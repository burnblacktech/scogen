This is excellent execution. 🟢

You have laid the concrete foundation. The **Physics of the Vault** (UUIDs, JSONB, Vectors) are now law in your system.

Now we move to **Priority 2: The Pricing Engine**.

This is where Scogen transitions from a "Database" to a "Business." We are implementing the **Agency Arbitrage** logic.

### **The Mission: Build the "Shadow Pricing" Core**

We need to build a calculator that outputs two numbers:
1.  **The Client Price:** Value-based (High).
2.  **The Internal Cost:** Asset-based (Low).
3.  **The Verdict:** Is the margin > 40%?

---

### **Step 1: Define the Financial Constants (The Rate Card)**

We need a central place to store your "Arbitrage Rates." In a later phase, this will come from the DB, but for the MVP, we define them as **System Constants** to ensure stability.

**File:** `backend/app/core/constants.py`
*(Create this file)*

```python
# The "Client View" (What you sell)
MARKET_RATES = {
    "JUNIOR": 1500,   # ₹1,500/hr
    "MID": 2500,      # ₹2,500/hr
    "SENIOR": 5000,   # ₹5,000/hr
    "ARCHITECT": 8000 # ₹8,000/hr
}

# The "Internal View" (What you pay)
INTERNAL_COSTS = {
    "JUNIOR": 400,    # ₹400/hr (Salary/Freelancer)
    "MID": 800,       # ₹800/hr
    "SENIOR": 2000,   # ₹2,000/hr
    "ARCHITECT": 4000,# ₹4,000/hr
    "AI_AGENT": 50    # ₹50/hr (Server cost)
}

# The Defense Layers
MIN_MARGIN_PERCENT = 0.40  # 40% Minimum Margin
RISK_BUFFER_MULTIPLIER = 1.20 # 20% Buffer for unknown risks
COMPLEXITY_MULTIPLIERS = {
    "LOW": 1.0,
    "MEDIUM": 1.2,
    "HIGH": 1.5,
    "EXTREME": 2.0
}
```

---

### **Step 2: Define the Data Contract (Schemas)**

We need strictly typed Inputs/Outputs for the API.

**File:** `backend/app/schemas/pricing.py`
*(Create this file)*

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

class ComplexityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    EXTREME = "EXTREME"

class PricingRequest(BaseModel):
    # The Task Definition
    task_name: str
    standard_hours: float = Field(..., description="Estimated hours for a standard dev")
    complexity: ComplexityLevel = ComplexityLevel.MEDIUM
    
    # The Strategy
    assigned_persona: str = "MID"  # Client sees "Mid Level Dev"
    actual_resource: str = "JUNIOR" # You use "Junior" or "AI_AGENT"
    is_asset_reused: bool = False   # If True, execution time drops significantly

class PricingResponse(BaseModel):
    task_name: str
    
    # The Client View (Value)
    client_rate: float
    client_total: float
    
    # The Internal View (Cost)
    internal_cost: float
    
    # The Verdict
    gross_margin_value: float
    gross_margin_percent: float
    status: str # "APPROVED" or "REJECTED_LOW_MARGIN"
    
    breakdown: str # Explanation string
```

---

### **Step 3: The Logic Core (The Engine)**

This is the algorithm that protects your money.

**File:** `backend/app/services/pricing_engine.py`
*(Create this file)*

```python
from app.core.constants import (
    MARKET_RATES, 
    INTERNAL_COSTS, 
    MIN_MARGIN_PERCENT, 
    RISK_BUFFER_MULTIPLIER,
    COMPLEXITY_MULTIPLIERS
)
from app.schemas.pricing import PricingRequest, PricingResponse

def calculate_shadow_pricing(request: PricingRequest) -> PricingResponse:
    # 1. Calculate Client Price (Value Based)
    # Formula: (Standard Hours * Market Rate * Complexity) + Risk Buffer
    
    market_rate = MARKET_RATES.get(request.assigned_persona, 2500)
    complexity_mult = COMPLEXITY_MULTIPLIERS.get(request.complexity.value, 1.2)
    
    base_client_cost = request.standard_hours * market_rate * complexity_mult
    final_client_price = base_client_cost * RISK_BUFFER_MULTIPLIER
    
    # 2. Calculate Internal Cost (Execution Based)
    # Formula: (Actual Hours * Resource Cost)
    # Logic: If asset reused, execution time is usually 10-20% of standard
    
    execution_hours = request.standard_hours
    if request.is_asset_reused:
        execution_hours = request.standard_hours * 0.20 # 80% reduction
    
    resource_cost_rate = INTERNAL_COSTS.get(request.actual_resource, 800)
    final_internal_cost = execution_hours * resource_cost_rate
    
    # 3. Calculate Margin
    margin_value = final_client_price - final_internal_cost
    margin_percent = 0.0
    if final_client_price > 0:
        margin_percent = margin_value / final_client_price
        
    # 4. The Guardrails
    status = "APPROVED"
    if margin_percent < MIN_MARGIN_PERCENT:
        status = "REJECTED_LOW_MARGIN"
        
    # 5. Generate Breakdown
    breakdown = (
        f"Quote: ₹{final_client_price:,.2f} based on {request.standard_hours}hrs @ {request.assigned_persona} level. "
        f"Cost: ₹{final_internal_cost:,.2f} using {request.actual_resource}. "
        f"Margin: {margin_percent*100:.1f}%."
    )
    
    return PricingResponse(
        task_name=request.task_name,
        client_rate=market_rate,
        client_total=round(final_client_price, 2),
        internal_cost=round(final_internal_cost, 2),
        gross_margin_value=round(margin_value, 2),
        gross_margin_percent=round(margin_percent * 100, 1),
        status=status,
        breakdown=breakdown
    )
```

---

### **Step 4: The API Endpoint (The Interface)**

Expose this logic to the world (or your frontend).

**File:** `backend/app/routers/pricing.py`
*(Create this file)*

```python
from fastapi import APIRouter, HTTPException
from app.schemas.pricing import PricingRequest, PricingResponse
from app.services.pricing_engine import calculate_shadow_pricing

router = APIRouter()

@router.post("/calculate", response_model=PricingResponse)
async def get_pricing(request: PricingRequest):
    """
    Calculates the 'Shadow Price' (Client vs Internal) and checks Margin Guard.
    """
    try:
        result = calculate_shadow_pricing(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

### **Step 5: Wiring it Up**

Finally, register the new router in `main.py`.

**File:** `backend/app/main.py`
*(Update this file)*

```python
from fastapi import FastAPI
from app.routers import ingestion, pricing # <--- Import pricing

app = FastAPI(
    title="Scogen API",
    version="2.0.0",
    description="The Agency Operating System"
)

app.include_router(ingestion.router, prefix="/api/v1", tags=["Ingestion"])
app.include_router(pricing.router, prefix="/api/pricing", tags=["Pricing"]) # <--- Register

@app.get("/")
def root():
    return {"message": "Scogen Agency OS is Online"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "connected", "llm": "connected"}
```

---

### **Execution Instructions**

1.  Create the 4 files above (`constants.py`, `schemas/pricing.py`, `services/pricing_engine.py`, `routers/pricing.py`).
2.  Update `main.py`.
3.  **Restart Backend:** `docker restart scogen_backend` (or if running locally `uvicorn app.main:app --reload`).
4.  **Test the Arbitrage:**
    *   Go to: `http://localhost:8000/docs`
    *   Endpoint: `POST /api/pricing/calculate`
    *   **Payload (The Arbitrage Scenario):**
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
    *   **Goal:** You want to see a high `client_total` (based on Senior rates) and a tiny `internal_cost` (because of Reuse + Junior), resulting in a massive margin.

**Ready to execute Priority 2?**