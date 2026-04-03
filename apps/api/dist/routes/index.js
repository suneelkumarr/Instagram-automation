"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController = __importStar(require("../controllers/authController.js"));
const automationController = __importStar(require("../controllers/automationController.js"));
const contactController = __importStar(require("../controllers/contactController.js"));
const conversationController = __importStar(require("../controllers/conversationController.js"));
const instagramController = __importStar(require("../controllers/instagramController.js"));
const analyticsController = __importStar(require("../controllers/analyticsController.js"));
const billingController = __importStar(require("../controllers/billingController.js"));
const aiController = __importStar(require("../controllers/aiController.js"));
const auth_js_1 = require("../middleware/auth.js");
const validation_js_1 = require("../middleware/validation.js");
const router = (0, express_1.Router)();
// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ==================== AUTH ROUTES ====================
router.post('/auth/register', (0, validation_js_1.validate)(validation_js_1.schemas.register), authController.register);
router.post('/auth/login', (0, validation_js_1.validate)(validation_js_1.schemas.login), authController.login);
router.post('/auth/refresh', authController.refreshToken);
router.get('/auth/me', auth_js_1.authenticate, authController.getMe);
router.patch('/auth/me', auth_js_1.authenticate, authController.updateMe);
// ==================== INSTAGRAM WEBHOOK ====================
// NOTE: The POST webhook handler with raw body is in apps/api/src/index.ts
// The GET verification handler is here (it doesn't need raw body):
router.get('/webhooks/instagram/:accountId', instagramController.handleWebhookVerification);
// ==================== PROTECTED ROUTES ====================
router.use(auth_js_1.authenticate);
router.use(auth_js_1.requireWorkspace);
// ==================== INSTAGRAM ACCOUNTS ====================
router.get('/instagram-accounts', instagramController.listInstagramAccounts);
router.post('/instagram-accounts/connect', instagramController.connectInstagram);
router.get('/instagram-accounts/:id', instagramController.getInstagramAccount);
router.delete('/instagram-accounts/:id', instagramController.disconnectInstagram);
router.post('/instagram-accounts/:id/refresh-token', instagramController.refreshInstagramToken);
router.post('/instagram-accounts/:id/sync', instagramController.syncInstagramAccount);
router.post('/instagram-accounts/:id/webhook-test', instagramController.testWebhook);
router.post('/instagram-accounts/:id/webhook-register', instagramController.registerWebhook);
// ==================== AUTOMATIONS ====================
router.get('/automations', automationController.listAutomations);
router.post('/automations', (0, validation_js_1.validate)(validation_js_1.schemas.createAutomation), automationController.createAutomation);
router.get('/automations/:id', automationController.getAutomation);
router.patch('/automations/:id', automationController.updateAutomation);
router.delete('/automations/:id', automationController.deleteAutomation);
router.post('/automations/:id/activate', automationController.activateAutomation);
router.post('/automations/:id/pause', automationController.pauseAutomation);
router.post('/automations/:id/duplicate', automationController.duplicateAutomation);
router.post('/automations/:id/test', automationController.testAutomation);
router.get('/automations/:id/stats', automationController.getAutomationStats);
// ==================== CONTACTS ====================
router.get('/contacts', contactController.listContacts);
router.post('/contacts/import', contactController.importContacts);
router.get('/contacts/export', contactController.exportContacts);
router.get('/contacts/:id', contactController.getContact);
router.patch('/contacts/:id', contactController.updateContact);
router.delete('/contacts/:id', contactController.deleteContact);
router.post('/contacts/:id/tag', contactController.addTag);
router.delete('/contacts/:id/tag/:tag', contactController.removeTag);
router.post('/contacts/:id/lists/:listName', contactController.addToList);
router.delete('/contacts/:id/lists/:listName', contactController.removeFromList);
// ==================== CONVERSATIONS ====================
router.get('/conversations', conversationController.listConversations);
router.get('/conversations/:id', conversationController.getConversation);
router.patch('/conversations/:id', conversationController.updateConversation);
router.post('/conversations/:id/close', conversationController.closeConversation);
router.post('/conversations/:id/reopen', conversationController.reopenConversation);
router.post('/conversations/:id/messages', conversationController.sendMessage);
// ==================== AI AGENT ====================
router.post('/ai/generate-reply', aiController.generateReply);
router.post('/ai/queue-response', aiController.queueAIResponse);
router.post('/ai/test-prompt', aiController.testPrompt);
router.get('/ai/templates', aiController.getTemplates);
router.post('/ai/conversation-preview', aiController.conversationPreview);
// ==================== ANALYTICS ====================
router.get('/analytics/overview', analyticsController.getOverview);
router.get('/analytics/messages', analyticsController.getMessageAnalytics);
router.get('/analytics/automations', analyticsController.getAutomationAnalytics);
router.get('/analytics/contacts', analyticsController.getContactAnalytics);
// ==================== BILLING ====================
router.get('/billing/plans', billingController.getPlans);
router.get('/billing/current', billingController.getCurrentPlan);
router.post('/billing/subscribe', billingController.subscribe);
router.post('/billing/upgrade', billingController.upgrade);
router.post('/billing/cancel', billingController.cancelSubscription);
router.get('/billing/usage', billingController.getUsage);
router.get('/billing/portal', billingController.getBillingPortal);
exports.default = router;
//# sourceMappingURL=index.js.map