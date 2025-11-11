class LargeInputProcessor {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.threshold = this.config.get('inputProcessing.largeInputThreshold') || 30000;
    this.moduleKeywords = this.loadModuleKeywords();
  }

  /**
   * Main entry point - decide if processing needed
   */
  needsProcessing(input) {
    const length = input.length;
    const estimatedTokens = Math.ceil(length / 4);
    
    this.logger.info('Checking input size', { 
      characters: length,
      estimatedTokens: estimatedTokens,
      threshold: this.threshold 
    });
    return length > this.threshold || estimatedTokens > 7000;
  }

  /**
   * Process large input intelligently
   */
  async process(input) {
    console.log('\n========================================');
    console.log('LARGE INPUT PROCESSOR - DIAGNOSTIC MODE');
    console.log('========================================');
    console.log('Original input length:', input.length);
    console.log('Estimated tokens:', Math.ceil(input.length / 4));
    console.log('First 500 chars:');
    console.log(input.substring(0, 500));
    console.log('---');
    console.log('Last 500 chars:');
    console.log(input.substring(input.length - 500));
    console.log('========================================\n');

    this.logger.info('Processing large input', { 
      originalLength: input.length,
      estimatedTokens: Math.ceil(input.length / 4)
    });
    
    // Try Strategy C first (fastest for structured data)
    const structured = this.tryStructuredExtraction(input);
    
    console.log('\n========================================');
    console.log('STRUCTURED EXTRACTION RESULT:');
    console.log('Success:', structured.success);
    if (structured.success) {
      console.log('Features extracted:', structured.features.length);
      console.log('Categories found:', Object.keys(structured.grouped).length);
      console.log('Category breakdown:');
      Object.entries(structured.grouped).forEach(([cat, items]) => {
        console.log(`  ${cat}: ${items.length} items`);
      });
    } else {
      console.log('Structured extraction FAILED');
    }
    console.log('========================================\n');
    
    if (structured.success) {
      this.logger.info('Structured extraction successful', { 
        strategy: 'Template Matching',
        featuresExtracted: structured.features.length,
        categories: Object.keys(structured.grouped).length
      });
      
      const summary = this.structuredToSummary(structured.features, structured.grouped);
      
      console.log('\n========================================');
      console.log('GENERATED SUMMARY:');
      console.log('Summary length:', summary.length);
      console.log('Summary preview:');
      console.log(summary.substring(0, 1000));
      console.log('========================================\n');
      
      return summary;
    }
    
    // Fallback to Strategy A (summarization)
    console.log('\nFALLING BACK TO SUMMARIZATION\n');
    this.logger.info('Falling back to summarization strategy');
    return this.createIntelligentSummary(input);
  }

  /**
   * STRATEGY C: Template Matching for Structured Data
   */
  tryStructuredExtraction(input) {
    const lines = input.split('\n').filter(line => line.trim());
    
    // Enhanced detection logging
    const hasPipes = input.includes('|');
    const hasCommas = input.split(',').length > 10;
    const pipeCount = lines.filter(line => line.includes('|')).length;
    const commaCount = lines.filter(line => line.split(',').length > 2).length;
    const sampleLines = lines.slice(0, 5).map(l => l.substring(0, 100));
    
    this.logger.info('Analyzing input structure', { 
      totalLines: lines.length,
      hasPipes: hasPipes,
      hasCommas: hasCommas,
      pipeCount: pipeCount,
      commaCount: commaCount,
      sampleLines: sampleLines
    });
    
    // Check if Excel/CSV format (pipe or comma separated)
    if (this.looksLikeTable(input, lines)) {
      this.logger.info('Detected table format, parsing...');
      return this.parseTableFormat(lines);
    }
    
    // Check if numbered/bulleted list
    if (this.looksLikeList(lines)) {
      this.logger.info('Detected list format, parsing...');
      return this.parseListFormat(lines);
    }
    
    this.logger.warn('Structured extraction failed - no table or list format detected', {
      pipeRatio: pipeCount / lines.length,
      commaRatio: commaCount / lines.length
    });
    
    return { success: false };
  }

  looksLikeTable(input, lines) {
    if (lines.length === 0) return false;
    
    // Check if >50% of lines have pipes or commas (table format)
    const pipeCount = lines.filter(line => line.includes('|')).length;
    const commaCount = lines.filter(line => {
      const parts = line.split(',');
      return parts.length > 2 && parts.some(p => p.trim().length > 0);
    }).length;
    
    const separatorCount = pipeCount + commaCount;
    const ratio = separatorCount / lines.length;
    
    this.logger.debug('Table detection check', {
      totalLines: lines.length,
      pipeCount: pipeCount,
      commaCount: commaCount,
      separatorCount: separatorCount,
      ratio: ratio.toFixed(2),
      threshold: 0.5,
      isTable: ratio > 0.5
    });
    
    // Lower threshold to 30% for better detection
    return ratio > 0.3;
  }

  looksLikeList(lines) {
    // Check if >30% of lines start with numbers, bullets, or dashes
    const listPattern = /^[\d\-\*•]\s*\.?\s*.+/;
    const listCount = lines.filter(line => listPattern.test(line)).length;
    return listCount > lines.length * 0.3;
  }

  /**
   * Parse table format (Excel export, CSV, pipe-separated)
   */
  parseTableFormat(lines) {
    const features = [];
    let separator = '|';
    
    // Detect separator (pipe or comma)
    // Count which separator appears more frequently
    const pipeLines = lines.filter(line => line.includes('|')).length;
    const commaLines = lines.filter(line => {
      const parts = line.split(',');
      return parts.length > 2;
    }).length;
    
    if (commaLines > pipeLines && commaLines > lines.length * 0.3) {
      separator = ',';
    }
    
    this.logger.info('Parsing table format', { 
      separator: separator,
      totalLines: lines.length,
      pipeLines: pipeLines,
      commaLines: commaLines
    });
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cells = line.split(separator).map(c => c.trim());
      
      // Skip empty rows
      if (cells.length < 2 || !cells.some(c => c)) {
        continue;
      }
      
      // Skip header row (common headers)
      if (i === 0 && this.isHeaderRow(cells)) {
        this.logger.debug('Skipping header row', { cells });
        continue;
      }
      
      // Extract feature
      const featureText = cells.join(' ').trim();
      
      if (featureText.length > 5) {  // Minimum meaningful length
        const category = this.categorizeFeature(featureText);
        
        features.push({
          text: featureText,
          cells: cells,
          category: category,
          line: i + 1
        });
      }
    }
    
    // Group by category
    const grouped = this.groupByCategory(features);
    
    return {
      success: features.length > 0,
      features: features,
      grouped: grouped
    };
  }

  isHeaderRow(cells) {
    const headerKeywords = ['feature', 'description', 'requirement', 'module', 'priority', 'status', 'name'];
    return cells.some(cell => 
      headerKeywords.some(kw => cell.toLowerCase().includes(kw))
    );
  }

  /**
   * Parse list format (numbered or bulleted)
   */
  parseListFormat(lines) {
    const features = [];
    const listPattern = /^[\d\-\*•]\s*\.?\s*(.+)/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(listPattern);
      
      if (match) {
        const text = match[1].trim();
        
        if (text.length > 5) {
          const category = this.categorizeFeature(text);
          
          features.push({
            text: text,
            category: category,
            line: i + 1
          });
        }
      }
    }
    
    const grouped = this.groupByCategory(features);
    
    return {
      success: features.length > 0,
      features: features,
      grouped: grouped
    };
  }

  /**
   * Categorize feature using keyword matching
   */
  categorizeFeature(text) {
    const lower = text.toLowerCase();
    const matches = [];
    
    // Check each category's keywords
    for (const [category, keywords] of Object.entries(this.moduleKeywords)) {
      const matchCount = keywords.filter(kw => lower.includes(kw)).length;
      
      if (matchCount > 0) {
        matches.push({ category, score: matchCount });
      }
    }
    
    // Return category with highest match score
    if (matches.length > 0) {
      matches.sort((a, b) => b.score - a.score);
      return matches[0].category;
    }
    
    return 'general';
  }

  /**
   * Group features by category
   */
  groupByCategory(features) {
    const grouped = {};
    
    features.forEach(feature => {
      const category = feature.category;
      
      if (!grouped[category]) {
        grouped[category] = [];
      }
      
      grouped[category].push(feature);
    });
    
    return grouped;
  }

  /**
   * Convert structured features to LLM-friendly summary
   */
  structuredToSummary(features, grouped) {
    const parts = [];
    
    parts.push('PROJECT REQUIREMENTS ANALYSIS');
    parts.push('═'.repeat(50));
    parts.push('');
    parts.push(`Total Requirements: ${features.length}`);
    parts.push('');
    parts.push('CATEGORIZED BREAKDOWN:');
    parts.push('');
    
    // Sort categories by count (most features first)
    const sortedCategories = Object.entries(grouped)
      .sort((a, b) => b[1].length - a[1].length);
    
    for (const [category, items] of sortedCategories) {
      const displayName = this.getCategoryDisplayName(category);
      
      parts.push(`${displayName.toUpperCase()} MODULE (${items.length} requirements):`);
      
      // Show first 10 examples from each category
      const examples = items.slice(0, 10);
      examples.forEach((item, index) => {
        const text = item.text.substring(0, 100);  // Truncate long items
        parts.push(`  ${index + 1}. ${text}${item.text.length > 100 ? '...' : ''}`);
      });
      
      if (items.length > 10) {
        parts.push(`  ... and ${items.length - 10} more ${category} requirements`);
      }
      
      parts.push('');
    }
    
    // Add statistics
    parts.push('REQUIREMENT STATISTICS:');
    parts.push(`- Total features: ${features.length}`);
    parts.push(`- Identified modules: ${Object.keys(grouped).length}`);
    parts.push(`- Top category: ${sortedCategories[0][0]} (${sortedCategories[0][1].length} items)`);
    
    const summary = parts.join('\n');
    
    const originalLength = features.reduce((sum, f) => sum + f.text.length, 0);
    const compression = originalLength > 0 
      ? Math.round((1 - summary.length / originalLength) * 100) + '%'
      : '0%';
    
    this.logger.info('Summary generated', { 
      originalLength: originalLength,
      summaryLength: summary.length,
      compression: compression
    });
    
    return summary;
  }

  /**
   * STRATEGY A: Intelligent Summarization (fallback)
   */
  createIntelligentSummary(input) {
    const lines = input.split('\n').filter(line => line.trim());
    
    const parts = [];
    
    parts.push('LARGE REQUIREMENTS DOCUMENT');
    parts.push('═'.repeat(50));
    parts.push('');
    parts.push(`Total length: ${input.length} characters (${lines.length} lines)`);
    parts.push('');
    
    // Extract sentences with action words (key requirements)
    const actionWords = [
      'must', 'should', 'need', 'require', 'implement', 'create', 
      'build', 'develop', 'design', 'support', 'provide', 'enable',
      'allow', 'ensure', 'display', 'show', 'calculate', 'process'
    ];
    
    const keyLines = lines.filter(line => 
      actionWords.some(word => line.toLowerCase().includes(word))
    );
    
    parts.push('KEY REQUIREMENTS (first 100):');
    parts.push('');
    
    keyLines.slice(0, 100).forEach((line, index) => {
      parts.push(`${index + 1}. ${line}`);
    });
    
    if (keyLines.length > 100) {
      parts.push('');
      parts.push(`... and ${keyLines.length - 100} more requirement statements`);
    }
    
    // Extract frequent keywords
    const keywords = this.extractFrequentKeywords(input);
    
    parts.push('');
    parts.push('FREQUENT KEYWORDS (potential modules):');
    parts.push(keywords.slice(0, 30).join(', '));
    
    const summary = parts.join('\n');
    
    this.logger.info('Intelligent summary created', {
      originalLines: lines.length,
      keyRequirements: keyLines.length,
      summaryLength: summary.length
    });
    
    return summary;
  }

  /**
   * Extract most frequent meaningful keywords
   */
  extractFrequentKeywords(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4);  // Ignore short words
    
    // Count frequency
    const freq = {};
    words.forEach(w => {
      freq[w] = (freq[w] || 0) + 1;
    });
    
    // Get top keywords
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
  }

  /**
   * Get display name for category
   */
  getCategoryDisplayName(category) {
    const displayNames = {
      auth: 'Authentication & Security',
      payment: 'Payment Processing',
      dashboard: 'Dashboard & Analytics',
      reports: 'Reporting & Export',
      admin: 'Admin & Management',
      notification: 'Notifications & Alerts',
      search: 'Search & Filtering',
      inventory: 'Inventory Management',
      payroll: 'Payroll & HR',
      crm: 'CRM & Sales',
      booking: 'Booking & Scheduling',
      ecommerce: 'E-commerce & Shopping',
      general: 'General Features'
    };
    
    return displayNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }

  /**
   * Load module keyword mappings
   */
  loadModuleKeywords() {
    return {
      auth: [
        'login', 'logout', 'signup', 'register', 'authentication', 
        'password', 'user account', 'session', 'oauth', 'sso',
        'permission', 'access control', 'security', '2fa', 'token'
      ],
      payment: [
        'payment', 'checkout', 'billing', 'invoice', 'transaction',
        'credit card', 'razorpay', 'stripe', 'paypal', 'refund',
        'subscription', 'pricing', 'gateway', 'purchase'
      ],
      dashboard: [
        'dashboard', 'overview', 'summary', 'widget', 'chart',
        'graph', 'analytics', 'visualization', 'kpi', 'metrics',
        'statistics', 'overview page'
      ],
      reports: [
        'report', 'export', 'excel', 'pdf', 'download', 'print',
        'generate report', 'data export', 'csv', 'reporting'
      ],
      admin: [
        'admin', 'management', 'settings', 'configuration', 'role',
        'permission', 'user management', 'system settings', 'control panel'
      ],
      notification: [
        'notification', 'alert', 'email', 'sms', 'push notification',
        'reminder', 'message', 'notify', 'send email'
      ],
      search: [
        'search', 'filter', 'query', 'find', 'lookup', 'search bar',
        'autocomplete', 'suggestion', 'sort', 'advanced search'
      ],
      inventory: [
        'inventory', 'stock', 'product', 'catalog', 'sku',
        'warehouse', 'item', 'quantity', 'reorder', 'supplier'
      ],
      payroll: [
        'payroll', 'salary', 'wage', 'employee', 'timesheet',
        'attendance', 'leave', 'overtime', 'tax calculation', 'pay stub'
      ],
      crm: [
        'customer', 'lead', 'contact', 'opportunity', 'deal',
        'pipeline', 'sales', 'prospect', 'client management'
      ],
      booking: [
        'booking', 'reservation', 'appointment', 'schedule',
        'calendar', 'availability', 'time slot'
      ],
      ecommerce: [
        'cart', 'shop', 'product listing', 'checkout', 'order',
        'shipping', 'delivery', 'wishlist', 'review', 'rating'
      ]
    };
  }
}

module.exports = LargeInputProcessor;

