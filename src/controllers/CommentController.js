const Comment = require('../models/Comment');
const User = require('../models/User');

class CommentController {
  static async list(req, res, next) {
    try {
      const status = req.query.status || null;
      const productId = req.query.product_id || req.query.productId || null;
      const page = req.query.page ? parseInt(req.query.page, 10) : 1;
      const perPage = req.query.per_page ? parseInt(req.query.per_page, 10) : 15;

      const result = await Comment.getAll({ status, productId, page, perPage });
      res.json({
        total: result.total,
        page,
        per_page: perPage,
        comments: result.comments
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOne(req, res, next) {
    try {
      const comment = await Comment.getById(req.params.id);
      if (!comment) return res.status(404).json({ error: 'Comment not found' });
      res.json(comment);
    } catch (err) {
      next(err);
    }
  }

  static async getByProduct(req, res, next) {
    try {
      const productId = req.params.productId;
      const comments = await Comment.getByProductId(productId);
      res.json(comments);
    } catch (err) {
      next(err);
    }
  }

  static async getMineByProduct(req, res, next) {
    try {
      const username = req.session?.username || req.session?.adminUsername;
      if (!username) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await User.getByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const productId = req.params.productId;
      const comment = await Comment.getByUserAndProduct(user.id, productId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      res.json(comment);
    } catch (err) {
      next(err);
    }
  }

  static async getByUser(req, res, next) {
    try {
      const userId = req.params.userId;
      const comments = await Comment.getByUserId(userId);
      res.json(comments);
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      // require signed-in user
      const username = req.session?.username || req.session?.adminUsername;

      if (!username) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      let user = await User.getByUsername(username);
      if (!user && username && username.includes('@')) {
        user = await User.getByEmail(username);
      }
      if (!user && req.session?.userId) {
        user = await User.getById(req.session.userId);
      }
      if (!user) {
        return res.status(401).json({ error: 'User record not found' });
      }

      // Only buyers can provide feedback
      if (!user.role_name || user.role_name.toLowerCase() !== 'buyer') {
        return res.status(403).json({ error: 'Feedback is allowed for buyers only' });
      }

      const { product_id, title, body, rating } = req.body;
      if (!product_id) {
        return res.status(400).json({ error: 'product_id is required' });
      }
      if (!body || typeof body !== 'string' || !body.trim()) {
        return res.status(400).json({ error: 'body is required' });
      }

      // If the buyer already left a comment for this product, do not allow a second submission.
      const existingComment = await Comment.getByUserAndProduct(user.id, product_id);
      if (existingComment) {
        return res.status(409).json({ error: 'You have already submitted a review for this product.' });
      }

      const newComment = await Comment.create({
        user_id: user.id,
        product_id: product_id || null,
        title: title || null,
        body: body.trim(),
        rating: rating ? Number(rating) : null,
        status: 'pending'
      });

      res.status(201).json(newComment);
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      const existing = await Comment.getById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Comment not found' });

      const username = req.session?.adminUsername || req.session?.username;
      if (!username) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      let currentUser = await User.getByUsername(username);
      if (!currentUser && username && username.includes('@')) {
        currentUser = await User.getByEmail(username);
      }
      if (!currentUser && req.session?.userId) {
        currentUser = await User.getById(req.session.userId);
      }

      const isAdminSession = !!req.session?.adminUsername || (currentUser && currentUser.role_name && currentUser.role_name.toLowerCase() === 'admin');
      const isOwner = currentUser && existing.user_id && Number(currentUser.id) === Number(existing.user_id);

      if (!isAdminSession && !isOwner) {
        return res.status(403).json({ error: 'Not authorized to update this comment' });
      }

      const { product_id, title, body, rating, status } = req.body;

      let finalStatus = existing.status;
      if (isAdminSession) {
        finalStatus = status ?? existing.status;
      } else if (isOwner) {
        finalStatus = 'pending';
      }

      const updatedComment = await Comment.update(req.params.id, {
        user_id: existing.user_id,
        product_id: product_id ?? existing.product_id,
        title: title ?? existing.title,
        body: body ?? existing.body,
        rating: rating ?? existing.rating,
        status: finalStatus
      });

      res.json(updatedComment);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req, res, next) {
    try {
      const existing = await Comment.getById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Comment not found' });

      const username = req.session?.adminUsername || req.session?.username;
      if (!username) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      let currentUser = await User.getByUsername(username);
      if (!currentUser && username && username.includes('@')) {
        currentUser = await User.getByEmail(username);
      }
      if (!currentUser && req.session?.userId) {
        currentUser = await User.getById(req.session.userId);
      }

      const isAdminSession = !!req.session?.adminUsername || (currentUser && currentUser.role_name && currentUser.role_name.toLowerCase() === 'admin');

      if (!isAdminSession) {
        return res.status(403).json({ error: 'Not authorized to delete this comment' });
      }

      await Comment.delete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CommentController;
