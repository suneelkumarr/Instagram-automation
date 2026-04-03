import { Request, Response } from 'express';
import { Conversation, Message, Contact } from '../models/index.js';
import { sendSuccess, sendError, parsePagination } from '../utils/pagination.js';

export const listConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace?._id.toString();
    const { page, limit, skip } = parsePagination(req.query as Record<string, string>);

    const { status, priority, assignedTo, instagramAccountId, sort = 'lastMessageAt', order = 'desc' } = req.query;

    const filter: Record<string, unknown> = { workspaceId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (instagramAccountId) filter.instagramAccountId = instagramAccountId;

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .populate('contactId', 'username displayName profilePicture leadScore tags')
        .populate('assignedTo', 'firstName lastName email')
        .sort({ [sort]: order === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    sendSuccess(res, conversations, 200, { page, limit, total });
  } catch (error) {
    sendError(res, 'Failed to list conversations');
  }
};

export const getConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    })
      .populate('contactId', 'username displayName profilePicture leadScore tags customFields')
      .populate('assignedTo', 'firstName lastName email avatar');

    if (!conversation) {
      sendError(res, 'Conversation not found', 404);
      return;
    }

    // Get messages
    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    sendSuccess(res, { conversation, messages });
  } catch (error) {
    sendError(res, 'Failed to get conversation');
  }
};

export const updateConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, priority, tags, assignedTo, sentiment } = req.body;

    const update: Record<string, unknown> = {};
    if (status) update.status = status;
    if (priority) update.priority = priority;
    if (tags) update.tags = tags;
    if (assignedTo !== undefined) update.assignedTo = assignedTo;
    if (sentiment) update.sentiment = sentiment;

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.workspace?._id },
      update,
      { new: true }
    );

    if (!conversation) {
      sendError(res, 'Conversation not found', 404);
      return;
    }

    sendSuccess(res, conversation);
  } catch (error) {
    sendError(res, 'Failed to update conversation');
  }
};

export const closeConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.workspace?._id },
      { status: 'closed', lastMessageAt: new Date() },
      { new: true }
    );

    if (!conversation) {
      sendError(res, 'Conversation not found', 404);
      return;
    }

    sendSuccess(res, conversation);
  } catch (error) {
    sendError(res, 'Failed to close conversation');
  }
};

export const reopenConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.workspace?._id },
      { status: 'open' },
      { new: true }
    );

    if (!conversation) {
      sendError(res, 'Conversation not found', 404);
      return;
    }

    sendSuccess(res, conversation);
  } catch (error) {
    sendError(res, 'Failed to reopen conversation');
  }
};

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipientId, text, mediaUrl, quickReplies } = req.body;

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    }).populate('instagramAccountId');

    if (!conversation) {
      sendError(res, 'Conversation not found', 404);
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

    sendSuccess(res, { queued: true, jobId: job });
  } catch (error) {
    sendError(res, 'Failed to send message');
  }
};
