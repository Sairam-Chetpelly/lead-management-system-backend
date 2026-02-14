# Swagger/OpenAPI Documentation

## Overview

This directory contains OpenAPI 3.0 specification files for the LMS API, organized by functional area.

## Files

- **openapi.yaml** - Main specification file with server config and references
- **auth.yaml** - Authentication endpoints
- **admin.yaml** - Admin management endpoints
- **leads.yaml** - Lead management endpoints
- **users.yaml** - User management endpoints
- **dashboard.yaml** - Dashboard and analytics endpoints
- **additional.yaml** - Supporting APIs (call logs, documents, etc.)

## Viewing Documentation

### Option 1: Swagger UI (Online)
1. Go to [Swagger Editor](https://editor.swagger.io/)
2. Copy content from `openapi.yaml`
3. Paste into editor

### Option 2: Swagger UI (Local)
```bash
# Install swagger-ui-express
npm install swagger-ui-express yamljs

# Add to server.js
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./swagger/openapi.yaml');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```

Access at: `http://localhost:5000/api-docs`

### Option 3: Redoc
```bash
npm install redoc-express

# Add to server.js
const redoc = require('redoc-express');
app.use('/docs', redoc({
  specUrl: '/swagger/openapi.yaml',
  title: 'LMS API Documentation'
}));
```

### Option 4: VS Code Extension
1. Install "OpenAPI (Swagger) Editor" extension
2. Open any `.yaml` file
3. Right-click → "Preview Swagger"

## Testing APIs

### Using Swagger UI
1. Click "Authorize" button
2. Enter JWT token: `Bearer <your-token>`
3. Enter API key: `lms-secure-api-key-2024`
4. Try out endpoints directly

### Using Postman
1. Import OpenAPI spec: File → Import → Select `openapi.yaml`
2. Set environment variables:
   - `baseUrl`: `http://localhost:5000/api`
   - `token`: Your JWT token
   - `apiKey`: `lms-secure-api-key-2024`

### Using cURL
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "x-api-key: lms-secure-api-key-2024" \
  -d '{"email":"admin@lms.com","password":"admin123"}'

# Get leads
curl -X GET http://localhost:5000/api/leads \
  -H "Authorization: Bearer <token>" \
  -H "x-api-key: lms-secure-api-key-2024"
```

## Generating Client SDKs

### JavaScript/TypeScript
```bash
npx @openapitools/openapi-generator-cli generate \
  -i swagger/openapi.yaml \
  -g typescript-axios \
  -o ./client
```

### Python
```bash
openapi-generator-cli generate \
  -i swagger/openapi.yaml \
  -g python \
  -o ./python-client
```

### Java
```bash
openapi-generator-cli generate \
  -i swagger/openapi.yaml \
  -g java \
  -o ./java-client
```

## Validation

### Validate Spec
```bash
# Using Swagger CLI
npm install -g @apidevtools/swagger-cli
swagger-cli validate swagger/openapi.yaml

# Using OpenAPI Generator
openapi-generator-cli validate -i swagger/openapi.yaml
```

## Updating Documentation

1. Edit relevant `.yaml` file
2. Validate changes
3. Test endpoints
4. Commit changes

## Notes

- All endpoints require authentication except webhooks
- Use `security: []` to mark public endpoints
- File uploads use `multipart/form-data`
- Date format: `YYYY-MM-DD`
- DateTime format: ISO 8601

## Support

For issues or questions about API documentation, contact the development team.
