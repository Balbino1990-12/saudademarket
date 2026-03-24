const express = require('express');
const router = express.Router();
const RecommendationProductController = require('../controllers/RecommendationProductController');
const { verifyAnySession } = require('../middleware/authentication');
const { checkPermission } = require('../middleware/authorization');

router.get('/active', RecommendationProductController.listActive);
router.get('/', verifyAnySession, checkPermission('manage_products'), RecommendationProductController.list);
router.get('/:id', verifyAnySession, checkPermission('manage_products'), RecommendationProductController.getOne);
router.post('/', verifyAnySession, checkPermission('manage_products'), RecommendationProductController.create);
router.put('/:id', verifyAnySession, checkPermission('manage_products'), RecommendationProductController.update);
router.delete('/:id', verifyAnySession, checkPermission('manage_products'), RecommendationProductController.delete);

module.exports = router;
