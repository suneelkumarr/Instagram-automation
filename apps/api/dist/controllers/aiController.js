"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conversationPreview = exports.getTemplates = exports.testPrompt = exports.queueAIResponse = exports.generateReply = void 0;
const aiAgentService_js_1 = require("../services/aiAgentService.js");
const index_js_1 = require("../models/index.js");
const pagination_js_1 = require("../utils/pagination.js");
const queueService_js_1 = require("../services/queueService.js");
const generateReply = async (req, res) => {
    try {
        const { contactId, conversationId, message, brandName, niche, customPrompt } = req.body;
        const workspaceId = req.workspace?._id.toString();
        // Get contact and conversation data (optional for testing)
        const contact = contactId
            ? await index_js_1.Contact.findOne({ _id: contactId, workspaceId })
            : null;
        const conversation = conversationId
            ? await index_js_1.Conversation.findOne({ _id: conversationId, workspaceId })
            : null;
        // Get recent message history
        const recentMessages = contact?._id || conversation?.contactId
            ? await index_js_1.Message.find({
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
        const response = await aiAgentService_js_1.aiService.generateResponse({
            workspaceId: workspaceId || '',
            contact: contact || {},
            conversation: conversation || {},
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
        (0, pagination_js_1.sendSuccess)(res, response);
    }
    catch (error) {
        const err = error;
        console.error('AI generate error:', err.message, err.stack);
        (0, pagination_js_1.sendError)(res, `Failed to generate response: ${err.message}`);
    }
};
exports.generateReply = generateReply;
const queueAIResponse = async (req, res) => {
    try {
        const { contactId, conversationId, message, brandName, niche, customPrompt } = req.body;
        const workspaceId = req.workspace?._id.toString();
        const contact = await index_js_1.Contact.findOne({ _id: contactId, workspaceId });
        const conversation = conversationId
            ? await index_js_1.Conversation.findOne({ _id: conversationId, workspaceId })
            : null;
        // Get recent messages for context
        const recentMessages = await index_js_1.Message.find({
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
            (0, pagination_js_1.sendError)(res, 'No Instagram account associated with this contact/conversation', 400);
            return;
        }
        const jobId = await (0, queueService_js_1.addAIJob)({
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
        (0, pagination_js_1.sendSuccess)(res, { queued: true, jobId });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to queue AI response');
    }
};
exports.queueAIResponse = queueAIResponse;
const testPrompt = async (req, res) => {
    try {
        const { prompt, testMessage } = req.body;
        const response = await aiAgentService_js_1.aiService.testPrompt(prompt, testMessage);
        (0, pagination_js_1.sendSuccess)(res, { response });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to test prompt');
    }
};
exports.testPrompt = testPrompt;
const getTemplates = async (req, res) => {
    const templates = aiAgentService_js_1.aiService.getNicheTemplates();
    (0, pagination_js_1.sendSuccess)(res, templates);
};
exports.getTemplates = getTemplates;
const conversationPreview = async (req, res) => {
    try {
        const { contactId, conversationId, brandName, niche, customPrompt } = req.body;
        const contact = await index_js_1.Contact.findOne({
            _id: contactId,
            workspaceId: req.workspace?._id,
        });
        const conversation = conversationId
            ? await index_js_1.Conversation.findOne({
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
        (0, pagination_js_1.sendSuccess)(res, preview);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to generate preview');
    }
};
exports.conversationPreview = conversationPreview;
//# sourceMappingURL=aiController.js.map