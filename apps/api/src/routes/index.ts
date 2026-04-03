import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import * as automationController from '../controllers/automationController.js';
import * as contactController from '../controllers/contactController.js';
import * as conversationController from '../controllers/conversationController.js';
import * as instagramController from '../controllers/instagramController.js';
import * as analyticsController from '../controllers/analyticsController.js';
import * as billingController from '../controllers/billingController.js';
import * as aiController from '../controllers/aiController.js';
import { authenticate, requireWorkspace, requireMember } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== AUTH ROUTES ====================
router.post('/auth/register', validate(schemas.register), authController.register);
router.post('/auth/login', validate(schemas.login), authController.login);
router.post('/auth/refresh', authController.refreshToken);
router.get('/auth/me', authenticate, authController.getMe);
router.patch('/auth/me', authenticate, authController.updateMe);

// ==================== INSTAGRAM WEBHOOK ====================
// NOTE: The POST webhook handler with raw body is in apps/api/src/index.ts
// The GET verification handler is here (it doesn't need raw body):
router.get('/webhooks/instagram/:accountId', instagramController.handleWebhookVerification);

// ==================== PROTECTED ROUTES ====================
router.use(authenticate);
router.use(requireWorkspace);

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
router.post('/automations', validate(schemas.createAutomation), automationController.createAutomation);
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

export default router;
