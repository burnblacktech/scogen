/**
 * Feature Suggestion Engine
 * 
 * Provides intelligent feature suggestions based on selected features
 * Uses pattern-based rules and optional LLM-based suggestions
 */

class FeatureSuggestionEngine {
  constructor(llmConversation = null, logger = null) {
    this.llm = llmConversation;
    this.logger = logger || console;
    
    // Pattern-based rules for feature suggestions
    this.rules = {
      'Patient Registration': ['Appointment Scheduling', 'Patient Portal'],
      'Appointment Scheduling': ['SMS/Email Reminders', 'Patient Portal'],
      'Electronic Medical Records (EMR)': ['Prescription Management', 'Lab Management'],
      'Prescription Management': ['Pharmacy Management', 'SMS/Email Reminders'],
      'Payroll Processing': ['Tax Calculation (TDS)', 'Statutory Compliance'],
      'Tax Calculation (TDS)': ['Form 16 Generation', 'Statutory Compliance'],
      'Shopping Cart': ['Payment Gateway', 'Order Management'],
      'Product Catalog': ['Search & Filters', 'Inventory Sync'],
      'Contact Management': ['Deal Pipeline', 'Activity Tracking'],
      'Deal Pipeline': ['Email Integration', 'Reporting Dashboard'],
      'Course Management': ['Content Upload', 'Student Enrollment'],
      'Student Enrollment': ['Video Player', 'Assessments'],
      'User KYC & Onboarding': ['Security & Authentication', 'Account Management'],
      'Payment Processing': ['Transaction History', 'Security & Authentication'],
      'Property Listing': ['Search & Filters', 'Lead Management'],
      'Lead Management': ['Site Visit Scheduling', 'Email/SMS Campaigns']
    };
  }

  /**
   * Get feature suggestions for selected features
   * @param {Array} selectedFeatures - Currently selected features
   * @param {Array} allFeatures - All available features
   * @param {string} domain - Project domain
   * @returns {Promise<Array>} Array of suggested features with reasons and confidence
   */
  async suggestFeatures(selectedFeatures, allFeatures, domain = 'generic') {
    try {
      // Step 1: Pattern-based suggestions
      const patternSuggestions = this.analyzePatterns(selectedFeatures, allFeatures);
      
      // Step 2: LLM-based suggestions (if available)
      let aiSuggestions = [];
      if (this.llm && selectedFeatures.length > 0) {
        try {
          aiSuggestions = await this.getAISuggestions({
            selected: selectedFeatures,
            available: allFeatures,
            domain: domain
          });
        } catch (error) {
          this.logger.warn('LLM suggestions failed, using pattern-based only', {
            error: error.message
          });
        }
      }
      
      // Step 3: Merge and deduplicate
      const merged = this.mergeSuggestions(patternSuggestions, aiSuggestions);
      
      // Step 4: Score and rank
      return this.rankSuggestions(merged);
      
    } catch (error) {
      this.logger.error('Failed to generate suggestions', {
        error: error.message,
        stack: error.stack
      });
      return [];
    }
  }

  /**
   * Analyze patterns to suggest features
   * @param {Array} selectedFeatures - Selected features
   * @param {Array} allFeatures - All available features
   * @returns {Array} Pattern-based suggestions
   */
  analyzePatterns(selectedFeatures, allFeatures) {
    const suggestions = [];
    const selectedNames = new Set(selectedFeatures.map(f => f.name));
    
    for (const selected of selectedFeatures) {
      const featureName = selected.name || selected;
      const relatedFeatures = this.rules[featureName] || [];
      
      for (const relatedName of relatedFeatures) {
        // Find the feature in allFeatures
        const feature = allFeatures.find(f => 
          f.name === relatedName || 
          (f.name && f.name.toLowerCase().includes(relatedName.toLowerCase()))
        );
        
        if (feature && !selectedNames.has(feature.name)) {
          // Check if already suggested
          const alreadySuggested = suggestions.find(s => s.feature.name === feature.name);
          if (!alreadySuggested) {
            suggestions.push({
              feature: feature,
              reason: `Commonly used with ${featureName}`,
              confidence: 0.8,
              source: 'pattern'
            });
          }
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Get AI-based suggestions using LLM
   * @param {Object} context - Context with selected, available features, and domain
   * @returns {Promise<Array>} AI suggestions
   */
  async getAISuggestions(context) {
    if (!this.llm || !this.llm.getChatCompletion) {
      return [];
    }

    const selectedNames = context.selected.map(f => f.name || f).join(', ');
    const availableFeatures = context.available
      .slice(0, 50) // Limit to avoid token limits
      .map(f => `- ${f.name}: ${f.description || 'No description'}`)
      .join('\n');

    const prompt = `
Given a ${context.domain} project with these selected features:
${selectedNames}

Available features:
${availableFeatures}

Suggest 3-5 complementary features that would enhance the project.
For each suggestion, explain why it's recommended.

Return JSON array: [{"feature": "Feature Name", "reason": "why it's recommended", "confidence": 0.0-1.0}]
Only suggest features from the available list above.
`;

    try {
      const response = await this.llm.getChatCompletion([
        { role: 'system', content: 'You are a software project consultant. Provide helpful feature suggestions in JSON format only.' },
        { role: 'user', content: prompt }
      ]);

      // Parse JSON response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map(s => ({
          feature: context.available.find(f => f.name === s.feature) || { name: s.feature },
          reason: s.reason || 'AI recommendation',
          confidence: s.confidence || 0.7,
          source: 'ai'
        })).filter(s => s.feature);
      }
      
      return [];
    } catch (error) {
      this.logger.warn('Failed to parse AI suggestions', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Merge pattern and AI suggestions, removing duplicates
   * @param {Array} patternSuggestions - Pattern-based suggestions
   * @param {Array} aiSuggestions - AI-based suggestions
   * @returns {Array} Merged suggestions
   */
  mergeSuggestions(patternSuggestions, aiSuggestions) {
    const merged = [...patternSuggestions];
    const existingNames = new Set(patternSuggestions.map(s => s.feature.name));

    for (const aiSuggestion of aiSuggestions) {
      const featureName = aiSuggestion.feature.name;
      if (!existingNames.has(featureName)) {
        merged.push(aiSuggestion);
        existingNames.add(featureName);
      } else {
        // Update confidence if AI suggestion has higher confidence
        const existing = merged.find(s => s.feature.name === featureName);
        if (existing && aiSuggestion.confidence > existing.confidence) {
          existing.confidence = aiSuggestion.confidence;
          existing.reason = aiSuggestion.reason;
          existing.source = 'hybrid'; // Mark as hybrid
        }
      }
    }

    return merged;
  }

  /**
   * Rank suggestions by confidence score
   * @param {Array} suggestions - Suggestions to rank
   * @returns {Array} Ranked suggestions (top 5)
   */
  rankSuggestions(suggestions) {
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 suggestions
  }

  /**
   * Track user acceptance/ignoring of suggestions
   * @param {string} featureName - Feature name
   * @param {boolean} accepted - Whether user accepted the suggestion
   * @param {string} reason - Original suggestion reason
   */
  trackSuggestionFeedback(featureName, accepted, reason) {
    // This could be stored in database for learning
    this.logger.debug('Suggestion feedback tracked', {
      feature: featureName,
      accepted: accepted,
      reason: reason
    });
  }
}

module.exports = FeatureSuggestionEngine;

