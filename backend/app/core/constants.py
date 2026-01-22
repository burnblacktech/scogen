"""
Financial Constants - The Rate Card
Defines the arbitrage rates for Shadow Pricing Engine

Client View (Market Rates): What you sell
Internal View (Costs): What you pay
Defense Layers: Margin guards and risk buffers
"""

# The "Client View" (What you sell - Value-based pricing)
MARKET_RATES = {
    "JUNIOR": 1500,      # ₹1,500/hr - Junior developer market rate
    "MID": 2500,         # ₹2,500/hr - Mid-level developer
    "SENIOR": 5000,      # ₹5,000/hr - Senior developer
    "ARCHITECT": 8000    # ₹8,000/hr - Solution architect
}

# The "Internal View" (What you pay - Cost-based)
INTERNAL_COSTS = {
    "JUNIOR": 400,       # ₹400/hr - Junior salary/freelancer
    "MID": 800,          # ₹800/hr - Mid-level cost
    "SENIOR": 2000,      # ₹2,000/hr - Senior cost
    "ARCHITECT": 4000,   # ₹4,000/hr - Architect cost
    "AI_AGENT": 50       # ₹50/hr - Server/AI inference cost
}

# The Defense Layers
MIN_MARGIN_PERCENT = 0.40  # 40% Minimum Margin (The Guardrail)
RISK_BUFFER_MULTIPLIER = 1.20  # 20% Buffer for unknown risks
COMPLEXITY_MULTIPLIERS = {
    "LOW": 1.0,          # Standard complexity
    "MEDIUM": 1.2,       # 20% increase
    "HIGH": 1.5,         # 50% increase
    "EXTREME": 2.0       # 100% increase (double)
}

# Asset Reuse Efficiency
# When using pre-built archetypes, execution time drops dramatically
ASSET_REUSE_EFFICIENCY = 0.20  # 80% time reduction (only 20% of standard hours needed)

# Phase 2.5: God Mode Pricing Multipliers
TECH_VOLATILITY = {
    "Standard": 1.0,
    "Blockchain": 1.5,
    "AI": 1.8,
    "Embedded": 1.4
}

URGENCY_CURVE = {
    1: 2.5,  # 1 week: 250% price
    2: 2.0,  # 2 weeks: 200% price
    4: 1.0,  # 4 weeks: Standard
    8: 0.8   # 8 weeks: Discounted
}

CLIENT_RISK = {
    "INTERNAL": 1.0,
    "STARTUP": 1.1,
    "ENTERPRISE": 1.3,
    "GOVERNMENT": 1.5
}
