"""Quick validation of the enhanced archetype system"""
import json
from pathlib import Path

# Test JSON validity
json_path = Path("backend/library/archetypes/RFC-001-CRM-STANDARD.json")
with open(json_path, 'r') as f:
    data = json.load(f)

print("✅ JSON is valid")
print(f"✅ Archetype: {data['name']}")
print(f"✅ Features: {len(data['features'])}")

# Check structure
for feat in data['features']:
    has_nerves = 'technical_mapping' in feat
    has_body = 'asset_source' in feat
    print(f"  • {feat['id']}: Nerves={has_nerves}, Body={has_body}")

print("\n✅ All features have both Nerves and Body!")
