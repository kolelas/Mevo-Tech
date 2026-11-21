import type { Pool, PoolClient } from 'pg';
import type { Product, ProductVariant, ProductSpecification } from '../types';
import { withPostgresTransaction } from './postgres';

type DbProduct = {
  id:string; slug:string; name:string; sku:string; brand:string; category:string;
  sub_category:string|null; tagline:string; description:string; price_cents:string|number;
  promotional_price_cents:string|number|null; cost_price_cents:string|number;
  primary_image:string; images:unknown; specifications:unknown;
  stock_on_hand:number; stock_reserved:number; low_stock_threshold:number;
  active:boolean; featured:boolean; new_arrival:boolean; placement_slot:string;
  placement_priority:number; pinned_to_top:boolean; warranty_period_months:number;
  created_at:Date|string; updated_at:Date|string;
};

const asArray = <T>(value:unknown):T[] => Array.isArray(value) ? value as T[] : [];
const cents = (value:string|number|null):number => value == null ? 0 : Number(value);
const iso = (value:Date|string):string => new Date(value).toISOString();

function mapVariant(row:any):ProductVariant {
  return {
    id:row.id, sku:row.sku, title:row.title, attributeName:row.attribute_name,
    attributeValue:row.attribute_value, priceCents:cents(row.price_cents),
    promotionalPriceCents:row.promotional_price_cents == null ? undefined : cents(row.promotional_price_cents),
    onHandQuantity:Number(row.stock_on_hand), reservedQuantity:Number(row.stock_reserved),
  };
}

function mapProduct(row:DbProduct, variants:ProductVariant[] = []):Product {
  return {
    id:row.id, slug:row.slug, name:row.name, sku:row.sku, brand:row.brand,
    category:row.category, subCategory:row.sub_category || undefined,
    tagline:row.tagline, description:row.description, priceCents:cents(row.price_cents),
    promotionalPriceCents:row.promotional_price_cents == null ? undefined : cents(row.promotional_price_cents),
    costPriceCents:cents(row.cost_price_cents), primaryImage:row.primary_image,
    images:asArray<string>(row.images), specifications:asArray<ProductSpecification>(row.specifications),
    variants, onHandQuantity:Number(row.stock_on_hand), reservedQuantity:Number(row.stock_reserved),
    lowStockThreshold:Number(row.low_stock_threshold), isActive:row.active,
    isFeatured:row.featured, isNewArrival:row.new_arrival,
    placementSlot:row.placement_slot as Product['placementSlot'],
    placementPriority:Number(row.placement_priority), isPinnedToTop:row.pinned_to_top,
    warrantyPeriodMonths:Number(row.warranty_period_months),
    createdAt:iso(row.created_at), updatedAt:iso(row.updated_at),
  };
}

const PRODUCT_COLUMNS = `
  id, slug, name, sku, brand, category, sub_category, tagline, description,
  price_cents, promotional_price_cents, cost_price_cents, primary_image, images,
  specifications, stock_on_hand, stock_reserved, low_stock_threshold, active,
  featured, new_arrival, placement_slot, placement_priority, pinned_to_top,
  warranty_period_months, created_at, updated_at
`;

export class PostgresCommerceRepository {
  constructor(private readonly pool:Pool) {}

  async listProducts(filters:{
    category?:string; search?:string; brand?:string; minPriceCents?:number;
    maxPriceCents?:number; sort?:'price_asc'|'price_desc'|'newest'; onlyActive?:boolean;
  } = {}):Promise<Product[]> {
    const clauses:string[]=[];
    const values:unknown[]=[];
    const add=(sql:string,value:unknown)=>{values.push(value);clauses.push(sql.replace('?', '$'+values.length));};
    if(filters.onlyActive !== false) clauses.push('active = TRUE');
    if(filters.category) add('lower(category) = lower(?)',filters.category);
    if(filters.brand) add('lower(brand) = lower(?)',filters.brand);
    if(filters.search) add('(name ILIKE ? OR brand ILIKE ? OR sku ILIKE ?)', '%'+filters.search+'%');
    if(filters.minPriceCents !== undefined) add('COALESCE(promotional_price_cents,price_cents) >= ?',filters.minPriceCents);
    if(filters.maxPriceCents !== undefined) add('COALESCE(promotional_price_cents,price_cents) <= ?',filters.maxPriceCents);
    // Search uses one parameter for each expression.
    if(filters.search) {
      const marker='$'+values.length;
      clauses[clauses.length-1]='(name ILIKE '+marker+' OR brand ILIKE '+marker+' OR sku ILIKE '+marker+')';
    }
    const order=filters.sort==='price_asc'?'COALESCE(promotional_price_cents,price_cents) ASC':
      filters.sort==='price_desc'?'COALESCE(promotional_price_cents,price_cents) DESC':
      'pinned_to_top DESC, placement_priority ASC, created_at DESC';
    const result=await this.pool.query<DbProduct>(
      'SELECT '+PRODUCT_COLUMNS+' FROM mevo_products WHERE '+(clauses.length?clauses.join(' AND '):'TRUE')+' ORDER BY '+order,
      values,
    );
    if(!result.rows.length) return [];
    const ids=result.rows.map(r=>r.id);
    const variants=await this.pool.query('SELECT * FROM mevo_product_variants WHERE active=TRUE AND product_id=ANY($1::text[]) ORDER BY product_id, created_at', [ids]);
    const grouped=new Map<string,ProductVariant[]>();
    for(const row of variants.rows) grouped.set(row.product_id,[...(grouped.get(row.product_id)||[]),mapVariant(row)]);
    return result.rows.map(row=>mapProduct(row,grouped.get(row.id)||[]));
  }

  async getProductBySlug(slug:string):Promise<Product|null> {
    const result=await this.pool.query<DbProduct>('SELECT '+PRODUCT_COLUMNS+' FROM mevo_products WHERE slug=$1 AND active=TRUE LIMIT 1',[slug]);
    const row=result.rows[0]; if(!row) return null;
    const variants=await this.pool.query('SELECT * FROM mevo_product_variants WHERE product_id=$1 AND active=TRUE ORDER BY created_at',[row.id]);
    return mapProduct(row,variants.rows.map(mapVariant));
  }

  async getProductById(id:string, client:Pool|PoolClient=this.pool):Promise<Product|null> {
    const result=await client.query<DbProduct>('SELECT '+PRODUCT_COLUMNS+' FROM mevo_products WHERE id=$1 LIMIT 1',[id]);
    const row=result.rows[0]; if(!row) return null;
    const variants=await client.query('SELECT * FROM mevo_product_variants WHERE product_id=$1 AND active=TRUE ORDER BY created_at',[row.id]);
    return mapProduct(row,variants.rows.map(mapVariant));
  }

  async reserveStock(input:{items:Array<{productId:string;variantId?:string;quantity:number}>;sessionId:string;ttlSeconds?:number}):Promise<{success:boolean;reservationIds:string[];error?:string}> {
    if(!input.sessionId || input.sessionId.length>200 || !Array.isArray(input.items) || !input.items.length || input.items.length>50) {
      return {success:false,reservationIds:[],error:'Invalid stock reservation request.'};
    }
    for(const item of input.items) if(!item.productId || !Number.isInteger(item.quantity) || item.quantity<1 || item.quantity>99) {
      return {success:false,reservationIds:[],error:'Each item must have a product and quantity between 1 and 99.'};
    }
    try {
      return await withPostgresTransaction(this.pool,async(client)=>{
        await client.query(`UPDATE mevo_stock_reservations SET status='EXPIRED'
          WHERE status='ACTIVE' AND expires_at<=now()`);
        const ids:string[]=[];
        for(const item of input.items) {
          const table=item.variantId?'mevo_product_variants':'mevo_products';
          const result=await client.query(
            'SELECT id, stock_on_hand, stock_reserved, active FROM '+table+' WHERE id=$1 FOR UPDATE',
            [item.variantId||item.productId],
          );
          const row=result.rows[0];
          if(!row || (row.active===false) || Number(row.stock_on_hand)-Number(row.stock_reserved)<item.quantity) {
            throw new Error('Insufficient stock or product unavailable.');
          }
          const id=cryptoRandomId();
          await client.query('UPDATE '+table+' SET stock_reserved=stock_reserved+$1, updated_at=now() WHERE id=$2',[item.quantity,item.variantId||item.productId]);
          await client.query(`INSERT INTO mevo_stock_reservations
            (id,session_id,product_id,variant_id,quantity,status,expires_at)
            VALUES($1,$2,$3,$4,$5,'ACTIVE',now()+($6::int * interval '1 second'))`,
            [id,input.sessionId,item.productId,item.variantId||null,item.quantity,input.ttlSeconds??900]);
          ids.push(id);
        }
        return {success:true,reservationIds:ids};
      });
    } catch(error) {
      return {success:false,reservationIds:[],error:error instanceof Error?error.message:'Stock reservation failed.'};
    }
  }
}

function cryptoRandomId():string {
  return 'res_'+Array.from({length:24},()=>Math.floor(Math.random()*16).toString(16)).join('');
}
