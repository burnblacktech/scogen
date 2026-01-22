import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.schemas.pricing import PricingRequest
from app.services.pricing_engine import calculate_shadow_pricing

def test_trinity_pricing():
    print("💎 Testing Trinity Pricing (God Mode)...")
    
    # Case: Crypto App (High Risk, High Urgency)
    req = PricingRequest(
        task_name="Crypto App",
        standard_hours=500,
        complexity="HIGH",
        assigned_persona="SENIOR",
        actual_resource="MID",
        is_asset_reused=True,
        tech_stack_label="Blockchain",
        timeline_weeks=2,
        client_type="ENTERPRISE"
    )
    
    result = calculate_shadow_pricing(req)
    
    print(f"\nTask: {result.task_name}")
    print(f"Physics (Internal Floor):  ₹{result.internal_floor:,.2f}")
    print(f"Expectation (Market Anchor): ₹{result.market_anchor:,.2f}")
    print(f"Premium (Actuarial Ceiling): ₹{result.actuarial_ceiling:,.2f}")
    print(f"Breakdown: {result.risk_factor_breakdown}")
    
    # Assertions
    assert result.internal_floor < result.market_anchor, "Floor must be below Anchor"
    assert result.market_anchor < result.actuarial_ceiling, "Anchor must be below Ceiling"
    print("\n✅ Simulation Passed: Internal < Market < Risk")

if __name__ == "__main__":
    test_trinity_pricing()
