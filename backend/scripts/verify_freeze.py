import requests
import os
from uuid import UUID

def verify():
    project_id = "123e4567-e89b-12d3-a456-426614174000"
    archetype_id = "ARCH_CRM_STD_01"
    
    base_url = "http://127.0.0.1:8000"
    
    print(f"💧 Hydrating...")
    h_res = requests.post(f"{base_url}/api/archetypes/apply", json={
        "project_id": project_id,
        "archetype_id": archetype_id,
        "variance_responses": {}
    })
    print(f"Hydration: {h_res.status_code}")
    
    print(f"🚀 Freezing...")
    f_res = requests.post(f"{base_url}/api/projects/{project_id}/freeze")
    print(f"Freeze: {f_res.status_code}")
    
    if f_res.status_code == 200:
        print(f"✅ Success! Hash: {f_res.json()['hash']}")
        print(f"📜 Location: {f_res.json()['contract_url']}")

if __name__ == "__main__":
    verify()
