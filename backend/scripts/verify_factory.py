import requests
import os
from uuid import UUID

def verify_factory_launch():
    project_id = "123e4567-e89b-12d3-a456-426614174000"
    archetype_id = "ARCH_CRM_STD_01"
    base_url = "http://127.0.0.1:8000"
    
    print(f"🏭 Starting Factory Launch Verification...")
    
    # 1. Hydrate
    print("💧 Step 1: Hydrating...")
    h_res = requests.post(f"{base_url}/api/archetypes/apply", json={
        "project_id": project_id,
        "archetype_id": archetype_id,
        "variance_responses": {}
    })
    if h_res.status_code != 200:
        print(f"❌ Hydration failed: {h_res.text}")
        return

    # 2. Freeze
    print("🚀 Step 2: Freezing Scope...")
    f_res = requests.post(f"{base_url}/api/projects/{project_id}/freeze")
    if f_res.status_code != 200:
        print(f"❌ Freeze failed: {f_res.text}")
        return
    doc_hash = f_res.json()["hash"]
    print(f"✅ Scope Frozen. Hash: {doc_hash}")

    # 3. Launch
    print("🎬 Step 3: Launching Execution...")
    l_res = requests.post(f"{base_url}/api/execution/{project_id}/launch")
    if l_res.status_code != 200:
        print(f"❌ Launch failed: {l_res.text}")
        return
    print(f"✅ Factory Launched! Tasks generated: {l_res.json()['tasks_generated']}")

    # 4. List Tasks
    print("📋 Step 4: Verifying Task Board...")
    t_res = requests.get(f"{base_url}/api/execution/{project_id}/tasks")
    tasks = t_res.json()
    if len(tasks) > 0:
        print(f"✅ Tasks found in the board: {len(tasks)}")
        task = tasks[0]
        task_id = task["id"]
        airlock_path = task["technical_context"]["airlock_path"]
        
        # 5. Download Kit
        print(f"📦 Step 5: Testing Airlock Kit Download for Task {task_id[:8]}...")
        # Note: Airlock generate-bundle endpoint: GET /api/airlock/generate-bundle/{task_id}?module_path={path}
        bundle_url = f"{base_url}/api/airlock/generate-bundle/{task_id}?module_path={airlock_path}"
        b_res = requests.get(bundle_url)
        
        if b_res.status_code == 200:
            print("✨ SUCCESS: Code bundle received from the Airlock!")
            print(f"   Size: {len(b_res.content)} bytes")
        else:
            print(f"❌ Airlock failed: {b_res.text}")
    else:
        print("❌ No tasks found!")

if __name__ == "__main__":
    verify_factory_launch()
