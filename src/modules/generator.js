class Generator {
  constructor(library, logger) {
    this.library = library;
    this.logger = logger;
    this.pseudocodeTemplates = this.loadTemplates();
  }

  loadTemplates() {
    return {
      Auth: {
        high_level: "1. Email/password validation\n2. Hash password (bcrypt)\n3. Store user in DB\n4. Issue JWT token",
        detailed: `function handleLogin(email, password) {
  if (!isValidEmail(email)) throw Error('Invalid email');
  const hash = bcrypt.hashSync(password, 10);
  const user = await db.users.findOne({ email });
  if (!user) return { success: false, error: 'User not found' };
  const match = bcrypt.compareSync(password, user.passwordHash);
  if (!match) return { success: false, error: 'Wrong password' };
  const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
  return { success: true, token, user: { id: user.id, email: user.email, role: user.role } };
}`
      },
      HoursTracking: {
        high_level: "1. Log hours per employee per day\n2. Validate max hours (e.g., 12/day)\n3. Store by location\n4. Calculate weekly totals",
        detailed: `function logHours(employeeId, date, hours, locationId) {
  if (hours > 12) throw Error('Exceeds max 12 hrs/day');
  if (hours < 0) throw Error('Hours cannot be negative');
  const existing = await db.hoursLog.findOne({ employeeId, date, locationId });
  if (existing) throw Error('Already logged for this day');
  const entry = { id: uuid(), employeeId, date: new Date(date), hours: parseFloat(hours), locationId, timestamp: new Date() };
  await db.hoursLog.insert(entry);
  return { success: true, entry };
}`
      },
      TipCalculation: {
        high_level: "1. Aggregate tips per shift\n2. Allocate by hours worked\n3. Apply tax withholding (IRS rules)\n4. Generate tip report",
        detailed: `function calculateTips(shiftId, totalTips, employeeHours) {
  const totalHours = employeeHours.reduce((sum, e) => sum + e.hours, 0);
  if (totalHours === 0) throw Error('No hours logged for shift');
  const allocations = employeeHours.map(emp => {
    const share = (emp.hours / totalHours) * totalTips;
    const taxWithheld = share * 0.15;
    return { employeeId: emp.employeeId, grossTip: share.toFixed(2), taxWithheld: taxWithheld.toFixed(2), netTip: (share - taxWithheld).toFixed(2) };
  });
  await db.tipAllocations.insertMany(allocations.map(a => ({ ...a, shiftId, date: new Date() })));
  return { success: true, allocations };
}`
      },
      Dashboard: {
        high_level: "1. Fetch user data (role-based)\n2. Aggregate key metrics\n3. Display charts/tables\n4. Real-time updates (optional)",
        detailed: `function getDashboard(userId, role) {
  let data = {};
  if (role === 'manager') {
    data.employeeCount = await db.users.count({ role: 'employee' });
    data.locations = await db.locations.find({});
    data.weeklyHours = await db.hoursLog.aggregate([{ match: { date: { gte: startOfWeek() } } }, { group: { _id: '$locationId', total: { sum: '$hours' } } }]);
  } else {
    data.myHours = await db.hoursLog.find({ employeeId: userId, date: { gte: startOfWeek() } });
    data.weeklyTotal = data.myHours.reduce((sum, log) => sum + log.hours, 0);
  }
  return { success: true, data };
}`
      },
      PayrollEngine: {
        high_level: "1. Process hours worked\n2. Calculate base pay\n3. Apply taxes and deductions\n4. Generate payroll report",
        detailed: `function processPayroll(periodStart, periodEnd) {
  const hours = await db.hoursLog.find({ date: { gte: periodStart, lte: periodEnd } });
  const payroll = hours.map(entry => {
    const basePay = entry.hours * entry.hourlyRate;
    const taxes = basePay * 0.2;
    return { employeeId: entry.employeeId, basePay, taxes, netPay: basePay - taxes };
  });
  await db.payroll.insertMany(payroll);
  return { success: true, payroll };
}`
      },
      Reports: {
        high_level: "1. Query data by filters\n2. Aggregate metrics\n3. Format output\n4. Export options",
        detailed: `function generateReport(type, filters) {
  let data = {};
  if (type === 'payroll') {
    data = await db.payroll.find(filters);
  } else if (type === 'hours') {
    data = await db.hoursLog.find(filters);
  }
  return { success: true, report: data };
}`
      },
      Generic: {
        high_level: "1. Receive input\n2. Validate data\n3. Process core logic\n4. Return output",
        detailed: `function processModule(input) {
  if (!input || typeof input !== 'object') throw Error('Invalid input');
  const result = { processed: true, data: input, timestamp: new Date() };
  await db.results.insert(result);
  return { success: true, result };
}`
      }
    };
  }

  generate(refinedScope, budgetTier, psychProfile, domainContext) {
    const { modules, edges, feasibility } = refinedScope;

    const overview = this.buildOverview(modules, edges, feasibility, domainContext);
    const moduleDetails = this.buildModuleDetails(modules, budgetTier, psychProfile, domainContext);
    const steps = this.buildSteps(modules, budgetTier);
    const timeline = this.calculateTimeline(modules, budgetTier, psychProfile);
    const risks = this.formatRisks(edges, modules);

    // REMOVED: Hardcoded budget caps - timeline is calculated from scope
    // Budget constraints are handled in refiner as advisory warnings

    return {
      plan: {
        overview,
        modules: moduleDetails,
        steps,
        timeline,
        risks
      }
    };
  }

  buildOverview(modules, edges, feasibility, domainContext) {
    const activeModules = modules.filter(m => m.priority !== 'deferred');
    const intent = domainContext.industry || 'application';
    const useCase = domainContext.useCase || 'project';

    return {
      summary: `${intent.charAt(0).toUpperCase() + intent.slice(1)} ${useCase}: ${activeModules.map(m => m.displayName).join(' + ')}`,
      scope: `${domainContext.b2b ? 'B2B' : 'B2C'}, ${activeModules.length} modules, ${feasibility.confidence} confidence build`,
      feasibility: `${(feasibility.score * 100).toFixed(0)}% confident—${this.getFeasibilityMessage(feasibility.score)}`
    };
  }

  getFeasibilityMessage(score) {
    if (score >= 0.85) return 'safe path with proven patterns';
    if (score >= 0.7) return 'solid plan with minor risks';
    if (score >= 0.6) return 'achievable but watch for scope creep';
    return 'challenging—consider simplifying';
  }

  buildModuleDetails(modules, budgetTier, psychProfile, domainContext) {
    return modules
      .filter(m => m.priority !== 'deferred')
      .map(mod => {
        const reuse = this.library.getReusableModule(mod.name, domainContext.industry || 'generic');
        const template = this.pseudocodeTemplates[mod.name] || this.pseudocodeTemplates.Generic;

        let pseudocode = {};
        if (budgetTier === 'tight') {
          pseudocode.high_level = template.high_level;
          pseudocode.note = 'Detailed pseudocode available in higher tier';
        } else if (budgetTier === 'moderate') {
          pseudocode.high_level = template.high_level;
          pseudocode.detailed = template.detailed.split('\n').slice(0, 10).join('\n') + '\n  // ... (truncated)';
        } else {
          pseudocode.high_level = template.high_level;
          pseudocode.detailed = template.detailed;
        }

        if (!this.pseudocodeTemplates[mod.name]) {
          pseudocode.confidence = 0.5;
          pseudocode.note = 'Custom module—generic template used';
        }

        const baseEffort = { low: 1, med: 2, high: 4 }[mod.complexity] || 2;
        let effort = baseEffort;

        if (reuse.available) {
          effort = Math.max(1, effort * 0.5);
        }

        if (mod.deps && mod.deps.length > 3) {
          effort = Math.max(effort, 3);
        }

        return {
          name: mod.name,
          displayName: mod.displayName,
          description: this.getModuleDescription(mod, domainContext),
          pseudocode,
          effort: `${effort.toFixed(1)} days`,
          reusable: reuse.available,
          reuseNote: reuse.available ? `Proven template—saves $${Math.ceil(effort * 50)}` : null
        };
      });
  }

  getModuleDescription(module, domainContext) {
    const descriptions = {
      Auth: 'User accounts for login and role-based access',
      HoursTracking: `Daily hour logging${domainContext.industry === 'retail' ? ' for employees across locations' : ' for team members'}`,
      TipCalculation: 'Tip aggregation, allocation, and IRS-compliant reporting',
      Dashboard: 'Central view for metrics and management',
      PayrollEngine: 'Complete payroll processing with tax calculations',
      Reports: 'Generate payroll reports and analytics'
    };
    return descriptions[module.name] || `${module.displayName} functionality`;
  }

  buildSteps(modules, budgetTier) {
    const phase1Modules = modules.filter(m => m.phase === 1 && m.priority !== 'deferred');
    const phase2Modules = modules.filter(m => m.phase === 2);
    const steps = [];
    let weekCounter = 1;

    steps.push({
      week: weekCounter,
      phase: 1,
      focus: 'Foundation + Setup',
      tasks: [
        'Project initialization (repo, dependencies)',
        'Database schema design',
        'Environment configuration (dev/staging)',
        ...(phase1Modules.find(m => m.name === 'Auth') ? ['Build Auth module (login/signup)'] : [])
      ],
      deliverable: 'Development environment ready' + (phase1Modules.find(m => m.name === 'Auth') ? ', working login' : '')
    });

    const nonAuthModules = phase1Modules.filter(m => m.name !== 'Auth');
    const modulesPerWeek = budgetTier === 'tight' ? 1 : budgetTier === 'moderate' ? 2 : 3;

    for (let i = 0; i < nonAuthModules.length; i += modulesPerWeek) {
      weekCounter++;
      const weekModules = nonAuthModules.slice(i, i + modulesPerWeek);
      steps.push({
        week: weekCounter,
        phase: 1,
        focus: weekModules.map(m => m.displayName).join(' + '),
        tasks: weekModules.flatMap(mod => [
          `Build ${mod.displayName} module`,
          `Connect ${mod.displayName} dependencies (${mod.deps.join(', ') || 'none'})`,
          `Test ${mod.displayName} flows`
        ]),
        deliverable: `${weekModules.map(m => m.displayName).join(' + ')} functional`
      });
    }

    weekCounter++;
    steps.push({
      week: weekCounter,
      phase: 1,
      focus: 'Integration + MVP Deploy',
      tasks: [
        'End-to-end testing (all modules connected)',
        'Fix integration bugs',
        'Deploy to staging',
        'User acceptance testing'
      ],
      deliverable: 'MVP live and testable'
    });

    if (phase2Modules.length > 0) {
      weekCounter++;
      steps.push({
        week: weekCounter,
        phase: 2,
        focus: 'Phase 2 Enhancements',
        tasks: phase2Modules.map(m => `Build ${m.displayName}`),
        deliverable: `Phase 2 modules: ${phase2Modules.map(m => m.displayName).join(', ')}`,
        note: 'Deferred—start after MVP validated'
      });
    }

    return steps;
  }

  calculateTimeline(modules, budgetTier, psychProfile) {
    const activeModules = modules.filter(m => m.priority !== 'deferred');

    let totalDays = activeModules.reduce((sum, mod) => {
      const baseEffort = { low: 1, med: 2, high: 4 }[mod.complexity] || 2;
      const reuse = this.library.getReusableModule(mod.name, 'generic');
      const effort = reuse.available ? Math.max(1, baseEffort * 0.5) : baseEffort;
      return sum + effort;
    }, 0);

    totalDays += 3; // Setup
    totalDays += 2; // Integration/deploy

    const buffer = psychProfile.psychAdjustments.timelineBuffer || 0;
    totalDays *= (1 + buffer);

    totalDays = Math.max(totalDays, activeModules.length + 5);

    const totalWeeks = Math.ceil(totalDays / 5);

    const phase2Modules = modules.filter(m => m.phase === 2);
    let phase2Days = 0;
    if (phase2Modules.length > 0) {
      phase2Days = phase2Modules.reduce((sum, mod) => {
        const baseEffort = { low: 1, med: 2, high: 4 }[mod.complexity] || 2;
        return sum + baseEffort;
      }, 0);
    }

    return {
      totalDays: Math.ceil(totalDays),
      totalWeeks,
      phases: {
        1: `${totalWeeks} weeks (MVP)`,
        2: phase2Days > 0 ? `${Math.ceil(phase2Days / 5)} weeks (post-MVP)` : 'None'
      }
    };
  }

  formatRisks(edges, modules) {
    const topRisks = edges
      .filter(e => e.score > 5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return topRisks.map(risk => {
      let mitigation = 'Monitor during development';

      if (risk.desc.includes('Multi-location')) {
        mitigation = 'Use location ID field—simple architecture, scales to 10+ locations';
      } else if (risk.desc.includes('compliance') || risk.desc.includes('IRS')) {
        mitigation = 'Defer to phase 2 OR consult compliance expert (budget +$500)';
      } else if (risk.desc.includes('Real-time')) {
        mitigation = 'Use polling (simpler) vs WebSockets (complex)—choose based on need';
      } else if (risk.desc.includes('modules') && risk.desc.includes('budget')) {
        mitigation = 'Trim to core 3 modules, defer rest to phase 2';
      } else if (risk.desc.includes('Timeline')) {
        mitigation = 'Add buffer or reduce scope';
      }

      return {
        desc: risk.desc,
        mitigation,
        score: risk.score
      };
    });
  }
}

module.exports = Generator;

