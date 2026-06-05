export const envConfig = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'cakramerp',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
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
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  redis: {
    url: process.env.REDIS_URL || undefined,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    ttl: parseInt(process.env.CACHE_TTL || '300', 10),
  },
  otel: {
    enabled: process.env.OTEL_ENABLED === 'true',
    exporterEndpoint:
      process.env.OTEL_EXPORTER_ENDPOINT || 'http://localhost:4318/v1/traces',
    serviceName: process.env.OTEL_SERVICE_NAME || 'cakramerp-service',
  },
};
