const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Expense = require('../models/Expense');
const Approval = require('../models/Approval');
const User = require('../models/User');
const Company = require('../models/Company');
const { auth, authorize, checkCompanyAccess } = require('../middleware/auth');
const axios = require('axios');
let ocrService = null;
try {
  ocrService = require('../services/ocrService');
} catch (error) {
  console.log('OCR service not available:', error.message);
}

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/receipts/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed'));
    }
  }
});

// Helper function to convert currency
const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  try {
    if (fromCurrency === toCurrency) {
      return { amount, rate: 1 };
    }

    const response = await axios.get(`${process.env.EXCHANGE_RATE_API}/${fromCurrency}`);
    const rate = response.data.rates[toCurrency];
    
    if (!rate) {
      throw new Error(`Currency conversion rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    return {
      amount: amount * rate,
      rate
    };
  } catch (error) {
    console.error('Currency conversion error:', error);
    throw error;
  }
};

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     summary: Get expenses
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, partially_approved]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of expenses
 */
router.get('/', auth, checkCompanyAccess, async (req, res) => {
  try {
    const { status, category, startDate, endDate, employee } = req.query;
    
    let query = { company: req.user.company };
    
    // Role-based filtering
    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    } else if (req.user.role === 'manager') {
      // Managers can see their team's expenses
      const teamMembers = await User.find({ 
        manager: req.user._id,
        company: req.user.company 
      }).select('_id');
      const teamMemberIds = teamMembers.map(member => member._id);
      query.employee = { $in: [req.user._id, ...teamMemberIds] };
    }
    // Admins can see all expenses (no additional filtering)

    if (status) query.status = status;
    if (category) query.category = category;
    if (employee) query.employee = employee;
    
    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({ expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     summary: Create a new expense
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *               - category
 *               - description
 *               - expenseDate
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [travel, meals, accommodation, transportation, office_supplies, entertainment, utilities, communication, training, other]
 *               description:
 *                 type: string
 *               expenseDate:
 *                 type: string
 *                 format: date
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Expense created successfully
 *       400:
 *         description: Bad request
 */
router.post('/', [
  auth,
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').notEmpty().withMessage('Currency is required'),
  body('category').isIn(['travel', 'meals', 'accommodation', 'transportation', 'office_supplies', 'entertainment', 'utilities', 'communication', 'training', 'other']).withMessage('Invalid category'),
  body('description').notEmpty().withMessage('Description is required'),
  body('expenseDate').isISO8601().withMessage('Valid date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, currency, category, description, expenseDate, tags } = req.body;

    // Get company details
    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(400).json({ message: 'Company not found' });
    }

    // Convert currency
    const conversion = await convertCurrency(amount, currency, company.currency);

    // Create expense
    const expense = new Expense({
      employee: req.user._id,
      company: req.user.company,
      amount,
      currency: currency.toUpperCase(),
      convertedAmount: conversion.amount,
      companyCurrency: company.currency,
      exchangeRate: conversion.rate,
      category,
      description,
      expenseDate: new Date(expenseDate),
      tags: tags || []
    });

    await expense.save();

    // Create initial approval
    const manager = await User.findById(req.user.manager);
    if (manager) {
      const approval = new Approval({
        expense: expense._id,
        approver: manager._id,
        level: 1,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      });
      await approval.save();

      expense.currentApprover = manager._id;
      await expense.save();
    }

    const populatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email');

    res.status(201).json({
      message: 'Expense created successfully',
      expense: populatedExpense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/expenses/{id}:
 *   get:
 *     summary: Get expense by ID
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense data
 *       404:
 *         description: Expense not found
 */
router.get('/:id', auth, checkCompanyAccess, async (req, res) => {
  try {
    const expense = await Expense.findOne({ 
      _id: req.params.id, 
      company: req.user.company 
    })
    .populate('employee', 'firstName lastName email')
    .populate('currentApprover', 'firstName lastName email')
    .populate('approvedBy.user', 'firstName lastName email')
    .populate('rejectedBy.user', 'firstName lastName email');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check access permissions
    if (req.user.role === 'employee' && expense.employee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ expense });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/expenses/{id}:
 *   put:
 *     summary: Update expense
 *     tags: [Expenses]
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
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               expenseDate:
 *                 type: string
 *                 format: date
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Expense updated successfully
 *       404:
 *         description: Expense not found
 */
router.put('/:id', [
  auth,
  body('amount').optional().isNumeric().withMessage('Amount must be a number'),
  body('currency').optional().notEmpty().withMessage('Currency is required'),
  body('category').optional().isIn(['travel', 'meals', 'accommodation', 'transportation', 'office_supplies', 'entertainment', 'utilities', 'communication', 'training', 'other']).withMessage('Invalid category'),
  body('expenseDate').optional().isISO8601().withMessage('Valid date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const expense = await Expense.findOne({ 
      _id: req.params.id, 
      company: req.user.company 
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check if user can edit this expense
    if (req.user.role === 'employee' && expense.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only allow editing if expense is pending
    if (expense.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot edit approved or rejected expense' });
    }

    const { amount, currency, category, description, expenseDate, tags } = req.body;

    // Update fields
    if (amount !== undefined) expense.amount = amount;
    if (currency !== undefined) expense.currency = currency;
    if (category !== undefined) expense.category = category;
    if (description !== undefined) expense.description = description;
    if (expenseDate !== undefined) expense.expenseDate = new Date(expenseDate);
    if (tags !== undefined) expense.tags = tags;

    // Recalculate currency conversion if amount or currency changed
    if (amount !== undefined || currency !== undefined) {
      const company = await Company.findById(req.user.company);
      const conversion = await convertCurrency(
        expense.amount, 
        expense.currency, 
        company.currency
      );
      expense.convertedAmount = conversion.amount;
      expense.exchangeRate = conversion.rate;
    }

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName email')
      .populate('currentApprover', 'firstName lastName email');

    res.json({
      message: 'Expense updated successfully',
      expense: updatedExpense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/expenses/ocr-process:
 *   post:
 *     summary: Process receipt with OCR and auto-fill expense data
 *     tags: [Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               receipt:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: OCR processing completed
 *       400:
 *         description: Bad request
 */
router.post('/ocr-process', auth, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No receipt file uploaded' });
    }

    if (!ocrService) {
      return res.status(503).json({ 
        message: 'OCR service is not available. Please install tesseract.js and sharp dependencies.' 
      });
    }

    console.log('Processing receipt with OCR:', req.file.filename);

    // Process the receipt with OCR
    const ocrResult = await ocrService.processReceipt(req.file.path);

    if (!ocrResult.success) {
      return res.status(400).json({
        message: 'Failed to process receipt',
        error: ocrResult.error
      });
    }

    // Get company details for currency conversion
    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(400).json({ message: 'Company not found' });
    }

    // Convert currency if amount was detected
    let convertedAmount = null;
    let exchangeRate = 1;
    if (ocrResult.data.amount) {
      try {
        const conversion = await convertCurrency(ocrResult.data.amount, 'USD', company.currency);
        convertedAmount = conversion.amount;
        exchangeRate = conversion.rate;
      } catch (error) {
        console.log('Currency conversion failed, using original amount');
        convertedAmount = ocrResult.data.amount;
      }
    }

    // Prepare expense data
    const expenseData = {
      amount: ocrResult.data.amount || 0,
      currency: 'USD', // Default currency for OCR
      convertedAmount: convertedAmount || ocrResult.data.amount || 0,
      companyCurrency: company.currency,
      exchangeRate: exchangeRate,
      category: ocrResult.data.category,
      description: ocrResult.data.description || 'Receipt scan',
      expenseDate: ocrResult.data.date || new Date().toISOString().split('T')[0],
      merchant: ocrResult.data.merchant,
      items: ocrResult.data.items,
      receipt: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        uploadedAt: new Date()
      },
      ocrData: {
        extractedText: ocrResult.text,
        processedAt: new Date(),
        confidence: 'auto-detected'
      }
    };

    res.json({
      message: 'Receipt processed successfully',
      expenseData,
      ocrResult: {
        extractedText: ocrResult.text,
        parsedData: ocrResult.data
      }
    });

  } catch (error) {
    console.error('OCR processing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/expenses/{id}/receipt:
 *   post:
 *     summary: Upload receipt for expense
 *     tags: [Expenses]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               receipt:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Receipt uploaded successfully
 *       400:
 *         description: Bad request
 */
router.post('/:id/receipt', auth, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const expense = await Expense.findOne({ 
      _id: req.params.id, 
      company: req.user.company 
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check if user can edit this expense
    if (req.user.role === 'employee' && expense.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update expense with receipt info
    expense.receipt = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size
    };

    await expense.save();

    res.json({
      message: 'Receipt uploaded successfully',
      receipt: expense.receipt
    });
  } catch (error) {
    console.error('Upload receipt error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
