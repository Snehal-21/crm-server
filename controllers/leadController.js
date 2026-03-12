const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

// Allowed sort fields to prevent injection
const ALLOWED_SORT_FIELDS = ['name', 'createdAt', 'updatedAt', 'status', 'source'];

/**
 * Build access filter based on user role (ownership/assignment rules)
 */
const getAccessFilter = (user) => {
  if (user.role === 'admin' || user.role === 'manager') return {};
  // Sales: only own or assigned leads
  return {
    $or: [{ createdBy: user._id }, { assignedTo: user._id }]
  };
};

/**
 * POST /leads
 */
const createLead = async (req, res) => {
  try {
    const { name, phone, email, source, status, notes, assignedTo } = req.body;

    // Only manager/admin can assign on creation
    let assignedToId = null;
    if (assignedTo && (req.user.role === 'admin' || req.user.role === 'manager')) {
      const assignee = await User.findById(assignedTo);
      if (!assignee) return res.status(400).json({ message: 'Assigned user not found.' });
      assignedToId = assignedTo;
    }

    const lead = await Lead.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      source,
      status,
      notes,
      assignedTo: assignedToId,
      createdBy: req.user._id
    });

    const populatedLead = await Lead.findById(lead._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    // Notify managers/admins
    const managers = await User.find({ role: { $in: ['admin', 'manager'] } });
    const managerIds = managers.map(m => m._id).filter(id => id.toString() !== req.user._id.toString());

    await notificationService.notifyMany(managerIds, {
      type: 'lead_created',
      message: `New lead "${name}" was created by ${req.user.name}`,
      lead: lead._id,
      metadata: { leadName: name, createdBy: req.user.name }
    });

    // Notify assigned user if different from creator
    if (assignedToId && assignedToId.toString() !== req.user._id.toString()) {
      await notificationService.createNotification({
        recipient: assignedToId,
        type: 'lead_assigned',
        message: `You have been assigned to lead "${name}"`,
        lead: lead._id,
        metadata: { leadName: name, assignedBy: req.user.name }
      });
    }

    res.status(201).json({ message: 'Lead created successfully.', lead: populatedLead });
  } catch (error) {
    res.status(500).json({ message: 'Error creating lead.', error: error.message });
  }
};

/**
 * GET /leads — advanced list with filtering, sorting, pagination
 */
const getLeads = async (req, res) => {
  try {
    let {
      q, status, source, assignedTo,
      createdFrom, createdTo,
      sort = 'createdAt:desc',
      page = 1, limit = 10
    } = req.query;

    // Sanitize pagination
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (page - 1) * limit;

    // Build filter
    const filter = getAccessFilter(req.user);

    // Text search: name, email, phone (case-insensitive regex)
    if (q && q.trim()) {
      const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [{ name: regex }, { email: regex }, { phone: regex }]
      });
    }

    if (status) filter.status = status;
    if (source) filter.source = source;

    // Only manager/admin can filter by assignedTo
    if (assignedTo && (req.user.role === 'admin' || req.user.role === 'manager')) {
      filter.assignedTo = assignedTo;
    }

    // Date range
    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) {
        const d = new Date(createdFrom);
        if (isNaN(d)) return res.status(400).json({ message: 'Invalid createdFrom date format.' });
        filter.createdAt.$gte = d;
      }
      if (createdTo) {
        const d = new Date(createdTo);
        if (isNaN(d)) return res.status(400).json({ message: 'Invalid createdTo date format.' });
        filter.createdAt.$lte = d;
      }
    }

    // Parse sort
    const [sortField, sortOrder] = sort.split(':');
    if (!ALLOWED_SORT_FIELDS.includes(sortField)) {
      return res.status(400).json({ message: `Invalid sort field. Allowed: ${ALLOWED_SORT_FIELDS.join(', ')}` });
    }
    if (!['asc', 'desc'].includes(sortOrder)) {
      return res.status(400).json({ message: 'Sort order must be asc or desc.' });
    }

    const sortObj = { [sortField]: sortOrder === 'desc' ? -1 : 1, _id: 1 };

    // Use $facet for single-query data + count
    const aggregationPipeline = [
      { $match: filter },
      {
        $facet: {
          data: [
            { $sort: sortObj },
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: 'users', localField: 'createdBy',
                foreignField: '_id', as: 'createdBy',
                pipeline: [{ $project: { name: 1, email: 1 } }]
              }
            },
            { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: 'users', localField: 'assignedTo',
                foreignField: '_id', as: 'assignedTo',
                pipeline: [{ $project: { name: 1, email: 1 } }]
              }
            },
            { $unwind: { path: '$assignedTo', preserveNullAndEmptyArrays: true } }
          ],
          totalCount: [{ $count: 'count' }]
        }
      }
    ];

    const result = await Lead.aggregate(aggregationPipeline);
    const data = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    res.json({
      data,
      pagination: { page, limit, total, totalPages }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leads.', error: error.message });
  }
};

/**
 * GET /leads/:id
 */
const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!lead) return res.status(404).json({ message: 'Lead not found.' });

    // Check access for sales role
    if (req.user.role === 'sales') {
      const hasAccess =
        lead.createdBy._id.toString() === req.user._id.toString() ||
        (lead.assignedTo && lead.assignedTo._id.toString() === req.user._id.toString());
      if (!hasAccess) return res.status(403).json({ message: 'Access denied.' });
    }

    res.json({ lead });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lead.', error: error.message });
  }
};

/**
 * PATCH /leads/:id
 */
const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found.' });

    // Check access for sales
    if (req.user.role === 'sales') {
      const hasAccess =
        lead.createdBy.toString() === req.user._id.toString() ||
        (lead.assignedTo && lead.assignedTo.toString() === req.user._id.toString());
      if (!hasAccess) return res.status(403).json({ message: 'Access denied.' });
    }

    const { name, phone, email, source, status, notes, assignedTo } = req.body;
    const prevStatus = lead.status;
    const prevAssignedTo = lead.assignedTo?.toString();

    // Only manager/admin can change assignedTo
    if (assignedTo !== undefined && (req.user.role === 'admin' || req.user.role === 'manager')) {
      if (assignedTo) {
        const assignee = await User.findById(assignedTo);
        if (!assignee) return res.status(400).json({ message: 'Assigned user not found.' });
      }
      lead.assignedTo = assignedTo || null;
    }

    if (name !== undefined) lead.name = name.trim();
    if (phone !== undefined) lead.phone = phone.trim();
    if (email !== undefined) lead.email = email ? email.toLowerCase().trim() : '';
    if (source !== undefined) lead.source = source;
    if (status !== undefined) lead.status = status;
    if (notes !== undefined) lead.notes = notes;

    await lead.save();

    const updatedLead = await Lead.findById(lead._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    // Notify on assignment change
    const newAssignedTo = lead.assignedTo?.toString();
    if (newAssignedTo && newAssignedTo !== prevAssignedTo) {
      await notificationService.createNotification({
        recipient: lead.assignedTo,
        type: 'lead_assigned',
        message: `You have been assigned to lead "${lead.name}"`,
        lead: lead._id,
        metadata: { leadName: lead.name, assignedBy: req.user.name }
      });
    }

    // Notify on status change
    if (status && status !== prevStatus) {
      const notifyRecipients = [];
      if (lead.assignedTo) notifyRecipients.push(lead.assignedTo);
      const managers = await User.find({ role: { $in: ['admin', 'manager'] } });
      managers.forEach(m => {
        if (m._id.toString() !== req.user._id.toString()) {
          notifyRecipients.push(m._id);
        }
      });

      const uniqueRecipients = [...new Set(notifyRecipients.map(r => r.toString()))];
      await notificationService.notifyMany(uniqueRecipients, {
        type: 'lead_status_changed',
        message: `Lead "${lead.name}" status changed from "${prevStatus}" to "${status}"`,
        lead: lead._id,
        metadata: { leadName: lead.name, prevStatus, newStatus: status, changedBy: req.user.name }
      });
    }

    res.json({ message: 'Lead updated successfully.', lead: updatedLead });
  } catch (error) {
    res.status(500).json({ message: 'Error updating lead.', error: error.message });
  }
};

/**
 * DELETE /leads/:id
 */
const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found.' });

    // Check access for sales
    if (req.user.role === 'sales') {
      if (lead.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Only the creator can delete this lead.' });
      }
    }

    const leadName = lead.name;
    await lead.deleteOne();

    // Notify managers/admins
    const managers = await User.find({ role: { $in: ['admin', 'manager'] } });
    const managerIds = managers.map(m => m._id).filter(id => id.toString() !== req.user._id.toString());
    await notificationService.notifyMany(managerIds, {
      type: 'lead_deleted',
      message: `Lead "${leadName}" was deleted by ${req.user.name}`,
      lead: null,
      metadata: { leadName, deletedBy: req.user.name }
    });

    res.json({ message: 'Lead deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting lead.', error: error.message });
  }
};

/**
 * GET /leads/stats/summary — MongoDB aggregation with $facet
 */
const getStats = async (req, res) => {
  try {
    const { createdFrom, createdTo } = req.query;
    const matchFilter = {};

    if (createdFrom || createdTo) {
      matchFilter.createdAt = {};
      if (createdFrom) {
        const d = new Date(createdFrom);
        if (isNaN(d)) return res.status(400).json({ message: 'Invalid createdFrom date.' });
        matchFilter.createdAt.$gte = d;
      }
      if (createdTo) {
        const d = new Date(createdTo);
        if (isNaN(d)) return res.status(400).json({ message: 'Invalid createdTo date.' });
        matchFilter.createdAt.$lte = d;
      }
    }

    const result = await Lead.aggregate([
      { $match: matchFilter },
      {
        $facet: {
          totalLeads: [{ $count: 'count' }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          bySource: [{ $group: { _id: '$source', count: { $sum: 1 } } }]
        }
      }
    ]);

    const raw = result[0];
    const total = raw.totalLeads[0]?.count || 0;

    // Normalize: ensure all enum values present with 0 defaults
    const statusValues = ['new', 'contacted', 'qualified', 'won', 'lost'];
    const sourceValues = ['website', 'referral', 'cold', 'social', 'other'];

    const byStatus = {};
    statusValues.forEach(s => (byStatus[s] = 0));
    raw.byStatus.forEach(item => { if (item._id) byStatus[item._id] = item.count; });

    const bySource = {};
    sourceValues.forEach(s => (bySource[s] = 0));
    raw.bySource.forEach(item => { if (item._id) bySource[item._id] = item.count; });

    res.json({ totalLeads: total, byStatus, bySource });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats.', error: error.message });
  }
};

module.exports = { createLead, getLeads, getLeadById, updateLead, deleteLead, getStats };