export const envConfig = {
  // Database Configuration
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'cakramerp',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },

  // JWT Configuration
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'a8f5c2e1d9b7f3a6c4e2d0f8b6a4c2e0d8f6b4a2c0e8d6f4b2a0qe8w6r4y2u0i8o6p4',
    expiresIn: process.env.JWT_EXPIRATION || '7d',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'z9x7c5v3b1n9m7k5j3h1g9f7d5s3a1p9o7i5u3y1t9r7e5w3q1m0n8b6v4c2x0',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '30d',
  },

  // Server Configuration
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // CORS Configuration
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
