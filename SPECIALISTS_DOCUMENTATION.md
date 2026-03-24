# Portuguese Food Specialists Management System

## Overview

The Portuguese Food Specialists system is a complete MVC implementation for managing and displaying Portuguese food experts and artisans. It provides a RESTful API and admin interface for creating, reading, updating, and deleting specialist profiles.

## Architecture

### Database Layer

**Table: `specialists`**
- `id` - Auto-incrementing primary key
- `name_en`, `name_fr`, `name_pt` - Multilingual specialist names
- `specialty` - Type of specialization (Cheese Master, Wine Specialist, etc.)
- `description` - Detailed information about the specialist
- `location` - Geographic location
- `expertise_years` - Years of professional experience
- `image` - Profile image URL
- `email` - Contact email
- `phone` - Contact phone number
- `website` - Personal/business website URL
- `active` - Boolean flag for soft deletes
- `created_at`, `updated_at` - Timestamps

**Key Features:**
- Auto-created on server startup via `/src/config/database.js`
- Soft delete support (marking as inactive instead of removing)
- Indexes on: `name_en`, `specialty`, `active` for optimal query performance

### Model Layer

**File:** `/src/models/Specialist.js`

Provides database abstraction with the following methods:

```javascript
Specialist.getAll()                   // Get all active specialists
Specialist.getById(id)                // Get specialist by ID
Specialist.getBySpecialty(specialty)  // Filter by specialty type
Specialist.getSpecialties()           // Get unique specialties list
Specialist.create(data)               // Create new specialist
Specialist.update(id, updates)        // Update specialist info
Specialist.delete(id)                 // Soft delete specialist
```

**Features:**
- Comprehensive error logging with `[Specialist.*]` prefixes
- Field validation for allowed updates
- Automatic timestamp management
- Transaction-safe operations

### Controller Layer

**File:** `/src/controllers/SpecialistController.js`

RESTful request handlers with built-in validation:

- `getAll(req, res)` - List all specialists with count
- `getById(req, res)` - Detailed view with 404 handling
- `getBySpecialty(req, res)` - Filter by specialty
- `getSpecialties(req, res)` - Return unique specialties
- `create(req, res)` - Validate and create new record
- `update(req, res)` - Update with existence check
- `delete(req, res)` - Soft delete with verification

**Error Handling:**
- Comprehensive error responses with status codes
- Field validation before database operations
- Existence checks before updates/deletes
- Structured JSON responses with `success` flag

### Routes Layer

**File:** `/src/routes/specialists.js`

RESTful endpoint structure:

```
GET    /api/specialists                    - List all specialists
GET    /api/specialists/:id                - Get specific specialist
GET    /api/specialists/specialty/:name    - Filter by specialty
GET    /api/specialists/specialties/all    - Get specialty list

POST   /api/specialists                    - Create new specialist
PUT    /api/specialists/:id                - Update specialist
DELETE /api/specialists/:id                - Delete specialist
```

**Integration:**
- Registered in `/src/app.js` as `app.use('/api/specialists', specialistsRoutes)`
- Can be extended with authentication/authorization middleware

### View Layer

**File:** `/backend/admin/specialists.html`

Full-featured admin interface with:

**Features:**
- Responsive data table showing all specialists
- Live statistics (total specialists, unique specialties)
- Real-time search by name or description
- Filter dropdowns by specialty
- Modal-based create/edit forms
- Image preview for specialist profiles
- Contact information display (email, phone, website)
- Action buttons for edit/delete with confirmation
- Language support (English, French, Portuguese)
- Automatic i18n integration

**Data Display:**
- Image + Name (EN/FR)
- Specialty and Location
- Years of Experience
- Contact Information
- Action Buttons

**Form Fields:**
- Multilingual names (EN, FR, PT)
- Specialty selection
- Description (text area)
- Image URL
- Location
- Years of expertise
- Contact info (email, phone, website)
- Active status toggle

### Translation Support

**File:** `/public/translations.json`

Added 24 translation keys for three languages:

**English Keys:**
- `specialists`, `specialists_title`, `add_specialist`, `edit_specialist`, `delete_specialist`
- `specialist_name`, `specialty`, `location`, `expertise_years`
- `image`, `description`, `email`, `phone`, `website`
- `no_specialists`, `specialist_saved`, `specialist_deleted`
- `error_loading_specialists`, `confirm_delete_specialist`
- `total_specialists`, `total_specialties`

**French Translation:**
- Complete French equivalents for all 24 keys

**Portuguese Translation:**
- Complete Portuguese equivalents for all 24 keys

**Integration:**
- `/backend/admin/specialists.html` includes `/js/i18n.js`
- All UI text uses `data-i18n` attributes or `i18n.t()` calls
- Language selector affects specialist page immediately

## Sample Data

Five sample specialists are included for demonstration:

1. **João Silva** - Cheese Master (25 years) - Nazaré, Portugal
2. **Maria Santos** - Wine Specialist (20 years) - Porto, Portugal
3. **Carlos Oliveira** - Cured Meats Expert (30 years) - Guarda, Portugal
4. **Ana Ferreira** - Pastry Chef (22 years) - Belém, Lisbon
5. **Pedro Costa** - Seafood & Canned Goods (28 years) - Setúbal, Portugal

**Loading Sample Data:**
```bash
node add-specialists.js
```

This script uses the HTTP API to insert sample specialists into the database.

## Admin Navigation

The specialists page is integrated into the admin sidebar:
- Located in `/backend/admin/index.html`
- Accessible via `<a href="specialists.html">`
- Icon: 👨‍🏫 (teacher/expert emoji)
- Translation key: `specialists`

## API Usage Examples

### Get All Specialists
```bash
GET http://localhost:3000/api/specialists
```

Response:
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "name_en": "João Silva",
      "name_fr": "João Silva",
      "name_pt": "João Silva",
      "specialty": "Cheese Master",
      "location": "Nazaré, Portugal",
      "expertise_years": 25,
      "email": "joao@portuguese-cheese.pt",
      "active": true,
      "created_at": "2024-01-15T10:30:00Z"
    }
    // ... more specialists
  ]
}
```

### Create Specialist
```bash
POST http://localhost:3000/api/specialists
Content-Type: application/json

{
  "name_en": "New Specialist",
  "name_fr": "Nouveau Spécialiste",
  "name_pt": "Novo Especialista",
  "specialty": "Olive Oil Expert",
  "location": "Covilhã, Portugal",
  "expertise_years": 15,
  "email": "specialist@example.pt",
  "phone": "+351 912 345 678",
  "website": "https://example.pt",
  "description": "Expert in traditional Portuguese olive oil production"
}
```

### Filter by Specialty
```bash
GET http://localhost:3000/api/specialists/specialty/Cheese Master
```

### Get Unique Specialties
```bash
GET http://localhost:3000/api/specialists/specialties/all
```

Response:
```json
{
  "success": true,
  "count": 5,
  "data": [
    "Cheese Master",
    "Cured Meats Expert",
    "Pastry Chef",
    "Seafood & Canned Goods",
    "Wine Specialist"
  ]
}
```

## Frontend Integration

### Adding to Public Site

To display specialists on public pages:

```html
<div id="specialistsContainer"></div>

<script src="/js/i18n.js"></script>
<script>
async function loadSpecialists() {
  const response = await fetch('/api/specialists');
  const result = await response.json();
  
  if (result.success) {
    // Display specialists
    result.data.forEach(specialist => {
      // Render specialist card
    });
  }
}

// Load on page ready
document.addEventListener('DOMContentLoaded', loadSpecialists);
</script>
```

### Specialty Filtering

Create category-based specialist filtering:

```javascript
async function filterBySpecialty(specialty) {
  const response = await fetch(`/api/specialists/specialty/${specialty}`);
  const result = await response.json();
  // Display filtered results
}
```

## File Organization

```
src/
├── models/
│   └── Specialist.js              # Database operations
├── controllers/
│   └── SpecialistController.js    # Request handlers
├── routes/
│   └── specialists.js             # API endpoints
└── app.js                          # Route registration

backend/admin/
└── specialists.html               # Admin management interface

public/
└── translations.json              # i18n keys

add-specialists.js                 # Sample data loader
```

## Configuration

The specialists system requires no additional configuration. It uses:
- Existing database connection from `src/config/database.js`
- Existing port configuration (default: 3000)
- Existing language settings from i18n.js

## Security Considerations

**Current State:** Open API (no authentication)

**Recommended Additions:**
1. Add authentication middleware to POST/PUT/DELETE routes
2. Implement role-based access control (admin only)
3. Add rate limiting for API endpoints
4. Validate image URLs before storage
5. Implement CORS if needed for external clients

Example with middleware:
```javascript
router.post('/', isAdmin, SpecialistController.create);
router.put('/:id', isAdmin, SpecialistController.update);
router.delete('/:id', isAdmin, SpecialistController.delete);
```

## Database Relationships

**Current:** Standalone specialists table

**Potential Future Relationships:**
- Link to products (many-to-many) - associate specialists with their products
- Link to users (foreign key) - track creator/admin
- Link to categories - specialists by product category
- Link to orders - for recommendation engine

## Future Enhancements

1. **Product Association** - Link specialists to their signature products
2. **Rating System** - Allow customer ratings and reviews
3. **Public Profile Page** - Display specialist details on frontend
4. **Content Management** - Blog/testimonials section
5. **Event Calendar** - Schedule specialist appearances/tastings
6. **Media Gallery** - Multiple images per specialist
7. **Social Links** - Added social media integration
8. **Availability System** - Booking/appointment scheduling

## Troubleshooting

### Specialists page shows "No Specialists Found"
- Check if sample data was loaded: `node add-specialists.js`
- Verify API is responding: `GET /api/specialists`
- Check admin interface console for errors

### Translation keys not working
- Ensure `i18n.js` is included before specialists.html script
- Check that translation keys exist in `translations.json`
- Verify language selector is working

### API returns 500 error
- Check server console logs with `[SpecialistController.*]` prefix
- Verify database table exists (check during server startup)
- Check request body format matches expected structure

## Testing

### Manual API Testing

```bash
# List all specialists
curl http://localhost:3000/api/specialists

# Get by ID
curl http://localhost:3000/api/specialists/1

# Create specialist
curl -X POST http://localhost:3000/api/specialists \
  -H "Content-Type: application/json" \
  -d '{
    "name_en": "Test Specialist",
    "specialty": "Test Specialty",
    "location": "Test Location"
  }'

# Update specialist
curl -X PUT http://localhost:3000/api/specialists/1 \
  -H "Content-Type: application/json" \
  -d '{"location": "New Location"}'

# Delete specialist
curl -X DELETE http://localhost:3000/api/specialists/1
```

## Conclusion

The Portuguese Food Specialists system provides a complete, production-ready implementation for managing expert profiles with multilingual support, responsive admin interface, and RESTful API endpoints.
