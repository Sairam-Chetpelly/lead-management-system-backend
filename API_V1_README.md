# API V1 Structure

## Overview
New versioned API structure with standardized response format and optimized architecture.

## Response Format

### Success Response
```json
{
  "status": "success",
  "data": {},
  "message": "Successfully logged in"
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error message",
  "errors": [] // Optional validation errors
}
```

## Architecture

```
backend/
├── controllers/v1/     # Request handlers
├── services/v1/        # Business logic
├── validations/v1/     # Input validation rules
├── routes/v1/          # Route definitions
└── utils/
    └── response.js     # Standardized response utility
```

## Available Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password

### Users
- `GET /api/v1/users` - Get all users (with filters)
- `GET /api/v1/users/:id` - Get user by ID
- `POST /api/v1/users` - Create new user
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user (soft delete)

## Adding New Endpoints

### 1. Create Service (services/v1/yourService.js)
```javascript
class YourService {
  async yourMethod(params) {
    // Business logic here
    return data;
  }
}
module.exports = new YourService();
```

### 2. Create Validation (validations/v1/yourValidation.js)
```javascript
const { body } = require('express-validator');

const yourValidation = [
  body('field').notEmpty().withMessage('Field is required')
];

module.exports = { yourValidation };
```

### 3. Create Controller (controllers/v1/yourController.js)
```javascript
const { validationResult } = require('express-validator');
const yourService = require('../../services/v1/yourService');
const { successResponse, errorResponse } = require('../../utils/response');

class YourController {
  async yourMethod(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const result = await yourService.yourMethod(req.body);
      return successResponse(res, result, 'Success message', 200);
    } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 500);
    }
  }
}

module.exports = new YourController();
```

### 4. Create Routes (routes/v1/yourRoutes.js)
```javascript
const express = require('express');
const router = express.Router();
const yourController = require('../../controllers/v1/yourController');
const { yourValidation } = require('../../validations/v1/yourValidation');
const auth = require('../../middleware/auth');

router.post('/', auth, yourValidation, yourController.yourMethod.bind(yourController));

module.exports = router;
```

### 5. Register in routes/v1/index.js
```javascript
const yourRoutes = require('./yourRoutes');
router.use('/your-path', yourRoutes);
```

## Key Features

- **Separation of Concerns**: Controllers, Services, Validations separated
- **Standardized Responses**: Consistent response format across all endpoints
- **Validation**: Express-validator for input validation
- **Error Handling**: Centralized error handling with proper status codes
- **Authentication**: JWT-based auth middleware
- **Backward Compatible**: Old APIs remain unchanged

## Testing

```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"email":"admin@lms.com","password":"admin123"}'

# Get Users
curl -X GET http://localhost:5000/api/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-api-key: your-api-key"
```

## Notes

- All v1 APIs are prefixed with `/api/v1`
- Old APIs (`/api/*`) remain unchanged
- API key authentication still required
- JWT token required for protected routes
