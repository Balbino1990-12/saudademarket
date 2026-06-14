const Product = require('../models/Product');
const Activity = require('../models/Activity');
const User = require('../models/User');
const SessionManager = require('../services/SessionManager');
const RecommendationService = require('../services/RecommendationService');

class ProductController {
  static async resolveCurrentUser(req) {
    if (req.user) {
      return req.user;
    }

    const bearer = req.headers.authorization?.split(' ')[1];
    const token = bearer || req.headers['x-user-token'] || req.headers['x-admin-token'] || req.cookies?.userToken || req.cookies?.adminToken;

    if (token) {
      const session = SessionManager.validate(token);
      if (session?.username) {
        return await User.getByUsername(session.username);
      }
    }

    return null;
  }

  static async list(req, res, next) {
    try {
      const search = req.query.search || '';
      const rawLimit = req.query.limit;
      const requestedLimit = parseInt(rawLimit, 10);
      const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 10)
        : null;

      const categoryIdRaw = req.query.category_id || req.query.categoryId || req.query.category;
      const categoryId = categoryIdRaw ? parseInt(categoryIdRaw, 10) : null;
      if (categoryIdRaw && Number.isNaN(categoryId)) {
        return res.status(400).json({ error: 'Invalid category_id parameter' });
      }

      const currentUser = await ProductController.resolveCurrentUser(req);
      let products;
      const roleName = currentUser?.role_name?.toString().trim().toLowerCase();
      const isSeller = roleName === 'seller';

      // Seller sees only own products
      if (currentUser && isSeller) {
        if (search) {
          products = await Product.searchByUserId(currentUser.id, search, limit);
        } else {
          products = await Product.getByUserId(currentUser.id, limit);
        }
        if (categoryId) {
          products = products.filter(p => Number(p.category_id) === categoryId);
        }
      } else {
        if (search) {
          products = await Product.search(search, limit);
          if (categoryId) {
            products = products.filter(p => Number(p.category_id) === categoryId);
          }
        } else if (categoryId) {
          products = await Product.getByCategoryId(categoryId);
        } else {
          products = await Product.getAll(limit);
        }
      }

      res.json(products);
    } catch (err) {
      next(err);
    }
  }

  static async getOne(req, res, next) {
    try {
      const identifier = String(req.params.id || '').trim();
      let product;
      if (/^\d+$/.test(identifier)) {
        product = await Product.getById(identifier);
      } else {
        product = await Product.getBySlugOrName(identifier);
      }

      if (!product) return res.status(404).json({ error: 'Product not found' });

      // Track product view for recommendations
      const userId = req.user?.id || req.session?.userId;
      await RecommendationService.trackProductView(userId, product.id);

      res.json(product);
    } catch (err) {
      next(err);
    }
  }

  static async resolveUserIdFromRequest(req) {
    if (req.user?.id) {
      return req.user.id;
    }

    if (req.userId) {
      return req.userId;
    }

    if (req.body?.user_id) {
      const parsed = parseInt(req.body.user_id, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    const username = req.body?.username || req.session?.username || req.session?.adminUsername;
    if (username) {
      const user = await User.getByUsername(username);
      if (user) {
        return user.id;
      }

      // Fallback for admin session user not present in users table
      if (username.toLowerCase() === 'admin') {
        console.warn('[ProductController.resolveUserIdFromRequest] Admin username has no user record. Falling back to id 1.');
        return 1;
      }
    }

    return null;
  }

  static async create(req, res, next) {
    try {
      const product = req.body;
      
      let userId = await ProductController.resolveUserIdFromRequest(req);
      
      console.log('[ProductController.create] Debug info - req.user:', req.user ? 'exists' : 'missing', 'req.user.id:', req.user?.id);
      console.log('[ProductController.create] Debug info - req.session.username:', req.session?.username);
      
      // If still no userId, try to get from username in session
      if (!userId && req.session?.username) {
        const User = require('../models/User');
        const user = await User.getByUsername(req.session.username);
        if (user) {
          userId = user.id;
          console.log('[ProductController.create] Got user ID from session username:', userId);
        }
      }
      
      // Ensure category_id is numeric for DB insert
      if (product.category_id) {
        product.category_id = Number.isNaN(parseInt(product.category_id, 10))
          ? product.category_id
          : parseInt(product.category_id, 10);
      }

      if (product.quantity !== undefined) {
        product.quantity = Number.isNaN(parseInt(product.quantity, 10))
          ? 0
          : Math.max(0, parseInt(product.quantity, 10));
      } else {
        product.quantity = 0;
      }

      // Validate required fields
      if (!product.name_en || !product.category_id || product.price === undefined || product.price === null) {
        // Clean up uploaded file if validation fails
        if (req.file) {
          const fs = require('fs');
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ 
          success: false,
          error: 'Missing required fields: name_en, category_id, price' 
        });
      }
      
      // Validate user_id and fallback where needed
      if (!userId || userId === 'null' || userId === 'undefined') {
        console.warn('[ProductController.create] userId missing, attempting more fallback');
        if (req.session?.username) {
          const userFromSession = await User.getByUsername(req.session.username);
          if (userFromSession?.id) {
            userId = userFromSession.id;
            console.log('[ProductController.create] userId found from session user lookup:', userId);
          }
        }
      }

      if (!userId && req.session?.username?.toLowerCase() === 'admin') {
        console.warn('[ProductController.create] admin user not found in users table, using fallback id=1');
        userId = 1;
      }

      if (!userId) {
        if (req.file) {
          const fs = require('fs');
          fs.unlinkSync(req.file.path);
        }
        return res.status(401).json({ 
          success: false,
          error: 'User not authenticated. Please login again.' 
        });
      }
      
      if (typeof userId === 'string') {
        userId = parseInt(userId, 10);
      }

      if (!Number.isInteger(userId) || userId <= 0) {
        console.warn('[ProductController.create] invalid userId after parse:', userId);
        if (req.file) {
          const fs = require('fs');
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ 
          success: false,
          error: 'Invalid user_id. Please login again.' 
        });
      }

      console.log('[ProductController.create] Creating product for user:', userId);
      
      // Use provided names or default to name_en
      product.name_fr = product.name_fr || product.name_en;
      product.name_pt = product.name_pt || product.name_en;

      // If file was uploaded, set image path (relative to public)
      if (req.file) {
        product.image = '/images/' + req.file.filename;
      }

      // Set user_id
      product.user_id = parseInt(userId);

      console.log('[ProductController.create] Final payload going to Product.create:', {
        name_en: product.name_en,
        category_id: product.category_id,
        quantity: product.quantity,
        price: product.price,
        user_id: product.user_id,
        session: req.session,
        user: req.user,
      });

      // Create the product
      const createdProduct = await Product.create(product);
      
      // Log activity
      console.log('[ProductController.create] Product saved, now logging activity...');
      try {
        await Activity.logProductAdded({
          name_en: product.name_en,
          name_fr: product.name_fr,
          name_pt: product.name_pt
        });
        console.log('[ProductController.create] ✅ Activity logged successfully');
      } catch (err) {
        console.error('[ProductController.create] ⚠️ Activity logging failed (non-blocking):', err.message);
      }

      res.status(201).json({ 
        success: true, 
        product: createdProduct,
        message: 'Product created successfully' 
      });
    } catch (err) {
      // Clean up uploaded file on error
      if (req.file) {
        try {
          const fs = require('fs');
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error('Error deleting uploaded file:', e);
        }
      }
      console.error('Create product error:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Error creating product' 
      });
    }
  }

  static async update(req, res, next) {
    try {
      const id = req.params.id;
      
      // Check if product exists
      const existing = await Product.getById(id);
      if (!existing) {
        // If product doesn't exist, try to create it instead (fallback for new products)
        console.log(`Product ${id} not found, attempting to create as new product`);
        
        const product = req.body;
        
        // Validate required fields
        if (!product.name_en || !product.category_id || product.price === undefined || product.price === null) {
          if (req.file) {
            const fs = require('fs');
            fs.unlinkSync(req.file.path);
          }
          return res.status(400).json({ 
            success: false,
            error: 'Missing required fields: name_en, category_id, price' 
          });
        }

        // Set default language names
        product.name_fr = product.name_fr || product.name_en;
        product.name_pt = product.name_pt || product.name_en;
        product.quantity = product.quantity !== undefined && !Number.isNaN(parseInt(product.quantity, 10))
          ? Math.max(0, parseInt(product.quantity, 10))
          : 0;

        // If file was uploaded, set image path
        if (req.file) {
          product.image = '/images/' + req.file.filename;
        }

        try {
          await Product.create(product);
          return res.status(201).json({ 
            success: true, 
            product,
            message: 'Product created successfully (via update fallback)' 
          });
        } catch (createErr) {
          if (req.file) {
            try {
              const fs = require('fs');
              fs.unlinkSync(req.file.path);
            } catch (e) {
              console.error('Error deleting uploaded file:', e);
            }
          }
          throw createErr;
        }
      }

      // Merge existing with new data
      const updated = { ...existing, ...req.body };

      if (updated.quantity !== undefined) {
        updated.quantity = Number.isNaN(parseInt(updated.quantity, 10))
          ? 0
          : Math.max(0, parseInt(updated.quantity, 10));
      }

      // Validate required fields still exist
      if (!updated.name_en || !updated.category_id || updated.price === undefined || updated.price === null) {
        // Clean up uploaded file if validation fails
        if (req.file) {
          const fs = require('fs');
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ 
          success: false,
          error: 'Missing required fields' 
        });
      }

      // If new file was uploaded, update image path and delete old image
      if (req.file) {
        // Delete old image if it exists
        if (existing.image && existing.image.startsWith('/images/')) {
          try {
            const fs = require('fs');
            const path = require('path');
            const oldImagePath = path.join(__dirname, '../../public', existing.image);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
            }
          } catch (e) {
            console.error('Error deleting old image:', e);
          }
        }
        updated.image = '/images/' + req.file.filename;
      }

      await Product.update(id, updated);
      
      // Log activity
      console.log('[ProductController.update] Product updated, now logging activity...');
      try {
        await Activity.logProductUpdated({
          name_en: updated.name_en,
          name_fr: updated.name_fr,
          name_pt: updated.name_pt
        });
        console.log('[ProductController.update] ✅ Activity logged successfully');
      } catch (err) {
        console.error('[ProductController.update] ⚠️ Activity logging failed (non-blocking):', err.message);
      }

      res.json({ 
        success: true, 
        product: updated,
        message: 'Product updated successfully' 
      });
    } catch (err) {
      // Clean up uploaded file on error
      if (req.file) {
        try {
          const fs = require('fs');
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error('Error deleting uploaded file:', e);
        }
      }
      console.error('Update product error:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Error updating product' 
      });
    }
  }

  static async delete(req, res, next) {
    try {
      const id = req.params.id;
      
      // Check if product exists
      const existing = await Product.getById(id);
      if (!existing) {
        return res.status(404).json({ 
          success: false,
          error: 'Product not found' 
        });
      }

      // Delete associated image file if it exists
      if (existing.image && existing.image.startsWith('/images/')) {
        try {
          const fs = require('fs');
          const path = require('path');
          const imagePath = path.join(__dirname, '../../public', existing.image);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        } catch (e) {
          console.error('Error deleting image file:', e);
          // Continue with product deletion even if image cleanup fails
        }
      }

      await Product.delete(id);
      
      // Log activity
      console.log('[ProductController.delete] Product deleted, now logging activity...');
      try {
        await Activity.logProductDeleted({
          name_en: existing.name_en,
          name_fr: existing.name_fr,
          name_pt: existing.name_pt
        });
        console.log('[ProductController.delete] ✅ Activity logged successfully');
      } catch (err) {
        console.error('[ProductController.delete] ⚠️ Activity logging failed (non-blocking):', err.message);
      }

      res.json({ 
        success: true,
        message: 'Product deleted successfully' 
      });
    } catch (err) {
      console.error('Delete product error:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Error deleting product' 
      });
    }
  }
  static async getByUser(req, res, next) {
    try {
      const userId = req.params.userId;
      if (!userId) {
        return res.status(400).json({ error: 'user_id is required' });
      }

      let currentUser = req.user;
      if (!currentUser) {
        const bearer = req.headers.authorization?.split(' ')[1];
        const token = bearer || req.headers['x-user-token'] || req.headers['x-admin-token'] || req.cookies?.userToken || req.cookies?.adminToken;
        if (token) {
          const session = SessionManager.validate(token);
          if (session?.username) {
            currentUser = await User.getByUsername(session.username);
          }
        }
      }

      if (!currentUser) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const requestedUserId = parseInt(userId, 10);
      const currentUserRole = currentUser?.role_name?.toString().trim().toLowerCase();

      // Public / buyer can view any user's products
      if (currentUserRole === 'seller' && currentUser.id !== requestedUserId) {
        return res.status(403).json({ error: 'Forbidden: sellers can only view their own products' });
      }

      // Admin can view any user products; buyer and anonymous can also see it
      const products = await Product.getByUserId(requestedUserId);
      res.json(products);
    } catch (err) {
      next(err);
    }
  }

  static async checkOwnership(req, res, next) {
    try {
      const { productId, userId } = req.params;
      if (!productId || !userId) {
        return res.status(400).json({ error: 'productId and userId are required' });
      }

      const isOwner = await Product.isOwner(parseInt(productId), parseInt(userId));
      res.json({ isOwner, productId: parseInt(productId), userId: parseInt(userId) });
    } catch (err) {
      next(err);
    }
  }}

module.exports = ProductController;

