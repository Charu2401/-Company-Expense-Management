const express = require('express');
const { body, validationResult } = require('express-validator');
const Company = require('../models/Company');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/companies:
 *   get:
 *     summary: Get company details
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company data
 */
router.get('/', auth, async (req, res) => {
  try {
    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json({ company });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/companies:
 *   put:
 *     summary: Update company settings
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               country:
 *                 type: string
 *               currency:
 *                 type: string
 *               timezone:
 *                 type: string
 *               address:
 *                 type: object
 *               contact:
 *                 type: object
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Company updated successfully
 *       403:
 *         description: Forbidden
 */
router.put('/', [
  auth,
  authorize('admin'),
  body('name').optional().notEmpty().withMessage('Company name is required'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const company = await Company.findById(req.user.company);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const { name, country, currency, timezone, address, contact, settings } = req.body;

    if (name) company.name = name;
    if (country) company.country = country;
    if (currency) company.currency = currency;
    if (timezone) company.timezone = timezone;
    if (address) company.address = { ...company.address, ...address };
    if (contact) company.contact = { ...company.contact, ...contact };
    if (settings) company.settings = { ...company.settings, ...settings };

    await company.save();

    res.json({
      message: 'Company updated successfully',
      company
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
