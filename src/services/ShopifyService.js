/**
 * Shopify API Service
 * Handles communication with Shopify APIs for products and checkout
 */

const https = require('https');

class ShopifyService {
  constructor() {
    this.shopName = process.env.SHOP_NAME || 'portugalstorefr.myshopify.com';
    this.adminToken = process.env.SHOPIFY_ADMIN_TOKEN;
    this.storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN;
    this.apiVersion = '2024-01'; // Latest stable API version
  }

  /**
   * Fetch products from Shopify Admin API
   * @returns {Promise<Array>} Array of product objects
   */
  async getProducts() {
    if (!this.adminToken) {
      throw new Error('SHOPIFY_ADMIN_TOKEN is not configured');
    }

    const query = `
      {
        products(first: 50) {
          edges {
            node {
              id
              title
              handle
              description
              priceRange {
                minVariantPrice {
                  amount
                }
              }
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    id
                    title
                  }
                }
              }
            }
          }
        }
      }
    `;

    return this._makeGraphQLRequest(query, 'admin');
  }

  /**
   * Create a checkout in Shopify Storefront API
   * @param {Array} lineItems - Array of {variantId, quantity}
   * @returns {Promise<Object>} Checkout object with checkoutUrl
   */
  async createCheckout(lineItems) {
    if (!this.storefrontToken) {
      throw new Error('SHOPIFY_STOREFRONT_TOKEN is not configured');
    }

    const query = `
      mutation {
        checkoutCreate(input: {
          lineItems: [
            ${lineItems
              .map(
                (item) => `{
              variantId: "${item.variantId}",
              quantity: ${item.quantity}
            }`
              )
              .join(',\n')}
          ]
        }) {
          checkout {
            id
            webUrl
          }
          checkoutUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    return this._makeGraphQLRequest(query, 'storefront');
  }

  /**
   * Make a GraphQL request to Shopify API
   * @private
   * @param {string} query - GraphQL query string
   * @param {string} apiType - 'admin' or 'storefront'
   * @returns {Promise<Object>} API response data
   */
  _makeGraphQLRequest(query, apiType = 'admin') {
    return new Promise((resolve, reject) => {
      const token = apiType === 'admin' ? this.adminToken : this.storefrontToken;
      const endpoint =
        apiType === 'admin'
          ? `/admin/api/${this.apiVersion}/graphql.json`
          : `/api/${this.apiVersion}/graphql.json`;

      const options = {
        hostname: this.shopName,
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
          'Content-Length': Buffer.byteLength(JSON.stringify({ query }))
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);

            if (parsed.errors) {
              const errorMsg = parsed.errors
                .map((e) => e.message)
                .join('; ');
              reject(new Error(`Shopify API Error: ${errorMsg}`));
            } else {
              resolve(parsed.data);
            }
          } catch (e) {
            reject(new Error(`Failed to parse Shopify response: ${e.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Shopify API request failed: ${error.message}`));
      });

      req.write(JSON.stringify({ query }));
      req.end();
    });
  }

  /**
   * Transform Shopify product to simplified format
   * @private
   */
  _transformProduct(shopifyProduct) {
    return {
      id: shopifyProduct.id,
      title: shopifyProduct.title,
      handle: shopifyProduct.handle,
      description: shopifyProduct.description,
      price: shopifyProduct.priceRange?.minVariantPrice?.amount || 0,
      image: shopifyProduct.images?.edges?.[0]?.node?.url || null,
      imageAlt: shopifyProduct.images?.edges?.[0]?.node?.altText || '',
      variantId: shopifyProduct.variants?.edges?.[0]?.node?.id || null
    };
  }
}

module.exports = ShopifyService;

