const express = require('express');
const { body, validationResult } = require('express-validator');
const Approval = require('../models/Approval');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Company = require('../models/Company');
const { auth, authorize, checkCompanyAccess } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/approvals:
 *   get:
 *     summary: Get pending approvals for current user
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending approvals
 */
router.get('/', auth, async (req, res) => {
  try {
    const approvals = await Approval.find({ 
      approver: req.user._id, 
      status: 'pending' 
    })
    .populate({
      path: 'expense',
      populate: {
        path: 'employee',
        select: 'firstName lastName email'
      }
    })
    .sort({ createdAt: -1 });

    res.json({ approvals });
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/approvals/{id}/approve:
 *   post:
 *     summary: Approve an expense
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Expense approved successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Approval not found
 */
router.post('/:id/approve', [
  auth,
  authorize('manager', 'admin'),
  body('comments').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { comments } = req.body;
    const approvalId = req.params.id;

    const approval = await Approval.findById(approvalId)
      .populate('expense');

    if (!approval) {
      return res.status(404).json({ message: 'Approval not found' });
    }

    // Check if user is the approver
    if (approval.approver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to approve this expense' });
    }

    // Check if already processed
    if (approval.status !== 'pending') {
      return res.status(400).json({ message: 'This approval has already been processed' });
    }

    const expense = approval.expense;

    // Update approval
    approval.status = 'approved';
    approval.comments = comments || null;
    approval.approvedAt = new Date();
    await approval.save();

    // Add to expense approvedBy array
    expense.approvedBy.push({
      user: req.user._id,
      level: approval.level,
      approvedAt: new Date(),
      comments: comments || null
    });

    // Check conditional approval rules
    const company = await Company.findById(expense.company);
    let shouldApprove = false;
    let shouldMoveToNext = false;

    // Get all approvals for this expense
    const allApprovals = await Approval.find({ expense: expense._id });
    const approvedCount = allApprovals.filter(a => a.status === 'approved').length;
    const totalApprovers = allApprovals.length;

    // Check specific approver rule (e.g., CFO approval)
    if (company.settings.approvalRules === 'specific' || company.settings.approvalRules === 'hybrid') {
      const specificApprovers = company.settings.specificApprovers || [];
      if (specificApprovers.includes(req.user._id.toString())) {
        shouldApprove = true;
      }
    }

    // Check percentage rule
    if (!shouldApprove && (company.settings.approvalRules === 'percentage' || company.settings.approvalRules === 'hybrid')) {
      const threshold = company.settings.percentageThreshold || 60;
      const approvalPercentage = (approvedCount / totalApprovers) * 100;
      if (approvalPercentage >= threshold) {
        shouldApprove = true;
      }
    }

    // Check hybrid rule (either condition met)
    if (company.settings.approvalRules === 'hybrid') {
      // Already checked above, shouldApprove will be true if either condition is met
    }

    if (shouldApprove) {
      // Conditional approval met - approve expense
      expense.status = 'approved';
      expense.currentApprover = null;
    } else {
      // Check if we need to move to next level
      const totalLevels = company.settings.approvalRules === 'percentage' ? 3 : 2;
      
      if (approval.level >= totalLevels) {
        // Final approval level reached but conditions not met
        expense.status = 'approved'; // Auto-approve as fallback
        expense.currentApprover = null;
      } else {
        // Move to next level
        const nextLevel = approval.level + 1;
        
        // Find next approver based on company rules
        let nextApprover = null;
        
        if (company.settings.approvalRules === 'specific' && company.settings.specificApprovers.length > 0) {
          nextApprover = company.settings.specificApprovers[nextLevel - 1];
        } else {
          // Default: find manager or admin
          nextApprover = await User.findOne({
            company: expense.company,
            role: nextLevel === 2 ? 'manager' : 'admin'
          });
        }

        if (nextApprover) {
          // Create next approval
          const nextApproval = new Approval({
            expense: expense._id,
            approver: nextApprover._id,
            level: nextLevel,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          });
          await nextApproval.save();

          expense.currentApprover = nextApprover._id;
          expense.approvalLevel = nextLevel;
        } else {
          // No more approvers, auto-approve
          expense.status = 'approved';
          expense.currentApprover = null;
        }
      }
    }

    await expense.save();

    res.json({
      message: 'Expense approved successfully',
      approval
    });
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/approvals/{id}/reject:
 *   post:
 *     summary: Reject an expense
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Expense rejected successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Approval not found
 */
router.post('/:id/reject', [
  auth,
  authorize('manager', 'admin'),
  body('reason').notEmpty().withMessage('Rejection reason is required'),
  body('comments').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason, comments } = req.body;
    const approvalId = req.params.id;

    const approval = await Approval.findById(approvalId)
      .populate('expense');

    if (!approval) {
      return res.status(404).json({ message: 'Approval not found' });
    }

    // Check if user is the approver
    if (approval.approver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to reject this expense' });
    }

    // Check if already processed
    if (approval.status !== 'pending') {
      return res.status(400).json({ message: 'This approval has already been processed' });
    }

    const expense = approval.expense;

    // Update approval
    approval.status = 'rejected';
    approval.rejectionReason = reason;
    approval.comments = comments || null;
    approval.approvedAt = new Date();
    await approval.save();

    // Update expense
    expense.status = 'rejected';
    expense.rejectionReason = reason;
    expense.currentApprover = null;
    
    expense.rejectedBy.push({
      user: req.user._id,
      level: approval.level,
      rejectedAt: new Date(),
      reason: reason
    });

    await expense.save();

    res.json({
      message: 'Expense rejected successfully',
      approval
    });
  } catch (error) {
    console.error('Reject expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/approvals/stats:
 *   get:
 *     summary: Get approval statistics
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Approval statistics
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Approval.aggregate([
      {
        $match: {
          approver: req.user._id
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      pending: 0,
      approved: 0,
      rejected: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
    });

    res.json({ stats: formattedStats });
  } catch (error) {
    console.error('Get approval stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
