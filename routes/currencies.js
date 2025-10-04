const express = require('express');
const axios = require('axios');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/currencies/countries:
 *   get:
 *     summary: Get list of countries and their currencies
 *     tags: [Currencies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of countries with currencies
 */
router.get('/countries', auth, async (req, res) => {
  try {
    const response = await axios.get(process.env.COUNTRIES_API);
    
    const countries = response.data.map(country => ({
      name: country.name.common,
      currency: country.currencies ? Object.keys(country.currencies)[0] : 'USD'
    }));

    res.json({ countries });
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({ message: 'Failed to fetch countries data' });
  }
});

/**
 * @swagger
 * /api/currencies/convert:
 *   post:
 *     summary: Convert currency
 *     tags: [Currencies]
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
 *               - from
 *               - to
 *             properties:
 *               amount:
 *                 type: number
 *               from:
 *                 type: string
 *               to:
 *                 type: string
 *     responses:
 *       200:
 *         description: Currency converted successfully
 *       400:
 *         description: Bad request
 */
router.post('/convert', auth, async (req, res) => {
  try {
    const { amount, from, to } = req.body;

    if (!amount || !from || !to) {
      return res.status(400).json({ message: 'Amount, from, and to currencies are required' });
    }

    if (from === to) {
      return res.json({
        amount,
        convertedAmount: amount,
        rate: 1,
        from,
        to
      });
    }

    const response = await axios.get(`${process.env.EXCHANGE_RATE_API}/${from}`);
    const rate = response.data.rates[to];

    if (!rate) {
      return res.status(400).json({ message: `Conversion rate not found for ${from} to ${to}` });
    }

    const convertedAmount = amount * rate;

    res.json({
      amount,
      convertedAmount: Math.round(convertedAmount * 100) / 100,
      rate: Math.round(rate * 10000) / 10000,
      from,
      to
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({ message: 'Failed to convert currency' });
  }
});

/**
 * @swagger
 * /api/currencies/rates:
 *   get:
 *     summary: Get exchange rates for a base currency
 *     tags: [Currencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: base
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Exchange rates
 */
router.get('/rates', auth, async (req, res) => {
  try {
    const { base } = req.query;

    if (!base) {
      return res.status(400).json({ message: 'Base currency is required' });
    }

    const response = await axios.get(`${process.env.EXCHANGE_RATE_API}/${base}`);
    
    res.json({
      base: response.data.base,
      rates: response.data.rates,
      date: response.data.date
    });
  } catch (error) {
    console.error('Get exchange rates error:', error);
    res.status(500).json({ message: 'Failed to fetch exchange rates' });
  }
});

module.exports = router;
