const { request } = require('../../setup/testApp');
const { createTestUser, getCsrfToken } = require('../../setup/testHelpers');
const { clearDatabase } = require('../../setup/database');
const Product = require('../../../src/models/Product');
const Category = require('../../../src/models/Category');

describe('Cart API', () => {
  let user;
  let token;

  beforeEach(async () => {
    await clearDatabase();
    user = await createTestUser();
    // Mock login to get token
    const csrfToken = await getCsrfToken(request);
    const loginResponse = await request()
      .post('/api/user/login')
      .set('x-csrf-token', csrfToken)
      .send({ username: user.username, password: 'password123' });
    token = loginResponse.body.token;
  });

  describe('GET /api/cart', () => {
    it('should return empty cart for new user', async () => {
      const response = await request()
        .get('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toEqual([]);
    });
  });

  describe('POST /api/cart/add', () => {
    it('should add item to cart', async () => {
      const category = await Category.create({ name_en: 'Cart Test Category' });
      const product = await Product.create({
        name_en: 'Test Product',
        name_fr: 'Produit test',
        name_pt: 'Produto de teste',
        price: 12.5,
        quantity: 10,
        category_id: category.id,
        user_id: user.id,
      });

      const response = await request()
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId: product.id,
          quantity: 2,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(2);
    });
  });
});