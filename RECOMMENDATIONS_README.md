# Product Recommendations System

This document describes the product recommendation algorithm implemented for Portugal Store.

## Overview

The recommendation system provides personalized product suggestions to users based on their behavior and preferences. It uses multiple algorithms to ensure relevant recommendations even for new users.

## Algorithms Implemented

### 1. Category-Based Recommendations (40%)
- Recommends products from the same categories as items in the user's cart
- Useful for users browsing specific types of products

### 2. Collaborative Filtering (30%)
- Finds users with similar cart contents
- Recommends products that similar users have in their carts
- Helps discover products through "users also bought" logic

### 3. Popularity-Based Recommendations (20%)
- Recommends the most popular products across all users
- Fallback for new users or when other algorithms don't apply

### 4. Trending/New Products (10%)
- Shows recently added products
- Helps surface new inventory

## API Endpoints

### GET /api/recommendations
Returns personalized recommendations for the authenticated user.

**Parameters:**
- `limit` (optional): Maximum number of recommendations (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name_en": "Portuguese Wine",
      "name_fr": "Vin Portugais",
      "name_pt": "Vinho Português",
      "price": 15.99,
      "image": "/images/wine.jpg",
      "category_name": "Wines"
    }
  ],
  "count": 6
}
```

### GET /api/recommendations/popular
Returns popular products.

**Parameters:**
- `limit` (optional): Maximum number of products (default: 10)
- `excludeCart` (optional): Exclude products already in user's cart (default: false)

### GET /api/recommendations/similar/:productId
Returns products similar to the specified product.

**Parameters:**
- `limit` (optional): Maximum number of similar products (default: 5)

### POST /api/recommendations/track-view/:productId
Tracks that a user viewed a product (for analytics).

## Frontend Integration

The system is integrated into the frontend via JavaScript functions in `public/js/script.js`:

- `loadRecommendations(containerId, limit)`: Loads personalized recommendations
- `loadPopularProducts(containerId, limit)`: Loads popular products
- `loadSimilarProducts(productId, containerId, limit)`: Loads similar products
- `displayRecommendations(container, products, title)`: Displays recommendations in a grid

## Database Tables Used

- `products`: Product information
- `cart`: User cart contents (for behavior analysis)
- `categories`: Product categories
- `users`: User information

## Features

- **Personalized**: Recommendations based on user's cart and behavior
- **Fallback System**: Multiple algorithms ensure recommendations are always available
- **Performance Optimized**: Efficient database queries with proper indexing
- **Responsive Design**: Recommendations display properly on all devices
- **Real-time**: Updates based on current cart contents

## Usage Examples

### Display recommendations on homepage:
```javascript
// In HTML: <div id="recommendationsContainer"></div>
// In JavaScript:
loadRecommendations('recommendationsContainer', 6);
```

### Show similar products on product detail page:
```javascript
loadSimilarProducts(productId, 'similarProductsContainer', 4);
```

## Future Enhancements

1. **Purchase History**: Use order history for better recommendations
2. **User Ratings**: Incorporate product ratings
3. **Time-based**: Consider seasonal preferences
4. **Geographic**: Location-based recommendations
5. **Machine Learning**: Advanced ML models for better personalization

## Technical Details

- **Backend**: Node.js with Express
- **Database**: MySQL with connection pooling
- **Frontend**: Vanilla JavaScript with fetch API
- **Authentication**: Session-based with middleware
- **Error Handling**: Comprehensive error handling with fallbacks