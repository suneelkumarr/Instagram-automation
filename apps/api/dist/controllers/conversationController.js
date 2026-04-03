"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = exports.reopenConversation = exports.closeConversation = exports.updateConversation = exports.getConversation = exports.listConversations = void 0;
const index_js_1 = require("../models/index.js");
const pagination_js_1 = require("../utils/pagination.js");
const listConversations = async (req, res) => {
    try {
        const workspaceId = req.workspace?._id.toString();
        const { page, limit, skip } = (0, pagination_js_1.parsePagination)(req.query);
        const { status, priority, assignedTo, instagramAccountId, sort = 'lastMessageAt', order = 'desc' } = req.query;
        const filter = { workspaceId };
        if (status)
            filter.status = status;
        if (priority)
            filter.priority = priority;
        if (assignedTo)
            filter.assignedTo = assignedTo;
        if (instagramAccountId)
            filter.instagramAccountId = instagramAccountId;
        const [conversations, total] = await Promise.all([
            index_js_1.Conversation.find(filter)
                .populate('contactId', 'username displayName profilePicture leadScore tags')
                .populate('assignedTo', 'firstName lastName email')
                .sort({ [sort]: order === 'desc' ? -1 : 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            index_js_1.Conversation.countDocuments(filter),
        ]);
        (0, pagination_js_1.sendSuccess)(res, conversations, 200, { page, limit, total });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to list conversations');
    }
};
exports.listConversations = listConversations;
const getConversation = async (req, res) => {
    try {
        const conversation = await index_js_1.Conversation.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        })
            .populate('contactId', 'username displayName profilePicture leadScore tags customFields')
            .populate('assignedTo', 'firstName lastName email avatar');
        if (!conversation) {
            (0, pagination_js_1.sendError)(res, 'Conversation not found', 404);
            return;
        }
        // Get messages
        const messages = await index_js_1.Message.find({ conversationId: conversation._id })
            .sort({ createdAt: 1 })
            .limit(100)
            .lean();
        (0, pagination_js_1.sendSuccess)(res, { conversation, messages });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to get conversation');
    }
};
exports.getConversation = getConversation;
const updateConversation = async (req, res) => {
    try {
        const { status, priority, tags, assignedTo, sentiment } = req.body;
        const update = {};
        if (status)
            update.status = status;
        if (priority)
            update.priority = priority;
        if (tags)
            update.tags = tags;
        if (assignedTo !== undefined)
            update.assignedTo = assignedTo;
        if (sentiment)
            update.sentiment = sentiment;
        const conversation = await index_js_1.Conversation.findOneAndUpdate({ _id: req.params.id, workspaceId: req.workspace?._id }, update, { new: true });
        if (!conversation) {
            (0, pagination_js_1.sendError)(res, 'Conversation not found', 404);
            return;
        }
        (0, pagination_js_1.sendSuccess)(res, conversation);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to update conversation');
    }
};
exports.updateConversation = updateConversation;
const closeConversation = async (req, res) => {
    try {
        const conversation = await index_js_1.Conversation.findOneAndUpdate({ _id: req.params.id, workspaceId: req.workspace?._id }, { status: 'closed', lastMessageAt: new Date() }, { new: true });
        if (!conversation) {
            (0, pagination_js_1.sendError)(res, 'Conversation not found', 404);
            return;
        }
        (0, pagination_js_1.sendSuccess)(res, conversation);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to close conversation');
    }
};
exports.closeConversation = closeConversation;
const reopenConversation = async (req, res) => {
    try {
        const conversation = await index_js_1.Conversation.findOneAndUpdate({ _id: req.params.id, workspaceId: req.workspace?._id }, { status: 'open' }, { new: true });
        if (!conversation) {
            (0, pagination_js_1.sendError)(res, 'Conversation not found', 404);
            return;
        }
        (0, pagination_js_1.sendSuccess)(res, conversation);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to reopen conversation');
    }
};
exports.reopenConversation = reopenConversation;
const sendMessage = async (req, res) => {
    try {
        const { recipientId, text, mediaUrl, quickReplies } = req.body;
        const conversation = await index_js_1.Conversation.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        }).populate('instagramAccountId');
        if (!conversation) {
            (0, pagination_js_1.sendError)(res, 'Conversation not found', 404);
            return;
        }
        const { addDMJob } = await import('../services/queueService.js');
        const job = await addDMJob({
            workspaceId: req.workspace?._id.toString() || '',
            instagramAccountId: conversation.instagramAccountId._id.toString(),
            contactId: conversation.contactId.toString(),
            conversationId: conversation._id.toString(),
            recipientId,
            message: { text, mediaUrl, quickReplies },
        });
        (0, pagination_js_1.sendSuccess)(res, { queued: true, jobId: job });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to send message');
    }
};
exports.sendMessage = sendMessage;
//# sourceMappingURL=conversationController.js.map