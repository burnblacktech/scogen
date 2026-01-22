
import sys
import os
import json
import requests
from unittest.mock import MagicMock

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Mock DB if needed, but we mainly want to test the service logic
sys.modules['app.config'] = MagicMock()
mock_settings = sys.modules['app.config'].settings
mock_settings.OLLAMA_HOST = "http://localhost:11434"
# Using llama3:8b as confirmed by debug_ollama.py
mock_settings.OLLAMA_MODEL = "llama3:8b" 

from app.services.variance_service import VarianceService
from app.schemas.archetype import ArchetypeDefinition, ArchetypeFeature

def test_ai_iq():
    print("🧠 Testing Real-Time Neural Variance (AI IQ Test)...")
    service = VarianceService()
    
    # 1. Setup a Standard Marketplace Archetype
    marketplace_archetype = ArchetypeDefinition(
        id="ARCH_MKT_STD_01",
        name="Standard Marketplace",
        version="1.0.0",
        description="Standard supply-demand platform",
        base_hours=120.0,
        tech_stack=["React", "Node.js", "PostgreSQL"],
        features=[
            ArchetypeFeature(id="AUTH_01", category="Security", title="Email/Password Auth", description="Standard login", standard_hours=10, complexity="LOW", acceptance_criteria="Login works"),
            ArchetypeFeature(id="PAY_01", category="Payments", title="Stripe Integration", description="Fiat payments", standard_hours=15, complexity="MEDIUM", acceptance_criteria="Payments work"),
            ArchetypeFeature(id="MAP_01", category="Engagement", title="Live Location Tracking", description="Courier tracking", standard_hours=20, complexity="HIGH", acceptance_criteria="Tracking works")
        ],
        industry_verticals=["E-commerce"],
        variance_points=[]
    )
    
    # 2. User Intent: Crypto Exchange
    user_intent = "I want a Crypto P2P exchange where people trade Bitcoin for Cash. We need high security and Indian market compliance."
    
    print(f"\nTargeting: {marketplace_archetype.name}")
    print(f"User Intent: '{user_intent}'")
    
    # 3. Detect Variance (Try to call Ollama)
    try:
        variances = service.detect_variance(user_intent, marketplace_archetype)
        
        print(f"\n--- AI ARCHITECT OUTPUT ({len(variances)} items) ---")
        if not variances:
            print("⚠️ The AI Architect was silent (Empty list). Check if Ollama is running.")
        else:
            print(f"DEBUG: variances type {type(variances)}, contents: {variances}")
            for v in variances:
                print(f"📍 ID: {v.get('id')}")
                print(f"❓ Question: {v.get('question')}")
                print(f"🔫 Trigger: {v.get('trigger_if_yes')}")
                print(f"💰 Cost Impact: {v.get('cost_impact')}")
                print("-" * 20)
                
            # IQ Assessment
            has_crypto = any("crypto" in str(v).lower() or "wallet" in str(v).lower() or "bitcoin" in str(v).lower() for v in variances)
            has_auth = any("auth" in str(v).lower() or "2fa" in str(v).lower() or "otp" in str(v).lower() for v in variances)
            has_payment = any("payment" in str(v).lower() or "stripe" in str(v).lower() or "gateway" in str(v).lower() for v in variances)
            
            print("\n--- IQ Assessment ---")
            if has_crypto: print("✅ Detected Crypto/Hardware conflict.")
            if has_auth: print("✅ Detected Auth/Security gap.")
            if has_payment: print("✅ Detected Payment/Fiat incompatibility.")
            
            if has_crypto and (has_auth or has_payment):
                print("🏆 AI IQ: GENIUS (Architecture-Aware)")
            elif has_crypto:
                print("⚡ AI IQ: COMPETENT (Context-Aware)")
            else:
                print("📉 AI IQ: POTATO (Template-Bound)")

    except Exception as e:
        print(f"❌ Verification Failed: {e}")

if __name__ == "__main__":
    if not os.path.exists("backend"):
        print("Please run from scogen root.")
    else:
        test_ai_iq()
