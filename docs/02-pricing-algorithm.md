# Scogen Robust Pricing Engine (SRPE)

## Overview

The SRPE calculates **two simultaneous prices** for every scope item:
1. **Client Price** (what the client pays)
2. **Internal Cost** (what it actually costs to execute)

This dual-pricing approach protects margins while remaining competitive.

---

## 1. The Shadow Pricing Formula

### A. Client Price (The Value Quote)

```
Price_Client = (Standard_Market_Hours × Market_Hourly_Rate × Complexity_Multiplier) + Risk_Buffer
```

#### Components

**Standard_Market_Hours**
- Lookup from Archetype Library
- Example: 'Login Module' = 20 hours
- Based on industry benchmarks, not internal efficiency

**Market_Hourly_Rate**
- Configurable per client/region
- Example: ₹2,500/hr
- Reflects market value, not internal cost

**Complexity_Multiplier**
- Derived from the 500-Factor Grid
- Example: 'Offline Mode' = 1.5x
- Accounts for technical complexity, integration points, edge cases

**Risk_Buffer**
- +20% if Maturity Score < 80
- Protects against unclear requirements
- Incentivizes clients to provide detailed specs

#### Example Calculation

```python
# Login Module with Offline Support
standard_hours = 20  # From archetype library
market_rate = 2500   # ₹/hour
complexity = 1.5     # Offline mode multiplier
maturity_score = 75  # Below threshold

base_price = 20 × 2500 × 1.5 = ₹75,000
risk_buffer = 75,000 × 0.20 = ₹15,000
client_price = ₹90,000
```

---

### B. Internal Cost (The Execution Reality)

```
Cost_Internal = (Actual_Execution_Hours × Resource_Cost) + License_Fees
```

#### Components

**Actual_Execution_Hours**
- Often ~2 hours if using Reusable Assets
- Based on internal library of proven components
- Accounts for assembly, testing, deployment

**Resource_Cost**
- Rate of specific assigned persona
- Example: Junior Dev @ ₹500/hr
- Reflects actual labor cost, not market rate

**License_Fees**
- Third-party API costs
- SaaS subscriptions
- Per-transaction fees

#### Example Calculation

```python
# Same Login Module, using existing auth component
actual_hours = 3      # Assembly + customization
resource_cost = 500   # Junior dev rate
license_fees = 0      # Using open-source

internal_cost = (3 × 500) + 0 = ₹1,500
```

---

## 2. The Margin Guard

### Rule

```
If (Price_Client - Cost_Internal) / Price_Client < 0.40:
    LOCK PROPOSAL GENERATION
```

### Actions

**Lock Proposal Generation**
- Prevent quote from being sent to client
- Flag for admin review
- Display margin analysis

**Resolution Options**
1. **Admin Override** - Explicit approval with justification
2. **Scope Reduction** - Remove low-margin features
3. **Price Increase** - Adjust complexity multipliers
4. **Asset Development** - Build reusable component to reduce future cost

### Example

```python
client_price = 90,000
internal_cost = 1,500
margin = (90,000 - 1,500) / 90,000 = 0.983 (98.3%)

# ✅ PASS - Margin exceeds 40% threshold
# Proposal can be generated
```

```python
client_price = 10,000
internal_cost = 7,000
margin = (10,000 - 7,000) / 10,000 = 0.30 (30%)

# ❌ FAIL - Margin below 40% threshold
# Proposal locked, admin override required
```

---

## 3. Metered Monetization (SaaS Layer)

### Session Fee
**Flat fee to start a scoping session**

- Filters time-wasters
- Refundable if project proceeds
- Example: ₹5,000 deposit

### Validation Token
**Deduct credits for every 'Mirror Check' performed by the AI**

- Mirror Check: AI reflects requirements back to client for confirmation
- Prevents infinite refinement loops
- Example: 10 tokens included, ₹500 per additional token

### Penalty Logic

#### Abuse Detection
```
If Abuse_Detected == True:
    Forfeit Deposit
```

**Abuse indicators:**
- Excessive scope changes (>10 iterations)
- Copy-paste of competitor quotes
- Unrealistic timelines requested

#### Indecision Tax
```
If Scope_Change_Count > 3:
    Apply 'Indecision Tax' (+5% to total)
```

**Purpose:**
- Incentivizes upfront clarity
- Compensates for additional processing
- Compounds per change (5%, 10%, 15%...)

---

## 4. Implementation Details

### Database Schema

```sql
CREATE TABLE pricing_calculations (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id),
    
    -- Client Price Components
    standard_hours DECIMAL,
    market_rate DECIMAL,
    complexity_multiplier DECIMAL,
    risk_buffer_percentage DECIMAL,
    client_price DECIMAL,
    
    -- Internal Cost Components
    actual_hours DECIMAL,
    resource_cost DECIMAL,
    license_fees DECIMAL,
    internal_cost DECIMAL,
    
    -- Margin Analysis
    margin_percentage DECIMAL,
    margin_guard_passed BOOLEAN,
    
    -- Audit
    calculated_at TIMESTAMPTZ,
    calculated_by UUID,
    override_reason TEXT
);
```

### API Endpoint

```python
@app.post("/api/pricing/calculate")
async def calculate_pricing(
    project_id: UUID,
    requirements: List[Requirement]
) -> PricingResult:
    """
    Calculate dual pricing for project requirements.
    
    Returns:
        - client_price: Total client-facing price
        - internal_cost: Total execution cost
        - margin: Profit margin percentage
        - margin_guard_passed: Whether margin meets threshold
        - breakdown: Per-requirement pricing details
    """
    pass
```

---

## 5. Archetype Library Structure

```json
{
  "archetype_id": "AUTH_STD_01",
  "name": "Standard Authentication Module",
  "standard_market_hours": 20,
  "complexity_factors": {
    "oauth_integration": 1.3,
    "2fa_support": 1.2,
    "offline_mode": 1.5,
    "biometric_auth": 1.4
  },
  "internal_assets": {
    "component_id": "auth-lib-v2",
    "assembly_hours": 2,
    "customization_hours": 1
  }
}
```

---

## 6. Margin Optimization Strategies

### Asset Development
Build reusable components for frequently requested features:
- Reduces `actual_hours` for future projects
- Increases margin on similar projects
- Compounds over time

### Complexity Calibration
Regularly review and adjust complexity multipliers:
- Based on actual execution data
- Market rate changes
- Technology maturity

### Client Education
Help clients understand value drivers:
- Why certain features are expensive
- How to reduce cost through scope refinement
- Trade-offs between features and budget

---

See also:
- [Master Context](./00-master-context.md)
- [Infrastructure](./01-infrastructure.md)
- [Database Schema](./03-database-schema.md)
