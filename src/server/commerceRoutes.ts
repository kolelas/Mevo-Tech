import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import { PostgresCommerceRepository } from './commerceRepository';

function optionalNumber(value:unknown):number|undefined {
  if (value===undefined || value===null || value==='') return undefined;
  const parsed=Number(value);
  return Number.isFinite(parsed) && parsed>=0 ? parsed : Number.NaN;
}

export function createCommerceRouter(pool:Pool|null) {
  const router=Router();
  const repository=pool ? new PostgresCommerceRepository(pool) : null;

  const unavailable=(_req:Request,res:Response) => res.status(503).json({
    success:false,
    error:'Commerce services require the PostgreSQL database. The legacy in-memory store is not used as a fallback.',
  });

  router.get('/products', async (req,res) => {
    if(!repository) return unavailable(req,res);
    const minPriceCents=optionalNumber(req.query.minPrice);
    const maxPriceCents=optionalNumber(req.query.maxPrice);
    if(Number.isNaN(minPriceCents)||Number.isNaN(maxPriceCents)) {
      return res.status(400).json({success:false,error:'Price filters must be non-negative numbers.'});
    }
    const textParam=(value:unknown,max:number):string|undefined =>
      typeof value==='string' && value.trim().length>0 && value.length<=max ? value.trim() : undefined;
    if((req.query.search!==undefined && !textParam(req.query.search,100)) ||
       (req.query.category!==undefined && !textParam(req.query.category,100)) ||
       (req.query.brand!==undefined && !textParam(req.query.brand,100))) {
      return res.status(400).json({success:false,error:'Invalid catalogue filter.'});
    }
    const sort=textParam(req.query.sort,20);
    if(sort && !['price_asc','price_desc','newest'].includes(sort)) {
      return res.status(400).json({success:false,error:'Unsupported product sort order.'});
    }
    try {
      const products=await repository.listProducts({
        category:textParam(req.query.category,100),
        brand:textParam(req.query.brand,100),
        search:textParam(req.query.search,100),
        minPriceCents,maxPriceCents,
        sort:sort as 'price_asc'|'price_desc'|'newest'|undefined,
        onlyActive:true,
      });
      return res.json({success:true,count:products.length,products,source:'postgresql'});
    } catch {
      return res.status(503).json({success:false,error:'The PostgreSQL product catalogue is temporarily unavailable.'});
    }
  });

  router.get('/products/:slug', async (req,res) => {
    if(!repository) return unavailable(req,res);
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(req.params.slug) || req.params.slug.length>180) {
      return res.status(400).json({success:false,error:'Invalid product slug.'});
    }
    try {
      const product=await repository.getProductBySlug(req.params.slug);
      if(!product) return res.status(404).json({success:false,error:'Product not found'});
      return res.json({success:true,product,source:'postgresql'});
    } catch {
      return res.status(503).json({success:false,error:'The PostgreSQL product catalogue is temporarily unavailable.'});
    }
  });

  router.post('/checkout/reserve', async (req,res) => {
    if(!repository) return unavailable(req,res);
    const {items,sessionId}=req.body||{};
    if(!Array.isArray(items)||!sessionId||typeof sessionId!=='string') {
      return res.status(400).json({success:false,error:'Invalid stock reservation parameters.'});
    }
    const reservation=await repository.reserveStock({items,sessionId});
    if(!reservation.success) return res.status(409).json({success:false,error:reservation.error});
    return res.json({success:true,reservationIds:reservation.reservationIds});
  });

  return router;
}
