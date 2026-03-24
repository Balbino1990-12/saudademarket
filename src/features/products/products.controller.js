const productsService = require('./products.service');

async function listProducts(req, res, next){
  try{
    const products = await productsService.list();
    res.json(products);
  }catch(e){ next(e); }
}

module.exports = { listProducts };