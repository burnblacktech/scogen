/**
 * Unit Tests for Client Profiler Module
 * 
 * Test Cases:
 * 1. profileClient - with high tech savvy input
 * 2. profileClient - with low tech savvy input
 * 3. assessTechSavvy - high technical knowledge
 * 4. assessTechSavvy - low technical knowledge
 * 5. assessDecisionMaker - decision maker detected
 * 6. assessDecisionMaker - not decision maker
 * 7. assessUrgency - high urgency
 * 8. assessUrgency - low urgency
 * 9. detectPreviousFailure - previous failure detected
 * 10. assessBudgetClarity - clear budget
 * 11. assessBudgetClarity - vague budget
 * 12. assessClientSize - startup detected
 * 13. assessClientSize - enterprise detected
 * 14. detectCommittee - committee decision detected
 * 15. calculateRiskProfile - high risk profile
 * 16. calculateRiskProfile - low risk profile
 * 17. calculateCostMultipliers - multipliers for different risk levels
 * 18. generateRecommendations - recommendations for different profiles
 */

const ClientProfiler = require('../../src/modules/client-profiler');

describe('ClientProfiler', () => {
  let profiler;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    profiler = new ClientProfiler(mockLogger);
  });

  describe('profileClient', () => {
    test('should profile client with high tech savvy input', async () => {
      const input = `
        We need a microservices architecture with REST API, 
        PostgreSQL database, Docker containers, CI/CD pipeline,
        and AWS deployment. Need scalability and authentication.
      `;

      const result = await profiler.profileClient(input);

      expect(result).toBeDefined();
      expect(result.techSavvy).toBe('high');
      expect(result.riskLevel).toBeDefined();
      expect(result.costMultipliers).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('should profile client with low tech savvy input', async () => {
      const input = 'I need a simple website for my business. Just like Amazon.';

      const result = await profiler.profileClient(input);

      expect(result).toBeDefined();
      expect(result.techSavvy).toBe('low');
      expect(result.handHoldingNeeded).toBe(true);
    });

    test('should return default profile for empty input', async () => {
      const result = await profiler.profileClient('');

      expect(result).toBeDefined();
      expect(result.techSavvy).toBe('medium');
      expect(result.riskLevel).toBe('medium');
    });
  });

  describe('assessTechSavvy', () => {
    test('should detect high technical knowledge', () => {
      const input = 'Need microservices, REST API, PostgreSQL, Docker, CI/CD, AWS, scalability';

      const result = profiler.assessTechSavvy(input);

      expect(result).toBe('high');
    });

    test('should detect low technical knowledge', () => {
      const input = 'I need a simple website. Just like Amazon. Basic and easy.';

      const result = profiler.assessTechSavvy(input);

      expect(result).toBe('low');
    });

    test('should return medium for balanced input', () => {
      const input = 'Need a website with database and hosting. Some integration required.';

      const result = profiler.assessTechSavvy(input);

      expect(result).toBe('medium');
    });
  });

  describe('assessDecisionMaker', () => {
    test('should detect decision maker', () => {
      const input = 'I need a system for my company. My budget is ₹5 lakhs. I want this built.';

      const result = profiler.assessDecisionMaker(input);

      expect(result).toBe(true);
    });

    test('should detect non-decision maker', () => {
      const input = 'Our team wants this. The client needs approval. Management will decide.';

      const result = profiler.assessDecisionMaker(input);

      expect(result).toBe(false);
    });
  });

  describe('assessUrgency', () => {
    test('should detect high urgency', () => {
      const input = 'Need this ASAP. Urgent deadline. Must be done immediately.';

      const result = profiler.assessUrgency(input);

      expect(result).toBe('high');
    });

    test('should detect low urgency', () => {
      const input = 'Planning for next year. Exploring options. Considering for future.';

      const result = profiler.assessUrgency(input);

      expect(result).toBe('low');
    });

    test('should detect medium urgency', () => {
      const input = 'Need this soon. Timeline is few months. Next quarter.';

      const result = profiler.assessUrgency(input);

      expect(result).toBe('medium');
    });
  });

  describe('detectPreviousFailure', () => {
    test('should detect previous failure', () => {
      const input = 'Previous vendor failed. Had bad experience. Lost money on incomplete project.';

      const result = profiler.detectPreviousFailure(input);

      expect(result).toBe(true);
    });

    test('should not detect failure when not present', () => {
      const input = 'Need a new system for our business. First time building this.';

      const result = profiler.detectPreviousFailure(input);

      expect(result).toBe(false);
    });
  });

  describe('assessBudgetClarity', () => {
    test('should detect clear budget', () => {
      const input = 'Budget is ₹5 lakhs. Allocated ₹10 lakhs. Approved budget of ₹3 crore.';

      const result = profiler.assessBudgetClarity(input);

      expect(result).toBe('clear');
    });

    test('should detect vague budget', () => {
      const input = 'Need cost-effective solution. Affordable and reasonable. Within budget.';

      const result = profiler.assessBudgetClarity(input);

      expect(result).toBe('vague');
    });

    test('should detect cost-focused budget', () => {
      const input = 'Need cheapest option. Lowest cost. Reduce costs. Save money.';

      const result = profiler.assessBudgetClarity(input);

      expect(result).toBe('costFocused');
    });
  });

  describe('assessClientSize', () => {
    test('should detect startup', () => {
      const input = 'We are a startup. New company. Just started. Early stage business.';

      const result = profiler.assessClientSize(input);

      expect(result).toBe('startup');
    });

    test('should detect enterprise', () => {
      const input = 'Large enterprise. Multinational corporation. Fortune 500. 1000+ employees.';

      const result = profiler.assessClientSize(input);

      expect(result).toBe('enterprise');
    });

    test('should default to SME when not specified', () => {
      const input = 'We are a medium-sized business.';

      const result = profiler.assessClientSize(input);

      expect(result).toBe('sme');
    });
  });

  describe('detectCommittee', () => {
    test('should detect committee decision', () => {
      const input = 'Board needs to approve. Committee will decide. Stakeholders involved.';

      const result = profiler.detectCommittee(input);

      expect(result).toBe(true);
    });

    test('should not detect committee when not present', () => {
      const input = 'I need this for my business. My decision.';

      const result = profiler.detectCommittee(input);

      expect(result).toBe(false);
    });
  });

  describe('calculateRiskProfile', () => {
    test('should calculate high risk profile', () => {
      const profile = {
        techSavvy: 'low',
        hadFailure: true,
        urgency: 'high',
        budgetClarity: 'vague'
      };

      profiler.calculateRiskProfile(profile);

      expect(profile.riskLevel).toBe('high');
      expect(profile.trustBuildingNeeded).toBe(true);
    });

    test('should calculate low risk profile', () => {
      const profile = {
        techSavvy: 'high',
        hadFailure: false,
        urgency: 'low',
        budgetClarity: 'clear',
        decisionMaker: true
      };

      profiler.calculateRiskProfile(profile);

      expect(profile.riskLevel).toBe('low');
    });

    test('should set handHoldingNeeded for low tech savvy', () => {
      const profile = {
        techSavvy: 'low',
        hadFailure: false,
        urgency: 'medium',
        budgetClarity: 'clear'
      };

      profiler.calculateRiskProfile(profile);

      expect(profile.handHoldingNeeded).toBe(true);
    });
  });

  describe('calculateCostMultipliers', () => {
    test('should calculate multipliers for high risk profile', () => {
      const profile = {
        riskLevel: 'high',
        techSavvy: 'low',
        committeeDecision: true,
        urgency: 'high'
      };

      profiler.calculateCostMultipliers(profile);

      expect(profile.coordinationMultiplier).toBeGreaterThan(1.0);
      expect(profile.scopeCreepMultiplier).toBeGreaterThan(1.0);
      expect(profile.riskMultiplier).toBeGreaterThan(1.0);
    });

    test('should calculate multipliers for low risk profile', () => {
      const profile = {
        riskLevel: 'low',
        techSavvy: 'high',
        committeeDecision: false,
        urgency: 'low'
      };

      profiler.calculateCostMultipliers(profile);

      expect(profile.coordinationMultiplier).toBeLessThanOrEqual(1.0);
      expect(profile.scopeCreepMultiplier).toBeLessThanOrEqual(1.0);
      expect(profile.riskMultiplier).toBeLessThanOrEqual(1.0);
    });
  });

  describe('generateRecommendations', () => {
    test('should generate recommendations for low tech savvy client', () => {
      const profile = {
        techSavvy: 'low',
        riskLevel: 'medium',
        recommendations: [],
        warnings: [],
        dealStructure: []
      };

      profiler.generateRecommendations(profile);

      expect(profile.recommendations.length).toBeGreaterThan(0);
      expect(profile.recommendations.some(r => r.includes('simple language'))).toBe(true);
    });

    test('should generate recommendations for high risk client', () => {
      const profile = {
        techSavvy: 'medium',
        riskLevel: 'high',
        hadFailure: true,
        recommendations: [],
        warnings: [],
        dealStructure: []
      };

      profiler.generateRecommendations(profile);

      expect(profile.recommendations.length).toBeGreaterThan(0);
      expect(profile.dealStructure.length).toBeGreaterThan(0);
    });

    test('should generate warnings for high urgency and high risk', () => {
      const profile = {
        techSavvy: 'low',
        riskLevel: 'high',
        urgency: 'high',
        recommendations: [],
        warnings: [],
        dealStructure: []
      };

      profiler.generateRecommendations(profile);

      expect(profile.warnings.length).toBeGreaterThan(0);
      expect(profile.warnings.some(w => w.includes('High urgency'))).toBe(true);
    });

    test('should generate deal structure recommendations', () => {
      const profile = {
        techSavvy: 'medium',
        riskLevel: 'high',
        budgetClarity: 'costFocused',
        recommendations: [],
        warnings: [],
        dealStructure: []
      };

      profiler.generateRecommendations(profile);

      expect(profile.dealStructure.length).toBeGreaterThan(0);
    });
  });
});

