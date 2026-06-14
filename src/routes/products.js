const express = require('express'); // Import the Express framework to create a router for handling product-related routes  
const router = express.Router();
const ProductController = require('../controllers/ProductController');
const upload = require('../middleware/upload');
const { verifyAdminSession, verifyAnySession } = require('../middleware/authentication');
const { checkPermission } = require('../middleware/authorization');

router.get('/', ProductController.list);
router.get('/user/:userId', ProductController.getByUser);
router.get('/:id', ProductController.getOne);
router.get('/check-owner/:productId/:userId', ProductController.checkOwnership);
// Allow both admin and users with manage_products permission
router.post('/', verifyAnySession, checkPermission('manage_products'), upload.single('image'), ProductController.create);
router.put('/:id', verifyAnySession, checkPermission('manage_products'), upload.single('image'), ProductController.update);
router.delete('/:id', verifyAnySession, checkPermission('manage_products'), ProductController.delete);

module.exports = router;

