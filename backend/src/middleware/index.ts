import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { ContentError, DEMO_LEARNER_ID, PresenceError, type Role } from '@laporte/shared';
import { MulterError } from 'multer';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError } from '../utils/errors';

declare module 'express-serve-static-core' {
  interface Request {
    demoUser: { id: string; role: Role };
  }
}

/**
 * DEMO SESSION — NOT AUTHENTICATION.
 * Trusts the `x-demo-user` header so the prototype can switch roles.
 * Replace with real session/token verification before any production use.
 */
export const demoSession: RequestHandler = (req, _res, next) => {
  const id = req.header('x-demo-user') ?? DEMO_LEARNER_ID;
  const role: Role = id.startsWith('tut-') ? 'instructor' : id.startsWith('adm-') ? 'admin' : 'learner';
  req.demoUser = { id, role };
  next();
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!roles.includes(req.demoUser.role)) {
      return next(new AppError(403, 'forbidden', `This action requires the ${roles.join(' or ')} role.`));
    }
    next();
  };

export const validateBody =
  (schema: ZodTypeAny): RequestHandler =>
  (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };

export const validateQuery =
  (schema: ZodTypeAny): RequestHandler =>
  (req, _res, next) => {
    schema.parse(req.query);
    next();
  };

/** Wraps async handlers so rejected promises reach the error handler. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: `No route for ${req.method} ${req.path}` } });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: { code: 'validation_failed', message: 'Request is invalid.', details: err.flatten() } });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err instanceof ContentError || err instanceof PresenceError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err instanceof MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 400).json({ error: { code: tooBig ? 'file_too_large' : 'upload_failed', message: tooBig ? 'That file is too large.' : err.message } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'internal', message: 'Something went wrong.' } });
};
