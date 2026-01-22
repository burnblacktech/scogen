import sys
import os
import json

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Bypass config loading by mocking settings
from unittest.mock import MagicMock
sys.modules['app.config'] = MagicMock()
mock_settings = sys.modules['app.config'].settings
mock_settings.POSTGRES_USER = 'mock'
mock_settings.POSTGRES_PASSWORD = 'mock'
mock_settings.POSTGRES_HOST = 'mock'
mock_settings.POSTGRES_PORT = 5432
mock_settings.POSTGRES_DB = 'mock'

# Mock DB models to avoid SQLAlchemy dependencies in swapper test
sys.modules['app.db.models'] = MagicMock()

from app.services.archetype_service import ArchetypeService
from app.schemas.archetype import ArchetypeDefinition

def test_swapper_isolated():
    service = ArchetypeService()
    
    # Manually load the archetype JSON to avoid service.list_available_archetypes() hitting LIBRARY_PATH/DB
    archetype_path = "backend/library/archetypes/RFC-001-CRM-STANDARD.json"
    with open(archetype_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        base_archetype = ArchetypeDefinition(**data)

    print(f"\n--- Base Archetype: {base_archetype.name} ---")
    for f in base_archetype.features:
        print(f"  - [{f.category}] {f.title} ({f.id})")

    # TEST 1: Real Estate Context
    print("\n--- Testing 'Real Estate' Context ---")
    re_archetype = service.configure_project("I want a real estate CRM", base_archetype.model_copy(deep=True))
    
    leads_feature = next((f for f in re_archetype.features if f.category == "Leads"), None)
    if leads_feature and leads_feature.id == "MOD_LEADS_RE_01":
        print("✅ SUCCESS: Leads module swapped to MOD_LEADS_RE_01")
        if leads_feature.technical_mapping and leads_feature.technical_mapping.db_schema_snippet:
            print(f"✅ SUCCESS: DB Schema Snippet present: {leads_feature.technical_mapping.db_schema_snippet[:50]}...")
    else:
        print(f"❌ FAILURE: Leads module not swapped correctly. Found: {leads_feature.id if leads_feature else 'None'}")

    # TEST 2: OTP Context
    print("\n--- Testing 'OTP' Context ---")
    otp_archetype = service.configure_project("Need mobile otp login", base_archetype.model_copy(deep=True))
    
    auth_feature = next((f for f in otp_archetype.features if f.category == "Authentication"), None)
    if auth_feature and auth_feature.id == "MOD_AUTH_OTP_01":
        print("✅ SUCCESS: Auth module swapped to MOD_AUTH_OTP_01")
    else:
        print(f"❌ FAILURE: Auth module not swapped correctly. Found: {auth_feature.id if auth_feature else 'None'}")

    # TEST 3: Mixed Context
    print("\n--- Testing Mixed Context ---")
    mixed_archetype = service.configure_project("Real estate leads with OTP mobile login", base_archetype.model_copy(deep=True))
    
    leads_feature = next((f for f in mixed_archetype.features if f.category == "Leads"), None)
    auth_feature = next((f for f in mixed_archetype.features if f.category == "Authentication"), None)
    
    if leads_feature.id == "MOD_LEADS_RE_01" and auth_feature.id == "MOD_AUTH_OTP_01":
        print("✅ SUCCESS: Both modules swapped correctly")
        print(f"✅ Total Estimated Hours updated to: {mixed_archetype.base_hours}")
    else:
        print("❌ FAILURE: Mixed swap failed")

if __name__ == "__main__":
    if not os.path.exists("backend"):
        print("Please run this script from the scogen root directory.")
    else:
        test_swapper_isolated()
