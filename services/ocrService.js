const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');

class OCRService {
  constructor() {
    this.worker = null;
  }

  async initializeWorker() {
    if (!this.worker) {
      this.worker = await Tesseract.createWorker('eng');
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,-$/€£¥₹@#&()[]{}:;!?\'" ',
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      });
    }
    return this.worker;
  }

  async preprocessImage(imagePath) {
    try {
      const outputPath = imagePath.replace(/\.[^/.]+$/, '_processed.jpg');
      
      await sharp(imagePath)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: false })
        .sharpen()
        .normalize()
        .greyscale()
        .jpeg({ quality: 90 })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      console.error('Image preprocessing error:', error);
      return imagePath; // Return original if preprocessing fails
    }
  }

  async extractText(imagePath) {
    try {
      const worker = await this.initializeWorker();
      const processedImagePath = await this.preprocessImage(imagePath);
      
      const { data: { text } } = await worker.recognize(processedImagePath);
      
      // Clean up processed image
      if (processedImagePath !== imagePath) {
        const fs = require('fs');
        try {
          fs.unlinkSync(processedImagePath);
        } catch (err) {
          console.log('Could not delete processed image:', err.message);
        }
      }
      
      return text;
    } catch (error) {
      console.error('OCR extraction error:', error);
      throw new Error('Failed to extract text from receipt');
    }
  }

  parseReceiptData(text) {
    const data = {
      amount: null,
      date: null,
      description: '',
      merchant: '',
      category: 'other',
      items: []
    };

    // Extract amount (look for currency patterns)
    const amountPatterns = [
      /(?:total|amount|sum|due|balance)[\s:]*\$?(\d+\.?\d*)/i,
      /\$(\d+\.?\d*)/,
      /(\d+\.?\d*)\s*(?:USD|EUR|GBP|INR|CAD|AUD)/i,
      /(?:total|amount)[\s:]*(\d+\.?\d*)/i
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.amount = parseFloat(match[1]);
        break;
      }
    }

    // Extract date (look for date patterns)
    const datePatterns = [
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\s,]*(\d{1,2})[\s,]*(\d{2,4})/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          data.date = new Date(match[0]).toISOString().split('T')[0];
          break;
        } catch (e) {
          // Try alternative date parsing
          const dateStr = match[0];
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
              data.date = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
              break;
            }
          }
        }
      }
    }

    // Extract merchant name (usually at the top)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      // First non-empty line is often the merchant name
      data.merchant = lines[0].trim();
    }

    // Extract description (combine merchant and key details)
    const descriptionParts = [];
    if (data.merchant) {
      descriptionParts.push(data.merchant);
    }

    // Look for common receipt items
    const itemPatterns = [
      /(?:food|meal|lunch|dinner|breakfast|coffee|drink|beverage)/i,
      /(?:taxi|uber|lyft|transport|travel|flight|hotel)/i,
      /(?:office|supplies|stationery|equipment)/i,
      /(?:entertainment|movie|theater|concert)/i
    ];

    for (const pattern of itemPatterns) {
      const match = text.match(pattern);
      if (match) {
        descriptionParts.push(match[0]);
        break;
      }
    }

    data.description = descriptionParts.join(' - ');

    // Determine category based on content
    const categoryKeywords = {
      'meals': ['restaurant', 'food', 'meal', 'lunch', 'dinner', 'breakfast', 'coffee', 'cafe', 'bar', 'pub'],
      'travel': ['taxi', 'uber', 'lyft', 'flight', 'hotel', 'transport', 'travel', 'airline'],
      'transportation': ['gas', 'fuel', 'parking', 'metro', 'bus', 'train'],
      'office_supplies': ['office', 'supplies', 'stationery', 'equipment', 'computer', 'software'],
      'entertainment': ['movie', 'theater', 'concert', 'entertainment', 'game', 'sports'],
      'utilities': ['electricity', 'water', 'internet', 'phone', 'utility'],
      'communication': ['phone', 'internet', 'mobile', 'telecom', 'communication']
    };

    const textLower = text.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => textLower.includes(keyword))) {
        data.category = category;
        break;
      }
    }

    // Extract individual items (look for item lines with prices)
    const itemLines = lines.filter(line => {
      // Look for lines that might contain items with prices
      return /\d+\.?\d*\s*\$?/.test(line) && line.length > 5 && line.length < 100;
    });

    data.items = itemLines.slice(0, 5).map(line => ({
      description: line.trim(),
      amount: null // Could be enhanced to extract individual item prices
    }));

    return data;
  }

  async processReceipt(imagePath) {
    try {
      console.log('Starting OCR processing for:', imagePath);
      
      // Extract text from image
      const text = await this.extractText(imagePath);
      console.log('Extracted text:', text.substring(0, 200) + '...');
      
      // Parse the extracted text
      const parsedData = this.parseReceiptData(text);
      console.log('Parsed data:', parsedData);
      
      return {
        success: true,
        text,
        data: parsedData
      };
    } catch (error) {
      console.error('OCR processing error:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

module.exports = new OCRService();
