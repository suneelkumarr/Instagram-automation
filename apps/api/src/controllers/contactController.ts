import { Request, Response } from 'express';
import { Contact, Conversation, Message } from '../models/index.js';
import { sendSuccess, sendError, parsePagination } from '../utils/pagination.js';

export const listContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace?._id.toString();
    const { page, limit, skip } = parsePagination(req.query as Record<string, string>);

    const {
      search,
      tags,
      list,
      instagramAccountId,
      sort = 'lastInteractionAt',
      order = 'desc',
      minScore,
      maxScore,
      stage,
    } = req.query;

    const filter: Record<string, unknown> = { workspaceId };

    if (instagramAccountId) filter.instagramAccountId = instagramAccountId;
    if (tags) filter.tags = { $in: (tags as string).split(',') };
    if (list) filter.lists = list;
    if (stage) filter.conversationStage = stage;
    if (minScore) filter.leadScore = { $gte: parseInt(minScore as string) };
    if (maxScore) filter.leadScore = { ...(filter.leadScore as object || {}), $lte: parseInt(maxScore as string) };

    let query = Contact.find(filter);

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
      Contact.countDocuments(filter),
    ]);

    sendSuccess(res, contacts, 200, { page, limit, total });
  } catch (error) {
    sendError(res, 'Failed to list contacts');
  }
};

export const getContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!contact) {
      sendError(res, 'Contact not found', 404);
      return;
    }

    // Get recent conversations
    const conversations = await Conversation.find({
      contactId: contact._id,
    })
      .sort({ lastMessageAt: -1 })
      .limit(5)
      .lean();

    // Get recent messages
    const messages = await Message.find({
      contactId: contact._id,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    sendSuccess(res, { contact, conversations, messages });
  } catch (error) {
    sendError(res, 'Failed to get contact');
  }
};

export const updateContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const contact = await Contact.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!contact) {
      sendError(res, 'Contact not found', 404);
      return;
    }

    const { tags, lists, customFields, leadScore, conversationStage } = req.body;

    if (tags !== undefined) contact.tags = tags;
    if (lists !== undefined) contact.lists = lists;
    if (customFields !== undefined) {
      contact.customFields = { ...contact.customFields, ...customFields };
    }
    if (leadScore !== undefined) contact.leadScore = leadScore;
    if (conversationStage !== undefined) contact.conversationStage = conversationStage;

    await contact.save();

    sendSuccess(res, contact);
  } catch (error) {
    sendError(res, 'Failed to update contact');
  }
};

export const deleteContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const contact = await Contact.findOneAndDelete({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!contact) {
      sendError(res, 'Contact not found', 404);
      return;
    }

    // Also delete related conversations and messages
    await Promise.all([
      Conversation.deleteMany({ contactId: contact._id }),
      Message.deleteMany({ contactId: contact._id }),
    ]);

    sendSuccess(res, { deleted: true });
  } catch (error) {
    sendError(res, 'Failed to delete contact');
  }
};

export const addTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tag } = req.body;
    const contact = await Contact.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!contact) {
      sendError(res, 'Contact not found', 404);
      return;
    }

    await contact.addTag(tag);
    sendSuccess(res, contact);
  } catch (error) {
    sendError(res, 'Failed to add tag');
  }
};

export const removeTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tag } = req.params;
    const contact = await Contact.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!contact) {
      sendError(res, 'Contact not found', 404);
      return;
    }

    await contact.removeTag(tag);
    sendSuccess(res, contact);
  } catch (error) {
    sendError(res, 'Failed to remove tag');
  }
};

export const addToList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { listName } = req.params;
    const contact = await Contact.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!contact) {
      sendError(res, 'Contact not found', 404);
      return;
    }

    await contact.addToList(listName);
    sendSuccess(res, contact);
  } catch (error) {
    sendError(res, 'Failed to add to list');
  }
};

export const removeFromList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { listName } = req.params;
    const contact = await Contact.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!contact) {
      sendError(res, 'Contact not found', 404);
      return;
    }

    await contact.removeFromList(listName);
    sendSuccess(res, contact);
  } catch (error) {
    sendError(res, 'Failed to remove from list');
  }
};

export const importContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { contacts, instagramAccountId } = req.body;
    const workspaceId = req.workspace?._id.toString();

    if (!Array.isArray(contacts) || contacts.length === 0) {
      sendError(res, 'No contacts provided', 400);
      return;
    }

    const results = { imported: 0, skipped: 0, errors: [] as string[] };

    for (const contact of contacts) {
      try {
        const existing = await Contact.findOne({
          instagramAccountId,
          igUserId: contact.igUserId || contact.username,
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        const newContact = new Contact({
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
      } catch (err) {
        results.errors.push(`Failed to import ${contact.username}: ${(err as Error).message}`);
      }
    }

    sendSuccess(res, results, 201);
  } catch (error) {
    sendError(res, 'Failed to import contacts');
  }
};

export const exportContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace?._id.toString();
    const { format = 'json', tags, stage } = req.query;

    const filter: Record<string, unknown> = { workspaceId };
    if (tags) filter.tags = { $in: (tags as string).split(',') };
    if (stage) filter.conversationStage = stage;

    const contacts = await Contact.find(filter)
      .select('-workspaceId -instagramAccountId')
      .lean();

    if (format === 'csv') {
      // Convert to CSV
      const headers = ['username', 'displayName', 'email', 'tags', 'lists', 'leadScore', 'conversationStage', 'createdAt'];
      const csv = [
        headers.join(','),
        ...contacts.map((c) =>
          [
            c.username,
            c.displayName || '',
            (c.customFields as Record<string, string>)?.email || '',
            (c.tags || []).join(';'),
            (c.lists || []).join(';'),
            c.leadScore,
            c.conversationStage,
            c.createdAt?.toISOString() || '',
          ].map((v) => `"${v}"`).join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="contacts-${Date.now()}.csv"`);
      res.send(csv);
      return;
    }

    sendSuccess(res, contacts);
  } catch (error) {
    sendError(res, 'Failed to export contacts');
  }
};
