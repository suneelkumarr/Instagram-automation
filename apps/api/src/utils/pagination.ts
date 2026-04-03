import { Response } from 'express';
import { APIResponse } from '@rsushop/shared';

export interface PaginationOptions {
  page: number;
  limit: number;
  total: number;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  pagination?: PaginationOptions
): void => {
  const response: APIResponse<T> = {
    success: true,
    data,
  };

  if (pagination) {
    response.pagination = {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    };
  }

  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  error: string,
  statusCode = 400
): void => {
  res.status(statusCode).json({
    success: false,
    error,
  });
};

export const parsePagination = (query: {
  page?: string | number;
  limit?: string | number;
}): { page: number; limit: number; skip: number } => {
  const page = Math.max(1, parseInt(String(query.page || 1)));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || 20))));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};
