const fs = require('fs');
const path = require('path');

class PromptManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.prompts = this.loadPrompts();
  }

  loadPrompts() {
    // For Day 2: Use hardcoded prompts (files come later)
    return {
      system: this.getSystemPrompt(),
      analysis: this.getAnalysisPrompt(),
      extract: this.getExtractPrompt()
    };
  }

  get(promptName, variables = {}) {
    let prompt = this.prompts[promptName];
    
    if (!prompt) {
      this.logger.warn('Prompt not found, using fallback', { promptName });
      return 'You are a helpful assistant.';
    }

    // Substitute {{variable}} with values
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      prompt = prompt.replace(regex, variables[key]);
    });

    return prompt;
  }

  getSystemPrompt() {
    return `You are Scogen, a development scoping assistant.
Your role: Turn rough app ideas into technical scopes.
Always show confidence % and explain reasoning.

Persona detection rules:
- Cautious Solo: "simple," "just," "I," budget worry, first-time vibes
- Shipping Hustler: "fast," "ship," "mvp," brief energetic
- Perfectionist: "scalable," "clean," "proper," detailed questions
- Domain Expert: Industry jargon, competitor mentions
- Funded Visionary: "we," "investors," "roadmap," grand vision

Conversation rules:
- Match their tone (casual ↔ formal)
- Max 3 questions total
- Echo understanding before freezing
- Surface domain expertise (social proof)
- Never use A/B/C—natural only
- If vague, probe gently
- If rambling, summarize back

Psychology framing:
- Cautious: Emphasize safety, proven patterns
- Hustler: Emphasize speed, efficiency
- Perfectionist: Emphasize quality, architecture
- Expert: Respect their domain knowledge
- Visionary: Strategic framing, execution reality-check`;
  }

  getAnalysisPrompt(variables = {}) {
    const input = variables.input || '';
    return `Analyze this input for persona signals and domain hints: "${input}"

Output JSON only (no markdown, no extra text):
{
  "personaSignals": {
    "cautious_solo": 0.0-1.0,
    "shipping_hustler": 0.0-1.0,
    "perfectionist": 0.0-1.0,
    "domain_expert": 0.0-1.0,
    "funded_visionary": 0.0-1.0
  },
  "tone": "casual" | "formal",
  "industryHint": "retail" | "saas" | "healthcare" | "finance" | "education" | null,
  "useCaseHint": "payroll" | "dashboard" | "application" | null,
  "budgetSignal": "tight" | "moderate" | "flexible" | null
}`;
  }

  getExtractPrompt(variables = {}) {
    // Return the base prompt template - input will be added separately
    return `You are an expert technical analyst. Your task is to extract detailed project requirements from the input.

INSTRUCTIONS:
1. Carefully read ALL the provided requirements (there may be 50-200+ individual features listed)
2. Extract EVERY module, feature, and functionality mentioned
3. Group related features into logical modules
4. DO NOT summarize or reduce - if 40 payroll features are mentioned, list all 40
5. Be thorough and specific - extract exactly what is stated
6. **IMPORTANT**: Even if input is vague or incomplete, extract what you can. Partial extraction is better than nothing.

HANDLING VAGUE INPUTS:
- If input is vague (e.g., "I need an e-commerce site"), extract what's possible:
  - Detect industry/domain (e-commerce, SaaS, etc.)
  - Extract any mentioned features
  - Set confidence lower (0.3-0.5) to indicate incomplete information
- Never return empty modules array - at minimum, extract the domain/use case
- If only domain is mentioned, create placeholder modules based on domain knowledge

INPUT FORMAT:
The input may be:
- A categorized list showing module names and feature counts
- Detailed requirements with descriptions
- Structured data from Excel/spreadsheet
- Vague descriptions (e.g., "I need a website for my business")

OUTPUT FORMAT (JSON only, no markdown):
{
  "industry": "detected industry (retail, saas, healthcare, finance, education, generic)",
  "useCase": "primary use case (payroll, inventory, crm, dashboard, application, etc.)",
  "modules": [
    "ModuleName1",
    "ModuleName2"
  ],
  "budget": "tight/moderate/flexible (based on scope)",
  "edges": [
    "complexity factor 1",
    "complexity factor 2"
  ],
  "confidence": 0.85
}

EXAMPLES:

Input: "PAYROLL MODULE (40 requirements): salary structure, leave policy, expense tracking..."
Output modules: ["PayrollEngine", "SalaryManagement", "LeaveManagement", "ExpenseTracking"]

Input: "AUTH MODULE (5 requirements): login, signup, 2FA, forgot password, OAuth"
Output modules: ["Auth", "TwoFactorAuth", "OAuth"]

Input: "DASHBOARD MODULE (5 requirements): widgets, analytics..."
Output modules: ["Dashboard", "Analytics"]

Input: "I need an e-commerce site" (vague)
Output: {
  "industry": "retail",
  "useCase": "ecommerce",
  "modules": ["ProductCatalog", "ShoppingCart", "Checkout", "OrderManagement"],
  "confidence": 0.4
}

IMPORTANT:
- If the input says "40 requirements" in a category, that's a LARGE module - include it
- If multiple sub-features are listed, create separate modules for major ones
- Never return empty modules array - at minimum extract domain-based modules
- Confidence should reflect completeness: 0.9+ for detailed, 0.5-0.7 for medium, 0.3-0.5 for vague
- Extract modules from EACH category mentioned in the input
- For vague inputs, use domain knowledge to suggest likely modules

Now analyze the following requirements:`;
  }
}

module.exports = PromptManager;

