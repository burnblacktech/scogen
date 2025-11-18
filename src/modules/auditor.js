const { v4: uuidv4 } = require('uuid');

class Auditor {
  constructor(library, logger) {
    this.library = library;
    this.logger = logger;
    this.fixLibrary = this.loadFixLibrary();
    this.MAX_AUTO_ADDS = 2;
  }

  loadFixLibrary() {
    return {
      'vague_input': {
        condition: (edge) => edge.desc.toLowerCase().includes('vague'),
        fix: (scope, budgetTier, edge) => {
          if (scope.modules.filter(m => m.priority !== 'deferred').length < 2) {
            scope.modules.push(
              this.createModule('Auth', 'med', [], 'audit_added', 'Vague input—added foundation'),
              this.createModule('Dashboard', 'med', ['Auth'], 'audit_added', 'Vague input—added core UI')
            );
          }
          return { fixed: true, desc: 'Added default Auth + Dashboard modules', scoreReduction: 6 };
        }
      },
      'multi_location': {
        condition: (edge) => edge.desc.toLowerCase().includes('location') && edge.desc.toLowerCase().includes('multi'),
        fix: (scope, budgetTier, edge) => {
          scope.modules.forEach(mod => {
            if (!mod.auditNotes) mod.auditNotes = [];
            if (['HoursTracking', 'PayrollEngine'].includes(mod.name)) {
              mod.auditNotes.push('Architecture: Use location ID field for multi-location support');
            }
          });
          return { fixed: true, desc: 'Use location ID field—scales to 10 locations', scoreReduction: 4 };
        }
      },
      'budget_mismatch': {
        condition: (edge) => edge.desc.toLowerCase().includes('budget') && edge.score > 6,
        fix: (scope, budgetTier, edge) => {
          const activeModules = scope.modules.filter(m => m.priority !== 'deferred');
          const budgetModuleCaps = { tight: 3, moderate: 5, flexible: 7 };
          const cap = budgetModuleCaps[budgetTier || 'moderate'];

          if (activeModules.length > cap) {
            return { 
              fixed: false, 
              flagged: true, 
              mitigation: `Trim to ${cap} modules or upgrade budget tier`, 
              scoreReduction: 0 
            };
          }
          return { fixed: true, desc: 'Budget-scope alignment verified', scoreReduction: edge.score };
        }
      }
    };
  }

  audit(refinedScope, domainContext, estimate, budgetTier, psychProfile) {
    let scope = JSON.parse(JSON.stringify(refinedScope));
    let edges = [...scope.edges];

    edges = this.addDomainEdges(edges, domainContext, scope);
    edges = this.deduplicateEdges(edges);
    edges = this.scoreEdges(edges, domainContext);

    const { fixedEdges, fixedScope, autoAddCount } = this.applyFixes(
      edges,
      scope,
      budgetTier,
      psychProfile
    );

    edges = fixedEdges;
    scope = fixedScope;

    const coherenceCheck = this.validateCoherence(scope, estimate, budgetTier);
    if (coherenceCheck.issues.length > 0) {
      edges.push(...coherenceCheck.issues);
    }

    const newFeasibility = this.recalculateFeasibility(scope, edges);
    if (newFeasibility < refinedScope.feasibility.score - 0.15) {
      this.logger.warn('Audit fixes reduced feasibility—rolling back');
      scope = refinedScope;
      edges = edges.map(e => ({ ...e, fixed: false, flagged: true, mitigation: 'Auto-fix reduced feasibility—manual review needed' }));
    }

    const summary = this.generateSummary(edges, autoAddCount);

    return {
      auditedScope: {
        modules: scope.modules,
        edges,
        feasibility: { ...scope.feasibility, score: Math.max(newFeasibility, scope.feasibility.score) },
        auditSummary: summary
      }
    };
  }

  addDomainEdges(existingEdges, domainContext, scope) {
    if (!domainContext.hiddenEdges) return existingEdges;

    const newEdges = [...existingEdges];

    domainContext.hiddenEdges.forEach(hiddenEdge => {
      if (hiddenEdge.trigger) {
        if (!this.evaluateTrigger(hiddenEdge.trigger, scope, domainContext)) {
          return;
        }
      }

      const exists = newEdges.some(e => 
        e.desc.toLowerCase().includes(hiddenEdge.desc.toLowerCase().split(' ').slice(0, 3).join(' '))
      );

      if (!exists) {
        newEdges.push({
          desc: hiddenEdge.desc,
          score: hiddenEdge.score,
          source: 'domain_hidden',
          fixed: false
        });
      }
    });

    return newEdges;
  }

  evaluateTrigger(trigger, scope, domainContext) {
    if (trigger === 'country=US') {
      return true;
    }
    if (trigger.startsWith('modules.includes')) {
      const moduleName = trigger.match(/modules\.includes\('(.+)'\)/)?.[1];
      return scope.modules.some(m => m.name === moduleName);
    }
    return true;
  }

  deduplicateEdges(edges) {
    const seen = new Map();

    edges.forEach(edge => {
      const key = edge.desc.toLowerCase().split(' ').slice(0, 5).join(' ');
      
      if (seen.has(key)) {
        const existing = seen.get(key);
        existing.score = Math.max(existing.score, edge.score);
        existing.sources = [...(existing.sources || [existing.source]), edge.source];
      } else {
        seen.set(key, edge);
      }
    });

    return Array.from(seen.values());
  }

  scoreEdges(edges, domainContext) {
    return edges.map(edge => {
      let finalScore = edge.score;

      const domainEdge = domainContext.hiddenEdges?.find(de => 
        de.desc.toLowerCase().includes(edge.desc.toLowerCase().split(' ').slice(0, 3).join(' '))
      );

      if (domainEdge && domainEdge.score > edge.score) {
        finalScore = domainEdge.score;
        edge.scoreSource = 'domain_override';
      }

      return { ...edge, score: finalScore, originalScore: edge.score };
    });
  }

  applyFixes(edges, scope, budgetTier, psychProfile) {
    let fixedEdges = [...edges];
    let fixedScope = JSON.parse(JSON.stringify(scope));
    let autoAddCount = 0;

    const sortedEdges = fixedEdges
      .map((e, idx) => ({ ...e, originalIndex: idx }))
      .sort((a, b) => b.score - a.score);

    sortedEdges.forEach(edge => {
      if (edge.score <= 5 || edge.fixed) return;

      const fixKey = Object.keys(this.fixLibrary).find(key => 
        this.fixLibrary[key].condition(edge)
      );

      if (!fixKey) {
        edge.fixed = false;
        edge.flagged = true;
        edge.mitigation = this.getGenericMitigation(edge);
        return;
      }

      const willAddModule = fixKey.includes('vague');
      if (willAddModule && autoAddCount >= this.MAX_AUTO_ADDS) {
        edge.fixed = false;
        edge.flagged = true;
        edge.mitigation = `Auto-add limit reached—manually add ${fixKey} module if needed`;
        return;
      }

      try {
        const fixResult = this.fixLibrary[fixKey].fix(fixedScope, budgetTier, edge);

        if (fixResult.fixed) {
          edge.fixed = true;
          edge.fixApplied = fixResult.desc;
          edge.newScore = Math.max(1, edge.score - fixResult.scoreReduction);
          if (willAddModule) autoAddCount++;
        } else if (fixResult.flagged) {
          edge.fixed = false;
          edge.flagged = true;
          edge.mitigation = fixResult.mitigation;
        }
      } catch (error) {
        this.logger.error(`Fix failed for ${fixKey}:`, error);
        edge.fixed = false;
        edge.flagged = true;
        edge.mitigation = 'Auto-fix error—manual review required';
      }
    });

    fixedEdges = sortedEdges
      .sort((a, b) => a.originalIndex - b.originalIndex)
      .map(e => {
        const { originalIndex, ...rest } = e;
        return rest;
      });

    return { fixedEdges, fixedScope, autoAddCount };
  }

  getGenericMitigation(edge) {
    if (edge.score > 8) return 'High risk—consult domain expert before proceeding';
    if (edge.score > 6) return 'Monitor during development, add buffer to timeline';
    return 'Low-medium risk—standard mitigation practices';
  }

  validateCoherence(scope, estimate, budgetTier) {
    const issues = [];

    // REMOVED: Hardcoded budget caps - timeline is calculated from scope
    // Budget constraints are handled in refiner as advisory warnings
    
    // Future coherence checks can be added here (e.g., cost vs timeline consistency)
    // Currently returns empty issues array as budget constraints are handled elsewhere

    return { issues };
  }

  recalculateFeasibility(scope, edges) {
    let score = scope.feasibility.score;

    const fixedCount = edges.filter(e => e.fixed).length;
    score += fixedCount * 0.02;

    const flaggedCount = edges.filter(e => e.flagged && e.score > 7).length;
    score -= flaggedCount * 0.05;

    return Math.max(0.5, Math.min(1.0, score));
  }

  generateSummary(edges, autoAddCount) {
    const totalEdges = edges.length;
    const autoFixed = edges.filter(e => e.fixed).length;
    const flagged = edges.filter(e => e.flagged).length;

    if (totalEdges === 0 || (autoFixed === 0 && flagged === 0)) {
      return {
        totalEdges: totalEdges,
        autoFixed: 0,
        flagged: 0,
        confidenceBoost: 0.05,
        message: 'Clean scope—no major gaps detected. Confidence +5%'
      };
    }

    const confidenceBoost = Math.min(0.1, autoFixed * 0.02);

    return {
      totalEdges,
      autoFixed,
      flagged,
      autoAddedModules: autoAddCount,
      confidenceBoost,
      message: autoFixed > 0 
        ? `Fixed ${autoFixed} of ${totalEdges} gaps${flagged > 0 ? `, ${flagged} flagged for review` : ''}—scope tightened`
        : `${flagged} gaps flagged—manual review recommended`
    };
  }

  createModule(name, complexity, deps, source, reason) {
    return {
      id: uuidv4(),
      name,
      displayName: name.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase()),
      complexity,
      deps,
      confidence: 0.8,
      source,
      priority: 'high',
      phase: 1,
      auditNotes: [reason]
    };
  }
}

module.exports = Auditor;

