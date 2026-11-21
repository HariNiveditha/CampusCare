const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { logAudit } = require('../utils/auditLogger');
const flowEngine = require('../services/flowEngine');

// Helper to remove internal work notes for students
const sanitizeComplaint = (complaint, userRole) => {
  const obj = complaint.toObject ? complaint.toObject() : { ...complaint };
  if (userRole !== 'admin') {
    delete obj.workNotes;
  }
  return obj;
};

// Create complaint
exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, location, priority } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Title, description, and category are required.' });
    }

    // Always determine userId and userName from verified token
    const userId = req.user.id;
    const userName = req.user.username;

    // Handle photo from multer upload or body
    let photoUrl = '';
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.photo && typeof req.body.photo === 'string') {
      photoUrl = req.body.photo;
    }

    // Students cannot set arbitrary priority; default to Medium
    const complaintPriority = (req.user.role === 'admin' && priority) ? priority : 'Medium';

    const newComplaint = new Complaint({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      location: (location || '').trim(),
      photo: photoUrl,
      priority: complaintPriority,
      userId,
      userName,
      status: 'Submitted',
    });

    await newComplaint.save();

    // Audit log complaint creation
    await logAudit({
      user: req.user,
      role: req.user.role,
      action: 'COMPLAINT_CREATED',
      entityType: 'Complaint',
      entityId: newComplaint._id,
      details: {
        ticketNumber: newComplaint.ticketNumber,
        title: newComplaint.title,
        category: newComplaint.category,
        priority: newComplaint.priority,
        location: newComplaint.location,
        hasPhoto: Boolean(photoUrl),
      },
    });

    // Execute Flow Trigger: COMPLAINT_CREATED
    try {
      await flowEngine.executeTrigger('COMPLAINT_CREATED', {
        complaint: newComplaint,
        context: {
          ticketNumber: newComplaint.ticketNumber,
          title: newComplaint.title,
          category: newComplaint.category,
        },
      });
    } catch (flowErr) {
      console.error('Trigger COMPLAINT_CREATED flow error:', flowErr.message);
    }

    res.status(201).json(sanitizeComplaint(newComplaint, req.user.role));
  } catch (error) {
    console.error('Create complaint error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all complaints
exports.getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    const sanitized = complaints.map((c) => sanitizeComplaint(c, req.user?.role));
    res.json(sanitized);
  } catch (error) {
    console.error('Get all complaints error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get complaint by ID
exports.getComplaintById = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const complaint = await Complaint.findById(complaintId);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    res.json(sanitizeComplaint(complaint, req.user?.role));
  } catch (error) {
    console.error('Get complaint by ID error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get complaints by user
exports.getComplaintsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Security: Student cannot view another student's complaints through this endpoint
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        message: 'Forbidden: You do not have permission to view another student\'s private complaints.',
      });
    }

    const complaints = await Complaint.find({ userId }).sort({ createdAt: -1 });
    const sanitized = complaints.map((c) => sanitizeComplaint(c, req.user.role));
    res.json(sanitized);
  } catch (error) {
    console.error('Get complaints by user error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update complaint status and optional admin response (Admin only)
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status, adminResponse } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const validStatuses = ['Submitted', 'Pending', 'In Progress', 'Resolved', 'Closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const oldStatus = complaint.status;
    const oldResponse = complaint.adminResponse;

    complaint.status = status;
    if (adminResponse !== undefined) {
      complaint.adminResponse = adminResponse;
    }
    complaint.updatedAt = new Date();

    await complaint.save();

    // Audit log status change
    await logAudit({
      user: req.user,
      role: req.user.role,
      action: 'COMPLAINT_STATUS_UPDATED',
      entityType: 'Complaint',
      entityId: complaint._id,
      details: {
        ticketNumber: complaint.ticketNumber,
        oldStatus,
        newStatus: status,
        adminResponseUpdated: adminResponse !== undefined && adminResponse !== oldResponse,
      },
    });

    if (adminResponse && adminResponse !== oldResponse) {
      await logAudit({
        user: req.user,
        role: req.user.role,
        action: 'ADMIN_RESPONSE_ADDED',
        entityType: 'Complaint',
        entityId: complaint._id,
        details: {
          ticketNumber: complaint.ticketNumber,
          response: adminResponse,
        },
      });
    }

    // Execute Flow Trigger: COMPLAINT_STATUS_CHANGED only if status actually changed
    if (oldStatus !== status) {
      try {
        await flowEngine.executeTrigger('COMPLAINT_STATUS_CHANGED', {
          complaint,
          previousState: { status: oldStatus },
          context: {
            ticketNumber: complaint.ticketNumber,
            oldStatus,
            newStatus: status,
          },
        });
      } catch (flowErr) {
        console.error('Trigger COMPLAINT_STATUS_CHANGED flow error:', flowErr.message);
      }
    }

    res.json(sanitizeComplaint(complaint, req.user.role));
  } catch (error) {
    console.error('Update complaint status error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update complaint priority (Admin only)
exports.updateComplaintPriority = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { priority } = req.body;

    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (!priority || !validPriorities.includes(priority)) {
      return res.status(400).json({
        message: `Priority is required and must be one of: ${validPriorities.join(', ')}`,
      });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const oldPriority = complaint.priority;
    complaint.priority = priority;
    complaint.updatedAt = new Date();

    await complaint.save();

    // Audit log priority change
    await logAudit({
      user: req.user,
      role: req.user.role,
      action: 'COMPLAINT_PRIORITY_UPDATED',
      entityType: 'Complaint',
      entityId: complaint._id,
      details: {
        ticketNumber: complaint.ticketNumber,
        oldPriority,
        newPriority: priority,
      },
    });

    res.json(sanitizeComplaint(complaint, req.user.role));
  } catch (error) {
    console.error('Update complaint priority error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Assign complaint to an admin (Admin only)
exports.assignComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { assignedTo } = req.body;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const oldAssigneeName = complaint.assignedToName || 'Unassigned';

    if (!assignedTo) {
      // Unassign
      complaint.assignedTo = null;
      complaint.assignedToName = '';
    } else {
      const adminUser = await User.findById(assignedTo);
      if (!adminUser || adminUser.role !== 'admin') {
        return res.status(400).json({ message: 'Target user must be an active administrator.' });
      }
      complaint.assignedTo = adminUser._id;
      complaint.assignedToName = adminUser.username;
    }

    complaint.updatedAt = new Date();
    await complaint.save();

    // Audit log assignment
    await logAudit({
      user: req.user,
      role: req.user.role,
      action: 'COMPLAINT_ASSIGNED',
      entityType: 'Complaint',
      entityId: complaint._id,
      details: {
        ticketNumber: complaint.ticketNumber,
        assignedTo: complaint.assignedTo,
        assignedToName: complaint.assignedToName || 'Unassigned',
        previousAssignee: oldAssigneeName,
      },
    });

    res.json(sanitizeComplaint(complaint, req.user.role));
  } catch (error) {
    console.error('Assign complaint error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add internal work note (Admin only)
exports.addWorkNote = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { note } = req.body;

    if (!note || note.trim() === '') {
      return res.status(400).json({ message: 'Work note content is required.' });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const newNote = {
      note: note.trim(),
      authorId: req.user.id,
      authorName: req.user.username,
      createdAt: new Date(),
    };

    complaint.workNotes.push(newNote);
    complaint.updatedAt = new Date();

    await complaint.save();

    // Audit log work note
    await logAudit({
      user: req.user,
      role: req.user.role,
      action: 'WORK_NOTE_ADDED',
      entityType: 'Complaint',
      entityId: complaint._id,
      details: {
        ticketNumber: complaint.ticketNumber,
        authorName: req.user.username,
        noteExcerpt: note.trim().substring(0, 100),
      },
    });

    res.json(sanitizeComplaint(complaint, req.user.role));
  } catch (error) {
    console.error('Add work note error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Upvote complaint (Student or Admin)
exports.upvoteComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    // Always use authenticated user's ID
    const userId = req.user.id;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const alreadyUpvoted = complaint.upvotedBy.some((id) => id.toString() === userId.toString());

    if (alreadyUpvoted) {
      complaint.upvotedBy = complaint.upvotedBy.filter((id) => id.toString() !== userId.toString());
      complaint.upvotes = Math.max(0, complaint.upvotes - 1);
    } else {
      complaint.upvotedBy.push(userId);
      complaint.upvotes += 1;
    }

    await complaint.save();

    res.json(sanitizeComplaint(complaint, req.user.role));
  } catch (error) {
    console.error('Upvote complaint error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete complaint (Admin only)
exports.deleteComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;

    const deletedComplaint = await Complaint.findByIdAndDelete(complaintId);

    if (!deletedComplaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    await logAudit({
      user: req.user,
      role: req.user.role,
      action: 'COMPLAINT_DELETED',
      entityType: 'Complaint',
      entityId: complaintId,
      details: {
        ticketNumber: deletedComplaint.ticketNumber,
        title: deletedComplaint.title,
      },
    });

    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('Delete complaint error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
