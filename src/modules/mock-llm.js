class MockLLM {
  constructor(library, promptManager, logger) {
    this.library = library;
    this.promptManager = promptManager;
    this.logger = logger;
  }

  async startConversation(initialInput) {
    this.logger.info('Mock LLM conversation started', { input: initialInput });

    // Simulate persona detection
    const personaSignals = this.detectPersonaFromText(initialInput);
    
    // Simulate domain detection
    const { industry, useCase } = this.detectDomain(initialInput);

    // Simulate intent extraction
    const extractedIntent = {
      industry,
      useCase,
      modules: this.extractModules(initialInput),
      budget: this.detectBudget(initialInput),
      edges: this.extractEdges(initialInput)
    };

    return {
      analysis: {
        personaSignals,
        industryHint: industry,
        budgetSignal: extractedIntent.budget,
        conversationTone: 'casual'
      },
      domainContext: {
        industry,
        useCase,
        hiddenEdges: []
      },
      extractedIntent
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

    // Cautious signals
    if (lower.includes('simple') || lower.includes('just') || lower.includes('basic')) {
      signals.cautious_solo += 0.3;
    }

    // Hustler signals
    if (lower.includes('fast') || lower.includes('quick') || lower.includes('asap')) {
      signals.shipping_hustler += 0.3;
    }

    // Perfectionist signals
    if (lower.includes('scalable') || lower.includes('proper') || lower.includes('clean')) {
      signals.perfectionist += 0.3;
    }

    // Default to cautious if no strong signals
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

    if (lower.includes('retail') || lower.includes('shop') || lower.includes('store')) {
      industry = 'retail';
    }
    if (lower.includes('saas') || lower.includes('platform')) {
      industry = 'saas';
    }

    if (lower.includes('payroll') || lower.includes('pay')) {
      useCase = 'payroll';
    }
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
}

module.exports = MockLLM;

