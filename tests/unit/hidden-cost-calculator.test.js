/**
 * Unit Tests for Hidden Cost Calculator Module
 * 
 * Test Cases:
 * 1. calculateHiddenCosts - with high risk client profile
 * 2. calculateHiddenCosts - with low risk client profile
 * 3. calculateComponent - client coordination component
 * 4. calculateComponent - scope creep component
 * 5. calculateComponent - documentation component
 * 6. categorizeCosts - client vs internal categorization
 * 7. calculateMargin - margin calculation for different risk levels
 * 8. assessProjectRisk - risk assessment
 * 9. generateRecommendations - recommendations generation
 */

const HiddenCostCalculator = require('../../src/modules/hidden-cost-calculator');

describe('HiddenCostCalculator', () => {
  let calculator;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    calculator = new HiddenCostCalculator(mockLogger);
  });

  describe('calculateHiddenCosts', () => {
    test('should calculate hidden costs for high risk client profile', () => {
      const developmentCost = 100000;
      const clientProfile = {
        techSavvy: 'low',
        riskLevel: 'high',
        committeeDecision: true,
        hadFailure: true,
        urgency: 'high',
        budgetClarity: 'vague',
        clientSize: 'enterprise'
      };

      const projectScope = {
        hasSpecs: false,
        isCriticalSystem: true,
        hasMultipleIntegrations: true
      };

      const result = calculator.calculateHiddenCosts(
        developmentCost,
        clientProfile,
        projectScope
      );

      expect(result).toBeDefined();
      expect(result.development).toBe(developmentCost);
      expect(result.total).toBeGreaterThan(developmentCost);
      expect(result.percentageIncrease).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
      expect(result.internal).toBeDefined();
      expect(result.client).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('should calculate hidden costs for low risk client profile', () => {
      const developmentCost = 100000;
      const clientProfile = {
        techSavvy: 'high',
        riskLevel: 'low',
        committeeDecision: false,
        hadFailure: false,
        urgency: 'low',
        budgetClarity: 'clear',
        decisionMaker: true
      };

      const projectScope = {
        hasSpecs: true,
        isCriticalSystem: false,
        hasMultipleIntegrations: false
      };

      const result = calculator.calculateHiddenCosts(
        developmentCost,
        clientProfile,
        projectScope
      );

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(developmentCost);
      expect(result.percentageIncrease).toBeLessThan(50); // Lower for low risk
      expect(result.internal.risk).toBe('low');
    });

    test('should handle zero development cost', () => {
      const developmentCost = 0;
      const clientProfile = {
        techSavvy: 'medium',
        riskLevel: 'medium'
      };

      const result = calculator.calculateHiddenCosts(
        developmentCost,
        clientProfile,
        {}
      );

      expect(result).toBeDefined();
      expect(result.development).toBe(0);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateComponent', () => {
    test('should calculate client coordination component', () => {
      const baseCost = 100000;
      const clientProfile = {
        techSavvy: 'low',
        committeeDecision: true,
        decisionMaker: false,
        hadFailure: true
      };

      const result = calculator.calculateComponent(
        'clientCoordination',
        baseCost,
        clientProfile,
        {}
      );

      expect(result).toBeDefined();
      expect(result.percentage).toBeGreaterThan(0);
      expect(result.amount).toBeGreaterThan(0);
      expect(result.factors).toBeDefined();
    });

    test('should calculate scope creep component', () => {
      const baseCost = 100000;
      const clientProfile = {
        budgetClarity: 'vague',
        techSavvy: 'low',
        urgency: 'high'
      };

      const projectScope = {
        hasSpecs: false
      };

      const result = calculator.calculateComponent(
        'scopeCreep',
        baseCost,
        clientProfile,
        projectScope
      );

      expect(result).toBeDefined();
      expect(result.percentage).toBeGreaterThan(0);
      expect(result.amount).toBeGreaterThan(0);
    });

    test('should calculate documentation component', () => {
      const baseCost = 100000;
      const clientProfile = {
        committeeDecision: true,
        clientSize: 'enterprise'
      };

      const result = calculator.calculateComponent(
        'documentation',
        baseCost,
        clientProfile,
        {}
      );

      expect(result).toBeDefined();
      expect(result.percentage).toBeGreaterThan(0);
      expect(result.amount).toBeGreaterThan(0);
    });

    test('should calculate testing component', () => {
      const baseCost = 100000;
      const clientProfile = {
        hadFailure: true
      };

      const projectScope = {
        isCriticalSystem: true,
        hasMultipleIntegrations: true
      };

      const result = calculator.calculateComponent(
        'testing',
        baseCost,
        clientProfile,
        projectScope
      );

      expect(result).toBeDefined();
      expect(result.percentage).toBeGreaterThan(0);
      expect(result.amount).toBeGreaterThan(0);
    });
  });

  describe('categorizeCosts', () => {
    test('should categorize costs for client vs internal', () => {
      const hiddenCosts = {
        development: 100000,
        breakdown: {
          clientCoordination: { amount: 5000, percentage: 5 },
          scopeCreep: { amount: 10000, percentage: 10 },
          documentation: { amount: 5000, percentage: 5 },
          testing: { amount: 15000, percentage: 15 }
        },
        total: 135000
      };

      const clientProfile = {
        techSavvy: 'medium',
        riskLevel: 'medium'
      };

      calculator.categorizeCosts(hiddenCosts, clientProfile);

      expect(hiddenCosts.client).toBeDefined();
      expect(hiddenCosts.client.shown).toBeDefined();
      expect(hiddenCosts.client.hidden).toBeDefined();
      expect(hiddenCosts.client.total).toBeGreaterThan(0);
    });

    test('should show more costs to low tech savvy clients', () => {
      const hiddenCosts = {
        development: 100000,
        breakdown: {
          clientCoordination: { amount: 5000 },
          scopeCreep: { amount: 10000 },
          documentation: { amount: 5000 }
        },
        total: 120000
      };

      const clientProfile = {
        techSavvy: 'low',
        riskLevel: 'medium'
      };

      calculator.categorizeCosts(hiddenCosts, clientProfile);

      // Low tech savvy clients should see more costs
      expect(Object.keys(hiddenCosts.client.shown).length).toBeGreaterThan(0);
    });
  });

  describe('calculateMargin', () => {
    test('should calculate higher margin for high risk projects', () => {
      const hiddenCosts = {
        development: 100000,
        total: 150000,
        breakdown: {}
      };

      const clientProfile = {
        riskLevel: 'high',
        techSavvy: 'low'
      };

      const margin = calculator.calculateMargin(hiddenCosts, clientProfile);

      expect(margin).toBeGreaterThan(0);
      expect(margin).toBeLessThanOrEqual(1.0);
    });

    test('should calculate lower margin for low risk projects', () => {
      const hiddenCosts = {
        development: 100000,
        total: 120000,
        breakdown: {}
      };

      const clientProfile = {
        riskLevel: 'low',
        techSavvy: 'high'
      };

      const margin = calculator.calculateMargin(hiddenCosts, clientProfile);

      expect(margin).toBeGreaterThanOrEqual(0);
      expect(margin).toBeLessThan(0.5);
    });
  });

  describe('assessProjectRisk', () => {
    test('should assess high risk for high risk client profile', () => {
      const hiddenCosts = {
        development: 100000,
        total: 150000,
        percentageIncrease: 50,
        breakdown: {}
      };

      const clientProfile = {
        riskLevel: 'high',
        hadFailure: true,
        urgency: 'high'
      };

      const risk = calculator.assessProjectRisk(hiddenCosts, clientProfile);

      expect(risk).toBe('high');
    });

    test('should assess low risk for low risk client profile', () => {
      const hiddenCosts = {
        development: 100000,
        total: 115000,
        percentageIncrease: 15,
        breakdown: {}
      };

      const clientProfile = {
        riskLevel: 'low',
        hadFailure: false,
        urgency: 'low'
      };

      const risk = calculator.assessProjectRisk(hiddenCosts, clientProfile);

      expect(risk).toBe('low');
    });

    test('should assess medium risk for medium risk client profile', () => {
      const hiddenCosts = {
        development: 100000,
        total: 130000,
        percentageIncrease: 30,
        breakdown: {}
      };

      const clientProfile = {
        riskLevel: 'medium',
        hadFailure: false,
        urgency: 'medium'
      };

      const risk = calculator.assessProjectRisk(hiddenCosts, clientProfile);

      expect(risk).toBe('medium');
    });
  });

  describe('generateRecommendations', () => {
    test('should generate recommendations for high risk projects', () => {
      const hiddenCosts = {
        development: 100000,
        total: 150000,
        percentageIncrease: 50,
        breakdown: {
          scopeCreep: { amount: 15000 },
          clientCoordination: { amount: 10000 }
        }
      };

      const clientProfile = {
        riskLevel: 'high',
        techSavvy: 'low',
        urgency: 'high'
      };

      const recommendations = calculator.generateRecommendations(hiddenCosts, clientProfile);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    test('should generate recommendations for low risk projects', () => {
      const hiddenCosts = {
        development: 100000,
        total: 115000,
        percentageIncrease: 15,
        breakdown: {}
      };

      const clientProfile = {
        riskLevel: 'low',
        techSavvy: 'high'
      };

      const recommendations = calculator.generateRecommendations(hiddenCosts, clientProfile);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should include scope creep mitigation recommendations', () => {
      const hiddenCosts = {
        development: 100000,
        total: 150000,
        percentageIncrease: 50,
        breakdown: {
          scopeCreep: { amount: 20000 }
        }
      };

      const clientProfile = {
        riskLevel: 'high',
        budgetClarity: 'vague'
      };

      const recommendations = calculator.generateRecommendations(hiddenCosts, clientProfile);

      expect(recommendations.some(r => 
        r.toLowerCase().includes('scope') || 
        r.toLowerCase().includes('change')
      )).toBe(true);
    });
  });
});

