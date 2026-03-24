const express = require('express');
const router = express.Router();
const controller = require('./products.controller');

router.get('/', controller.listProducts);

module.exports = router;