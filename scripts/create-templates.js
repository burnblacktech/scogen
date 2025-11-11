/**
 * Script to create Excel requirement templates
 * Run: node scripts/create-templates.js
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Ensure templates directory exists
const templatesDir = path.join(__dirname, '..', 'templates');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

/**
 * Create Web App Requirements Template
 */
function createWebAppTemplate() {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Basic Info
  const basicInfo = [
    ['Project Name', ''],
    ['Industry', ''],
    ['Scale', 'Startup / Small / Medium / Enterprise'],
    ['Target Timeline', ''],
    ['Budget Range (Optional)', ''],
    ['', ''],
    ['Notes:', 'Fill in the project name, industry, expected scale, and timeline']
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(basicInfo);
  XLSX.utils.book_append_sheet(workbook, ws1, 'Basic Info');

  // Sheet 2: User Types
  const userTypes = [
    ['User Type', 'Description', 'Permissions', 'Estimated Count'],
    ['Admin', 'System administrator with full access', 'All permissions', ''],
    ['Manager', 'Department manager with limited admin access', 'Department-level permissions', ''],
    ['User', 'Regular user with standard access', 'Standard permissions', ''],
    ['Guest', 'Guest user with read-only access', 'Read-only', ''],
    ['', '', '', ''],
    ['Notes:', 'List all user types, their roles, and expected number of users']
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(userTypes);
  XLSX.utils.book_append_sheet(workbook, ws2, 'User Types');

  // Sheet 3: Core Features
  const coreFeatures = [
    ['Feature', 'Description', 'Priority', 'Complexity', 'Notes'],
    ['User Authentication', 'Login, signup, password reset', 'Critical', 'Medium', ''],
    ['Dashboard', 'Main dashboard with widgets and analytics', 'Critical', 'Medium', ''],
    ['User Management', 'CRUD operations for users', 'High', 'Low', ''],
    ['Role Management', 'Assign roles and permissions', 'High', 'Medium', ''],
    ['Reports', 'Generate and export reports', 'Medium', 'Medium', ''],
    ['Notifications', 'Email/SMS notifications', 'Medium', 'Low', ''],
    ['', '', '', '', ''],
    ['Notes:', 'List all features, mark priority (Critical/High/Medium/Low) and complexity']
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(coreFeatures);
  XLSX.utils.book_append_sheet(workbook, ws3, 'Core Features');

  // Sheet 4: Integrations
  const integrations = [
    ['Integration Type', 'Service/Provider', 'Purpose', 'Required', 'Notes'],
    ['Payment Gateway', 'Razorpay / PayU / Stripe', 'Process payments', 'Yes/No', ''],
    ['SMS Service', 'Twilio / MSG91', 'Send SMS notifications', 'Yes/No', ''],
    ['Email Service', 'SendGrid / Mailchimp', 'Send emails', 'Yes/No', ''],
    ['Cloud Storage', 'AWS S3 / Google Cloud', 'Store files', 'Yes/No', ''],
    ['Analytics', 'Google Analytics / Mixpanel', 'Track usage', 'Yes/No', ''],
    ['', '', '', '', ''],
    ['Notes:', 'List all third-party integrations needed']
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(integrations);
  XLSX.utils.book_append_sheet(workbook, ws4, 'Integrations');

  // Sheet 5: Technical Preferences
  const techPrefs = [
    ['Category', 'Preference', 'Notes'],
    ['Frontend Framework', 'React / Vue / Angular / Plain HTML', ''],
    ['Backend Framework', 'Node.js / Python / Java / PHP', ''],
    ['Database', 'PostgreSQL / MySQL / MongoDB', ''],
    ['Hosting', 'AWS / Azure / Google Cloud / On-premise', ''],
    ['Mobile App', 'Native / React Native / Flutter / Web only', ''],
    ['', '', ''],
    ['Notes:', 'Specify technical preferences if you have any']
  ];
  const ws5 = XLSX.utils.aoa_to_sheet(techPrefs);
  XLSX.utils.book_append_sheet(workbook, ws5, 'Technical Preferences');

  // Write file
  const filePath = path.join(templatesDir, 'web-app-requirements.xlsx');
  XLSX.writeFile(workbook, filePath);
  console.log('✓ Created web-app-requirements.xlsx');
}

/**
 * Create E-commerce Requirements Template
 */
function createEcommerceTemplate() {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Business Model
  const businessModel = [
    ['Business Model', ''],
    ['B2C (Business to Consumer)', ''],
    ['B2B (Business to Business)', ''],
    ['Marketplace (Multi-vendor)', ''],
    ['Hybrid', ''],
    ['', ''],
    ['Notes:', 'Select your business model']
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(businessModel);
  XLSX.utils.book_append_sheet(workbook, ws1, 'Business Model');

  // Sheet 2: Product Catalog
  const productCatalog = [
    ['Category', 'Attributes', 'Variants', 'Estimated Products', 'Notes'],
    ['Electronics', 'Brand, Model, Color, Storage', 'Yes (Color, Storage)', '100-500', ''],
    ['Clothing', 'Size, Color, Material', 'Yes (Size, Color)', '500-1000', ''],
    ['Books', 'Author, ISBN, Format', 'No', '1000+', ''],
    ['', '', '', '', ''],
    ['Notes:', 'List product categories, their attributes, variants, and estimated count']
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(productCatalog);
  XLSX.utils.book_append_sheet(workbook, ws2, 'Product Catalog');

  // Sheet 3: Order Management
  const orderManagement = [
    ['Order Status', 'Description', 'Actions Required'],
    ['Pending', 'Order placed, payment pending', 'Wait for payment'],
    ['Confirmed', 'Payment received, order confirmed', 'Process order'],
    ['Processing', 'Order being prepared', 'Update status'],
    ['Shipped', 'Order shipped to customer', 'Send tracking'],
    ['Delivered', 'Order delivered', 'Request feedback'],
    ['Cancelled', 'Order cancelled', 'Process refund'],
    ['', '', ''],
    ['Notes:', 'Define order workflow and status transitions']
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(orderManagement);
  XLSX.utils.book_append_sheet(workbook, ws3, 'Order Management');

  // Sheet 4: Payment & Delivery
  const paymentDelivery = [
    ['Payment Method', 'Provider', 'Enabled', 'Notes'],
    ['Credit/Debit Card', 'Razorpay / PayU', 'Yes/No', ''],
    ['UPI', 'Razorpay / PayU', 'Yes/No', ''],
    ['Cash on Delivery (COD)', 'N/A', 'Yes/No', ''],
    ['Wallet', 'Paytm / PhonePe', 'Yes/No', ''],
    ['EMI', 'Razorpay / PayU', 'Yes/No', ''],
    ['', '', '', ''],
    ['Delivery Zones', 'Delivery Charges', 'Estimated Days', 'Notes'],
    ['Within City', 'Free / ₹50', '1-2 days', ''],
    ['State', '₹100-200', '3-5 days', ''],
    ['All India', '₹200-500', '5-7 days', ''],
    ['', '', '', ''],
    ['Notes:', 'Specify payment methods and delivery zones']
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(paymentDelivery);
  XLSX.utils.book_append_sheet(workbook, ws4, 'Payment & Delivery');

  // Sheet 5: Marketing Features
  const marketingFeatures = [
    ['Feature', 'Description', 'Required', 'Notes'],
    ['Discount Codes', 'Apply discount codes at checkout', 'Yes/No', ''],
    ['Coupons', 'Generate and manage coupons', 'Yes/No', ''],
    ['Loyalty Program', 'Points/rewards system', 'Yes/No', ''],
    ['Referral Program', 'Refer friends and earn rewards', 'Yes/No', ''],
    ['Email Campaigns', 'Send promotional emails', 'Yes/No', ''],
    ['SMS Campaigns', 'Send promotional SMS', 'Yes/No', ''],
    ['Product Reviews', 'Customer reviews and ratings', 'Yes/No', ''],
    ['Wishlist', 'Save products for later', 'Yes/No', ''],
    ['', '', '', ''],
    ['Notes:', 'List marketing features needed']
  ];
  const ws5 = XLSX.utils.aoa_to_sheet(marketingFeatures);
  XLSX.utils.book_append_sheet(workbook, ws5, 'Marketing Features');

  // Write file
  const filePath = path.join(templatesDir, 'ecommerce-requirements.xlsx');
  XLSX.writeFile(workbook, filePath);
  console.log('✓ Created ecommerce-requirements.xlsx');
}

// Create templates
console.log('Creating Excel templates...\n');
createWebAppTemplate();
createEcommerceTemplate();
console.log('\n✓ All templates created successfully!');

