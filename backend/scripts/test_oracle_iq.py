
import sys
import os
import json
import requests
from unittest.mock import MagicMock

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Mock config and DB
sys.modules['app.config'] = MagicMock()
mock_settings = sys.modules['app.config'].settings
mock_settings.OLLAMA_HOST = "http://localhost:11434"
mock_settings.OLLAMA_MODEL = "llama3:8b" 

import sqlalchemy
sqlalchemy.create_engine = MagicMock()

from app.services.variance_service import VarianceService
from app.schemas.archetype import ArchetypeDefinition, ArchetypeFeature

def test_oracle_iq():
    print("🔮 Testing Research Oracle + Knowledge Harvester...")
    service = VarianceService()
    
    # Mock DB Session
    mock_db = MagicMock()
    # Mock return for check_constraints to avoid errors
    service.constraint_service.check_constraints = MagicMock(return_value=[])
    service.constraint_service.learn_constraint = MagicMock()
    marketplace_archetype = ArchetypeDefinition(
        id="ARCH_MKT_STD_01",
        name="Standard Marketplace",
        version="1.0.0",
        description="Standard supply-demand platform",
        base_hours=120.0,
        tech_stack=["React", "Node.js", "PostgreSQL"],
        features=[
            ArchetypeFeature(id="AUTH_01", category="Security", title="Email/Password Auth", description="Standard login", standard_hours=10, complexity="LOW", acceptance_criteria="Login works"),
            ArchetypeFeature(id="PAY_01", category="Payments", title="Stripe Integration", description="Fiat payments", standard_hours=15, complexity="MEDIUM", acceptance_criteria="Payments work")
        ],
        industry_verticals=["E-commerce"],
        variance_points=[]
    )
    
    # 2. User Intent: High-Risk Gaming/Finance in India
    user_intent = "I want to build a payment gateway for a high-risk real-money gaming app in India. We need to follow 2025 compliance rules."
    
    print(f"\nTargeting: {marketplace_archetype.name}")
    print(f"User Intent: '{user_intent}'")
    
    # 3. Detect Variance (This will trigger the Web Search and Crystallization)
    try:
        variances = service.detect_variance(mock_db, user_intent, marketplace_archetype)
        
        print(f"\n--- ORACLE ARCHITECT OUTPUT ({len(variances)} items) ---")
        if not variances:
            print("⚠️ The AI Architect was silent. Check Ollama connectivity.")
        else:
            for v in variances:
                print(f"📍 ID: {v.get('id')}")
                print(f"❓ Question: {v.get('question')}")
                print(f"🔫 Trigger: {v.get('trigger_if_yes')}")
                print("-" * 20)
                
            # IQ Assessment - Does it mention Indian specific providers or compliance?
            iq_text = str(variances).lower()
            mentions_razorpay = "razorpay" in iq_text
            mentions_cashfree = "cashfree" in iq_text
            mentions_phonepe = "phonepe" in iq_text
            mentions_compliance = "compliance" in iq_text or "regulation" in iq_text or "rbi" in iq_text
            mentions_high_risk = "high-risk" in iq_text or "gaming" in iq_text
            
            print("\n--- Oracle Insight Assessment ---")
            if mentions_razorpay or mentions_cashfree or mentions_phonepe:
                print("✅ ORACLE KNOWS INDIAN GATEWAYS (Razorpay/Cashfree/PhonePe).")
            if mentions_compliance:
                print("✅ ORACLE DETECTED REGULATORY CONTEXT.")
            if mentions_high_risk:
                print("✅ ORACLE LINKED HIGH-RISK TO GAMING.")
            
            if mentions_compliance and (mentions_cashfree or mentions_phonepe):
                print("🏆 ORACLE IQ: OMNISCIENT (Real-Time Aware)")
            elif mentions_compliance:
                print("⚡ ORACLE IQ: WELL-INFORMED (Grounded)")
            else:
                print("📉 ORACLE IQ: TEMPLATE-BOUND (Hallucinating/Static)")

            # 4. Verification of Crystallization
            print("\n--- Harvesting Assessment ---")
            if service.constraint_service.learn_constraint.called:
                print("✅ KNOWLEDGE HARVESTER: Wisdom captured in DB!")
                args, kwargs = service.constraint_service.learn_constraint.call_args
                print(f"📍 Captured Rule: {kwargs.get('description', 'N/A')[:50]}...")
            else:
                print("⚠️ KNOWLEDGE HARVESTER: No new wisdom captured.")

    except Exception as e:
        print(f"❌ Verification Failed: {e}")

if __name__ == "__main__":
    test_oracle_iq()
