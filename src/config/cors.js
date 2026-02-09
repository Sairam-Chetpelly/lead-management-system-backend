const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'https://crm.reminiscent.in'],
  credentials: true
};

module.exports = corsOptions;
