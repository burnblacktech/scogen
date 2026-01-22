from app.services.archetype_service import ArchetypeService

def verify_archetypes():
    service = ArchetypeService()
    archetypes = service.list_available_archetypes()
    
    print(f"📦 Archetype Registry Content: {len(archetypes)} items")
    for arc in archetypes:
        print(f" - [{arc.id}] {arc.name} (v{arc.version})")
        
    expected_ids = ["ARCH_CRM_STD_01", "ARCH_MKT_STD_01", "ARCH_ECOM_STD_01"]
    found_ids = [arc.id for arc in archetypes]
    
    missing = [eid for eid in expected_ids if eid not in found_ids]
    if not missing:
        print("✅ SUCCESS: All 3 mandatory archetypes identified.")
    else:
        print(f"❌ ERROR: Missing archetypes: {missing}")

if __name__ == "__main__":
    verify_archetypes()
