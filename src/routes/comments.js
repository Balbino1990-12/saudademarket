const express = require('express');
const router = express.Router();
const CommentController = require('../controllers/CommentController');
const { verifyAdminSession, verifyUserSession, verifyAnySession } = require('../middleware/authentication');
const { checkPermission } = require('../middleware/authorization');

// Admin only
router.get('/', verifyAdminSession, checkPermission('manage_comments'), CommentController.list);

// Public/Pending-approved views
router.get('/:id', CommentController.getOne);
router.get('/product/:productId', CommentController.getByProduct);

// User's own comment for update editing (buyers only)
router.get('/mine/product/:productId', verifyUserSession, CommentController.getMineByProduct);

// Admin only
router.get('/user/:userId', verifyAdminSession, checkPermission('manage_comments'), CommentController.getByUser);

// Create feedback (authenticated customers/users)
router.post('/', verifyUserSession, CommentController.create);

// Update/delete can be performed by admin or owning buyer via controller-level authorization
router.put('/:id', verifyAnySession, CommentController.update);
router.delete('/:id', verifyAnySession, CommentController.delete);

module.exports = router;
