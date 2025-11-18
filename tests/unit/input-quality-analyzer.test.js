/**
 * Unit Tests for Input Quality Analyzer (InputAnalyzerEnhanced)
 * 
 * Test Cases:
 * 1. analyze - with high quality input (detailed requirements)
 * 2. analyze - with low quality input (vague requirements)
 * 3. analyze - with medium quality input (needs clarification)
 * 4. analyzeTrust - with positive trust signals (budget, timeline, tech stack)
 * 5. analyzeTrust - with negative trust signals (equity offer, too ambitious)
 * 6. analyzeTrust - with contextual signals (repeat client, referral)
 * 7. detectIntent - builder intent detection
 * 8. detectIntent - explorer intent detection
 * 9. determineRouting - premium routing for high quality/trust
 * 10. determineRouting - guided routing for low quality/trust
 * 11. generateSmartRecommendations - recommendations for different scenarios
 * 12. generateFlag - flag generation for negative signals
 * 13. generateClarificationQuestions - question generation
 */

const InputAnalyzerEnhanced = require('../../src/modules/input-analyzer-enhanced');

describe('InputAnalyzerEnhanced', () => {
  let analyzer;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    analyzer = new InputAnalyzerEnhanced(mockLogger);
  });

  describe('analyze', () => {
    test('should return high quality analysis for detailed input', async () => {
      const input = `
        We need to build an e-commerce platform for retail business.
        Expected timeline: 3 months
        Budget: ₹5 lakhs
        Tech stack: React, Node.js, PostgreSQL
        User base: 1000+ customers
        Current system: Using Excel for inventory
        Industry: Retail
      `;

      const result = await analyzer.analyze(input, {
        useQualityAnalysis: true
      });

      expect(result).toBeDefined();
      expect(result.completeness).toBeGreaterThan(60);
      expect(result.quality).toBeGreaterThan(60);
      expect(result.trust).toBeDefined();
      expect(result.trust.score).toBeGreaterThan(50);
    });

    test('should return low quality analysis for vague input', async () => {
      const input = 'I need an app';

      const result = await analyzer.analyze(input, {
        useQualityAnalysis: true
      });

      expect(result).toBeDefined();
      expect(result.completeness).toBeLessThan(40);
      expect(result.quality).toBeLessThan(40);
      expect(result.feasibility).toBe('too-vague');
    });

    test('should return medium quality analysis for partial input', async () => {
      const input = `
        Building a website for my business.
        Need user login and dashboard.
        Budget around ₹2 lakhs.
      `;

      const result = await analyzer.analyze(input, {
        useQualityAnalysis: true
      });

      expect(result).toBeDefined();
      expect(result.completeness).toBeGreaterThan(30);
      expect(result.completeness).toBeLessThan(70);
      expect(result.feasibility).toBe('needs-clarification');
    });
  });

  describe('analyzeTrust', () => {
    test('should detect positive trust signals (budget, timeline, tech stack)', () => {
      const input = `
        We need a SaaS platform.
        Budget: ₹10 lakhs
        Timeline: 6 months
        Tech: React, Node.js, MongoDB
        Users: 5000 customers
        Industry: Healthcare
      `;

      const result = analyzer.analyzeTrust(input);

      expect(result.score).toBeGreaterThan(50);
      expect(result.signals.positive.length).toBeGreaterThan(0);
      expect(result.signals.positive).toContain('hasBudget');
      expect(result.signals.positive).toContain('hasTimeline');
      expect(result.signals.positive).toContain('hasSpecificTech');
      expect(result.confidence).toBe('high');
    });

    test('should detect negative trust signals (equity offer, too ambitious)', () => {
      const input = `
        Looking for a developer to build the next billion dollar app.
        We can offer equity instead of payment.
        Need it ASAP.
        Just checking prices.
      `;

      const result = analyzer.analyzeTrust(input);

      expect(result.score).toBeLessThan(50);
      expect(result.signals.negative.length).toBeGreaterThan(0);
      expect(result.signals.negative).toContain('hasEquityOffer');
      expect(result.signals.negative).toContain('tooAmbitious');
      expect(result.flags.length).toBeGreaterThan(0);
    });

    test('should detect contextual trust signals (repeat client, referral)', () => {
      const input = 'Need to build a new feature for our existing system.';

      const context = {
        isRepeatClient: true,
        referrer: 'trusted-partner',
        source: 'direct'
      };

      const result = analyzer.analyzeTrust(input, context);

      expect(result.score).toBeGreaterThan(50);
      expect(result.signals.contextual.length).toBeGreaterThan(0);
      expect(result.signals.contextual).toContain('repeatClient');
    });

    test('should normalize trust score to 0-100 range', () => {
      const input = 'a'.repeat(1000); // Very long input with many positive signals

      const result = analyzer.analyzeTrust(input);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('detectIntent', () => {
    test('should detect builder intent', () => {
      const input = 'I need to build a mobile app for my business. Looking for development team.';

      const result = analyzer.detectIntent(input);

      expect(result.primary).toBe('builder');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should detect explorer intent', () => {
      const input = 'Exploring options for building a website. Researching costs and feasibility.';

      const result = analyzer.detectIntent(input);

      expect(result.primary).toBe('explorer');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should detect validator intent', () => {
      const input = 'Need to validate a quote I received. Second opinion on estimate.';

      const result = analyzer.detectIntent(input);

      expect(result.primary).toBe('validator');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should detect shopper intent', () => {
      const input = 'Comparing prices from multiple vendors. Looking for best price.';

      const result = analyzer.detectIntent(input);

      expect(result.primary).toBe('shopper');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should detect dreamer intent', () => {
      const input = 'Want to build this after we get funding. Once investor comes in.';

      const result = analyzer.detectIntent(input);

      expect(result.primary).toBe('dreamer');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should detect tender intent', () => {
      const input = 'Need response to RFP. Tender submission required. Technical proposal needed.';

      const result = analyzer.detectIntent(input);

      expect(result.primary).toBe('tender');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should return unknown intent when no patterns match', () => {
      const input = 'Random text with no intent signals.';

      const result = analyzer.detectIntent(input);

      expect(result.primary).toBe('unknown');
      expect(result.confidence).toBe(0);
    });
  });

  describe('determineRouting', () => {
    test('should route to FULL_ANALYSIS for premium quality/trust', () => {
      const qualityAnalysis = {
        quality: 80,
        completeness: 85
      };

      const trustAnalysis = {
        score: 75,
        confidence: 'high'
      };

      const intent = {
        primary: 'builder',
        confidence: 80
      };

      const result = analyzer.determineRouting(qualityAnalysis, trustAnalysis, intent);

      expect(result.path).toBe('FULL_ANALYSIS');
      expect(result.tier).toBe('premium');
    });

    test('should route to GUIDED_CLARIFICATION for low quality/trust', () => {
      const qualityAnalysis = {
        quality: 35,
        completeness: 30
      };

      const trustAnalysis = {
        score: 30,
        confidence: 'low'
      };

      const intent = {
        primary: 'explorer',
        confidence: 40
      };

      const result = analyzer.determineRouting(qualityAnalysis, trustAnalysis, intent);

      expect(result.path).toBe('GUIDED_CLARIFICATION');
      expect(result.tier).toBe('guided');
    });

    test('should route to EDUCATIONAL for very low quality/trust', () => {
      const qualityAnalysis = {
        quality: 20,
        completeness: 15
      };

      const trustAnalysis = {
        score: 20,
        confidence: 'low'
      };

      const intent = {
        primary: 'dreamer',
        confidence: 30
      };

      const result = analyzer.determineRouting(qualityAnalysis, trustAnalysis, intent);

      expect(result.path).toBe('EDUCATIONAL');
      expect(result.tier).toBe('educational');
    });
  });

  describe('generateSmartRecommendations', () => {
    test('should generate recommendations for high quality input', () => {
      const quality = {
        quality: 80,
        completeness: 85
      };

      const trust = {
        score: 75,
        confidence: 'high'
      };

      const intent = {
        primary: 'builder',
        confidence: 80
      };

      const routing = {
        path: 'FULL_ANALYSIS',
        tier: 'premium'
      };

      const result = analyzer.generateSmartRecommendations(quality, trust, intent, routing);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should generate recommendations for low quality input', () => {
      const quality = {
        quality: 30,
        completeness: 25
      };

      const trust = {
        score: 30,
        confidence: 'low'
      };

      const intent = {
        primary: 'explorer',
        confidence: 40
      };

      const routing = {
        path: 'GUIDED_CLARIFICATION',
        tier: 'guided'
      };

      const result = analyzer.generateSmartRecommendations(quality, trust, intent, routing);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should include clarification recommendations
      expect(result.some(r => r.type === 'clarification')).toBe(true);
    });
  });

  describe('generateFlag', () => {
    test('should generate flag for equity offer', () => {
      const flag = analyzer.generateFlag('hasEquityOffer');

      expect(flag).toBeDefined();
      expect(flag.type).toBe('warning');
      expect(flag.severity).toBe('high');
    });

    test('should generate flag for too ambitious', () => {
      const flag = analyzer.generateFlag('tooAmbitious');

      expect(flag).toBeDefined();
      expect(flag.type).toBe('warning');
    });
  });

  describe('generateClarificationQuestions', () => {
    test('should generate clarification questions for low quality input', () => {
      const quality = {
        quality: 30,
        completeness: 25,
        missingCritical: ['timeline', 'budget']
      };

      const trust = {
        score: 30,
        confidence: 'low'
      };

      const result = analyzer.generateClarificationQuestions(quality, trust);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should generate questions based on missing critical information', () => {
      const quality = {
        quality: 40,
        completeness: 35,
        missingCritical: ['budget', 'userCount']
      };

      const trust = {
        score: 40,
        confidence: 'medium'
      };

      const result = analyzer.generateClarificationQuestions(quality, trust);

      expect(result).toBeDefined();
      // Should include questions about budget and user count
      expect(result.some(q => q.category === 'budget' || q.category === 'userCount')).toBe(true);
    });
  });
});

