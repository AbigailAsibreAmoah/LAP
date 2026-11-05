import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { demoSession, errorHandler, notFoundHandler } from './middleware';
import { dayRollover } from './middleware/dayRollover';
import { api } from './routes';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', dayRollover, demoSession, api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
