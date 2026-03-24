const productsModel = require('./products.model');
async function list(){
  return await productsModel.getAll();
}
module.exports = { list };