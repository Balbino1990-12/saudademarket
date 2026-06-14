const express = require('express');
const router = express.Router();
const adminService = require('./admin.service');
const { verifyAdminSession } = require('../../middleware/authentication');
const productsService = require('../products/products.service');

router.post('/login', (req, res) => adminService.login(req, res, req.app));
router.post('/logout', verifyAdminSession, (req, res) => adminService.logout(req, res, req.app));
router.get('/products', verifyAdminSession, async (req, res, next) => {
  try{
    const products = await productsService.list();
    res.json(products);
  }catch(e){ next(e); }
});

module.exports = router;
