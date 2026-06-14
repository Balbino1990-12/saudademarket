const Cart = require('../models/Cart');
const Product = require('../models/Product');

class CartController {
  /**
   * Get user's cart items
   */
  static async getCart(req, res, next) {
    try {
      const userId = req.user?.id || req.session?.userId || req.session?.buyerId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const cartItems = await Cart.getByUserId(userId);
      const summary = await Cart.getCartSummary(userId);

      res.json({
        success: true,
        data: {
          items: cartItems,
          summary: summary
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Add item to cart
   */
  static async addItem(req, res, next) {
    try {
      const userId = req.user?.id || req.session?.userId || req.session?.buyerId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const { productId, quantity = 1 } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required'
        });
      }

      // Validate product exists
      const product = await Product.getById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
        });
      }

      // Check if product is in stock
      if ((product.quantity || 0) <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Product is out of stock'
        });
      }

      // Validate quantity
      const qty = parseInt(quantity);
      if (isNaN(qty) || qty < 1) {
        return res.status(400).json({
          success: false,
          error: 'Quantity must be a positive number'
        });
      }

      // Check if requested quantity is available
      if (qty > (product.quantity || 0)) {
        return res.status(400).json({
          success: false,
          error: `Only ${product.quantity} items available in stock`
        });
      }

      const cartItem = await Cart.addItem(userId, productId, qty);
      const summary = await Cart.getCartSummary(userId);

      res.json({
        success: true,
        message: 'Item added to cart',
        data: {
          items: cartItem ? [cartItem] : [],
          summary: summary
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update cart item quantity
   */
  static async updateItem(req, res, next) {
    try {
      const userId = req.user?.id || req.session?.userId || req.session?.buyerId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const productId = req.params.productId || req.body.productId;
      const { quantity } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required'
        });
      }

      // Validate quantity
      const qty = parseInt(quantity);
      if (isNaN(qty) || qty < 0) {
        return res.status(400).json({
          success: false,
          error: 'Quantity must be a non-negative number'
        });
      }

      // If updating to a positive quantity, check product stock
      if (qty > 0) {
        const product = await Product.getById(productId);
        if (!product) {
          return res.status(404).json({
            success: false,
            error: 'Product not found'
          });
        }

        if ((product.quantity || 0) <= 0) {
          return res.status(400).json({
            success: false,
            error: 'Product is out of stock'
          });
        }

        if (qty > (product.quantity || 0)) {
          return res.status(400).json({
            success: false,
            error: `Only ${product.quantity} items available in stock`
          });
        }
      }

      let cartItem = null;
      if (qty > 0) {
        cartItem = await Cart.updateQuantity(userId, productId, qty);
      } else {
        // Remove item if quantity is 0
        await Cart.removeItem(userId, productId);
      }

      const summary = await Cart.getCartSummary(userId);

      res.json({
        success: true,
        message: qty > 0 ? 'Cart item updated' : 'Item removed from cart',
        data: {
          item: cartItem,
          summary: summary
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Remove item from cart
   */
  static async removeItem(req, res, next) {
    try {
      const userId = req.user?.id || req.session?.userId || req.session?.buyerId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const productId = req.params.productId || req.body.productId;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required'
        });
      }

      const removed = await Cart.removeItem(userId, productId);
      const summary = await Cart.getCartSummary(userId);

      res.json({
        success: true,
        message: removed ? 'Item removed from cart' : 'Item not found in cart',
        data: {
          removed: removed,
          summary: summary
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Clear entire cart
   */
  static async clearCart(req, res, next) {
    try {
      const userId = req.user?.id || req.session?.userId || req.session?.buyerId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const removedCount = await Cart.clearCart(userId);

      res.json({
        success: true,
        message: 'Cart cleared',
        data: {
          removedCount: removedCount,
          summary: { itemCount: 0, totalPrice: 0 }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get cart summary (count and total)
   */
  static async getSummary(req, res, next) {
    try {
      const userId = req.user?.id || req.session?.userId || req.session?.buyerId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const summary = await Cart.getCartSummary(userId);

      res.json({
        success: true,
        data: summary
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Check if product is in cart
   */
  static async checkItem(req, res, next) {
    try {
      const userId = req.user?.id || req.session?.userId || req.session?.buyerId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const { productId } = req.params;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Product ID is required'
        });
      }

      const inCart = await Cart.hasItem(userId, productId);

      res.json({
        success: true,
        data: {
          productId: productId,
          inCart: inCart
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CartController;
