import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
export declare const validate: (schema: z.ZodSchema) => (req: Request, res: Response, next: NextFunction) => void;
export declare const schemas: {
    register: z.ZodObject<{
        body: z.ZodObject<{
            email: z.ZodString;
            password: z.ZodString;
            firstName: z.ZodString;
            lastName: z.ZodString;
            workspaceName: z.ZodOptional<z.ZodString>;
            ref: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            email: string;
            firstName: string;
            lastName: string;
            password: string;
            ref?: string | undefined;
            workspaceName?: string | undefined;
        }, {
            email: string;
            firstName: string;
            lastName: string;
            password: string;
            ref?: string | undefined;
            workspaceName?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            email: string;
            firstName: string;
            lastName: string;
            password: string;
            ref?: string | undefined;
            workspaceName?: string | undefined;
        };
    }, {
        body: {
            email: string;
            firstName: string;
            lastName: string;
            password: string;
            ref?: string | undefined;
            workspaceName?: string | undefined;
        };
    }>;
    login: z.ZodObject<{
        body: z.ZodObject<{
            email: z.ZodString;
            password: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            email: string;
            password: string;
        }, {
            email: string;
            password: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            email: string;
            password: string;
        };
    }, {
        body: {
            email: string;
            password: string;
        };
    }>;
    createAutomation: z.ZodObject<{
        body: z.ZodObject<{
            instagramAccountId: z.ZodString;
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            trigger: z.ZodObject<{
                type: z.ZodString;
                config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
            }, "strip", z.ZodTypeAny, {
                type: string;
                config: Record<string, unknown>;
            }, {
                type: string;
                config: Record<string, unknown>;
            }>;
            flowData: z.ZodObject<{
                nodes: z.ZodArray<z.ZodUnknown, "many">;
                edges: z.ZodArray<z.ZodUnknown, "many">;
            }, "strip", z.ZodTypeAny, {
                nodes: unknown[];
                edges: unknown[];
            }, {
                nodes: unknown[];
                edges: unknown[];
            }>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            trigger: {
                type: string;
                config: Record<string, unknown>;
            };
            instagramAccountId: string;
            flowData: {
                nodes: unknown[];
                edges: unknown[];
            };
            description?: string | undefined;
        }, {
            name: string;
            trigger: {
                type: string;
                config: Record<string, unknown>;
            };
            instagramAccountId: string;
            flowData: {
                nodes: unknown[];
                edges: unknown[];
            };
            description?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        body: {
            name: string;
            trigger: {
                type: string;
                config: Record<string, unknown>;
            };
            instagramAccountId: string;
            flowData: {
                nodes: unknown[];
                edges: unknown[];
            };
            description?: string | undefined;
        };
    }, {
        body: {
            name: string;
            trigger: {
                type: string;
                config: Record<string, unknown>;
            };
            instagramAccountId: string;
            flowData: {
                nodes: unknown[];
                edges: unknown[];
            };
            description?: string | undefined;
        };
    }>;
    pagination: z.ZodObject<{
        query: z.ZodObject<{
            page: z.ZodDefault<z.ZodNumber>;
            limit: z.ZodDefault<z.ZodNumber>;
            sort: z.ZodOptional<z.ZodString>;
            order: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
        }, "strip", z.ZodTypeAny, {
            limit: number;
            page: number;
            sort?: string | undefined;
            order?: "asc" | "desc" | undefined;
        }, {
            sort?: string | undefined;
            limit?: number | undefined;
            page?: number | undefined;
            order?: "asc" | "desc" | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        query: {
            limit: number;
            page: number;
            sort?: string | undefined;
            order?: "asc" | "desc" | undefined;
        };
    }, {
        query: {
            sort?: string | undefined;
            limit?: number | undefined;
            page?: number | undefined;
            order?: "asc" | "desc" | undefined;
        };
    }>;
};
//# sourceMappingURL=validation.d.ts.map