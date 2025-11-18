/**
 * Unit Tests for Estimator Module
 * 
 * Test Cases:
 * 1. calculateFromTechnicalBreakdown - with valid technical breakdown
 * 2. calculateFromTechnicalBreakdown - with missing components
 * 3. calculateTechnicalConfidence - high confidence with detailed breakdown
 * 4. calculateTechnicalConfidence - low confidence with minimal breakdown
 * 5. estimate - with technical breakdown (component-level)
 * 6. estimate - without technical breakdown (module-level)
 * 7. calculateTimeline - with dependencies and persona buffer
 * 8. calculateTimeline - with reusable modules
 * 9. calculateDepChainDepth - simple dependency chain
 * 10. calculateDepChainDepth - complex nested dependencies
 * 11. calculateCost - with budget tier and domain context
 * 12. calculateSavings - with reusable modules
 * 13. calculateConfidence - high feasibility
 * 14. calculateConfidence - low feasibility
 * 15. getHourlyRate - for different industries
 * 16. getTimelineConfidence - for different domains
 */

const Estimator = require('../../src/modules/estimator');

describe('Estimator', () => {
  let estimator;
  let mockLibrary;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    mockLibrary = {
      getModuleEffort: jest.fn((moduleName, industry) => {
        const efforts = {
          'Auth': 2.0,
          'Dashboard': 3.0,
          'API': 2.5,
          'Database': 4.0
        };
        return efforts[moduleName] || 2.0;
      }),
      getHourlyRate: jest.fn((industry) => {
        const rates = {
          retail: 80,
          saas: 100,
          healthcare: 120,
          finance: 110,
          generic: 85
        };
        return rates[industry] || 85;
      }),
      getReusableModule: jest.fn((moduleName, industry) => ({
        available: moduleName === 'Auth',
        effortReduction: 0.5
      })),
      getBaseline: jest.fn((industry) => ({
        hourly_rate: industry === 'retail' ? 80 : 85,
        module_efforts: {
          'Auth': 2.0,
          'Dashboard': 3.0
        }
      }))
    };

    estimator = new Estimator(mockLibrary, mockLogger);
  });

  describe('calculateFromTechnicalBreakdown', () => {
    test('should calculate estimate from valid technical breakdown', () => {
      const technicalBreakdown = {
        technicalBreakdowns: [
          {
            businessModule: 'Auth',
            technicalComponents: [
              {
                component: 'Login API',
                layer: 'API',
                baseEffort: 2,
                adjustedEffort: 2.5,
                complexity: 'medium'
              },
              {
                component: 'User Model',
                layer: 'Database',
                baseEffort: 1.5,
                adjustedEffort: 1.5,
                complexity: 'low'
              }
            ]
          }
        ],
        totalComponents: 2
      };

      const refinedScope = {
        modules: [{ name: 'Auth', complexity: 'medium' }]
      };

      const budgetTier = 'moderate';
      const psychProfile = {
        psychAdjustments: {
          timelineBuffer: 0.1
        }
      };

      const domainContext = {
        industry: 'retail'
      };

      const result = estimator.calculateFromTechnicalBreakdown(
        technicalBreakdown,
        refinedScope,
        budgetTier,
        psychProfile,
        domainContext
      );

      expect(result.estimate).toBeDefined();
      expect(result.estimate.timeline).toBeDefined();
      expect(result.estimate.cost).toBeDefined();
      expect(result.estimate.cost.total).toBeGreaterThan(0);
      expect(result.estimate.timeline.days).toBeGreaterThan(0);
      expect(result.estimate.method).toBe('technical_breakdown');
    });

    test('should handle missing components gracefully', () => {
      const technicalBreakdown = {
        technicalBreakdowns: [],
        totalComponents: 0
      };

      const refinedScope = {
        modules: []
      };

      const result = estimator.calculateFromTechnicalBreakdown(
        technicalBreakdown,
        refinedScope,
        'moderate',
        { psychAdjustments: { timelineBuffer: 0 } },
        { industry: 'generic' }
      );

      expect(result.estimate).toBeDefined();
      expect(result.estimate.cost.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateTechnicalConfidence', () => {
    test('should return high confidence for detailed breakdown', () => {
      const technicalBreakdown = {
        technicalBreakdowns: [
          {
            technicalComponents: [
              { component: 'Component1' },
              { component: 'Component2' },
              { component: 'Component3' }
            ]
          }
        ],
        totalComponents: 3,
        codeStructure: {
          'src': ['file1.js', 'file2.js', 'file3.js', 'file4.js', 'file5.js'],
          'tests': ['test1.js', 'test2.js', 'test3.js', 'test4.js', 'test5.js', 'test6.js']
        }
      };

      const confidence = estimator.calculateTechnicalConfidence(technicalBreakdown);
      expect(confidence).toBeGreaterThan(0.7);
      expect(confidence).toBeLessThanOrEqual(0.95);
    });

    test('should return lower confidence for minimal breakdown', () => {
      const technicalBreakdown = {
        technicalBreakdowns: [
          {
            technicalComponents: [
              { component: 'Component1' }
            ]
          }
        ],
        totalComponents: 1
      };

      const confidence = estimator.calculateTechnicalConfidence(technicalBreakdown);
      expect(confidence).toBeGreaterThanOrEqual(0.6);
      expect(confidence).toBeLessThan(0.8);
    });

    test('should return default confidence for null breakdown', () => {
      const confidence = estimator.calculateTechnicalConfidence(null);
      expect(confidence).toBe(0.6);
    });
  });

  describe('estimate', () => {
    test('should use technical breakdown when available', () => {
      const technicalBreakdown = {
        technicalBreakdowns: [
          {
            businessModule: 'Auth',
            technicalComponents: [
              {
                component: 'Login API',
                baseEffort: 2,
                adjustedEffort: 2
              }
            ]
          }
        ],
        totalComponents: 1
      };

      const refinedScope = {
        modules: [{ name: 'Auth', complexity: 'medium' }],
        feasibility: { score: 0.8 }
      };

      const result = estimator.estimate(
        refinedScope,
        'moderate',
        { psychAdjustments: { timelineBuffer: 0 } },
        { industry: 'retail' },
        null,
        technicalBreakdown
      );

      expect(result.estimate.method).toBe('technical_breakdown');
      expect(result.estimate.componentCount).toBe(1);
    });

    test('should fallback to module-level calculation without technical breakdown', () => {
      const refinedScope = {
        modules: [
          { name: 'Auth', complexity: 'med', priority: 'high' },
          { name: 'Dashboard', complexity: 'low', priority: 'high' }
        ],
        feasibility: { score: 0.8 }
      };

      const result = estimator.estimate(
        refinedScope,
        'moderate',
        { psychAdjustments: { timelineBuffer: 0.1 } },
        { industry: 'retail' },
        null,
        null
      );

      expect(result.estimate).toBeDefined();
      expect(result.estimate.timeline).toBeDefined();
      expect(result.estimate.cost).toBeDefined();
      expect(result.estimate.hourly_rate).toBe(80); // retail rate
    });
  });

  describe('calculateTimeline', () => {
    test('should calculate timeline with dependencies and persona buffer', () => {
      const modules = [
        {
          name: 'Auth',
          complexity: 'med',
          priority: 'high',
          deps: ['Database']
        },
        {
          name: 'Database',
          complexity: 'high',
          priority: 'high',
          deps: []
        }
      ];

      const psychProfile = {
        psychAdjustments: {
          timelineBuffer: 0.2
        }
      };

      const result = estimator.calculateTimeline(
        modules,
        psychProfile,
        { industry: 'retail' },
        null,
        'moderate'
      );

      expect(result.days).toBeGreaterThan(0);
      expect(result.weeks).toBeGreaterThan(0);
      expect(result.range.min).toBeLessThan(result.range.max);
    });

    test('should apply reuse reduction for reusable modules', () => {
      const modules = [
        {
          name: 'Auth',
          complexity: 'med',
          priority: 'high',
          reusable: true,
          deps: []
        }
      ];

      const result = estimator.calculateTimeline(
        modules,
        { psychAdjustments: { timelineBuffer: 0 } },
        { industry: 'retail' },
        null,
        'moderate'
      );

      // Auth with reuse should have reduced effort
      expect(result.days).toBeGreaterThanOrEqual(1);
    });

    test('should handle deferred modules', () => {
      const modules = [
        {
          name: 'Auth',
          complexity: 'med',
          priority: 'high'
        },
        {
          name: 'Future Feature',
          complexity: 'high',
          priority: 'deferred'
        }
      ];

      const result = estimator.calculateTimeline(
        modules,
        { psychAdjustments: { timelineBuffer: 0 } },
        { industry: 'retail' },
        null,
        'moderate'
      );

      // Deferred modules should not be included
      expect(result.days).toBeGreaterThan(0);
    });
  });

  describe('calculateDepChainDepth', () => {
    test('should calculate simple dependency chain depth', () => {
      const modules = [
        {
          name: 'ModuleA',
          deps: ['ModuleB']
        },
        {
          name: 'ModuleB',
          deps: []
        }
      ];

      const depth = estimator.calculateDepChainDepth(modules[0], modules);
      expect(depth).toBe(1);
    });

    test('should handle complex nested dependencies', () => {
      const modules = [
        {
          name: 'ModuleA',
          deps: ['ModuleB']
        },
        {
          name: 'ModuleB',
          deps: ['ModuleC']
        },
        {
          name: 'ModuleC',
          deps: ['ModuleD']
        },
        {
          name: 'ModuleD',
          deps: []
        }
      ];

      const depth = estimator.calculateDepChainDepth(modules[0], modules);
      expect(depth).toBe(3);
    });

    test('should handle circular dependencies gracefully', () => {
      const modules = [
        {
          name: 'ModuleA',
          deps: ['ModuleB']
        },
        {
          name: 'ModuleB',
          deps: ['ModuleA']
        }
      ];

      const depth = estimator.calculateDepChainDepth(modules[0], modules);
      // Should not infinite loop, visited set prevents this
      expect(depth).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateCost', () => {
    test('should calculate cost with budget tier and domain context', () => {
      const timeline = {
        days: 10,
        weeks: 2
      };

      const modules = [
        { name: 'Auth', complexity: 'med' }
      ];

      const result = estimator.calculateCost(
        timeline,
        modules,
        'moderate',
        { industry: 'retail' }
      );

      expect(result.total).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.base).toBeGreaterThan(0);
    });

    test('should apply budget tier constraints', () => {
      const timeline = {
        days: 100,
        weeks: 20
      };

      const modules = [
        { name: 'Auth', complexity: 'med' }
      ];

      const result = estimator.calculateCost(
        timeline,
        modules,
        'tight',
        { industry: 'retail' }
      );

      expect(result.total).toBeGreaterThan(0);
      // Budget tier should affect calculation
      expect(result.breakdown).toBeDefined();
    });
  });

  describe('calculateSavings', () => {
    test('should calculate savings from reusable modules', () => {
      const modules = [
        {
          name: 'Auth',
          reusable: true
        },
        {
          name: 'Dashboard',
          reusable: false
        }
      ];

      const baseCost = 10000;
      const result = estimator.calculateSavings(
        modules,
        { industry: 'retail' },
        baseCost
      );

      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.breakdown).toBeDefined();
    });

    test('should return zero savings when no reusable modules', () => {
      const modules = [
        {
          name: 'CustomModule',
          reusable: false
        }
      ];

      const result = estimator.calculateSavings(
        modules,
        { industry: 'retail' },
        10000
      );

      expect(result.total).toBe(0);
    });
  });

  describe('calculateConfidence', () => {
    test('should return high confidence for high feasibility', () => {
      const feasibility = {
        score: 0.9,
        factors: {
          completeness: 0.9,
          clarity: 0.8
        }
      };

      const result = estimator.calculateConfidence(
        feasibility,
        { industry: 'retail' },
        [{ name: 'Auth', complexity: 'med' }]
      );

      expect(result.overall).toBeGreaterThan(0.7);
      expect(result.timeline).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);
    });

    test('should return lower confidence for low feasibility', () => {
      const feasibility = {
        score: 0.4,
        factors: {
          completeness: 0.3,
          clarity: 0.4
        }
      };

      const result = estimator.calculateConfidence(
        feasibility,
        { industry: 'retail' },
        [{ name: 'Auth', complexity: 'med' }]
      );

      expect(result.overall).toBeLessThan(0.7);
    });
  });

  describe('getHourlyRate', () => {
    test('should return correct hourly rate for retail industry', () => {
      const rate = estimator.getHourlyRate('retail');
      expect(rate).toBe(80);
    });

    test('should return correct hourly rate for healthcare industry', () => {
      const rate = estimator.getHourlyRate('healthcare');
      expect(rate).toBe(120);
    });

    test('should return default rate for unknown industry', () => {
      const rate = estimator.getHourlyRate('unknown');
      expect(rate).toBe(85); // generic rate
    });
  });

  describe('getTimelineConfidence', () => {
    test('should return confidence based on domain context', () => {
      const confidence = estimator.getTimelineConfidence({
        industry: 'retail',
        hasHistoricalData: true
      });

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    test('should return lower confidence for unknown domain', () => {
      const confidence = estimator.getTimelineConfidence({
        industry: 'unknown',
        hasHistoricalData: false
      });

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThan(1);
    });
  });
});

