class PsychologicalProfiler {
  constructor(logger) {
    this.logger = logger;
  }

  classify(personaSignals, conversationTone, patterns) {
    // Find dominant persona
    const maxScore = Math.max(...Object.values(personaSignals));
    
    if (maxScore < 0.4) {
      // Weak signals, default to cautious
      this.logger.warn('Weak persona signals, defaulting to cautious_solo');
      return this.buildProfile('cautious_solo', 0.6, conversationTone);
    }

    const primary = Object.keys(personaSignals).reduce((max, p) => 
      personaSignals[p] > personaSignals[max] ? p : max
    );

    const confidence = personaSignals[primary];

    this.logger.info('Persona classified', { 
      primary, 
      confidence: confidence.toFixed(2) 
    });

    return this.buildProfile(primary, confidence, conversationTone);
  }

  buildProfile(persona, confidence, tone) {
    const profiles = {
      cautious_solo: {
        timelineBuffer: 0.2,
        moduleCapSuggestion: 3,
        reuseEmphasis: 'high',
        riskFraming: 'safety-first',
        messagingTone: 'reassuring_buddy',
        costFraming: 'breakdown'
      },
      shipping_hustler: {
        timelineBuffer: -0.15,
        moduleCapSuggestion: null,
        reuseEmphasis: 'extreme',
        riskFraming: 'speed-focused',
        messagingTone: 'energetic_cofounder',
        costFraming: 'total-only'
      },
      perfectionist: {
        timelineBuffer: 0.3,
        moduleCapSuggestion: null,
        reuseEmphasis: 'selective',
        riskFraming: 'trade-offs',
        messagingTone: 'peer_engineer',
        costFraming: 'breakdown'
      },
      domain_expert: {
        timelineBuffer: 0.05,
        moduleCapSuggestion: null,
        reuseEmphasis: 'medium',
        riskFraming: 'domain-specific',
        messagingTone: 'respectful_consultant',
        costFraming: 'domain-context'
      },
      funded_visionary: {
        timelineBuffer: 0.1,
        moduleCapSuggestion: 7,
        reuseEmphasis: 'low',
        riskFraming: 'strategic',
        messagingTone: 'strategic_advisor',
        costFraming: 'total-only'
      }
    };

    const profile = profiles[persona] || profiles.cautious_solo;

    return {
      primaryPersona: persona,
      confidence,
      psychAdjustments: profile,
      messagingTone: profile.messagingTone
    };
  }
}

module.exports = PsychologicalProfiler;

