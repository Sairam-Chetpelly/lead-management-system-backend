# Quick Start Guide - Modular Backend

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB v6+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Seed database
npm run seed

# Start development server
npm run dev
```

## 📁 Project Structure Overview

```
src/
├── config/          # App configuration
├── middlewares/     # Express middleware
├── modules/         # Feature modules (controllers)
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Helper functions
├── validations/     # Input validation
├── app.js           # Express app
└── server.js        # Entry point
```

## 🎯 Creating a New Feature

### 1. Create Module Directory

```bash
mkdir -p src/modules/product
```

### 2. Create Controller

```javascript
// src/modules/product/product.controller.js
const Product = require('../../models/Product');

class ProductController {
  async getAll(req, res) {
    try {
      const products = await Product.find();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      const product = new Product(req.body);
      await product.save();
      res.status(201).json(product);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ProductController();
```

### 3. Create Routes

```javascript
// src/routes/product.routes.js
const express = require('express');
const productController = require('../modules/product/product.controller');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticateToken, productController.getAll);
router.post('/', authenticateToken, productController.create);

module.exports = router;
```

### 4. Create Validation (Optional)

```javascript
// src/validations/product.validation.js
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateProduct = [
  body('name').notEmpty().withMessage('Name is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  validate
];

module.exports = { validateProduct };
```

### 5. Register Routes

```javascript
// src/app.js
const productRoutes = require('./routes/product.routes');

// Add this line with other routes
app.use('/api/products', productRoutes);
```

## 🔧 Common Tasks

### Adding Middleware

```javascript
// src/middlewares/logger.js
const logger = (req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
};

module.exports = logger;

// Use in app.js
const logger = require('./middlewares/logger');
app.use(logger);
```

### Creating a Service

```javascript
// src/services/notificationService.js
const sendNotification = async (userId, message) => {
  // Notification logic
};

module.exports = { sendNotification };

// Use in controller
const { sendNotification } = require('../../services/notificationService');
```

### Adding Configuration

```javascript
// src/config/payment.js
const paymentConfig = {
  apiKey: process.env.PAYMENT_API_KEY,
  apiSecret: process.env.PAYMENT_API_SECRET
};

module.exports = paymentConfig;
```

## 📝 Code Style

### Controller Pattern

```javascript
class FeatureController {
  async methodName(req, res) {
    try {
      // Logic here
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new FeatureController();
```

### Route Pattern

```javascript
const express = require('express');
const controller = require('../modules/feature/feature.controller');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../validations/feature.validation');

const router = express.Router();

router.get('/', authenticate, controller.getAll);
router.post('/', authenticate, validate, controller.create);

module.exports = router;
```

### Service Pattern

```javascript
const helperFunction = async (param) => {
  // Business logic
  return result;
};

module.exports = { helperFunction };
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run specific test
npm test -- product.test.js
```

## 📚 API Documentation

### Authentication

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Protected Routes

```bash
GET /api/users
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
```

## 🐛 Debugging

### Enable Debug Logs

```bash
DEBUG=* npm run dev
```

### Check Database Connection

```javascript
// In any file
const mongoose = require('mongoose');
console.log('DB Status:', mongoose.connection.readyState);
// 0 = disconnected, 1 = connected
```

## 🔒 Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/lms

# Security
JWT_SECRET=your-secret-key
API_KEY=your-api-key

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-password

# Frontend
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
```

## 📦 Dependencies

### Core
- express - Web framework
- mongoose - MongoDB ODM
- jsonwebtoken - JWT authentication
- bcryptjs - Password hashing

### Middleware
- cors - CORS handling
- express-rate-limit - Rate limiting
- express-validator - Input validation

### Utilities
- dotenv - Environment variables
- nodemailer - Email sending
- multer - File uploads

## 🚨 Common Errors

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9
```

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod
```

### Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📖 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [JWT Documentation](https://jwt.io/)
- [Express Validator](https://express-validator.github.io/)

## 💡 Tips

1. **Use async/await** instead of callbacks
2. **Always handle errors** in try-catch blocks
3. **Validate input** before processing
4. **Use environment variables** for sensitive data
5. **Keep controllers thin** - move logic to services
6. **Write meaningful commit messages**
7. **Test your endpoints** before committing

## 🤝 Contributing

1. Create a feature branch
2. Follow the module structure
3. Add validation for inputs
4. Handle errors properly
5. Test your changes
6. Submit a pull request

## 📞 Support

For questions or issues:
- Check the documentation
- Review existing code examples
- Ask the team

---

Happy coding! 🎉
