import { Response } from 'express';
export interface PaginationOptions {
    page: number;
    limit: number;
    total: number;
}
export declare const sendSuccess: <T>(res: Response, data: T, statusCode?: number, pagination?: PaginationOptions) => void;
export declare const sendError: (res: Response, error: string, statusCode?: number) => void;
export declare const parsePagination: (query: {
    page?: string | number;
    limit?: string | number;
}) => {
    page: number;
    limit: number;
    skip: number;
};
//# sourceMappingURL=pagination.d.ts.map