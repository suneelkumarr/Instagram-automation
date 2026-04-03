import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

// Common validation schemas
export const schemas = {
  register: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(8).max(100),
      firstName: z.string().min(1).max(50),
      lastName: z.string().min(1).max(50),
      workspaceName: z.string().min(1).max(100).optional(),
      ref: z.string().optional(),
    }),
  }),

  login: z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string(),
    }),
  }),

  createAutomation: z.object({
    body: z.object({
      instagramAccountId: z.string().min(1),
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      trigger: z.object({
        type: z.string(),
        config: z.record(z.unknown()),
      }),
      flowData: z.object({
        nodes: z.array(z.unknown()),
        edges: z.array(z.unknown()),
      }),
    }),
  }),

  pagination: z.object({
    query: z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      sort: z.string().optional(),
      order: z.enum(['asc', 'desc']).optional(),
    }),
  }),
};
