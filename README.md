# Expense Management System

A comprehensive MERN stack application for managing employee expense claims with multi-level approval workflows, currency conversion, and role-based access control.

## 🚀 Features

### Core Functionality
- **User Authentication & Management**: JWT-based authentication with role-based access control
- **Expense Submission**: Employees can submit expense claims with receipt uploads
- **Multi-level Approval Workflow**: Configurable approval process (Manager → Finance → Director)
- **Currency Conversion**: Real-time currency conversion using external APIs
- **Role-based Dashboards**: Different views for Admin, Manager, and Employee roles
- **Receipt Management**: Upload and manage expense receipts
- **Company Management**: Admin can manage company settings and users

### Advanced Features
- **Conditional Approval Rules**: Percentage-based, specific approver, or hybrid approval systems
- **Real-time Currency Conversion**: Automatic conversion to company currency
- **Responsive Design**: Mobile-friendly interface built with TailwindCSS
- **API Documentation**: Swagger/OpenAPI documentation included
- **File Upload**: Receipt upload with validation
- **Data Visualization**: Charts and graphs for expense analytics

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Multer** for file uploads
- **Swagger** for API documentation
- **Axios** for external API calls

### Frontend
- **React 18** with TypeScript
- **TailwindCSS** for styling
- **React Router** for navigation
- **React Hook Form** for form management
- **Recharts** for data visualization
- **Lucide React** for icons

### External APIs
- **Exchange Rate API** for currency conversion
- **REST Countries API** for country and currency data

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Backend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/expense-management
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d
   EXCHANGE_RATE_API=https://api.exchangerate-api.com/v4/latest
   COUNTRIES_API=https://restcountries.com/v3.1/all?fields=name,currencies
   ```

3. **Start MongoDB**:
   ```bash
   # Make sure MongoDB is running on your system
   mongod
   ```

4. **Start the server**:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to client directory**:
   ```bash
   cd client
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

### Full Stack Development

To run both backend and frontend simultaneously:

```bash
# From the root directory
npm run dev:full
```

## 🗄️ Database Schema

### Users Collection
- Personal information (name, email, phone)
- Role (admin, manager, employee)
- Company association
- Manager relationship
- Account status

### Companies Collection
- Company details (name, country, currency)
- Address and contact information
- Approval settings and rules
- Configuration options

### Expenses Collection
- Expense details (amount, category, description)
- Currency conversion data
- Receipt information
- Approval status and history
- OCR data (for future implementation)

### Approvals Collection
- Approval workflow tracking
- Approver information
- Status and comments
- Due dates and reminders

## 🔐 Authentication & Authorization

### User Roles

1. **Admin**
   - Full system access
   - User management
   - Company settings
   - Override approvals
   - View all expenses

2. **Manager**
   - Approve/reject team expenses
   - View team member expenses
   - Manage team members

3. **Employee**
   - Submit expense claims
   - View own expenses
   - Upload receipts

### API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

#### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create user (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

#### Expenses
- `GET /api/expenses` - Get expenses
- `POST /api/expenses` - Create expense
- `GET /api/expenses/:id` - Get expense by ID
- `PUT /api/expenses/:id` - Update expense
- `POST /api/expenses/:id/receipt` - Upload receipt

#### Approvals
- `GET /api/approvals` - Get pending approvals
- `POST /api/approvals/:id/approve` - Approve expense
- `POST /api/approvals/:id/reject` - Reject expense
- `GET /api/approvals/stats` - Get approval statistics

#### Companies
- `GET /api/companies` - Get company details
- `PUT /api/companies` - Update company (Admin only)

#### Currencies
- `GET /api/currencies/countries` - Get countries and currencies
- `POST /api/currencies/convert` - Convert currency
- `GET /api/currencies/rates` - Get exchange rates

## 📊 API Documentation

Once the server is running, visit `http://localhost:5000/api-docs` to view the interactive Swagger documentation.

## 🎨 UI Components

### Dashboard
- Role-based statistics
- Expense charts and graphs
- Recent expenses
- Pending approvals (for managers/admins)

### Expense Management
- Create/edit expenses
- File upload for receipts
- Filter and search functionality
- Currency conversion

### Approval Workflow
- Pending approvals list
- Approve/reject with comments
- Approval history
- Status tracking

### User Management (Admin)
- Create/edit users
- Assign roles and managers
- User status management

### Settings
- Company information
- Approval rules configuration
- Currency and timezone settings

## 🔧 Configuration

### Approval Rules

1. **Percentage-based**: Requires a certain percentage of approvers to approve
2. **Specific Approvers**: Requires specific users to approve
3. **Hybrid**: Combines percentage and specific approver rules

### Currency Support

The system supports automatic currency conversion using the Exchange Rate API. All expenses are converted to the company's base currency for reporting and approval.

## 🚀 Deployment

### Backend Deployment

1. **Environment Variables**: Set production environment variables
2. **Database**: Use MongoDB Atlas or your preferred MongoDB hosting
3. **File Storage**: Configure file upload storage (AWS S3, etc.)
4. **Server**: Deploy to Heroku, AWS, DigitalOcean, etc.

### Frontend Deployment

1. **Build**: `npm run build`
2. **Hosting**: Deploy to Netlify, Vercel, or your preferred hosting service
3. **Environment**: Set `REACT_APP_API_URL` to your backend URL

## 🧪 Testing

### Sample Data

The application includes sample data for testing:

1. **Admin User**: Created automatically on first registration
2. **Sample Expenses**: Various categories and statuses
3. **Test Users**: Different roles for testing workflows

### Test Scenarios

1. **User Registration**: Test company creation and admin setup
2. **Expense Submission**: Test expense creation and currency conversion
3. **Approval Workflow**: Test multi-level approval process
4. **Role-based Access**: Test different user permissions

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- File upload security
- CORS configuration

