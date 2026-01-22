"""
Pricing API Router
Exposes Shadow Pricing Engine endpoints
"""
from fastapi import APIRouter, HTTPException
from app.schemas.pricing import PricingRequest, PricingResponse
from app.services.pricing_engine import calculate_shadow_pricing, calculate_project_pricing

router = APIRouter()


@router.post("/calculate", response_model=PricingResponse)
async def get_pricing(request: PricingRequest):
    """
    Calculate Shadow Pricing for a single task
    
    Returns dual pricing:
    - Client Price (value-based, what you quote)
    - Internal Cost (execution-based, what you pay)
    - Margin analysis with 40% guard
    
    Example Request:
        {
            "task_name": "Login Module",
            "standard_hours": 20,
            "complexity": "MEDIUM",
            "assigned_persona": "SENIOR",
            "actual_resource": "JUNIOR",
            "is_asset_reused": true
        }
    
    Example Response:
        {
            "task_name": "Login Module",
            "client_rate": 5000.0,
            "client_total": 120000.0,
            "internal_cost": 1600.0,
            "gross_margin_value": 118400.0,
            "gross_margin_percent": 98.7,
            "status": "APPROVED",
            "breakdown": "Quote: ₹120,000.00..."
        }
    """
    try:
        result = calculate_shadow_pricing(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pricing calculation failed: {str(e)}")


@router.post("/calculate-project")
async def get_project_pricing(requirements: list[dict]):
    """
    Calculate aggregated pricing for an entire project
    
    Args:
        requirements: List of requirement dicts with pricing details
        
    Returns:
        Aggregated pricing summary with total client price, cost, and margin
        
    Example Request:
        [
            {
                "task_name": "Login Module",
                "standard_hours": 20,
                "complexity": "MEDIUM",
                "assigned_persona": "SENIOR",
                "actual_resource": "JUNIOR",
                "is_asset_reused": true
            },
            {
                "task_name": "Dashboard",
                "standard_hours": 40,
                "complexity": "HIGH",
                "assigned_persona": "SENIOR",
                "actual_resource": "MID",
                "is_asset_reused": false
            }
        ]
    """
    try:
        result = calculate_project_pricing(requirements)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Project pricing calculation failed: {str(e)}")


@router.get("/rates")
async def get_rate_card():
    """
    Get current market rates and internal costs
    
    Returns the rate card used for pricing calculations
    """
    from app.core.constants import MARKET_RATES, INTERNAL_COSTS, MIN_MARGIN_PERCENT
    
    return {
        "market_rates": MARKET_RATES,
        "internal_costs": INTERNAL_COSTS,
        "minimum_margin_percent": MIN_MARGIN_PERCENT * 100
    }
