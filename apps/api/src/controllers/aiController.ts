import { Request, Response } from 'express';
import { aiService } from '../services/aiAgentService.js';
import { Contact, Conversation, Message } from '../models/index.js';
import { sendSuccess, sendError } from '../utils/pagination.js';
import { addAIJob } from '../services/queueService.js';

export const generateReply = async (req: Request, res: Response): Promise<void> => {
  try {
    const { contactId, conversationId, message, brandName, niche, customPrompt } = req.body;
    const workspaceId = req.workspace?._id.toString();

    // Get contact and conversation data (optional for testing)
    const contact = contactId
      ? await Contact.findOne({ _id: contactId, workspaceId })
      : null;
    const conversation = conversationId
      ? await Conversation.findOne({ _id: conversationId, workspaceId })
      : null;

    // Get recent message history
    const recentMessages = contact?._id || conversation?.contactId
      ? await Message.find({
          contactId: contact?._id || conversation?.contactId,
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
      : [];

    const history = recentMessages.reverse().map((m) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.content || '',
    }));

    // Generate AI response
    const response = await aiService.generateResponse({
      workspaceId: workspaceId || '',
      contact: contact || {} as Partial<Contact>,
      conversation: conversation || {} as Partial<Conversation>,
      message,
      brandName: brandName || 'RsuShop',
      niche: niche || 'default',
      customPrompt,
      conversationHistory: history,
    });

    // Consume AI credit
    const workspace = req.workspace;
    if (workspace) {
      await workspace.incrementUsage('aiCredits');
    }

    sendSuccess(res, response);
  } catch (error) {
    const err = error as Error;
    console.error('AI generate error:', err.message, err.stack);
    sendError(res, `Failed to generate response: ${err.message}`);
  }
};

export const queueAIResponse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { contactId, conversationId, message, brandName, niche, customPrompt } = req.body;
    const workspaceId = req.workspace?._id.toString();

    const contact = await Contact.findOne({ _id: contactId, workspaceId });
    const conversation = conversationId
      ? await Conversation.findOne({ _id: conversationId, workspaceId })
      : null;

    // Get recent messages for context
    const recentMessages = await Message.find({
      contactId: contact?._id || conversation?.contactId,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const history = recentMessages.reverse().map((m) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.content || '',
    }));

    const instagramAccountId = conversation?.instagramAccountId?.toString() || contact?.instagramAccountId?.toString();
    if (!instagramAccountId) {
      sendError(res, 'No Instagram account associated with this contact/conversation', 400);
      return;
    }

    const jobId = await addAIJob({
      workspaceId: workspaceId || '',
      instagramAccountId,
      contactId: contact?._id?.toString() || '',
      conversationId: conversation?._id?.toString() || '',
      message,
      brandName: brandName || 'RsuShop',
      niche: niche || 'default',
      customPrompt,
      conversationHistory: history,
    });

    sendSuccess(res, { queued: true, jobId });
  } catch (error) {
    sendError(res, 'Failed to queue AI response');
  }
};

export const testPrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, testMessage } = req.body;

    const response = await aiService.testPrompt(prompt, testMessage);
    sendSuccess(res, { response });
  } catch (error) {
    sendError(res, 'Failed to test prompt');
  }
};

export const getTemplates = async (req: Request, res: Response): Promise<void> => {
  const templates = aiService.getNicheTemplates();
  sendSuccess(res, templates);
};

export const conversationPreview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { contactId, conversationId, brandName, niche, customPrompt } = req.body;

    const contact = await Contact.findOne({
      _id: contactId,
      workspaceId: req.workspace?._id,
    });

    const conversation = conversationId
      ? await Conversation.findOne({
          _id: conversationId,
          workspaceId: req.workspace?._id,
        })
      : null;

    // Build sample conversation
    const preview = {
      contact: {
        username: contact?.username || 'sample_user',
        displayName: contact?.displayName || 'Sample User',
        leadScore: contact?.leadScore || 0,
        conversationStage: contact?.conversationStage || 'aware',
        tags: contact?.tags || [],
      },
      messages: [
        { role: 'user', content: 'Hi! I saw your fitness program. Is it for beginners?' },
        { role: 'assistant', content: 'Hey there! 👋 Thanks for reaching out. Our program is absolutely perfect for beginners! We start with the fundamentals and build up progressively. What\'s your main fitness goal?' },
        { role: 'user', content: 'I want to lose belly fat and get more energy' },
      ],
      suggestedResponse: 'That\'s awesome! Losing belly fat while boosting energy is totally achievable. Most of our beginners see noticeable energy improvements within 2 weeks. Can I ask - do you have any experience with working out, or would this be completely new for you? And what\'s your typical schedule like for fitting in workouts?',
    };

    sendSuccess(res, preview);
  } catch (error) {
    sendError(res, 'Failed to generate preview');
  }
};
