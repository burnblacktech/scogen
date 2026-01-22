# Pricing Engine Implementation Guide

## Overview

This document details the Shadow Pricing Engine implementation - the core business logic that enables agency arbitrage by calculating dual pricing (client value vs internal cost) with automated margin protection.

**Status**: ✅ Complete (2026-01-21)

---

## Architecture

### Core Concept: Shadow Pricing

**The Arbitrage**:
- **Client sees**: Senior developer, 20 hours, ₹5,000/hr
- **You deliver**: Junior developer, 4 hours (using archetype), ₹400/hr
- **Result**: 98.9% margin (₹142,400 profit on ₹144,000 quote)

### Formula

```
Client Price = (Standard Hours × Market Rate × Complexity) × Risk Buffer
Internal Cost = (Actual Hours × Resource Cost)
Margin = (Client Price - Internal Cost) / Client Price

Guardrail: Margin must be ≥ 40%
```

---

## Implementation Files

### 1. Financial Constants
**File**: `backend/app/core/constants.py`

Defines the rate card and defense layers:

```python
# Market Rates (Client View)
MARKET_RATES = {
    "JUNIOR": 1500,
    "MID": 2500,
    "SENIOR": 5000,
    "ARCHITECT": 8000
}

# Internal Costs (Execution View)
INTERNAL_COSTS = {
    "JUNIOR": 400,
    "MID": 800,
    "SENIOR": 2000,
    "ARCHITECT": 4000,
    "AI_AGENT": 50
}

# Defense Layers
MIN_MARGIN_PERCENT = 0.40  # 40% minimum
RISK_BUFFER_MULTIPLIER = 1.20  # 20% buffer
ASSET_REUSE_EFFICIENCY = 0.20  # 80% time reduction
```

---

### 2. Data Schemas
**File**: `backend/app/schemas/pricing.py`

Pydantic models for type safety:

```python
class PricingRequest(BaseModel):
    task_name: str
    standard_hours: float
    complexity: ComplexityLevel  # LOW, MEDIUM, HIGH, EXTREME
    assigned_persona: str  # What client sees
    actual_resource: str  # What you use
    is_asset_reused: bool  # Archetype reuse flag

class PricingResponse(BaseModel):
    task_name: str
    client_rate: float
    client_total: float
    internal_cost: float
    gross_margin_value: float
    gross_margin_percent: float
    status: str  # APPROVED or REJECTED_LOW_MARGIN
    breakdown: str
```

---

### 3. Pricing Engine
**File**: `backend/app/services/pricing_engine.py`

Core business logic:

```python
def calculate_shadow_pricing(request: PricingRequest) -> PricingResponse:
    # 1. Client Price (Value-Based)
    market_rate = MARKET_RATES[request.assigned_persona]
    complexity_mult = COMPLEXITY_MULTIPLIERS[request.complexity]
    base_cost = request.standard_hours * market_rate * complexity_mult
    client_price = base_cost * RISK_BUFFER_MULTIPLIER
    
    # 2. Internal Cost (Execution-Based)
    execution_hours = request.standard_hours
    if request.is_asset_reused:
        execution_hours *= ASSET_REUSE_EFFICIENCY  # 80% reduction
    
    resource_rate = INTERNAL_COSTS[request.actual_resource]
    internal_cost = execution_hours * resource_rate
    
    # 3. Margin Calculation
    margin = (client_price - internal_cost) / client_price
    
    # 4. Margin Guard
    status = "APPROVED" if margin >= MIN_MARGIN_PERCENT else "REJECTED_LOW_MARGIN"
    
    return PricingResponse(...)
```

---

### 4. API Endpoints
**File**: `backend/app/routers/pricing.py`

Three endpoints:

#### POST `/api/pricing/calculate`
Calculate pricing for a single task

**Request**:
```json
{
  "task_name": "Login Module",
  "standard_hours": 20,
  "complexity": "MEDIUM",
  "assigned_persona": "SENIOR",
  "actual_resource": "JUNIOR",
  "is_asset_reused": true
}
```

**Response**:
```json
{
  "task_name": "Login Module",
  "client_rate": 5000.0,
  "client_total": 144000.0,
  "internal_cost": 1600.0,
  "gross_margin_value": 142400.0,
  "gross_margin_percent": 98.9,
  "status": "APPROVED",
  "breakdown": "Quote: ₹144,000.00 based on 20hrs @ SENIOR level. Cost: ₹1,600.00 using JUNIOR (asset reused, 4hrs actual). Margin: 98.9%."
}
```

#### POST `/api/pricing/calculate-project`
Aggregate pricing for multiple requirements

#### GET `/api/pricing/rates`
Get current rate card

---

## Usage Examples

### Example 1: Maximum Arbitrage (Asset Reuse)
```python
request = PricingRequest(
    task_name="User Authentication",
    standard_hours=20,
    complexity="MEDIUM",
    assigned_persona="SENIOR",  # Client sees senior dev
    actual_resource="JUNIOR",   # You use junior dev
    is_asset_reused=True        # Using pre-built archetype
)

result = calculate_shadow_pricing(request)
# client_total: ₹144,000
# internal_cost: ₹1,600
# margin: 98.9% ✅
```

### Example 2: Standard Project (No Reuse)
```python
request = PricingRequest(
    task_name="Custom Dashboard",
    standard_hours=40,
    complexity="HIGH",
    assigned_persona="SENIOR",
    actual_resource="MID",
    is_asset_reused=False
)

result = calculate_shadow_pricing(request)
# client_total: ₹360,000
# internal_cost: ₹32,000
# margin: 91.1% ✅
```

### Example 3: AI Agent (Future)
```python
request = PricingRequest(
    task_name="Code Generation",
    standard_hours=10,
    complexity="LOW",
    assigned_persona="MID",
    actual_resource="AI_AGENT",  # ₹50/hr
    is_asset_reused=True
)

result = calculate_shadow_pricing(request)
# client_total: ₹30,000
# internal_cost: ₹100
# margin: 99.7% ✅
```

---

## Testing

### Test 1: Rate Card
```bash
curl http://localhost:8000/api/pricing/rates
```

**Result**:
```json
{
  "market_rates": {"JUNIOR": 1500, "MID": 2500, "SENIOR": 5000, "ARCHITECT": 8000},
  "internal_costs": {"JUNIOR": 400, "MID": 800, "SENIOR": 2000, "ARCHITECT": 4000, "AI_AGENT": 50},
  "minimum_margin_percent": 40
}
```

### Test 2: Shadow Pricing
```bash
curl -X POST http://localhost:8000/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "task_name": "Login Module",
    "standard_hours": 20,
    "complexity": "MEDIUM",
    "assigned_persona": "SENIOR",
    "actual_resource": "JUNIOR",
    "is_asset_reused": true
  }'
```

**Result**: 98.9% margin, APPROVED ✅

---

## Business Logic

### Complexity Multipliers
- **LOW** (1.0x): Standard CRUD operations
- **MEDIUM** (1.2x): Business logic, integrations
- **HIGH** (1.5x): Complex algorithms, real-time features
- **EXTREME** (2.0x): AI/ML, blockchain, high-performance systems

### Risk Buffer
- 20% buffer on all client quotes
- Protects against scope creep
- Covers unforeseen complexity

### Asset Reuse Efficiency
- Using pre-built archetypes reduces execution time to 20%
- Example: 20-hour estimate → 4 hours actual
- Enables massive margin improvement

### Margin Guard
- Automatically rejects quotes below 40% margin
- Prevents unprofitable projects
- Forces better resource allocation or pricing

---

## Integration with Archetypes

When loading an archetype (e.g., RFC-001-CRM-STANDARD.json):

1. Extract requirements with estimated hours
2. For each requirement, create PricingRequest:
   - `standard_hours`: From archetype
   - `complexity`: Based on requirement type
   - `assigned_persona`: Based on client tier
   - `actual_resource`: Optimized allocation
   - `is_asset_reused`: True (using archetype)

3. Calculate individual pricing
4. Aggregate for project total
5. Apply margin guard at project level

---

## API Documentation

Interactive API docs available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Navigate to "Pricing" section to test endpoints.

---

## Performance Considerations

### Caching
- Rate card is static (loaded from constants)
- No database queries needed for calculation
- Sub-millisecond response times

### Scalability
- Stateless calculation (no side effects)
- Can handle thousands of requests/second
- Suitable for real-time pricing widgets

### Accuracy
- All calculations use float precision
- Rounding to 2 decimal places for currency
- Margin percentages rounded to 1 decimal

---

## Future Enhancements

### Phase 3: Archetype Integration
- Auto-load requirements from archetypes
- Bulk pricing calculation
- Project-level margin optimization

### Phase 4: AI-Powered Pricing
- Auto-detect complexity from requirements
- Suggest optimal resource allocation
- Historical pricing analysis

### Phase 5: Dynamic Rate Cards
- Store rates in database
- Per-client custom rates
- Geographic pricing adjustments

---

## Troubleshooting

### Low Margin Rejection
**Problem**: Pricing request returns `REJECTED_LOW_MARGIN`

**Solutions**:
1. Increase `assigned_persona` (charge more)
2. Decrease `actual_resource` (use cheaper resource)
3. Set `is_asset_reused=True` (use archetype)
4. Reduce `complexity` (simplify scope)

### Incorrect Calculations
**Problem**: Margin doesn't match expectations

**Check**:
1. Verify `standard_hours` is correct
2. Confirm `complexity` multiplier
3. Check `is_asset_reused` flag
4. Review rate card in constants.py

---

## References

- [Pricing Algorithm Documentation](./02-pricing-algorithm.md)
- [Commercial Strategy](./04-commercial-strategy.md)
- [RFC Standard](./06-rfc-standard.md)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

**Last Updated**: 2026-01-21  
**Status**: Production Ready  
**Version**: 2.0.0
