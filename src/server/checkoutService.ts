import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { Order, OrderItemSnapshot, PaymentProvider, ShippingAddress, ShippingMethod, CouponDiscount } from '../types';
import { calculateCartTotals, calculateIncludedVAT, generateOrderReference } from '../utils/calculations';
import { withPostgresTransaction } from './postgres';

export class CheckoutError extends Error {
  constructor(message:string, readonly statusCode:number=400) { super(message); this.name='CheckoutError'; }
}

type CheckoutItem={productId:string;variantId?:string;quantity:number};
type CheckoutInput={
  customerId:string; items:CheckoutItem[]; shippingAddress:ShippingAddress;
  shippingMethodId:string; paymentMethod:PaymentProvider; discountCode?:string;
  sessionId?:string;
};

function parseJson<T>(value:unknown,fallback:T):T {
  if(value && typeof value==='object') return value as T;
  if(typeof value==='string') { try { return JSON.parse(value) as T; } catch { return fallback; } }
  return fallback;
}

export class PostgresCheckoutService {
  constructor(private readonly pool:Pool) {}

  async createPendingOrder(input:CheckoutInput):Promise<Order> {
    if(!input.customerId || !Array.isArray(input.items) || input.items.length<1 || input.items.length>50) {
      throw new CheckoutError('A customer account and between 1 and 50 order items are required.');
    }
    if(!input.shippingAddress || !input.shippingAddress.fullName || !input.shippingAddress.phone ||
       !input.shippingAddress.streetAddress || !input.shippingAddress.city || !input.shippingAddress.postalCode) {
      throw new CheckoutError('A complete shipping address is required.');
    }
    if(!['payfast','payflex','ozow','paystack','crypto'].includes(input.paymentMethod)) {
      throw new CheckoutError('Unsupported payment method.');
    }
    for(const item of input.items) {
      if(!item || typeof item.productId!=='string' || !Number.isInteger(item.quantity) || item.quantity<1 || item.quantity>99) {
        throw new CheckoutError('Item quantities must be whole numbers between 1 and 99.');
      }
    }

    return withPostgresTransaction(this.pool,async(client)=>{
      const customerResult=await client.query(
        'SELECT id,email,display_name,phone,status,email_verified,restriction_reason FROM mevo_customers WHERE id=$1 FOR UPDATE',
        [input.customerId],
      );
      const customer=customerResult.rows[0];
      if(!customer) throw new CheckoutError('Valid customer account required. Please sign in or register before checking out.',401);
      if(!customer.email_verified) throw new CheckoutError('Email confirmation is required before checkout.',403);
      if(customer.status==='blocked') throw new CheckoutError('Your customer account is suspended. Order creation is blocked.',403);
      if(customer.status==='restricted') throw new CheckoutError('Your account is restricted from placing new orders. '+(customer.restriction_reason||'Contact customer support.'),403);

      const settingsResult=await client.query('SELECT tax_rate_percent,free_shipping_threshold_cents FROM mevo_store_settings WHERE id=1');
      const settings=settingsResult.rows[0]||{tax_rate_percent:15,free_shipping_threshold_cents:150000};
      const shippingResult=await client.query(
        'SELECT id,name,description,price_cents,estimated_delivery FROM mevo_shipping_methods WHERE id=$1 AND active=TRUE',
        [input.shippingMethodId],
      );
      const shippingRow=shippingResult.rows[0];
      if(!shippingRow) throw new CheckoutError('The selected shipping method is unavailable.',409);
      const shippingMethod:ShippingMethod={
        id:shippingRow.id,name:shippingRow.name,description:shippingRow.description,
        priceCents:Number(shippingRow.price_cents),estimatedDelivery:shippingRow.estimated_delivery,
      };

      const snapshots:OrderItemSnapshot[]=[];
      const reservedRows:Array<{productId:string;variantId?:string;quantity:number;sku:string}>=[];
      for(const item of input.items) {
        const productResult=await client.query(
          `SELECT id,sku,name,brand,active,price_cents,promotional_price_cents,stock_on_hand,stock_reserved
             FROM mevo_products WHERE id=$1 FOR UPDATE`,[item.productId],
        );
        const product=productResult.rows[0];
        if(!product || !product.active) throw new CheckoutError('Product unavailable: '+item.productId,409);
        let sku=product.sku, title=product.name, brand=product.brand;
        let unitPrice=product.promotional_price_cents==null?Number(product.price_cents):Number(product.promotional_price_cents);
        let stockTable='mevo_products', stockId=product.id;
        if(item.variantId) {
          const variantResult=await client.query(
            `SELECT id,sku,title,price_cents,promotional_price_cents,stock_on_hand,stock_reserved,active
               FROM mevo_product_variants WHERE id=$1 AND product_id=$2 FOR UPDATE`,
            [item.variantId,item.productId],
          );
          const variant=variantResult.rows[0];
          if(!variant || !variant.active) throw new CheckoutError('Selected product variant is unavailable.',409);
          sku=variant.sku; title=product.name+' - '+variant.title;
          unitPrice=variant.promotional_price_cents==null?Number(variant.price_cents):Number(variant.promotional_price_cents);
          stockTable='mevo_product_variants'; stockId=variant.id;
          if(Number(variant.stock_on_hand)-Number(variant.stock_reserved)<item.quantity) throw new CheckoutError('Insufficient stock for '+title+'.',409);
        } else if(Number(product.stock_on_hand)-Number(product.stock_reserved)<item.quantity) {
          throw new CheckoutError('Insufficient stock for '+title+'.',409);
        }
        const lineTotal=unitPrice*item.quantity;
        snapshots.push({
          productId:product.id,variantId:item.variantId,sku,name:title,brand,
          variantTitle:item.variantId?title.slice(product.name.length+3):undefined,
          unitPriceCents:unitPrice,quantity:item.quantity,totalCents:lineTotal,
          taxCents:calculateIncludedVAT(lineTotal,Number(settings.tax_rate_percent)),
        });
        await client.query(
          'UPDATE '+stockTable+' SET stock_reserved=stock_reserved+$1,updated_at=now() WHERE id=$2',
          [item.quantity,stockId],
        );
        reservedRows.push({productId:product.id,variantId:item.variantId,quantity:item.quantity,sku});
      }

      let coupon:CouponDiscount|null=null;
      if(input.discountCode) {
        const couponResult=await client.query(
          'SELECT code,discount_type,discount_value,minimum_order_cents,description,active,expires_at,max_uses,usage_count FROM mevo_coupons WHERE code=upper($1) FOR UPDATE',
          [input.discountCode.trim()],
        );
        const row=couponResult.rows[0];
        if(row && row.active && (!row.expires_at || new Date(row.expires_at).getTime()>Date.now()) &&
           (row.max_uses==null || Number(row.usage_count)<Number(row.max_uses))) {
          coupon={
            code:row.code,type:row.discount_type,value:Number(row.discount_value),
            minOrderCents:Number(row.minimum_order_cents),description:row.description,
            isActive:true,expiresAt:row.expires_at?new Date(row.expires_at).toISOString():undefined,
            maxUses:row.max_uses==null?undefined:Number(row.max_uses),usageCount:Number(row.usage_count),
          };
        } else {
          throw new CheckoutError('The discount code is invalid, expired or no longer available.',409);
        }
      }

      const totals=calculateCartTotals({
        items:snapshots.map(i=>({priceCents:i.unitPriceCents,quantity:i.quantity})),
        discount:coupon,shippingMethod,
        freeShippingThresholdCents:Number(settings.free_shipping_threshold_cents),
      });
      const now=new Date().toISOString();
      let reference='';
      // Retry the short public reference if a concurrent checkout collides.
      for(let attempt=0;attempt<5;attempt++) {
        const candidate=generateOrderReference();
        const exists=await client.query('SELECT 1 FROM mevo_orders WHERE reference=$1',[candidate]);
        if(!exists.rowCount) { reference=candidate; break; }
      }
      if(!reference) throw new CheckoutError('Could not allocate an order reference. Please retry.',503);
      const id='ord_'+randomUUID();
      const address={...input.shippingAddress,email:customer.email};
      await client.query(
        `INSERT INTO mevo_orders
          (id,reference,customer_id,customer_email,customer_name,customer_phone,status,currency,
           subtotal_cents,discount_cents,shipping_cents,tax_cents,total_cents,shipping_address,
           shipping_method,payment_method,tax_rate_percent,discount_code)
         VALUES($1,$2,$3,$4,$5,$6,'PENDING_PAYMENT','ZAR',$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16)`,
        [id,reference,customer.id,customer.email,address.fullName,address.phone,totals.subtotalCents,
         totals.discountCents,totals.shippingCents,totals.taxCents,totals.totalCents,
         JSON.stringify(address),JSON.stringify(shippingMethod),input.paymentMethod,
         Number(settings.tax_rate_percent),coupon?.code||null],
      );
      for(const snapshot of snapshots) {
        await client.query(
          `INSERT INTO mevo_order_items
            (order_id,product_id,variant_id,sku_snapshot,name_snapshot,brand_snapshot,variant_title_snapshot,
             unit_price_cents,quantity,total_cents,tax_cents)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [id,snapshot.productId,snapshot.variantId||null,snapshot.sku,snapshot.name,snapshot.brand,
           snapshot.variantTitle||null,snapshot.unitPriceCents,snapshot.quantity,snapshot.totalCents,snapshot.taxCents],
        );
      }
      for(const reservation of reservedRows) {
        await client.query(
          `INSERT INTO mevo_stock_reservations
            (id,session_id,order_id,product_id,variant_id,quantity,status,expires_at)
           VALUES($1,$2,$3,$4,$5,$6,'ACTIVE',now()+interval '20 minutes')`,
          ['res_'+randomUUID(),input.sessionId||reference,id,reservation.productId,
           reservation.variantId||null,reservation.quantity],
        );
        await client.query(
          `INSERT INTO mevo_inventory_movements(product_id,movement_type,quantity,reference,actor)
           VALUES($1,'RESERVATION',$2,$3,$4)`,
          [reservation.productId,reservation.quantity,reference,'checkout'],
        );
      }
      if(coupon) await client.query('UPDATE mevo_coupons SET usage_count=usage_count+1 WHERE code=$1',[coupon.code]);
      await client.query(
        `INSERT INTO mevo_order_status_history(order_id,status,note,actor)
         VALUES($1,'PENDING_PAYMENT',$2,'system:checkout')`,
        [id,'Order created awaiting '+input.paymentMethod.toUpperCase()+' payment confirmation'],
      );
      await client.query(
        `INSERT INTO mevo_audit_events(actor,action,target_type,target_id,details)
         VALUES($1,'checkout.order.created','order',$2,$3::jsonb)`,
        [customer.id,reference,JSON.stringify({itemCount:snapshots.length,totalCents:totals.totalCents})],
      );

      return {
        id,reference,customerId:customer.id,customerEmail:customer.email,
        customerName:address.fullName,customerPhone:address.phone,
        status:'PENDING_PAYMENT',items:snapshots,subtotalCents:totals.subtotalCents,
        discountCents:totals.discountCents,shippingCents:totals.shippingCents,
        taxCents:totals.taxCents,totalCents:totals.totalCents,currency:'ZAR',
        shippingAddress:address,shippingMethod,paymentMethod:input.paymentMethod,
        paymentAttempts:[],statusHistory:[{
          status:'PENDING_PAYMENT',note:'Order created awaiting '+input.paymentMethod.toUpperCase()+' payment confirmation',
          updatedBy:'System Checkout',timestamp:now,
        }],createdAt:now,updatedAt:now,
      } as Order;
    });
  }
}
