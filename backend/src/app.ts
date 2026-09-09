import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { AppError } from './errors/AppError';

// Import route modules
import authRoutes from './modules/auth/auth.routes';
import productsRoutes from './modules/products/products.routes';
import challansRoutes from './modules/challans/challans.routes';
import customersRoutes from './modules/customers/customers.routes';
import usersRoutes from './modules/users/users.routes';

const app = express();

// Security & Parsing Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, postman) or matching client URL
      if (!origin || ENV.NODE_ENV === 'development' || origin === ENV.CLIENT_URL) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'Mini ERP+CRM API',
  });
});

// API Routes (Tier 1 & Tier 2)
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/challans', challansRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/users', usersRoutes);

// Fallback for unmatched routes
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(AppError.notFound(`Cannot find ${req.method} ${req.originalUrl} on this server`));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
