"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePagination = exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data, statusCode = 200, pagination) => {
    const response = {
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
exports.sendSuccess = sendSuccess;
const sendError = (res, error, statusCode = 400) => {
    res.status(statusCode).json({
        success: false,
        error,
    });
};
exports.sendError = sendError;
const parsePagination = (query) => {
    const page = Math.max(1, parseInt(String(query.page || 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || 20))));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};
exports.parsePagination = parsePagination;
//# sourceMappingURL=pagination.js.map