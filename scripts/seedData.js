const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Company = require('../models/Company');
const Expense = require('../models/Expense');
const Approval = require('../models/Approval');

// Sample data
const sampleCompanies = [
  {
    name: 'TechCorp Solutions',
    country: 'United States',
    currency: 'USD',
    timezone: 'America/New_York',
    address: {
      street: '123 Tech Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'United States'
    },
    contact: {
      email: 'contact@techcorp.com',
      phone: '+1-555-0123',
      website: 'https://techcorp.com'
    },
    settings: {
      approvalRules: 'percentage',
      percentageThreshold: 60,
      specificApprovers: [],
      requireReceipt: true,
      maxExpenseAmount: 10000
    }
  },
  {
    name: 'Global Innovations Ltd',
    country: 'United Kingdom',
    currency: 'GBP',
    timezone: 'Europe/London',
    address: {
      street: '456 Innovation Avenue',
      city: 'London',
      state: 'England',
      zipCode: 'SW1A 1AA',
      country: 'United Kingdom'
    },
    contact: {
      email: 'info@globalinnovations.co.uk',
      phone: '+44-20-7946-0958',
      website: 'https://globalinnovations.co.uk'
    },
    settings: {
      approvalRules: 'hybrid',
      percentageThreshold: 70,
      specificApprovers: [],
      requireReceipt: false,
      maxExpenseAmount: 15000
    }
  }
];

const sampleUsers = [
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@techcorp.com',
    password: 'password123',
    role: 'admin',
    phone: '+1-555-0101',
    department: 'IT'
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@techcorp.com',
    password: 'password123',
    role: 'manager',
    phone: '+1-555-0102',
    department: 'Finance'
  },
  {
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'mike.johnson@techcorp.com',
    password: 'password123',
    role: 'employee',
    phone: '+1-555-0103',
    department: 'Sales'
  },
  {
    firstName: 'Sarah',
    lastName: 'Wilson',
    email: 'sarah.wilson@techcorp.com',
    password: 'password123',
    role: 'employee',
    phone: '+1-555-0104',
    department: 'Marketing'
  },
  {
    firstName: 'David',
    lastName: 'Brown',
    email: 'david.brown@techcorp.com',
    password: 'password123',
    role: 'manager',
    phone: '+1-555-0105',
    department: 'Operations'
  }
];

const sampleExpenses = [
  {
    amount: 150.00,
    currency: 'USD',
    category: 'travel',
    description: 'Flight to client meeting in New York',
    expenseDate: new Date('2024-01-15'),
    tags: ['client-meeting', 'travel']
  },
  {
    amount: 75.50,
    currency: 'USD',
    category: 'meals',
    description: 'Business dinner with potential client',
    expenseDate: new Date('2024-01-16'),
    tags: ['client-meeting', 'entertainment']
  },
  {
    amount: 200.00,
    currency: 'USD',
    category: 'accommodation',
    description: 'Hotel stay for conference',
    expenseDate: new Date('2024-01-17'),
    tags: ['conference', 'travel']
  },
  {
    amount: 45.00,
    currency: 'USD',
    category: 'transportation',
    description: 'Taxi rides during business trip',
    expenseDate: new Date('2024-01-18'),
    tags: ['travel', 'transportation']
  },
  {
    amount: 120.00,
    currency: 'USD',
    category: 'office_supplies',
    description: 'Office supplies for new project',
    expenseDate: new Date('2024-01-19'),
    tags: ['office', 'supplies']
  },
  {
    amount: 300.00,
    currency: 'USD',
    category: 'training',
    description: 'Professional development course',
    expenseDate: new Date('2024-01-20'),
    tags: ['training', 'development']
  },
  {
    amount: 85.00,
    currency: 'USD',
    category: 'meals',
    description: 'Team lunch meeting',
    expenseDate: new Date('2024-01-21'),
    tags: ['team', 'meeting']
  },
  {
    amount: 250.00,
    currency: 'USD',
    category: 'entertainment',
    description: 'Client entertainment event',
    expenseDate: new Date('2024-01-22'),
    tags: ['client', 'entertainment']
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-management');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Company.deleteMany({});
    await Expense.deleteMany({});
    await Approval.deleteMany({});
    console.log('Cleared existing data');

    // Create companies
    const companies = await Company.insertMany(sampleCompanies);
    console.log(`Created ${companies.length} companies`);

    // Create users
    const users = [];
    for (let i = 0; i < sampleUsers.length; i++) {
      const userData = { ...sampleUsers[i] };
      userData.company = companies[0]._id; // Assign to first company
      
      // Set manager relationships
      if (userData.role === 'employee' && i > 1) {
        const manager = users.find(u => u.role === 'manager');
        if (manager) {
          userData.manager = manager._id;
        }
      }

      const user = new User(userData);
      await user.save();
      users.push(user);
    }
    console.log(`Created ${users.length} users`);

    // Create expenses
    const expenses = [];
    for (let i = 0; i < sampleExpenses.length; i++) {
      const expenseData = { ...sampleExpenses[i] };
      expenseData.employee = users[2 + (i % 3)]._id; // Assign to employees
      expenseData.company = companies[0]._id;
      expenseData.convertedAmount = expenseData.amount; // Same currency for now
      expenseData.companyCurrency = companies[0].currency;
      expenseData.exchangeRate = 1;
      expenseData.status = ['pending', 'approved', 'rejected'][i % 3];
      expenseData.approvalLevel = 1;
      expenseData.totalApprovalLevels = 3;
      expenseData.tags = expenseData.tags || [];
      expenseData.isReimbursable = true;

      const expense = new Expense(expenseData);
      await expense.save();
      expenses.push(expense);
    }
    console.log(`Created ${expenses.length} expenses`);

    // Create approvals for pending expenses
    const pendingExpenses = expenses.filter(e => e.status === 'pending');
    for (const expense of pendingExpenses) {
      const manager = users.find(u => u.role === 'manager');
      if (manager) {
        const approval = new Approval({
          expense: expense._id,
          approver: manager._id,
          level: 1,
          status: 'pending',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        });
        await approval.save();

        expense.currentApprover = manager._id;
        await expense.save();
      }
    }
    console.log(`Created approvals for ${pendingExpenses.length} pending expenses`);

    console.log('Database seeded successfully!');
    console.log('\nSample login credentials:');
    console.log('Admin: john.doe@techcorp.com / password123');
    console.log('Manager: jane.smith@techcorp.com / password123');
    console.log('Employee: mike.johnson@techcorp.com / password123');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seeder
seedDatabase();
