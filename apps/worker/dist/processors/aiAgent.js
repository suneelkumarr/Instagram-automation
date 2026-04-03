"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAIWorker = void 0;
const bullmq_1 = require("bullmq");
const openai_1 = __importDefault(require("openai"));
const queues_js_1 = require("../queues/queues.js");
const connection_js_1 = __importDefault(require("../queues/connection.js"));
const index_js_1 = require("../models/index.js");
const openai = new openai_1.default({ apiKey: connection_js_1.default.openai.apiKey });
const CAPTURE_PATTERNS = {
    email: /[\w.+-]+@[\w.-]+\.\w{2,}/gi,
    phone: /(\+?\d{1,4}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
    name: /(?:my name is|i'm|i am|call me|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
};
const generateResponse = async (data) => {
    const { message, brandName, niche, customPrompt, conversationHistory = [] } = data;
    const systemPrompt = customPrompt || `You are a helpful assistant for ${brandName}.
Be friendly, helpful, and professional. Ask questions to understand needs.
Capture relevant information like name and email naturally.
Suggest products or next steps when appropriate.
Never be pushy, spammy, or make claims you can't verify.`;
    const messages = [
        { role: 'system', content: systemPrompt },
    ];
    for (const msg of conversationHistory.slice(-10)) {
        messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: 'user', content: message });
    const completion = await openai.chat.completions.create({
        model: connection_js_1.default.openai.model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
    });
    const responseText = completion.choices[0]?.message?.content?.trim() || '';
    // Extract fields
    const capturedFields = {};
    const emailMatch = message.match(CAPTURE_PATTERNS.email);
    if (emailMatch)
        capturedFields.email = emailMatch[0].toLowerCase();
    const nameMatch = message.match(CAPTURE_PATTERNS.name);
    if (nameMatch)
        capturedFields.name = nameMatch[1];
    // Detect escalation
    const lowerResponse = responseText.toLowerCase();
    const escalateKeywords = ['speak to', 'talk to', 'human', 'real person', 'manager', 'cancel', 'refund'];
    const escalate = escalateKeywords.some(kw => lowerResponse.includes(kw));
    return { text: responseText, capturedFields, escalate };
};
const createAIWorker = () => {
    const worker = new bullmq_1.Worker(queues_js_1.QUEUE_NAMES.AI_AGENT, async (job) => {
        const startTime = Date.now();
        // Check AI credits
        const workspace = await index_js_1.Workspace.findById(job.data.workspaceId);
        if (workspace) {
            if (!workspace.checkUsageLimit('aiCredits')) {
                throw new Error('AI credits exhausted');
            }
        }
        const { text, capturedFields, escalate } = await generateResponse(job.data);
        // Update contact with captured fields
        if (Object.keys(capturedFields).length > 0) {
            const updateFields = {};
            if (capturedFields.email)
                updateFields['customFields.email'] = capturedFields.email;
            if (capturedFields.name)
                updateFields.displayName = capturedFields.name;
            await index_js_1.Contact.findByIdAndUpdate(job.data.contactId, updateFields);
        }
        // If escalation needed, mark conversation
        if (escalate && job.data.conversationId) {
            await index_js_1.Conversation.findByIdAndUpdate(job.data.conversationId, {
                status: 'pending',
                priority: 'high',
            });
        }
        // Update AI usage
        if (workspace) {
            await workspace.incrementUsage('aiCredits');
        }
        // Get contact to get recipientId (Instagram user ID)
        const contact = await index_js_1.Contact.findById(job.data.contactId);
        const recipientId = contact?.igUserId || contact?.username || '';
        // Get IG account to send response
        const { addDMJob } = await import('../queues/dmQueue.js');
        await addDMJob({
            workspaceId: job.data.workspaceId,
            instagramAccountId: job.data.instagramAccountId,
            contactId: job.data.contactId,
            conversationId: job.data.conversationId,
            recipientId,
            message: { text },
            automationId: job.data.automationId,
        }, 1);
        return {
            response: text,
            capturedFields,
            escalate,
            processingTime: Date.now() - startTime,
        };
    }, {
        connection: (0, queues_js_1.getConnection)(),
        concurrency: 20,
    });
    worker.on('completed', (job, result) => {
        console.log(`AI job ${job.id} completed in ${result.processingTime}ms`);
    });
    worker.on('failed', (job, err) => {
        console.error(`AI job ${job?.id} failed:`, err.message);
    });
    return worker;
};
exports.createAIWorker = createAIWorker;
//# sourceMappingURL=aiAgent.js.map