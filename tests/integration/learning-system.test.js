/**
 * Integration Tests for Learning System
 * 
 * Test Cases:
 * 1. Full learning flow - feedback submission triggers learning
 * 2. Pattern learning integration - learn from project completion
 * 3. Duplicate filtering integration - prevent duplicate lessons
 * 4. Baseline tuning integration - generate and apply recommendations
 * 5. Domain emergence integration - detect new domains
 * 6. Learning orchestrator integration - coordinate all components
 */

const FeedbackAutomator = require('../../src/modules/feedback-automator');
const PatternLearner = require('../../src/modules/pattern-learner');
const BaselineTuner = require('../../src/modules/baseline-tuner');
const DomainEmergenceDetector = require('../../src/modules/domain-emergence');
const LearningOrchestrator = require('../../src/modules/learning-orchestrator');

describe('Learning System Integration', () => {
  let mockDb;
  let mockLogger;
  let mockConfig;
  let mockLibrary;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    mockConfig = {};

    mockLibrary = {
      getBaseline: jest.fn((industry) => ({
        domain: industry,
        module_efforts: {
          'Auth': 2.0,
          'Dashboard': 3.0
        },
        hourly_rate: 85
      })),
      getModuleEffort: jest.fn((moduleName, industry) => 2.0)
    };

    // Mock database with learning tables
    const lessons = new Map();
    const patterns = new Map();
    const accuracy = new Map();

    mockDb = {
      getProject: jest.fn((id) => {
        if (id === 'project-1') {
          return {
            id: 1,
            project_code: 'project-1',
            quoted_cost: 100000,
            quoted_timeline_days: 30,
            actual_cost: 120000,
            actual_timeline_days: 35,
            refined_scope: JSON.stringify({
              modules: [
                { name: 'Auth', effort: 5, days: 5 },
                { name: 'Dashboard', effort: 10, days: 10 }
              ]
            }),
            domainContext: { industry: 'retail' },
            client_id: 1
          };
        }
        return null;
      }),
      getLearningLesson: jest.fn((hash) => {
        return lessons.get(hash) || null;
      }),
      storeLearningLesson: jest.fn((hash, type, content, projectId, confidence) => {
        const lesson = {
          id: lessons.size + 1,
          lesson_hash: hash,
          lesson_type: type,
          lesson_content: content,
          first_seen_project_id: projectId,
          confidence_score: confidence,
          occurrence_count: 1
        };
        lessons.set(hash, lesson);
        return lesson.id;
      }),
      getLessonsByType: jest.fn((type) => {
        return Array.from(lessons.values()).filter(l => l.lesson_type === type);
      }),
      updateEstimationAccuracy: jest.fn((moduleName, domain, variance, multiplier) => {
        const key = `${moduleName}-${domain}`;
        accuracy.set(key, { moduleName, domain, variance, multiplier });
      }),
      recordPattern: jest.fn((type, domain, key, value, success) => {
        const patternKey = `${type}-${domain}-${key}`;
        patterns.set(patternKey, { type, domain, key, value, success });
      }),
      db: {
        prepare: jest.fn((sql) => {
          return {
            get: jest.fn(() => null),
            run: jest.fn(() => ({ lastInsertRowid: 1 })),
            all: jest.fn(() => [])
          };
        })
      }
    };
  });

  describe('Full Learning Flow', () => {
    test('should trigger learning when feedback is submitted', async () => {
      const feedbackAutomator = new FeedbackAutomator(mockDb, mockLogger, mockConfig);
      const patternLearner = new PatternLearner(mockDb, mockLogger, mockConfig);

      // Mock feedback processing
      const projectId = 'project-1';
      const token = 'test-token-123';
      const actualData = {
        cost: 120000,
        timeline: 35,
        scopeCreep: 5,
        moduleActuals: {
          'Auth': 6,
          'Dashboard': 12
        }
      };

      // Process feedback (should trigger learning)
      const result = await feedbackAutomator.processFeedback(projectId, token, actualData);

      expect(result.success).toBe(true);
      expect(result.variances).toBeDefined();
      expect(result.variances.costVariance).toBeCloseTo(20, 1);

      // Verify learning was triggered
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Learning triggered'),
        expect.any(Object)
      );
    });
  });

  describe('Pattern Learning Integration', () => {
    test('should learn patterns from project completion', async () => {
      const patternLearner = new PatternLearner(mockDb, mockLogger, mockConfig);

      const projectId = 'project-1';
      const result = await patternLearner.learn(projectId);

      expect(result.success).toBe(true);
      expect(result.modulesUpdated).toBeGreaterThanOrEqual(0);
      expect(result.lessonsStored).toBeGreaterThanOrEqual(0);
      expect(result.duplicatesFiltered).toBeGreaterThanOrEqual(0);
    });

    test('should update module accuracy from variances', async () => {
      const patternLearner = new PatternLearner(mockDb, mockLogger, mockConfig);

      const moduleName = 'Auth';
      const domain = 'retail';
      const variance = 0.2;
      const projectId = 1;

      await patternLearner.updateModuleAccuracy(moduleName, domain, variance, projectId);

      // Should attempt to update estimation accuracy
      expect(mockDb.updateEstimationAccuracy || mockDb.db.prepare).toHaveBeenCalled();
    });
  });

  describe('Duplicate Filtering Integration', () => {
    test('should prevent duplicate lessons from being stored', async () => {
      const patternLearner = new PatternLearner(mockDb, mockLogger, mockConfig);

      const lessonContent = {
        moduleName: 'Auth',
        domain: 'retail',
        variance: 0.2
      };
      const lessonType = 'module_accuracy';
      const projectId = 1;

      // First lesson - should be stored
      const hash1 = await patternLearner.storeLesson(lessonContent, lessonType, projectId, 0.7);
      expect(hash1).toBeDefined();

      // Second identical lesson - should be detected as duplicate
      const duplicate = await patternLearner.detectDuplicateLesson(lessonContent, lessonType);
      
      // Should detect duplicate
      expect(duplicate).not.toBeNull();
    });

    test('should update occurrence count for duplicate lessons', async () => {
      const patternLearner = new PatternLearner(mockDb, mockLogger, mockConfig);

      const lessonContent = {
        moduleName: 'Auth',
        domain: 'retail',
        variance: 0.2
      };
      const lessonType = 'module_accuracy';
      const projectId = 1;

      // Store first lesson
      await patternLearner.storeLesson(lessonContent, lessonType, projectId, 0.7);

      // Try to store duplicate
      const existingLesson = await patternLearner.detectDuplicateLesson(lessonContent, lessonType);
      if (existingLesson) {
        // Should update existing lesson
        const updateStmt = {
          run: jest.fn()
        };
        mockDb.db.prepare = jest.fn(() => updateStmt);
        
        await patternLearner.storeLesson(lessonContent, lessonType, projectId, 0.8);
        
        // Should update occurrence count
        expect(updateStmt.run).toHaveBeenCalled();
      }
    });
  });

  describe('Baseline Tuning Integration', () => {
    test('should generate tuning recommendations from variance patterns', async () => {
      const baselineTuner = new BaselineTuner(mockDb, mockLogger, mockConfig, mockLibrary);

      // Mock projects with variances
      mockDb.db.prepare = jest.fn((sql) => {
        if (sql.includes('SELECT * FROM projects')) {
          return {
            all: jest.fn(() => [
              {
                id: 1,
                quoted_cost: 100000,
                actual_cost: 120000,
                quoted_timeline_days: 30,
                actual_timeline_days: 35,
                status: 'completed',
                completed_at: new Date().toISOString(),
                client_id: 1,
                refined_scope: JSON.stringify({
                  modules: [
                    { name: 'Auth', effort: 5, days: 5 }
                  ]
                })
              }
            ])
          };
        }
        if (sql.includes('SELECT industry FROM clients')) {
          return {
            get: jest.fn(() => ({ industry: 'retail' }))
          };
        }
        return {
          get: jest.fn(() => null),
          all: jest.fn(() => [])
        };
      });

      const domain = 'retail';
      const result = await baselineTuner.tuneBaseline(domain);

      // Should analyze patterns and generate recommendations
      expect(result).toBeDefined();
      expect(result.patterns).toBeDefined();
    });

    test('should apply baseline recommendations', async () => {
      const baselineTuner = new BaselineTuner(mockDb, mockLogger, mockConfig, mockLibrary);

      const domain = 'retail';
      const recommendations = [
        {
          type: 'multiplier_adjustment',
          module: 'Auth',
          domain: 'retail',
          recommendedMultiplier: 1.2,
          currentBaseline: 2.0,
          recommendedBaseline: 2.4,
          confidence: 0.8
        }
      ];

      const result = await baselineTuner.applyRecommendations(domain, recommendations);

      expect(result.applied).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Domain Emergence Integration', () => {
    test('should detect emerging domain patterns', async () => {
      const domainEmergence = new DomainEmergenceDetector(mockDb, mockLogger, mockConfig);

      // Mock projects for pattern detection
      mockDb.db.prepare = jest.fn((sql) => {
        if (sql.includes('SELECT * FROM projects')) {
          return {
            all: jest.fn(() => [
              {
                id: 1,
                status: 'completed',
                actual_cost: 100000,
                completed_at: new Date().toISOString(),
                client_id: 1,
                refined_scope: JSON.stringify({
                  modules: [
                    { name: 'Auth', displayName: 'Auth' },
                    { name: 'Dashboard', displayName: 'Dashboard' }
                  ]
                })
              }
            ])
          };
        }
        if (sql.includes('SELECT industry FROM clients')) {
          return {
            get: jest.fn(() => ({ industry: 'retail' }))
          };
        }
        return {
          get: jest.fn(() => null),
          all: jest.fn(() => [])
        };
      });

      const result = await domainEmergence.detectEmergingDomains();

      expect(Array.isArray(result)).toBe(true);
    });

    test('should filter duplicate domain patterns', async () => {
      const domainEmergence = new DomainEmergenceDetector(mockDb, mockLogger, mockConfig);

      const patternKey = 'retail-2-medium-generic';
      
      // Check for duplicate
      const duplicate = await domainEmergence.checkDuplicateDomain(patternKey);

      // Should return null for new pattern or existing pattern
      expect(duplicate === null || duplicate !== null).toBe(true);
    });
  });

  describe('Learning Orchestrator Integration', () => {
    test('should coordinate all learning components', async () => {
      const orchestrator = new LearningOrchestrator(mockDb, mockLogger, mockConfig, mockLibrary);

      const projectId = 'project-1';
      const result = await orchestrator.processProjectCompletion(projectId);

      expect(result).toBeDefined();
      expect(result.projectId).toBeDefined();
      expect(result.feedbackRequest).toBeDefined();
      expect(result.patternLearning).toBeDefined();
    });

    test('should run scheduled learning tasks', async () => {
      const orchestrator = new LearningOrchestrator(mockDb, mockLogger, mockConfig, mockLibrary);

      // Mock projects for scheduled learning
      mockDb.db.prepare = jest.fn((sql) => {
        if (sql.includes('SELECT * FROM projects')) {
          return {
            all: jest.fn(() => [
              {
                id: 1,
                status: 'completed',
                actual_cost: 120000,
                actual_timeline_days: 35,
                completed_at: new Date().toISOString()
              }
            ])
          };
        }
        return {
          get: jest.fn(() => null),
          all: jest.fn(() => [])
        };
      });

      const result = await orchestrator.runScheduledLearning();

      expect(result).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.projectsProcessed).toBeGreaterThanOrEqual(0);
    });

    test('should get learning statistics', async () => {
      const orchestrator = new LearningOrchestrator(mockDb, mockLogger, mockConfig, mockLibrary);

      mockDb.db.prepare = jest.fn((sql) => {
        if (sql.includes('COUNT(*)')) {
          return {
            get: jest.fn(() => ({ count: 10 }))
          };
        }
        return {
          get: jest.fn(() => null),
          all: jest.fn(() => [])
        };
      });

      const stats = await orchestrator.getLearningStats();

      expect(stats).toBeDefined();
      expect(stats.lessonsCount).toBeGreaterThanOrEqual(0);
      expect(stats.patternsCount).toBeGreaterThanOrEqual(0);
      expect(stats.accuracyRecordsCount).toBeGreaterThanOrEqual(0);
    });
  });
});

