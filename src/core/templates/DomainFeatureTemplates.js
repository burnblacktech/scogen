/**
 * Domain Feature Templates
 * 
 * Detailed feature-level templates for common project domains
 * Expands minimal user input into complete feature lists with hours, complexity, and descriptions
 */

class DomainFeatureTemplates {
  /**
   * Get template for a domain
   * @param {string} domain - Domain identifier
   * @returns {Object|null} Domain template or null if not found
   */
  static getTemplate(domain) {
    const normalizedDomain = domain.toLowerCase().trim();
    const templates = this.getAllTemplates();
    
    // Direct match
    if (templates[normalizedDomain]) {
      return templates[normalizedDomain];
    }
    
    // Alias matching
    const aliases = {
      'payroll': 'payroll',
      'salary': 'payroll',
      'wages': 'payroll',
      'employee payment': 'payroll',
      'inventory': 'inventory',
      'stock': 'inventory',
      'warehouse': 'inventory',
      'stock management': 'inventory',
      'ecommerce': 'ecommerce',
      'e-commerce': 'ecommerce',
      'online store': 'ecommerce',
      'shopping': 'ecommerce',
      'crm': 'crm',
      'customer relationship': 'crm',
      'sales management': 'crm',
      'lms': 'lms',
      'learning management': 'lms',
      'e-learning': 'lms',
      'education': 'lms',
      'learning': 'lms',
      'healthcare': 'healthcare',
      'hospital': 'healthcare',
      'clinic': 'healthcare',
      'medical': 'healthcare',
      'patient': 'healthcare',
      'doctor': 'healthcare',
      'ehr': 'healthcare',
      'emr': 'healthcare',
      'telemedicine': 'healthcare',
      'finance': 'finance',
      'fintech': 'finance',
      'banking': 'finance',
      'payment': 'finance',
      'wallet': 'finance',
      'loan': 'finance',
      'investment': 'finance',
      'mutual fund': 'finance',
      'real estate': 'realestate',
      'realestate': 'realestate',
      'property': 'realestate',
      'housing': 'realestate',
      'apartment': 'realestate',
      'builder': 'realestate',
      'rera': 'realestate'
    };
    
    if (aliases[normalizedDomain]) {
      return templates[aliases[normalizedDomain]];
    }
    
    return null;
  }

  /**
   * Get all available templates
   * @returns {Object} All templates keyed by domain
   */
  static getAllTemplates() {
    return {
      payroll: this.getPayrollTemplate(),
      inventory: this.getInventoryTemplate(),
      ecommerce: this.getEcommerceTemplate(),
      crm: this.getCRMTemplate(),
      lms: this.getLMSTemplate(),
      healthcare: this.getHealthcareTemplate(),
      finance: this.getFinanceTemplate(),
      realestate: this.getRealEstateTemplate()
    };
  }

  /**
   * Get list of available domains
   * @returns {Array<string>} List of domain identifiers
   */
  static getAllDomains() {
    return Object.keys(this.getAllTemplates());
  }

  /**
   * Match domain from input text
   * @param {string} inputText - User input text
   * @returns {string|null} Matched domain or null
   */
  static matchDomain(inputText) {
    const text = inputText.toLowerCase();
    const domains = this.getAllDomains();
    
    for (const domain of domains) {
      const template = this.getTemplate(domain);
      if (template && template.keywords) {
        for (const keyword of template.keywords) {
          if (text.includes(keyword)) {
            return domain;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Payroll System Template
   */
  static getPayrollTemplate() {
    return {
      domain: 'payroll',
      keywords: ['payroll', 'salary', 'wages', 'employee payment', 'payslip', 'form 16'],
      essential: [
        { name: 'Employee Master', category: 'core', hours: 20, complexity: 2, description: 'Employee database with personal, professional, banking details' },
        { name: 'Salary Structure', category: 'core', hours: 16, complexity: 3, description: 'CTC components, earnings, deductions' },
        { name: 'Payroll Processing', category: 'core', hours: 40, complexity: 4, description: 'Monthly salary calculation engine' },
        { name: 'Tax Calculation (TDS)', category: 'compliance', hours: 24, complexity: 4, description: 'Income tax calculation, regime selection' },
        { name: 'Statutory Compliance', category: 'compliance', hours: 32, complexity: 4, description: 'PF, ESI, PT calculation and reporting' },
        { name: 'Payslip Generation', category: 'reporting', hours: 12, complexity: 2, description: 'PDF payslips, email delivery' },
        { name: 'Form 16 Generation', category: 'compliance', hours: 16, complexity: 3, description: 'Annual tax certificate' },
        { name: 'Admin Dashboard', category: 'ui', hours: 24, complexity: 2, description: 'Payroll admin interface' }
      ],
      recommended: [
        { name: 'Attendance Integration', category: 'integration', hours: 20, complexity: 3, description: 'Link with attendance/leave system' },
        { name: 'Leave Management', category: 'hr', hours: 24, complexity: 3, description: 'Leave balance, accrual, encashment' },
        { name: 'Reimbursements', category: 'finance', hours: 16, complexity: 2, description: 'Expense claims, approvals' },
        { name: 'Loan Management', category: 'finance', hours: 20, complexity: 3, description: 'Advance, loan tracking, deductions' },
        { name: 'Employee Self-Service', category: 'ui', hours: 20, complexity: 2, description: 'View payslips, investment declarations' }
      ],
      optional: [
        { name: 'Mobile App', category: 'mobile', hours: 60, complexity: 3, description: 'iOS/Android app for employees' },
        { name: 'Biometric Integration', category: 'integration', hours: 16, complexity: 3, description: 'Integrate with biometric devices' },
        { name: 'Bank File Generation', category: 'integration', hours: 12, complexity: 2, description: 'NEFT/RTGS file formats' },
        { name: 'Multi-location Support', category: 'enterprise', hours: 24, complexity: 3, description: 'Multiple offices, state-wise PT' }
      ],
      compliance: ['PF', 'ESI', 'PT', 'TDS', 'Form 16', 'Form 24Q', 'Gratuity', 'Bonus Act'],
      integrations: ['Attendance System', 'HRMS', 'Accounting Software'],
      estimatedTimeline: { weeks: 12, developers: 3 },
      estimatedCost: { min: 600000, max: 1200000 }
    };
  }

  /**
   * Inventory Management Template
   */
  static getInventoryTemplate() {
    return {
      domain: 'inventory',
      keywords: ['inventory', 'stock', 'warehouse', 'products', 'stock management'],
      essential: [
        { name: 'Product Master', category: 'core', hours: 16, complexity: 2, description: 'SKU, categories, variants, pricing' },
        { name: 'Stock Management', category: 'core', hours: 32, complexity: 3, description: 'Stock in/out, current stock, alerts' },
        { name: 'Purchase Orders', category: 'procurement', hours: 24, complexity: 3, description: 'Create PO, vendor management, GRN' },
        { name: 'Sales Orders', category: 'sales', hours: 24, complexity: 3, description: 'Sales order processing, invoicing' },
        { name: 'Stock Adjustment', category: 'core', hours: 12, complexity: 2, description: 'Manual stock correction, reasons' },
        { name: 'Warehouse Management', category: 'core', hours: 20, complexity: 3, description: 'Multiple warehouses, bin locations' },
        { name: 'Reporting', category: 'reporting', hours: 20, complexity: 2, description: 'Stock reports, aging, valuation' }
      ],
      recommended: [
        { name: 'Barcode Scanning', category: 'hardware', hours: 16, complexity: 3, description: 'Barcode generation, scanning' },
        { name: 'Batch/Serial Tracking', category: 'core', hours: 24, complexity: 4, description: 'Batch numbers, expiry, serial tracking' },
        { name: 'Reorder Automation', category: 'automation', hours: 16, complexity: 3, description: 'Auto-generate PO on low stock' },
        { name: 'Multi-location Transfer', category: 'logistics', hours: 20, complexity: 3, description: 'Stock transfer between warehouses' }
      ],
      optional: [
        { name: 'Mobile App', category: 'mobile', hours: 60, complexity: 3, description: 'Mobile scanning, stock updates' },
        { name: 'Accounting Integration', category: 'integration', hours: 20, complexity: 3, description: 'Sync with Tally/Zoho' },
        { name: 'E-commerce Integration', category: 'integration', hours: 24, complexity: 3, description: 'Sync with online store' }
      ],
      compliance: ['GST', 'HSN Codes', 'E-way Bill'],
      integrations: ['Barcode Scanner', 'Accounting Software', 'E-commerce Platforms'],
      estimatedTimeline: { weeks: 10, developers: 3 },
      estimatedCost: { min: 500000, max: 1000000 }
    };
  }

  /**
   * E-commerce Platform Template
   */
  static getEcommerceTemplate() {
    return {
      domain: 'ecommerce',
      keywords: ['ecommerce', 'e-commerce', 'online store', 'shopping', 'cart', 'checkout'],
      essential: [
        { name: 'Product Catalog', category: 'catalog', hours: 32, complexity: 3, description: 'Products, categories, variants, images' },
        { name: 'Shopping Cart', category: 'cart', hours: 20, complexity: 3, description: 'Add to cart, quantity, remove' },
        { name: 'Checkout', category: 'checkout', hours: 24, complexity: 3, description: 'Address, shipping, payment' },
        { name: 'Payment Gateway', category: 'payment', hours: 16, complexity: 3, description: 'Razorpay/PayU integration' },
        { name: 'Order Management', category: 'orders', hours: 28, complexity: 3, description: 'Order processing, status, tracking' },
        { name: 'Customer Accounts', category: 'users', hours: 20, complexity: 2, description: 'Registration, login, profile' },
        { name: 'Admin Panel', category: 'admin', hours: 32, complexity: 3, description: 'Product, order, customer management' }
      ],
      recommended: [
        { name: 'Search & Filters', category: 'search', hours: 20, complexity: 3, description: 'Product search, faceted filters' },
        { name: 'Reviews & Ratings', category: 'social', hours: 16, complexity: 2, description: 'Customer reviews, ratings' },
        { name: 'Wishlist', category: 'engagement', hours: 12, complexity: 2, description: 'Save for later' },
        { name: 'Coupons & Discounts', category: 'marketing', hours: 20, complexity: 3, description: 'Promo codes, discounts' },
        { name: 'Inventory Sync', category: 'inventory', hours: 16, complexity: 3, description: 'Real-time stock updates' }
      ],
      optional: [
        { name: 'Mobile App', category: 'mobile', hours: 80, complexity: 4, description: 'Native iOS/Android app' },
        { name: 'Multi-vendor', category: 'marketplace', hours: 60, complexity: 4, description: 'Multiple sellers, commissions' },
        { name: 'Email Marketing', category: 'marketing', hours: 16, complexity: 2, description: 'Newsletters, abandoned cart' }
      ],
      compliance: ['GST', 'PCI DSS', 'Privacy Policy', 'Terms & Conditions'],
      integrations: ['Razorpay', 'Shiprocket', 'SMS Gateway', 'Email Service'],
      estimatedTimeline: { weeks: 14, developers: 4 },
      estimatedCost: { min: 800000, max: 1500000 }
    };
  }

  /**
   * CRM System Template
   */
  static getCRMTemplate() {
    return {
      domain: 'crm',
      keywords: ['crm', 'customer relationship', 'leads', 'sales', 'customer management'],
      essential: [
        { name: 'Contact Management', category: 'contacts', hours: 20, complexity: 2, description: 'Leads, contacts, companies' },
        { name: 'Deal Pipeline', category: 'sales', hours: 28, complexity: 3, description: 'Opportunity tracking, stages' },
        { name: 'Activity Tracking', category: 'activities', hours: 20, complexity: 2, description: 'Calls, meetings, notes' },
        { name: 'Task Management', category: 'tasks', hours: 16, complexity: 2, description: 'To-dos, reminders, assignments' },
        { name: 'Email Integration', category: 'email', hours: 24, complexity: 3, description: 'Email tracking, templates' },
        { name: 'Reporting Dashboard', category: 'reporting', hours: 24, complexity: 3, description: 'Sales reports, funnels' }
      ],
      recommended: [
        { name: 'Workflow Automation', category: 'automation', hours: 28, complexity: 4, description: 'Auto-assign, notifications' },
        { name: 'Custom Fields', category: 'customization', hours: 16, complexity: 3, description: 'User-defined fields' },
        { name: 'Document Management', category: 'documents', hours: 20, complexity: 2, description: 'Attach files, proposals' },
        { name: 'Mobile App', category: 'mobile', hours: 60, complexity: 3, description: 'Access CRM on mobile' }
      ],
      optional: [
        { name: 'WhatsApp Integration', category: 'integration', hours: 16, complexity: 3, description: 'WhatsApp Business API' },
        { name: 'Telephony Integration', category: 'integration', hours: 20, complexity: 3, description: 'Call logging, recording' }
      ],
      compliance: [],
      integrations: ['Email (IMAP/SMTP)', 'Calendar', 'WhatsApp', 'Telephony'],
      estimatedTimeline: { weeks: 10, developers: 3 },
      estimatedCost: { min: 500000, max: 1000000 }
    };
  }

  /**
   * Learning Management System Template
   */
  static getLMSTemplate() {
    return {
      domain: 'lms',
      keywords: ['lms', 'learning management', 'e-learning', 'education', 'learning', 'courses'],
      essential: [
        { name: 'Course Management', category: 'courses', hours: 28, complexity: 3, description: 'Create courses, lessons, modules' },
        { name: 'Content Upload', category: 'content', hours: 20, complexity: 2, description: 'Video, PDF, SCORM support' },
        { name: 'Student Enrollment', category: 'students', hours: 16, complexity: 2, description: 'Enroll, track progress' },
        { name: 'Video Player', category: 'media', hours: 20, complexity: 3, description: 'Streaming, progress tracking' },
        { name: 'Assessments', category: 'assessment', hours: 32, complexity: 4, description: 'Quizzes, assignments, grading' },
        { name: 'Certificates', category: 'certification', hours: 16, complexity: 2, description: 'Auto-generate on completion' },
        { name: 'Student Dashboard', category: 'ui', hours: 20, complexity: 2, description: 'My courses, progress' }
      ],
      recommended: [
        { name: 'Discussion Forums', category: 'social', hours: 24, complexity: 3, description: 'Course discussions, Q&A' },
        { name: 'Live Classes', category: 'live', hours: 28, complexity: 4, description: 'Zoom/Teams integration' },
        { name: 'Payment Gateway', category: 'payment', hours: 16, complexity: 3, description: 'Course purchases' },
        { name: 'Mobile App', category: 'mobile', hours: 60, complexity: 3, description: 'Learn on mobile' }
      ],
      optional: [
        { name: 'Gamification', category: 'engagement', hours: 20, complexity: 3, description: 'Badges, points, leaderboard' },
        { name: 'White-label', category: 'customization', hours: 24, complexity: 3, description: 'Custom branding' }
      ],
      compliance: ['SCORM', 'Data Privacy'],
      integrations: ['Zoom', 'YouTube', 'Razorpay', 'AWS S3'],
      estimatedTimeline: { weeks: 12, developers: 3 },
      estimatedCost: { min: 600000, max: 1200000 }
    };
  }

  /**
   * Healthcare Management System Template
   */
  static getHealthcareTemplate() {
    return {
      domain: 'healthcare',
      keywords: ['hospital', 'clinic', 'healthcare', 'medical', 'patient', 'doctor', 'ehr', 'emr', 'telemedicine'],
      essential: [
        { name: 'Patient Registration', category: 'core', hours: 24, complexity: 3, description: 'Patient demographics, medical history, insurance details, emergency contacts' },
        { name: 'Appointment Scheduling', category: 'core', hours: 28, complexity: 3, description: 'Book appointments, manage doctor availability, send reminders' },
        { name: 'Electronic Medical Records (EMR)', category: 'core', hours: 60, complexity: 5, description: 'Patient medical records, diagnosis, prescriptions, lab results, history' },
        { name: 'Prescription Management', category: 'clinical', hours: 32, complexity: 4, description: 'Generate prescriptions, drug database, interaction warnings, refills' },
        { name: 'Billing & Insurance', category: 'finance', hours: 40, complexity: 4, description: 'Generate bills, insurance claims, payment processing, invoicing' },
        { name: 'Lab Management', category: 'clinical', hours: 36, complexity: 4, description: 'Lab test ordering, result entry, report generation, integration' },
        { name: 'Doctor Dashboard', category: 'ui', hours: 28, complexity: 3, description: 'Doctor interface with patient queue, EMR access, quick actions' },
        { name: 'Pharmacy Management', category: 'pharmacy', hours: 32, complexity: 3, description: 'Medicine inventory, dispensing, stock alerts, expiry tracking' }
      ],
      recommended: [
        { name: 'PACS Integration', category: 'integration', hours: 40, complexity: 5, description: 'Integrate with imaging systems (X-ray, MRI, CT scan)' },
        { name: 'Telemedicine', category: 'telehealth', hours: 48, complexity: 4, description: 'Video consultations, chat, virtual waiting room, recording' },
        { name: 'Patient Portal', category: 'ui', hours: 32, complexity: 3, description: 'Patients view records, book appointments, download reports' },
        { name: 'SMS/Email Reminders', category: 'communication', hours: 16, complexity: 2, description: 'Automated appointment reminders, medication reminders' },
        { name: 'Bed Management', category: 'inpatient', hours: 24, complexity: 3, description: 'Ward allocation, bed availability, occupancy tracking' },
        { name: 'Reporting & Analytics', category: 'reporting', hours: 28, complexity: 3, description: 'Patient statistics, revenue reports, doctor performance' }
      ],
      optional: [
        { name: 'Mobile App (Patient)', category: 'mobile', hours: 80, complexity: 4, description: 'iOS/Android app for patients' },
        { name: 'Mobile App (Doctor)', category: 'mobile', hours: 80, complexity: 4, description: 'iOS/Android app for doctors' },
        { name: 'HL7 Integration', category: 'integration', hours: 60, complexity: 5, description: 'HL7 FHIR standard integration with external systems' },
        { name: 'Wearable Device Integration', category: 'iot', hours: 48, complexity: 4, description: 'Integrate vitals from smartwatches, glucose monitors' },
        { name: 'AI Diagnosis Assistant', category: 'ai', hours: 120, complexity: 5, description: 'AI-powered diagnosis suggestions based on symptoms' }
      ],
      compliance: ['HIPAA', 'NABH', 'Clinical Establishment Act', 'Data Privacy', 'Medical Council Regulations'],
      integrations: ['PACS', 'Lab Systems', 'Payment Gateway', 'SMS Gateway', 'Video Conferencing'],
      estimatedTimeline: { weeks: 20, developers: 5 },
      estimatedCost: { min: 1500000, max: 3000000 }
    };
  }

  /**
   * Finance/FinTech Platform Template
   */
  static getFinanceTemplate() {
    return {
      domain: 'finance',
      keywords: ['fintech', 'banking', 'finance', 'payment', 'wallet', 'loan', 'investment', 'mutual fund'],
      essential: [
        { name: 'User KYC & Onboarding', category: 'compliance', hours: 40, complexity: 4, description: 'KYC verification, Aadhaar integration, video KYC, document upload' },
        { name: 'Account Management', category: 'core', hours: 32, complexity: 4, description: 'Virtual accounts, wallet, balance tracking, transaction limits' },
        { name: 'Payment Processing', category: 'payments', hours: 48, complexity: 5, description: 'UPI, NEFT, RTGS, IMPS integration, payment gateway' },
        { name: 'Transaction History', category: 'core', hours: 24, complexity: 3, description: 'Transaction listing, search, filter, export, statements' },
        { name: 'Security & Authentication', category: 'security', hours: 40, complexity: 5, description: '2FA, OTP, biometric, device fingerprinting, fraud detection' },
        { name: 'Admin Dashboard', category: 'admin', hours: 36, complexity: 3, description: 'User management, transaction monitoring, reports, settings' },
        { name: 'Regulatory Reporting', category: 'compliance', hours: 32, complexity: 4, description: 'RBI reporting, AML checks, suspicious transaction reporting' }
      ],
      recommended: [
        { name: 'Investment Module', category: 'investment', hours: 60, complexity: 5, description: 'Mutual funds, stocks, SIP, portfolio tracking, recommendations' },
        { name: 'Loan Management', category: 'lending', hours: 56, complexity: 5, description: 'Loan application, credit scoring, EMI calculation, repayment tracking' },
        { name: 'Bill Payments', category: 'payments', hours: 32, complexity: 3, description: 'BBPS integration, electricity, mobile, DTH, broadband bills' },
        { name: 'Rewards & Cashback', category: 'engagement', hours: 24, complexity: 3, description: 'Points system, cashback offers, referral rewards' },
        { name: 'Financial Analytics', category: 'analytics', hours: 28, complexity: 4, description: 'Spend analysis, budgeting, savings goals, insights' },
        { name: 'Card Management', category: 'cards', hours: 40, complexity: 4, description: 'Virtual/physical cards, limits, freeze/unfreeze, PIN management' }
      ],
      optional: [
        { name: 'Mobile Banking App', category: 'mobile', hours: 100, complexity: 4, description: 'iOS/Android app with biometric, push notifications' },
        { name: 'API Banking', category: 'api', hours: 48, complexity: 4, description: 'Open banking APIs for third-party integrations' },
        { name: 'Cryptocurrency Support', category: 'crypto', hours: 80, complexity: 5, description: 'Buy/sell/hold crypto, wallet, exchange integration' },
        { name: 'Robo-Advisory', category: 'ai', hours: 100, complexity: 5, description: 'AI-powered investment recommendations, portfolio rebalancing' }
      ],
      compliance: ['RBI Guidelines', 'KYC/AML', 'PCI DSS', 'ISO 27001', 'Data Localization'],
      integrations: ['UPI', 'Payment Gateway', 'NPCI', 'CKYC', 'BSE/NSE APIs', 'Aadhaar'],
      estimatedTimeline: { weeks: 24, developers: 6 },
      estimatedCost: { min: 2000000, max: 5000000 }
    };
  }

  /**
   * Real Estate Management System Template
   */
  static getRealEstateTemplate() {
    return {
      domain: 'realestate',
      keywords: ['real estate', 'property', 'realestate', 'housing', 'apartment', 'builder', 'rera'],
      essential: [
        { name: 'Property Listing', category: 'core', hours: 32, complexity: 3, description: 'Property details, photos, videos, floor plans, pricing, amenities' },
        { name: 'Search & Filters', category: 'search', hours: 28, complexity: 4, description: 'Advanced search with filters (location, price, size, type, amenities)' },
        { name: 'Lead Management', category: 'crm', hours: 32, complexity: 3, description: 'Capture leads, track inquiries, follow-ups, assign to agents' },
        { name: 'Agent Management', category: 'core', hours: 24, complexity: 3, description: 'Agent profiles, property assignment, commission tracking' },
        { name: 'Property Comparison', category: 'ui', hours: 16, complexity: 2, description: 'Side-by-side property comparison, save favorites' },
        { name: 'Site Visit Scheduling', category: 'scheduling', hours: 20, complexity: 3, description: 'Book site visits, manage availability, reminders' },
        { name: 'Document Management', category: 'documents', hours: 24, complexity: 3, description: 'Upload property documents, agreements, NOCs, approvals' }
      ],
      recommended: [
        { name: 'Interactive Map', category: 'maps', hours: 24, complexity: 3, description: 'Google Maps integration, nearby places, locality info' },
        { name: 'Virtual Tours', category: 'media', hours: 32, complexity: 4, description: '360° virtual tours, video walkthroughs, 3D floor plans' },
        { name: 'EMI Calculator', category: 'finance', hours: 12, complexity: 2, description: 'Loan EMI calculator with bank rates, eligibility check' },
        { name: 'Customer Portal', category: 'ui', hours: 28, complexity: 3, description: 'Customer dashboard with saved searches, alerts, bookings' },
        { name: 'Email/SMS Campaigns', category: 'marketing', hours: 20, complexity: 3, description: 'Send property updates, newsletters, promotions to leads' },
        { name: 'Payment Integration', category: 'payments', hours: 20, complexity: 3, description: 'Token amount, booking payments, payment gateway integration' },
        { name: 'Reporting & Analytics', category: 'reporting', hours: 24, complexity: 3, description: 'Lead conversion, property performance, agent performance' }
      ],
      optional: [
        { name: 'Mobile App', category: 'mobile', hours: 80, complexity: 4, description: 'iOS/Android app for property search and management' },
        { name: 'AI Property Recommendations', category: 'ai', hours: 60, complexity: 5, description: 'AI-powered property recommendations based on preferences' },
        { name: 'Chatbot', category: 'ai', hours: 32, complexity: 3, description: 'WhatsApp/web chatbot for property inquiries' },
        { name: 'Multi-language Support', category: 'i18n', hours: 24, complexity: 3, description: 'Support for Hindi, regional languages' },
        { name: 'Rental Management', category: 'rental', hours: 48, complexity: 4, description: 'Rent collection, tenant management, maintenance requests' }
      ],
      compliance: ['RERA', 'GST', 'Data Privacy'],
      integrations: ['Google Maps', 'Payment Gateway', 'SMS Gateway', 'Email Service', 'WhatsApp Business'],
      estimatedTimeline: { weeks: 14, developers: 4 },
      estimatedCost: { min: 800000, max: 1800000 }
    };
  }

  /**
   * Match features based on input text
   * Analyzes user input to determine which recommended/optional features to include
   * @param {string} inputText - User input text
   * @param {Object} template - Domain template
   * @returns {Object} Matched features with inclusion flags
   */
  static matchFeatures(inputText, template) {
    const text = inputText.toLowerCase();
    const matched = {
      essential: template.essential.map(f => ({ ...f, included: true, source: 'template' })),
      recommended: [],
      optional: []
    };

    // Check for exclusion keywords
    const exclusionKeywords = ['no ', 'without ', 'exclude ', 'not need', "don't need", 'skip '];
    const hasExclusions = exclusionKeywords.some(keyword => text.includes(keyword));

    // Match recommended features
    for (const feature of template.recommended || []) {
      let included = false;
      
      // Check if feature name or description matches keywords in input
      const featureKeywords = [
        feature.name.toLowerCase(),
        ...feature.description.toLowerCase().split(' ')
      ];
      
      // Check for positive matches
      for (const keyword of featureKeywords) {
        if (keyword.length > 3 && text.includes(keyword)) {
          included = true;
          break;
        }
      }
      
      // Special matching for common features
      if (feature.name.toLowerCase().includes('attendance') && 
          (text.includes('attendance') || text.includes('employee') || /\d+\s*(employees?|staff)/.test(text))) {
        included = true;
      }
      
      if (feature.name.toLowerCase().includes('barcode') && text.includes('barcode')) {
        included = true;
      }
      
      if (feature.name.toLowerCase().includes('mobile') && text.includes('mobile')) {
        included = true;
      }

      // Healthcare-specific matching
      if (feature.name.toLowerCase().includes('telemedicine') && (text.includes('telemedicine') || text.includes('video consultation'))) {
        included = true;
      }
      if (feature.name.toLowerCase().includes('pacs') && text.includes('pacs')) {
        included = true;
      }
      if (feature.name.toLowerCase().includes('hl7') && text.includes('hl7')) {
        included = true;
      }
      if (feature.name.toLowerCase().includes('patient portal') && (text.includes('patient portal') || text.includes('patient access'))) {
        included = true;
      }

      // Finance-specific matching
      if (feature.name.toLowerCase().includes('upi') && text.includes('upi')) {
        included = true;
      }
      if (feature.name.toLowerCase().includes('loan') && text.includes('loan')) {
        included = true;
      }
      if (feature.name.toLowerCase().includes('investment') && (text.includes('investment') || text.includes('mutual fund'))) {
        included = true;
      }
      if (feature.name.toLowerCase().includes('crypto') && text.includes('crypto')) {
        included = true;
      }

      // Real Estate-specific matching
      if (feature.name.toLowerCase().includes('virtual tour') && (text.includes('virtual tour') || text.includes('3d'))) {
        included = true;
      }
      if (feature.name.toLowerCase().includes('emi') && (text.includes('emi') || text.includes('loan calculator'))) {
        included = true;
      }
      if (feature.name.toLowerCase().includes('map') && (text.includes('map') || text.includes('location'))) {
        included = true;
      }
      if (feature.name.toLowerCase().includes('rental') && text.includes('rental')) {
        included = true;
      }

      matched.recommended.push({
        ...feature,
        included: included,
        source: 'template'
      });
    }

    // Match optional features
    for (const feature of template.optional || []) {
      let included = false;
      
      // Check exclusion first
      const featureNameLower = feature.name.toLowerCase();
      if (hasExclusions) {
        // Check if this feature is explicitly excluded
        if (featureNameLower.includes('mobile') && 
            (text.includes('no mobile') || text.includes('without mobile') || text.includes('exclude mobile'))) {
          included = false;
        } else {
          // Check for positive matches
          const featureKeywords = [
            feature.name.toLowerCase(),
            ...feature.description.toLowerCase().split(' ')
          ];
          
          for (const keyword of featureKeywords) {
            if (keyword.length > 3 && text.includes(keyword)) {
              included = true;
              break;
            }
          }
        }
      } else {
        // No exclusions, check for positive matches
        const featureKeywords = [
          feature.name.toLowerCase(),
          ...feature.description.toLowerCase().split(' ')
        ];
        
        for (const keyword of featureKeywords) {
          if (keyword.length > 3 && text.includes(keyword)) {
            included = true;
            break;
          }
        }
      }

      matched.optional.push({
        ...feature,
        included: included,
        source: 'template'
      });
    }

    return matched;
  }
}

module.exports = DomainFeatureTemplates;

