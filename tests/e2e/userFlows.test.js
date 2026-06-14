const { request } = require('../setup/testApp');
const { createTestUser, getCsrfToken } = require('../setup/testHelpers');
const { clearDatabase } = require('../setup/database');
const Product = require('../../src/models/Product');
const Category = require('../../src/models/Category');

describe('E2E: User Registration and Login Flow', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('should allow user to register, login, and access protected route', async () => {
    // Register user
    const csrfToken = await getCsrfToken(request);
    const registerResponse = await request()
      .post('/api/users/register')
      .set('x-csrf-token', csrfToken)
      .send({
        username: 'e2euser',
        email: 'e2e@example.com',
        password: 'password123',
        country: 'Portugal',
      })
      .expect(201);

    expect(registerResponse.body.success).toBe(true);

    // Login with new user
    const loginResponse = await request()
      .post('/api/user/login')
      .set('x-csrf-token', csrfToken)
      .send({
        username: 'e2euser',
        password: 'password123',
      })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
    const token = loginResponse.body.token;

    // Access protected route
    const profileResponse = await request()
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(profileResponse.body.success).toBe(true);
    expect(profileResponse.body.user.username).toBe('e2euser');
  });
});

describe('E2E: Cart and Checkout Flow', () => {
  let user;
  let token;

  beforeEach(async () => {
    user = await createTestUser();
    const csrfToken = await getCsrfToken(request);
    const loginResponse = await request()
      .post('/api/user/login')
      .set('x-csrf-token', csrfToken)
      .send({ username: user.username, password: 'password123' });
    token = loginResponse.body.token;
  });

  it('should add to cart and checkout', async () => {
    const category = await Category.create({ name_en: 'E2E Cart Category' });
    const product = await Product.create({
      name_en: 'Checkout Product',
      name_fr: 'Produit de paiement',
      name_pt: 'Produto de checkout',
      price: 25,
      quantity: 10,
      category_id: category.id,
      user_id: user.id,
    });

    // Add to cart
    await request()
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: product.id,
        quantity: 1,
      })
      .expect(200);

    // Get cart
    const cartResponse = await request()
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(cartResponse.body.data.items).toHaveLength(1);

    // Checkout (mock payment)
    const checkoutResponse = await request()
      .post('/api/checkouts/intent')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingMethod: 'Standard',
      })
      .expect(200);

    expect(checkoutResponse.body.clientSecret).toBeDefined();
  });
});