"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportContacts = exports.importContacts = exports.removeFromList = exports.addToList = exports.removeTag = exports.addTag = exports.deleteContact = exports.updateContact = exports.getContact = exports.listContacts = void 0;
const index_js_1 = require("../models/index.js");
const pagination_js_1 = require("../utils/pagination.js");
const listContacts = async (req, res) => {
    try {
        const workspaceId = req.workspace?._id.toString();
        const { page, limit, skip } = (0, pagination_js_1.parsePagination)(req.query);
        const { search, tags, list, instagramAccountId, sort = 'lastInteractionAt', order = 'desc', minScore, maxScore, stage, } = req.query;
        const filter = { workspaceId };
        if (instagramAccountId)
            filter.instagramAccountId = instagramAccountId;
        if (tags)
            filter.tags = { $in: tags.split(',') };
        if (list)
            filter.lists = list;
        if (stage)
            filter.conversationStage = stage;
        if (minScore)
            filter.leadScore = { $gte: parseInt(minScore) };
        if (maxScore)
            filter.leadScore = { ...(filter.leadScore || {}), $lte: parseInt(maxScore) };
        let query = index_js_1.Contact.find(filter);
        if (search) {
            query = query.or([
                { username: { $regex: search, $options: 'i' } },
                { displayName: { $regex: search, $options: 'i' } },
                { 'customFields.email': { $regex: search, $options: 'i' } },
            ]);
        }
        const [contacts, total] = await Promise.all([
            query
                .sort({ [sort]: order === 'desc' ? -1 : 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            index_js_1.Contact.countDocuments(filter),
        ]);
        (0, pagination_js_1.sendSuccess)(res, contacts, 200, { page, limit, total });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to list contacts');
    }
};
exports.listContacts = listContacts;
const getContact = async (req, res) => {
    try {
        const contact = await index_js_1.Contact.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!contact) {
            (0, pagination_js_1.sendError)(res, 'Contact not found', 404);
            return;
        }
        // Get recent conversations
        const conversations = await index_js_1.Conversation.find({
            contactId: contact._id,
        })
            .sort({ lastMessageAt: -1 })
            .limit(5)
            .lean();
        // Get recent messages
        const messages = await index_js_1.Message.find({
            contactId: contact._id,
        })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        (0, pagination_js_1.sendSuccess)(res, { contact, conversations, messages });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to get contact');
    }
};
exports.getContact = getContact;
const updateContact = async (req, res) => {
    try {
        const contact = await index_js_1.Contact.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!contact) {
            (0, pagination_js_1.sendError)(res, 'Contact not found', 404);
            return;
        }
        const { tags, lists, customFields, leadScore, conversationStage } = req.body;
        if (tags !== undefined)
            contact.tags = tags;
        if (lists !== undefined)
            contact.lists = lists;
        if (customFields !== undefined) {
            contact.customFields = { ...contact.customFields, ...customFields };
        }
        if (leadScore !== undefined)
            contact.leadScore = leadScore;
        if (conversationStage !== undefined)
            contact.conversationStage = conversationStage;
        await contact.save();
        (0, pagination_js_1.sendSuccess)(res, contact);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to update contact');
    }
};
exports.updateContact = updateContact;
const deleteContact = async (req, res) => {
    try {
        const contact = await index_js_1.Contact.findOneAndDelete({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!contact) {
            (0, pagination_js_1.sendError)(res, 'Contact not found', 404);
            return;
        }
        // Also delete related conversations and messages
        await Promise.all([
            index_js_1.Conversation.deleteMany({ contactId: contact._id }),
            index_js_1.Message.deleteMany({ contactId: contact._id }),
        ]);
        (0, pagination_js_1.sendSuccess)(res, { deleted: true });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to delete contact');
    }
};
exports.deleteContact = deleteContact;
const addTag = async (req, res) => {
    try {
        const { tag } = req.body;
        const contact = await index_js_1.Contact.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!contact) {
            (0, pagination_js_1.sendError)(res, 'Contact not found', 404);
            return;
        }
        await contact.addTag(tag);
        (0, pagination_js_1.sendSuccess)(res, contact);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to add tag');
    }
};
exports.addTag = addTag;
const removeTag = async (req, res) => {
    try {
        const { tag } = req.params;
        const contact = await index_js_1.Contact.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!contact) {
            (0, pagination_js_1.sendError)(res, 'Contact not found', 404);
            return;
        }
        await contact.removeTag(tag);
        (0, pagination_js_1.sendSuccess)(res, contact);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to remove tag');
    }
};
exports.removeTag = removeTag;
const addToList = async (req, res) => {
    try {
        const { listName } = req.params;
        const contact = await index_js_1.Contact.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!contact) {
            (0, pagination_js_1.sendError)(res, 'Contact not found', 404);
            return;
        }
        await contact.addToList(listName);
        (0, pagination_js_1.sendSuccess)(res, contact);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to add to list');
    }
};
exports.addToList = addToList;
const removeFromList = async (req, res) => {
    try {
        const { listName } = req.params;
        const contact = await index_js_1.Contact.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!contact) {
            (0, pagination_js_1.sendError)(res, 'Contact not found', 404);
            return;
        }
        await contact.removeFromList(listName);
        (0, pagination_js_1.sendSuccess)(res, contact);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to remove from list');
    }
};
exports.removeFromList = removeFromList;
const importContacts = async (req, res) => {
    try {
        const { contacts, instagramAccountId } = req.body;
        const workspaceId = req.workspace?._id.toString();
        if (!Array.isArray(contacts) || contacts.length === 0) {
            (0, pagination_js_1.sendError)(res, 'No contacts provided', 400);
            return;
        }
        const results = { imported: 0, skipped: 0, errors: [] };
        for (const contact of contacts) {
            try {
                const existing = await index_js_1.Contact.findOne({
                    instagramAccountId,
                    igUserId: contact.igUserId || contact.username,
                });
                if (existing) {
                    results.skipped++;
                    continue;
                }
                const newContact = new index_js_1.Contact({
                    workspaceId,
                    instagramAccountId,
                    igUserId: contact.igUserId || contact.username,
                    username: contact.username,
                    displayName: contact.displayName || '',
                    profilePicture: contact.profilePicture || '',
                    source: 'imported',
                    tags: contact.tags || [],
                    customFields: contact.customFields || {},
                });
                await newContact.save();
                results.imported++;
            }
            catch (err) {
                results.errors.push(`Failed to import ${contact.username}: ${err.message}`);
            }
        }
        (0, pagination_js_1.sendSuccess)(res, results, 201);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to import contacts');
    }
};
exports.importContacts = importContacts;
const exportContacts = async (req, res) => {
    try {
        const workspaceId = req.workspace?._id.toString();
        const { format = 'json', tags, stage } = req.query;
        const filter = { workspaceId };
        if (tags)
            filter.tags = { $in: tags.split(',') };
        if (stage)
            filter.conversationStage = stage;
        const contacts = await index_js_1.Contact.find(filter)
            .select('-workspaceId -instagramAccountId')
            .lean();
        if (format === 'csv') {
            // Convert to CSV
            const headers = ['username', 'displayName', 'email', 'tags', 'lists', 'leadScore', 'conversationStage', 'createdAt'];
            const csv = [
                headers.join(','),
                ...contacts.map((c) => [
                    c.username,
                    c.displayName || '',
                    c.customFields?.email || '',
                    (c.tags || []).join(';'),
                    (c.lists || []).join(';'),
                    c.leadScore,
                    c.conversationStage,
                    c.createdAt?.toISOString() || '',
                ].map((v) => `"${v}"`).join(',')),
            ].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="contacts-${Date.now()}.csv"`);
            res.send(csv);
            return;
        }
        (0, pagination_js_1.sendSuccess)(res, contacts);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to export contacts');
    }
};
exports.exportContacts = exportContacts;
//# sourceMappingURL=contactController.js.map