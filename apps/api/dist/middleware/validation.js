"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemas = exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
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
exports.validate = validate;
// Common validation schemas
exports.schemas = {
    register: zod_1.z.object({
        body: zod_1.z.object({
            email: zod_1.z.string().email(),
            password: zod_1.z.string().min(8).max(100),
            firstName: zod_1.z.string().min(1).max(50),
            lastName: zod_1.z.string().min(1).max(50),
            workspaceName: zod_1.z.string().min(1).max(100).optional(),
            ref: zod_1.z.string().optional(),
        }),
    }),
    login: zod_1.z.object({
        body: zod_1.z.object({
            email: zod_1.z.string().email(),
            password: zod_1.z.string(),
        }),
    }),
    createAutomation: zod_1.z.object({
        body: zod_1.z.object({
            instagramAccountId: zod_1.z.string().min(1),
            name: zod_1.z.string().min(1).max(100),
            description: zod_1.z.string().max(500).optional(),
            trigger: zod_1.z.object({
                type: zod_1.z.string(),
                config: zod_1.z.record(zod_1.z.unknown()),
            }),
            flowData: zod_1.z.object({
                nodes: zod_1.z.array(zod_1.z.unknown()),
                edges: zod_1.z.array(zod_1.z.unknown()),
            }),
        }),
    }),
    pagination: zod_1.z.object({
        query: zod_1.z.object({
            page: zod_1.z.coerce.number().min(1).default(1),
            limit: zod_1.z.coerce.number().min(1).max(100).default(20),
            sort: zod_1.z.string().optional(),
            order: zod_1.z.enum(['asc', 'desc']).optional(),
        }),
    }),
};
//# sourceMappingURL=validation.js.map