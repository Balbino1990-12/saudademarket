const express = require('express');
const router = express.Router();
const ShopifyService = require('../services/ShopifyService');

/**
 * GET /api/shopify/products
 * Fetch products from Shopify
 */
router.get('/products', async (req, res, next) => {
  try {
    const shopify = new ShopifyService();
    const response = await shopify.getProducts();

    if (!response || !response.products) {
      return res.status(200).json([]);
    }

    const products = response.products.edges
      .map((edge) => edge.node)
      .map((product) => ({
        id: product.id,
        title: product.title,
        handle: product.handle,
        description: product.description,
        price: parseFloat(
          product.priceRange?.minVariantPrice?.amount || '0'
        ),
        image:
          product.images?.edges?.[0]?.node?.url ||
          '/images/placeholder.png',
        imageAlt: product.images?.edges?.[0]?.node?.altText || product.title,
        variantId: product.variants?.edges?.[0]?.node?.id || null
      }));

    res.json(products);
  } catch (err) {
    console.error('Error fetching Shopify products:', err.message);
    // Fail gracefully - allow fallback to local products
    res.status(200).json([]);
  }
});

/**
 * POST /api/shopify/checkout
 * Create a checkout in Shopify
 * Expected body: { lineItems: [{ variantId, quantity }, ...] }
 */
router.post('/checkout', async (req, res, next) => {
  try {
    const { lineItems } = req.body;

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res
        .status(400)
        .json({ error: 'Invalid lineItems: must be a non-empty array' });
    }

    // Validate line items format, ensuring variantId and quantity are present and valid, and that quantity is a positive number
    // This validation is crucial to prevent malformed requests from reaching the Shopify API, which could lead to errors or unintended consequences
    //create a documentation comment for this validation logic to explain its importance and what it checks for
    // Validate each line item
    for (const item of lineItems) {
      if (!item.variantId || !item.quantity) {
        return res.status(400).json({
          error: 'Each lineItem must have variantId and quantity'
        });
      }
      if (typeof item.quantity !== 'number' || item.quantity < 1) {
        return res.status(400).json({
          error: 'Quantity must be a positive number'
        });
      }
    }

    const shopify = new ShopifyService();
    const response = await shopify.createCheckout(lineItems);

    if (response && response.checkoutCreate) {
      const { checkout, checkoutUserErrors } = response.checkoutCreate;

      if (checkoutUserErrors && checkoutUserErrors.length > 0) {
        const errorMsg = checkoutUserErrors
          .map((e) => e.message)
          .join('; ');
        return res.status(400).json({ error: errorMsg });
      }

      if (checkout && checkout.webUrl) {
        return res.json({
          success: true,
          checkoutUrl: checkout.webUrl,
          checkout
        });
      }
    }

    res.status(500).json({
      error: 'Failed to create checkout'
    });
  } catch (err) {
    console.error('Error creating checkout:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

