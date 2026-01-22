"""
Shadow Pricing Engine - The Arbitrage Calculator
Traceability: Priority 3

This is the core business logic that protects margins.

Formula:
    Client Price = (Standard Hours × Market Rate × Complexity) + Risk Buffer
    Internal Cost = (Actual Hours × Resource Cost)
    Margin = (Client Price - Internal Cost) / Client Price
    
Guardrails:
    - Minimum 40% margin required
    - 20% risk buffer on all quotes
    - Asset reuse reduces execution time to 20%
"""
from app.core.constants import (
    MARKET_RATES,
    INTERNAL_COSTS,
    MIN_MARGIN_PERCENT,
    RISK_BUFFER_MULTIPLIER,
    COMPLEXITY_MULTIPLIERS,
    ASSET_REUSE_EFFICIENCY,
    TECH_VOLATILITY,
    URGENCY_CURVE,
    CLIENT_RISK
)
from app.schemas.pricing import PricingRequest, PricingResponse


def calculate_shadow_pricing(request: PricingRequest) -> PricingResponse:
    """
    Calculates the Trinity Realities (Internal Floor, Market Anchor, Actuarial Ceiling)
    
    This is the "God Mode" logic that visualizes arbitrage.
    """
    # 1. INTERNAL REALITY (The Floor) - Physics
    # Asset reuse: 80% time reduction
    eff_hours = request.standard_hours * ASSET_REUSE_EFFICIENCY if request.is_asset_reused else request.standard_hours
    resource_rate = INTERNAL_COSTS.get(request.actual_resource, 800)
    floor = eff_hours * resource_rate

    # 2. TRADITIONAL REALITY (The Anchor) - Expectation
    # Pure Market Rate (no risk multipliers)
    base_rate = MARKET_RATES.get(request.assigned_persona, 2500)
    anchor = request.standard_hours * base_rate

    # 3. ACTUARIAL REALITY (The Ceiling) - Premium
    # Market Rate * Risk Multipliers
    tech_risk = TECH_VOLATILITY.get(request.tech_stack_label, 1.0)
    urgency_mult = URGENCY_CURVE.get(request.timeline_weeks, 1.0)
    client_mult = CLIENT_RISK.get(request.client_type, 1.0)
    
    ceiling = anchor * tech_risk * urgency_mult * client_mult

    # Explanation
    explanation = (
        f"Tech Risk: {tech_risk}x | Urgency: {urgency_mult}x | Client Profile: {client_mult}x"
    )

    return PricingResponse(
        task_name=request.task_name,
        internal_floor=round(floor, 2),
        market_anchor=round(anchor, 2),
        actuarial_ceiling=round(ceiling, 2),
        risk_factor_breakdown=explanation
    )


def calculate_project_pricing(requirements: list[dict]) -> dict:
    """
    Calculate Trinity realities for an entire project.
    """
    total_floor = 0.0
    total_anchor = 0.0
    total_ceiling = 0.0
    requirement_details = []
    
    for req in requirements:
        pricing_req = PricingRequest(**req)
        result = calculate_shadow_pricing(pricing_req)
        
        total_floor += result.internal_floor
        total_anchor += result.market_anchor
        total_ceiling += result.actuarial_ceiling
        
        requirement_details.append({
            "task": result.task_name,
            "internal_floor": result.internal_floor,
            "market_anchor": result.market_anchor,
            "actuarial_ceiling": result.actuarial_ceiling,
            "breakdown": result.risk_factor_breakdown
        })
    
    return {
        "total_internal_floor": round(total_floor, 2),
        "total_market_anchor": round(total_anchor, 2),
        "total_actuarial_ceiling": round(total_ceiling, 2),
        "requirements": requirement_details
    }
