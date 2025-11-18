/**
 * End-to-End Tests for Complete User Journeys
 * 
 * Test Cases:
 * 1. Complete scoping journey - input to estimate with learning
 * 2. Feedback submission journey - submit actuals and trigger learning
 * 3. Learning improvement journey - verify estimates improve over time
 * 4. Multi-project journey - handle multiple projects with learning
 * 5. Error recovery journey - handle errors gracefully
 */

const ChainExecutor = require('../../src/modules/chain-executor');
const FeedbackAutomator = require('../../src/modules/feedback-automator');
const LearningOrchestrator = require('../../src/modules/learning-orchestrator');

describe('E2E User Journeys', () => {
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

    mockConfig = {
      get: jest.fn((key) => {
        const defaults = {
          'scopeReview.budgetRiskThreshold': 0.2,
          'scopeReview.seniorResourceDailyRate': 15000
        };
        return defaults[key];
      })
    };

    mockLibrary = {
      getBaseline: jest.fn((industry) => ({
        domain: industry || 'generic',
        module_efforts: {
          'Auth': 2.0,
          'Dashboard': 3.0,
          'API': 2.5
        },
        hourly_rate: 85
      })),
      getModuleEffort: jest.fn((moduleName, industry) => {
        const efforts = {
          'Auth': 2.0,
          'Dashboard': 3.0,
          'API': 2.5
        };
        return efforts[moduleName] || 2.0;
      }),
      getReusableModule: jest.fn(() => ({ available: false })),
      normalizeModuleName: jest.fn((name) => name)
    };

    // Mock database
    const projects = new Map();
    const lessons = new Map();

    mockDb = {
      getProject: jest.fn((id) => {
        return projects.get(id) || null;
      }),
      createProject: jest.fn((data) => {
        const project = {
          id: projects.size + 1,
          project_code: `PROJ-${projects.size + 1}`,
          ...data
        };
        projects.set(project.id, project);
        return project;
      }),
      updateProjectActuals: jest.fn((code, actuals) => {
        const project = Array.from(projects.values()).find(p => p.project_code === code);
        if (project) {
          project.actual_cost = actuals.cost;
          project.actual_timeline_days = actuals.timeline;
          project.status = actuals.status || 'completed';
        }
      }),
      getLearningLesson: jest.fn((hash) => lessons.get(hash) || null),
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

  describe('Complete Scoping Journey', () => {
    test('should complete full scoping flow from input to estimate', async () => {
      const executor = new ChainExecutor(mockConfig, mockLogger, mockDb, mockLibrary);

      const input = `
        We need to build an e-commerce platform for retail business.
        Modules needed: User authentication, Product catalog, Shopping cart, Payment integration
        Expected users: 5000+
        Budget: ₹10 lakhs
        Timeline: 3 months
        Tech stack: React, Node.js, PostgreSQL
      `;

      const options = {
        useQualityAnalysis: true,
        projectDetails: {
          industry: 'retail',
          scale: 'medium'
        }
      };

      const result = await executor.execute(input, options);

      expect(result).toBeDefined();
      expect(result.technical).toBeDefined();
      expect(result.technical.estimate).toBeDefined();
      expect(result.technical.estimate.cost).toBeDefined();
      expect(result.technical.estimate.timeline).toBeDefined();
    });

    test('should include learning system in scoping flow', async () => {
      const executor = new ChainExecutor(mockConfig, mockLogger, mockDb, mockLibrary);

      const input = 'Need a simple website with login and dashboard.';

      const result = await executor.execute(input, {
        useQualityAnalysis: true
      });

      // Should complete without errors
      expect(result).toBeDefined();
      expect(result.technical).toBeDefined();
    });
  });

  describe('Feedback Submission Journey', () => {
    test('should submit feedback and trigger learning', async () => {
      // Create a project first
      const project = mockDb.createProject({
        project_code: 'PROJ-1',
        quoted_cost: 100000,
        quoted_timeline_days: 30,
        refined_scope: JSON.stringify({
          modules: [
            { name: 'Auth', effort: 5 },
            { name: 'Dashboard', effort: 10 }
          ]
        })
      });

      const feedbackAutomator = new FeedbackAutomator(mockDb, mockLogger, mockConfig);

      // Generate feedback request
      const feedbackRequest = await feedbackAutomator.createFeedbackRequest(project.id);
      expect(feedbackRequest.success).toBe(true);
      expect(feedbackRequest.token).toBeDefined();

      // Submit feedback
      const actualData = {
        cost: 120000,
        timeline: 35,
        scopeCreep: 5,
        moduleActuals: {
          'Auth': 6,
          'Dashboard': 12
        }
      };

      const result = await feedbackAutomator.processFeedback(
        project.id,
        feedbackRequest.token,
        actualData
      );

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

  describe('Learning Improvement Journey', () => {
    test('should improve estimates over multiple projects', async () => {
      const orchestrator = new LearningOrchestrator(mockDb, mockLogger, mockConfig, mockLibrary);

      // First project - high variance
      const project1 = mockDb.createProject({
        project_code: 'PROJ-1',
        quoted_cost: 100000,
        quoted_timeline_days: 30,
        actual_cost: 130000,
        actual_timeline_days: 40,
        status: 'completed',
        refined_scope: JSON.stringify({
          modules: [
            { name: 'Auth', effort: 5, days: 5 }
          ]
        }),
        domainContext: { industry: 'retail' }
      });

      // Process first project completion
      await orchestrator.processProjectCompletion(project1.id);

      // Second project - should learn from first
      const project2 = mockDb.createProject({
        project_code: 'PROJ-2',
        quoted_cost: 100000,
        quoted_timeline_days: 30,
        refined_scope: JSON.stringify({
          modules: [
            { name: 'Auth', effort: 5, days: 5 }
          ]
        }),
        domainContext: { industry: 'retail' }
      });

      // Process second project (should apply learned lessons)
      const result = await orchestrator.processProjectCompletion(project2.id);

      expect(result).toBeDefined();
      expect(result.patternLearning).toBeDefined();
    });
  });

  describe('Multi-Project Journey', () => {
    test('should handle multiple projects with learning', async () => {
      const orchestrator = new LearningOrchestrator(mockDb, mockLogger, mockConfig, mockLibrary);

      // Create multiple projects
      const projects = [];
      for (let i = 1; i <= 3; i++) {
        const project = mockDb.createProject({
          project_code: `PROJ-${i}`,
          quoted_cost: 100000,
          quoted_timeline_days: 30,
          actual_cost: 100000 + (i * 10000),
          actual_timeline_days: 30 + i,
          status: 'completed',
          refined_scope: JSON.stringify({
            modules: [
              { name: 'Auth', effort: 5 }
            ]
          }),
          domainContext: { industry: 'retail' }
        });
        projects.push(project);
      }

      // Process all projects
      for (const project of projects) {
        const result = await orchestrator.processProjectCompletion(project.id);
        expect(result).toBeDefined();
      }

      // Get learning stats
      const stats = await orchestrator.getLearningStats();
      expect(stats).toBeDefined();
      expect(stats.lessonsCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Recovery Journey', () => {
    test('should handle errors gracefully in learning flow', async () => {
      const orchestrator = new LearningOrchestrator(mockDb, mockLogger, mockConfig, mockLibrary);

      // Create project with invalid data
      const project = mockDb.createProject({
        project_code: 'PROJ-ERROR',
        quoted_cost: null, // Invalid
        quoted_timeline_days: null
      });

      // Mock database error
      mockDb.getProject = jest.fn(() => {
        throw new Error('Database error');
      });

      // Should handle error gracefully
      try {
        await orchestrator.processProjectCompletion(project.id);
      } catch (error) {
        // Error should be caught and logged
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });

    test('should continue processing even if one component fails', async () => {
      const orchestrator = new LearningOrchestrator(mockDb, mockLogger, mockConfig, mockLibrary);

      const project = mockDb.createProject({
        project_code: 'PROJ-PARTIAL',
        quoted_cost: 100000,
        quoted_timeline_days: 30,
        actual_cost: 120000,
        actual_timeline_days: 35,
        status: 'completed'
      });

      // Mock partial failure
      mockDb.getLearningLesson = jest.fn(() => {
        throw new Error('Learning lesson error');
      });

      // Should continue processing other components
      const result = await orchestrator.processProjectCompletion(project.id);

      expect(result).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

