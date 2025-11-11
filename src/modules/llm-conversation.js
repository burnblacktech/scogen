const OpenAI = require('openai');
const ERROR_MESSAGES = require('../utils/error-messages');

class LLMConversation {
  constructor(library, promptManager, logger, config) {
    this.library = library;
    this.promptManager = promptManager;
    this.logger = logger;
    this.config = config;
    
    // Initialize OpenAI client
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not set, will use fallback mode');
      this.client = null;
    } else {
      this.client = new OpenAI({ apiKey });
    }

    this.conversationHistory = [];
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  async startConversation(initialInput, userContext = {}) {
    const inputLength = initialInput.length;
    const estimatedTokens = Math.ceil(inputLength / 4);
    
    this.logger.info('LLM conversation started', { 
      inputLength: inputLength,
      estimatedTokens: estimatedTokens
    });

    // NEW: Large input processing
    const LargeInputProcessor = require('./large-input-processor');
    const processor = new LargeInputProcessor(this.config, this.logger);
    
    if (processor.needsProcessing(initialInput)) {
      this.logger.warn('Large input detected - preprocessing required', {
        originalLength: inputLength,
        threshold: processor.threshold
      });
      
      try {
        const processedInput = await processor.process(initialInput);
        
        this.logger.info('Input preprocessing complete', {
          originalLength: inputLength,
          processedLength: processedInput.length,
          reduction: Math.round((1 - processedInput.length / inputLength) * 100) + '%'
        });
        
        // Use processed summary instead of original
        initialInput = processedInput;
      } catch (error) {
        this.logger.error('Input preprocessing failed, using truncated original', {
          error: error.message
        });
        
        // Fallback: truncate to safe length
        initialInput = initialInput.substring(0, 28000) + 
          '\n\n[... input truncated due to length, original had ' + 
          inputLength + ' characters ...]';
      }
    }

    // Add initial input to history (may be processed version)
    this.conversationHistory.push({ role: 'user', content: initialInput });

    // Check if API is available
    if (!this.client) {
      this.logger.warn('LLM API unavailable, using fallback');
      return this.fallbackConversation(initialInput);
    }

    try {
      // Step 1: Analyze for persona signals and domain hints
      const analysis = await this.analyzeInput(initialInput);

      // Step 2: Get domain context from library
      const domainContext = this.getDomainContext(analysis);

      // Step 3: Extract initial intent (with user context)
      const extractedIntent = await this.extractIntent(initialInput, analysis, domainContext, userContext);

      this.logger.info('Conversation analysis complete', {
        persona: this.detectPersona(analysis.personaSignals),
        industry: extractedIntent.industry,
        useCase: extractedIntent.useCase
      });

      return {
        analysis: {
          personaSignals: analysis.personaSignals,
          industryHint: extractedIntent.industry,
          budgetSignal: extractedIntent.budget,
          conversationTone: analysis.tone || 'casual'
        },
        domainContext: {
          industry: extractedIntent.industry || 'generic',
          useCase: extractedIntent.useCase || 'application',
          hiddenEdges: domainContext.hiddenEdges || []
        },
        extractedIntent
      };

    } catch (error) {
      this.logger.error('LLM API error, using fallback', { error: error.message });
      return this.fallbackConversation(initialInput);
    }
  }

  async analyzeInput(input) {
    const systemPrompt = this.promptManager.get('system');
    const analysisPrompt = this.promptManager.get('analysis', { input });

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: analysisPrompt }
    ];

    try {
      const response = await this.callAPI(messages, 0.3);
      const content = response.choices[0].message.content.trim();

      // Parse JSON response
      let analysis;
      try {
        analysis = JSON.parse(content);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Failed to parse analysis response');
        }
      }

      // Validate persona signals
      if (!analysis.personaSignals) {
        analysis.personaSignals = {
          cautious_solo: 0.5,
          shipping_hustler: 0,
          perfectionist: 0,
          domain_expert: 0,
          funded_visionary: 0
        };
      }

      return {
        personaSignals: analysis.personaSignals,
        tone: analysis.tone || 'casual',
        industryHint: analysis.industryHint || null,
        useCaseHint: analysis.useCaseHint || null,
        budgetSignal: analysis.budgetSignal || null
      };

    } catch (error) {
      this.logger.error('Analysis failed', { error: error.message });
      return this.fallbackAnalysis(input);
    }
  }

  async extractIntent(input, analysis, domainContext, userContext = {}) {
    console.log('\n========================================');
    console.log('EXTRACT INTENT - DIAGNOSTIC');
    console.log('Input length received:', input.length);
    console.log('Platform Type:', userContext.platformType || 'not specified');
    console.log('Input preview (first 2000 chars):');
    console.log(input.substring(0, 2000));
    console.log('========================================\n');

    // Check if input was truncated
    if (input.length < 1500 && input.includes('...')) {
      this.logger.warn('Input appears truncated, using full context');
    }

    // Build context prompt based on platform type
    const contextPrompt = this.buildContextPrompt(userContext);
    
    // Get the base prompt (without input substitution)
    const basePrompt = this.promptManager.get('extract', {});
    
    // Build the full user message with context + complete input
    const userMessage = contextPrompt 
      ? `${basePrompt}\n\n${contextPrompt}\n\n${input}`
      : `${basePrompt}\n\n${input}`;

    const messages = [
      { role: 'system', content: 'You extract structured data from conversations. Output valid JSON only.' },
      { role: 'user', content: userMessage }
    ];

    console.log('\n========================================');
    console.log('MESSAGES BEING SENT TO OPENAI:');
    console.log('System prompt length:', messages[0].content.length);
    console.log('Base prompt length:', basePrompt.length);
    console.log('User input length:', input.length);
    console.log('Full user message length:', messages[1].content.length);
    console.log('Total estimated tokens:', Math.ceil((messages[0].content.length + messages[1].content.length) / 4));
    console.log('User message FULL CONTENT (first 2000 chars):');
    console.log(messages[1].content.substring(0, 2000));
    console.log('========================================\n');

    try {
      const response = await this.callAPI(messages, 0.2);
      const content = response.choices[0].message.content.trim();

      console.log('\n========================================');
      console.log('OPENAI RESPONSE:');
      console.log('Response length:', content.length);
      console.log('Response preview:');
      console.log(content.substring(0, 500));
      console.log('========================================\n');

      let extracted;
      try {
        extracted = JSON.parse(content);
      } catch (parseError) {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          extracted = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Failed to parse extraction response');
        }
      }

      console.log('\n========================================');
      console.log('PARSED MODULES FROM LLM:');
      console.log('Modules array:', JSON.stringify(extracted.modules, null, 2));
      console.log('Modules count:', extracted.modules ? extracted.modules.length : 0);
      console.log('========================================\n');

      // Validate and normalize
      let industry = extracted.industry || domainContext.industry || 'generic';
      let useCase = extracted.useCase || 'application';
      
      // NEW: Override industry based on platform type context
      if (userContext && userContext.platformType) {
        const platformIndustry = this.getIndustryFromPlatformType(userContext.platformType);
        if (platformIndustry) {
          industry = platformIndustry;
          this.logger.info('Using platform type for industry classification', { 
            platformType: userContext.platformType,
            industry: industry 
          });
        }
      }
      
      // If LLM returned generic but input suggests specific domain, use fallback detection
      if (industry === 'generic') {
        const fallbackDomain = this.detectDomain(input);
        if (fallbackDomain.industry !== 'generic') {
          industry = fallbackDomain.industry;
          this.logger.info('Using fallback domain detection', { 
            llmIndustry: extracted.industry, 
            fallbackIndustry: industry 
          });
        }
        if (fallbackDomain.useCase !== 'application') {
          useCase = fallbackDomain.useCase;
        }
      }
      
      return {
        industry,
        useCase,
        modules: extracted.modules || [],
        budget: extracted.budget || 'moderate',
        edges: extracted.edges || [],
        confidence: extracted.confidence || 0.7
      };

    } catch (error) {
      this.logger.error('Intent extraction failed', { error: error.message });
      return this.fallbackExtract(input);
    }
  }

  async callAPI(messages, temperature = 0.7, retryCount = 0) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const model = this.config.get('llm.model') || 'gpt-4';
      const maxTokens = this.config.get('llm.maxTokens') || 2000;
      const timeout = this.config.get('llm.timeout') || 30000;

      const response = await Promise.race([
        this.client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API timeout')), timeout)
        )
      ]);

      return response;

    } catch (error) {
      // Retry logic
      if (retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount);
        this.logger.warn(`API call failed, retrying in ${delay}ms...`, { error: error.message, retryCount });
        await this.sleep(delay);
        return this.callAPI(messages, temperature, retryCount + 1);
      }

      throw error;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getIndustryFromPlatformType(platformType) {
    const industryMap = {
      'eor-india': 'finance', // EOR is finance/HR tech
      'eor-global': 'finance',
      'hrms': 'saas',
      'payroll': 'finance',
      'ats': 'saas',
      'lms': 'education',
      'crm': 'saas',
      'erp': 'saas',
      'inventory': 'retail',
      'marketplace': 'retail',
      'ecommerce': 'retail',
      'saas': 'saas',
      'custom': 'generic'
    };
    return industryMap[platformType] || null;
  }

  buildContextPrompt(userContext) {
    if (!userContext || !userContext.platformType) {
      return '';
    }

    let prompt = 'PROJECT CONTEXT:\n';
    const platformType = userContext.platformType;

    // EOR India specific context
    if (platformType === 'eor-india') {
      prompt += '- Platform Type: EOR (Employer of Record) for India\n';
      prompt += '- Industry Classification: HR Tech / Payroll Services / EOR Platform\n';
      prompt += '- Compliance Required: PF (Provident Fund), ESI (Employee State Insurance), PT (Professional Tax), LWF (Labour Welfare Fund), TDS (Tax Deducted at Source)\n';
      prompt += '- Must include India-specific statutory compliance modules\n';
      prompt += '- Architecture: Multi-tenant B2B2C (employers manage employees)\n';
      prompt += '- Key Features: Payroll processing, statutory compliance, employee onboarding, contract management, client billing\n';
    }
    // EOR Global
    else if (platformType === 'eor-global') {
      prompt += '- Platform Type: EOR (Employer of Record) - Global/Multi-country\n';
      prompt += '- Industry Classification: HR Tech / Global Payroll / EOR Platform\n';
      prompt += '- Compliance Required: Multi-country payroll, tax, and labor law compliance\n';
      prompt += '- Architecture: Multi-tenant, multi-currency, multi-language\n';
    }
    // HRMS
    else if (platformType === 'hrms') {
      prompt += '- Platform Type: HRMS (HR Management System)\n';
      prompt += '- Industry Classification: HR Tech / Enterprise Software\n';
      prompt += '- Key Features: Employee management, attendance, leave management, performance reviews\n';
    }
    // Payroll Software
    else if (platformType === 'payroll') {
      prompt += '- Platform Type: Payroll Software\n';
      prompt += '- Industry Classification: Financial Software / HR Tech\n';
      prompt += '- Key Features: Salary calculation, tax deductions, payslip generation\n';
    }
    // CRM
    else if (platformType === 'crm') {
      prompt += '- Platform Type: CRM (Customer Relationship Management)\n';
      prompt += '- Industry Classification: Sales Tech / Enterprise Software\n';
      prompt += '- Key Features: Lead management, sales pipeline, customer tracking\n';
    }
    // ERP
    else if (platformType === 'erp') {
      prompt += '- Platform Type: ERP (Enterprise Resource Planning)\n';
      prompt += '- Industry Classification: Enterprise Software\n';
      prompt += '- Key Features: Resource planning, inventory, finance, HR integration\n';
    }
    // Marketplace
    else if (platformType === 'marketplace') {
      prompt += '- Platform Type: Marketplace Platform\n';
      prompt += '- Industry Classification: E-commerce / Platform Business\n';
      prompt += '- Architecture: Multi-vendor, payment gateway, order management\n';
    }
    // E-commerce
    else if (platformType === 'ecommerce') {
      prompt += '- Platform Type: E-commerce Store\n';
      prompt += '- Industry Classification: E-commerce / Retail Tech\n';
      prompt += '- Key Features: Product catalog, shopping cart, checkout, payment processing\n';
    }
    // LMS
    else if (platformType === 'lms') {
      prompt += '- Platform Type: Learning Management System (LMS)\n';
      prompt += '- Industry Classification: EdTech / Enterprise Training\n';
      prompt += '- Key Features: Course management, student tracking, assessments, certificates\n';
    }
    // ATS
    else if (platformType === 'ats') {
      prompt += '- Platform Type: Recruitment/ATS Platform\n';
      prompt += '- Industry Classification: HR Tech / Recruitment Software\n';
      prompt += '- Key Features: Job posting, candidate tracking, interview scheduling, offer management\n';
    }
    // Inventory
    else if (platformType === 'inventory') {
      prompt += '- Platform Type: Inventory Management System\n';
      prompt += '- Industry Classification: Supply Chain / Retail Tech\n';
      prompt += '- Key Features: Stock tracking, warehouse management, reorder alerts, supplier management\n';
    }
    // SaaS
    else if (platformType === 'saas') {
      prompt += '- Platform Type: SaaS Platform\n';
      prompt += '- Industry Classification: Software as a Service\n';
      prompt += '- Architecture: Multi-tenant, subscription-based\n';
    }
    // Custom
    else if (platformType === 'custom') {
      prompt += '- Platform Type: Custom Platform\n';
      prompt += '- Industry Classification: Custom Software Development\n';
    }

    prompt += '\nIMPORTANT: Use this context to accurately classify the industry and extract relevant modules.';
    
    this.logger.info('Context prompt built', { platformType, promptLength: prompt.length });
    
    return prompt;
  }

  getDomainContext(analysis) {
    const industry = analysis.industryHint || 'generic';
    const baseline = this.library.getBaseline(industry);
    
    return {
      industry,
      useCase: analysis.useCaseHint || 'application',
      commonModules: Object.keys(baseline.module_efforts || {}),
      hiddenEdges: [],
      socialProof: null
    };
  }

  detectPersona(signals) {
    if (!signals || Object.keys(signals).length === 0) {
      return 'cautious_solo';
    }
    return Object.keys(signals).reduce((max, p) => 
      signals[p] > signals[max] ? p : max
    );
  }

  // Fallback methods (when API unavailable)
  fallbackConversation(initialInput) {
    this.logger.warn('Using fallback conversation mode');
    
    const personaSignals = this.detectPersonaFromText(initialInput);
    const { industry, useCase } = this.detectDomain(initialInput);
    
    return {
      analysis: {
        personaSignals,
        industryHint: industry,
        budgetSignal: this.detectBudget(initialInput),
        conversationTone: 'casual'
      },
      domainContext: {
        industry,
        useCase,
        hiddenEdges: []
      },
      extractedIntent: {
        industry,
        useCase,
        modules: this.extractModules(initialInput),
        budget: this.detectBudget(initialInput),
        edges: this.extractEdges(initialInput)
      }
    };
  }

  detectPersonaFromText(text) {
    const lower = text.toLowerCase();
    const signals = {
      cautious_solo: 0,
      shipping_hustler: 0,
      perfectionist: 0,
      domain_expert: 0,
      funded_visionary: 0
    };

    if (lower.includes('simple') || lower.includes('just') || lower.includes('basic')) {
      signals.cautious_solo += 0.3;
    }
    if (lower.includes('fast') || lower.includes('quick') || lower.includes('asap')) {
      signals.shipping_hustler += 0.3;
    }
    if (lower.includes('scalable') || lower.includes('proper') || lower.includes('clean')) {
      signals.perfectionist += 0.3;
    }

    const max = Math.max(...Object.values(signals));
    if (max < 0.3) {
      signals.cautious_solo = 0.7;
    }

    return signals;
  }

  detectDomain(text) {
    const lower = text.toLowerCase();
    let industry = 'generic';
    let useCase = 'application';

    // Domain detection: payroll typically implies retail domain
    if (lower.includes('payroll') || lower.includes('pay')) {
      useCase = 'payroll';
      // If payroll mentioned and no explicit industry, default to retail
      if (!lower.includes('saas') && !lower.includes('healthcare') && !lower.includes('finance')) {
        industry = 'retail';
      }
    }

    // Explicit industry keywords
    if (lower.includes('retail') || lower.includes('shop') || lower.includes('store') || lower.includes('coffee')) {
      industry = 'retail';
    }
    if (lower.includes('saas') || lower.includes('platform')) {
      industry = 'saas';
    }
    if (lower.includes('healthcare') || lower.includes('medical') || lower.includes('hospital')) {
      industry = 'healthcare';
    }
    if (lower.includes('finance') || lower.includes('banking') || lower.includes('financial')) {
      industry = 'finance';
    }

    // Use case detection
    if (lower.includes('dashboard')) {
      useCase = 'dashboard';
    }

    return { industry, useCase };
  }

  extractModules(text) {
    const modules = [];
    const lower = text.toLowerCase();

    if (lower.includes('payroll') || lower.includes('pay')) modules.push('payroll');
    if (lower.includes('hours') || lower.includes('time')) modules.push('hours tracking');
    if (lower.includes('tips') || lower.includes('tip')) modules.push('tips');
    if (lower.includes('dashboard')) modules.push('dashboard');
    if (lower.includes('reports') || lower.includes('reporting')) modules.push('reports');

    return modules.length > 0 ? modules : ['application'];
  }

  detectBudget(text) {
    const lower = text.toLowerCase();
    if (lower.includes('tight') || lower.includes('cheap') || lower.includes('budget')) {
      return 'tight';
    }
    if (lower.includes('flexible') || lower.includes('money')) {
      return 'flexible';
    }
    return 'moderate';
  }

  extractEdges(text) {
    const edges = [];
    const lower = text.toLowerCase();

    if (lower.includes('daily')) edges.push('daily');
    if (lower.includes('locations') || lower.includes('shops')) edges.push('multiple locations');
    if (lower.includes('mobile')) edges.push('mobile');
    if (lower.includes('real-time') || lower.includes('realtime')) edges.push('real-time');

    return edges;
  }

  fallbackAnalysis(input) {
    return {
      personaSignals: this.detectPersonaFromText(input),
      tone: 'casual',
      industryHint: null,
      useCaseHint: null,
      budgetSignal: null
    };
  }

  fallbackExtract(input) {
    const { industry, useCase } = this.detectDomain(input);
    return {
      industry,
      useCase,
      modules: this.extractModules(input),
      budget: this.detectBudget(input),
      edges: this.extractEdges(input),
      confidence: 0.5
    };
  }
}

module.exports = LLMConversation;

