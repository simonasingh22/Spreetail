import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import groupRoutes from './routes/group.routes';
import expenseRoutes from './routes/expense.routes';
import settlementRoutes from './routes/settlement.routes';
import chatRoutes from './routes/chat.routes';

dotenv.config();

const app = express();

app.use((req, res, next) => {
  if (req.url.startsWith('/_/backend')) {
    req.url = req.url.slice('/_/backend'.length);
    if (!req.url.startsWith('/')) {
      req.url = '/' + req.url;
    }
  }
  next();
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  })
);

app.use(helmet());
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api', expenseRoutes);
app.use('/api', settlementRoutes);
app.use('/api', chatRoutes);
app.use('/api/v1', chatRoutes);

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Splitwise Clone Backend API is running'
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (status === 500) {
    console.error('Unhandled Server Error:', err);
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' ? { details: err.stack } : {})
  });
});

export default app;