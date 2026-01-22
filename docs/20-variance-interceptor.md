# Phase 3.3: The Variance Interceptor (Neural Synthesis)

## Objective
To close the loop on "Custom Intelligence". Instead of blindly hydrating a Standard Blueprint, the system intercepts the user's decision to check for conflicts against their stated intent. This is the "Stop the Click" moment.

**The Philosophy**: "The machine listens before it builds."

---

## The Workflow

### 1. The Setup (Intent Capture)
*   **The Therapist**: The user chats in the `LiveCanvas` (e.g., "I want a Crypto P2P exchange").
*   **The Transmission**: This intent stream is passed to the `BlueprintSelector`.

### 2. The Intercept (The Stop)
*   **User Action**: User clicks "Load Blueprint" (e.g., Standard E-Commerce).
*   **System Action**: The frontend halts. The "Matrix Matrix" loader appears.
*   **Backend Call**: `POST /api/variance/detect` sent with:
    *   `archetype_id`: "ecommerce_v1"
    *   `user_intent`: "I want a Crypto P2P exchange"

### 3. The Oracle (Analysis)
*   **The Brain**: The backend (Ollama/LLM) compares the *Structural Definition* of E-Commerce against the *Semantic Meaning* of the user's intent.
*   **Detection**: It finds gaps.
    *   *Standard*: Stripe/Paypal.
    *   *Intent*: Crypto Wallet/Binance P2P.
*   **Output**: A list of `Variance` objects (Question, Impact, Cost).

### 4. The Ask (Resolution)
*   **UI Display**: The `VarianceModal` appears.
    *   "Architectural Deviation Detected."
    *   "Standard uses Stripe. You mentioned Crypto. Switch?"
*   **User Choice**: User clicks "Apply Change" (+Cost) or "Keep Standard".

### 5. The Commit (Hydration)
*   **Final Call**: `POST /api/archetypes/apply` sent with `variance_responses`.
*   **Result**: The Database is hydrated with the *Customized* Scope.

---

## Technical Components

### Frontend (`frontend/src`)
*   `components/library/VarianceModal.tsx`: The UI for conflict resolution.
*   `components/library/BlueprintSelector.tsx`: Orchestrates the intercept logic.
*   `components/ingestion/LiveCanvas.tsx`: Broadcasts user intent.

### Backend (`backend/app`)
*   `routers/variance.py`: Endpoint for `/detect`.
*   `services/variance_service.py`: Logic to prompt LLM and parse differences.

---

## Success Metrics
*   **Traceability**: Every blueprint feature can be traced back to user intent or a standard default.
*   **Reduction in Change Orders**: Variances are caught *before* the contract is signed (Hydration).
*   **User Trust**: The user sees that the system "understood" them.
