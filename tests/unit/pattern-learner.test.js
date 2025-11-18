/**
 * Unit Tests for Pattern Learner Module (with Duplicate Filtering)
 * 
 * Test Cases:
 * 1. learn - learn from project with actuals
 * 2. learn - handle project without actuals
 * 3. updateModuleAccuracy - update accuracy with duplicate detection
 * 4. updateModuleAccuracy - filter duplicate lessons
 * 5. detectDuplicateLesson - detect existing lesson by hash
 * 6. storeLesson - store new lesson
 * 7. storeLesson - update existing lesson (duplicate)
 * 8. applyLessons - apply learned lessons to estimates
 * 9. detectNewPatterns - detect new patterns from project
 * 10. detectNewPatterns - filter duplicate patterns
 */

const PatternLearner = require('../../src/modules/pattern-learner');
const crypto = require('crypto');

describe('PatternLearner', () => {
  let learner;
  let mockDb;
  let mockLogger;
  let mockConfig;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    mockConfig = {};

    // Mock database with learning_lessons table
    mockDb = {
      getProject: jest.fn((id) => {
        if (id === 'test-project-1') {
          return {
            id: 1,
            project_code: 'test-project-1',
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
            domainContext: { industry: 'retail' }
          };
        }
        return null;
      }),
      getLearningLesson: jest.fn((hash) => {
        // Simulate existing lesson
        if (hash === 'existing-hash') {
          return {
            id: 1,
            lesson_hash: hash,
            lesson_type: 'module_accuracy',
            lesson_content: JSON.stringify({ moduleName: 'Auth', domain: 'retail', variance: 0.2 }),
            occurrence_count: 1,
            confidence_score: 0.5
          };
        }
        return null;
      }),
      storeLearningLesson: jest.fn((hash, type, content, projectId, confidence) => {
        return 1; // Return lesson ID
      }),
      getLessonsByType: jest.fn((type) => {
        return [
          {
            id: 1,
            lesson_hash: 'hash1',
            lesson_type: 'module_accuracy',
            lesson_content: JSON.stringify({ moduleName: 'Auth', domain: 'retail', multiplier: 1.2 }),
            confidence_score: 0.8,
            occurrence_count: 5
          }
        ];
      }),
      updateEstimationAccuracy: jest.fn(),
      recordPattern: jest.fn(),
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

    learner = new PatternLearner(mockDb, mockLogger, mockConfig);
  });

  describe('learn', () => {
    test('should learn from project with actuals', async () => {
      const projectId = 'test-project-1';

      const result = await learner.learn(projectId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.projectId).toBe(1);
      expect(result.modulesUpdated).toBeGreaterThanOrEqual(0);
      expect(result.lessonsStored).toBeGreaterThanOrEqual(0);
    });

    test('should handle project without actuals', async () => {
      mockDb.getProject = jest.fn(() => ({
        id: 2,
        quoted_cost: 100000,
        quoted_timeline_days: 30,
        actual_cost: 0,
        actual_timeline_days: 0
      }));

      const result = await learner.learn(2);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No actuals available');
    });

    test('should calculate variances correctly', async () => {
      const projectId = 'test-project-1';

      const result = await learner.learn(projectId);

      expect(result.costVariance).toBeDefined();
      expect(result.daysVariance).toBeDefined();
      // 20% cost variance: (120000 - 100000) / 100000 * 100 = 20%
      expect(result.costVariance).toBeCloseTo(20, 1);
    });
  });

  describe('updateModuleAccuracy', () => {
    test('should update module accuracy with duplicate detection', async () => {
      const moduleName = 'Auth';
      const domain = 'retail';
      const variance = 0.2;
      const projectId = 1;

      // Mock duplicate detection to return null (new lesson)
      mockDb.getLearningLesson = jest.fn(() => null);

      await learner.updateModuleAccuracy(moduleName, domain, variance, projectId);

      expect(mockDb.getLearningLesson).toHaveBeenCalled();
      expect(mockDb.storeLearningLesson || mockDb.db.prepare).toHaveBeenCalled();
    });

    test('should filter duplicate lessons', async () => {
      const moduleName = 'Auth';
      const domain = 'retail';
      const variance = 0.2;
      const projectId = 1;

      // Mock duplicate detection to return existing lesson
      const existingLesson = {
        id: 1,
        lesson_hash: 'existing-hash',
        occurrence_count: 1
      };
      mockDb.getLearningLesson = jest.fn(() => existingLesson);

      await learner.updateModuleAccuracy(moduleName, domain, variance, projectId);

      expect(mockDb.getLearningLesson).toHaveBeenCalled();
      // Should update existing lesson, not create new one
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate'),
        expect.any(Object)
      );
    });
  });

  describe('detectDuplicateLesson', () => {
    test('should detect existing lesson by hash', async () => {
      const lessonContent = {
        moduleName: 'Auth',
        domain: 'retail',
        variance: 0.2
      };
      const lessonType = 'module_accuracy';

      // Create hash
      const contentString = JSON.stringify(lessonContent) + lessonType;
      const lessonHash = crypto.createHash('sha256').update(contentString).digest('hex');

      // Mock database to return existing lesson
      mockDb.getLearningLesson = jest.fn(() => ({
        id: 1,
        lesson_hash: lessonHash
      }));

      const result = await learner.detectDuplicateLesson(lessonContent, lessonType);

      expect(result).not.toBeNull();
      expect(result.lesson_hash).toBe(lessonHash);
    });

    test('should return null for new lesson', async () => {
      const lessonContent = {
        moduleName: 'NewModule',
        domain: 'retail',
        variance: 0.3
      };
      const lessonType = 'module_accuracy';

      // Mock database to return null (no existing lesson)
      mockDb.getLearningLesson = jest.fn(() => null);

      const result = await learner.detectDuplicateLesson(lessonContent, lessonType);

      expect(result).toBeNull();
    });
  });

  describe('storeLesson', () => {
    test('should store new lesson', async () => {
      const lessonContent = {
        moduleName: 'Auth',
        domain: 'retail',
        variance: 0.2
      };
      const lessonType = 'module_accuracy';
      const projectId = 1;
      const confidence = 0.7;

      // Mock duplicate detection to return null
      mockDb.getLearningLesson = jest.fn(() => null);
      mockDb.storeLearningLesson = jest.fn(() => 1);

      const result = await learner.storeLesson(lessonContent, lessonType, projectId, confidence);

      expect(result).toBe(1);
      expect(mockDb.storeLearningLesson).toHaveBeenCalled();
    });

    test('should update existing lesson for duplicate', async () => {
      const lessonContent = {
        moduleName: 'Auth',
        domain: 'retail',
        variance: 0.2
      };
      const lessonType = 'module_accuracy';
      const projectId = 1;
      const confidence = 0.7;

      // Mock duplicate detection to return existing lesson
      const existingLesson = {
        id: 1,
        lesson_hash: 'existing-hash',
        occurrence_count: 1,
        confidence_score: 0.5
      };
      mockDb.getLearningLesson = jest.fn(() => existingLesson);

      // Mock database update
      const updateStmt = {
        run: jest.fn()
      };
      mockDb.db.prepare = jest.fn(() => updateStmt);

      const result = await learner.storeLesson(lessonContent, lessonType, projectId, confidence);

      expect(result).toBe(existingLesson.id);
      expect(updateStmt.run).toHaveBeenCalled();
    });
  });

  describe('applyLessons', () => {
    test('should apply learned lessons to estimates', async () => {
      const moduleName = 'Auth';
      const domain = 'retail';

      // Mock getLessonsByType to return relevant lessons
      mockDb.getLessonsByType = jest.fn(() => [
        {
          id: 1,
          lesson_hash: 'hash1',
          lesson_type: 'module_accuracy',
          lesson_content: JSON.stringify({
            moduleName: 'Auth',
            domain: 'retail',
            multiplier: 1.2
          }),
          confidence_score: 0.8,
          occurrence_count: 5
        }
      ]);

      const result = await learner.applyLessons(moduleName, domain);

      expect(result).toBeDefined();
      expect(result.multiplier).toBe(1.2);
      expect(result.confidence).toBe(0.8);
      expect(result.occurrenceCount).toBe(5);
    });

    test('should return default multiplier when no lessons found', async () => {
      const moduleName = 'UnknownModule';
      const domain = 'retail';

      // Mock getLessonsByType to return empty array
      mockDb.getLessonsByType = jest.fn(() => []);

      const result = await learner.applyLessons(moduleName, domain);

      expect(result.multiplier).toBe(1.0);
      expect(result.confidence).toBe(0);
      expect(result.occurrenceCount).toBe(0);
    });
  });

  describe('detectNewPatterns', () => {
    test('should detect new patterns from project', async () => {
      const project = {
        id: 1,
        refined_scope: {
          modules: [
            { name: 'Auth', displayName: 'Auth' },
            { name: 'Dashboard', displayName: 'Dashboard' }
          ]
        },
        domainContext: { industry: 'retail' }
      };

      // Mock duplicate detection to return null (new pattern)
      mockDb.getLearningLesson = jest.fn(() => null);
      mockDb.db.prepare = jest.fn(() => ({
        run: jest.fn(() => ({ lastInsertRowid: 1 }))
      }));

      const result = await learner.detectNewPatterns(project, 1);

      expect(result.stored).toBeGreaterThanOrEqual(0);
      expect(result.duplicates).toBeGreaterThanOrEqual(0);
    });

    test('should filter duplicate patterns', async () => {
      const project = {
        id: 1,
        refined_scope: {
          modules: [
            { name: 'Auth', displayName: 'Auth' }
          ]
        },
        domainContext: { industry: 'retail' }
      };

      // Mock duplicate detection to return existing pattern
      mockDb.getLearningLesson = jest.fn(() => ({
        id: 1,
        lesson_hash: 'existing-pattern-hash'
      }));

      const result = await learner.detectNewPatterns(project, 1);

      expect(result.duplicates).toBeGreaterThan(0);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate'),
        expect.any(Object)
      );
    });
  });

  describe('updateHiddenCostMultipliers', () => {
    test('should update hidden cost multipliers for significant variances', async () => {
      const project = {
        id: 1,
        client_profile: { riskLevel: 'high' }
      };

      const variances = {
        costVariance: 25, // > 15%
        daysVariance: 20  // > 15%
      };

      // Mock hidden cost actuals
      const hiddenCostActuals = [
        {
          cost_type: 'scopeCreep',
          variance: 20 // > 15%
        }
      ];

      mockDb.db.prepare = jest.fn((sql) => {
        if (sql.includes('hidden_cost_actuals')) {
          return {
            all: jest.fn(() => hiddenCostActuals)
          };
        }
        return {
          get: jest.fn(() => null),
          run: jest.fn(() => ({ lastInsertRowid: 1 }))
        };
      });

      // Mock duplicate detection
      mockDb.getLearningLesson = jest.fn(() => null);

      await learner.updateHiddenCostMultipliers(project, variances, 1);

      // Should process hidden cost multipliers
      expect(mockDb.db.prepare).toHaveBeenCalled();
    });

    test('should skip update for insignificant variances', async () => {
      const project = {
        id: 1
      };

      const variances = {
        costVariance: 10, // < 15%
        daysVariance: 8   // < 15%
      };

      await learner.updateHiddenCostMultipliers(project, variances, 1);

      // Should not process if variances are not significant
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Duplicate hidden cost'),
        expect.any(Object)
      );
    });
  });
});

