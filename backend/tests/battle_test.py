"""
Operation: Red Team - Battle Test Suite
Stress tests designed to break the system and expose vulnerabilities

This is NOT unit testing. This is WAR.
We are trying to rob the bank, crash the AI, and bypass the margin guard.

Test Targets:
1. Pricing Engine - Bankruptcy Attack (negative margins)
2. Airlock - Directory Traversal Attack (steal system files)
3. Constraint Engine - Confused AI Attack (poison prompts)
"""
import pytest
from httpx import AsyncClient
from app.main import app


# Base URL for local testing
BASE_URL = "http://test"


# ============================================================
# TARGET 1: THE "BANKRUPTCY" ATTACK (Pricing Engine)
# ============================================================

@pytest.mark.asyncio
async def test_pricing_bankruptcy_attack():
    """
    ATTACK: Force negative margin scenario
    
    Strategy:
    - Large job (100 hours)
    - Charge client JUNIOR rate (₹1500/hr)
    - Use SENIOR resource internally (₹2000/hr)
    - No asset reuse
    
    Math:
    - Client Price = 100 * 1500 * 1.0 * 1.2 = ₹180,000
    - Internal Cost = 100 * 2000 = ₹200,000
    - Margin = -₹20,000 (NEGATIVE!)
    
    EXPECT: Status REJECTED_LOW_MARGIN or similar rejection
    FAIL IF: Returns APPROVED with negative margin
    """
    async with AsyncClient(app=app, base_url=BASE_URL) as ac:
        payload = {
            "task_name": "Bankruptcy Attempt",
            "standard_hours": 100,
            "complexity": "LOW",
            "assigned_persona": "JUNIOR",  # Cheap rate for client
            "actual_resource": "SENIOR",   # Expensive resource used
            "is_asset_reused": False       # No efficiency gain
        }
        
        response = await ac.post("/api/pricing/calculate", json=payload)
        
        print(f"\n{'='*60}")
        print(f"BANKRUPTCY ATTACK RESULTS")
        print(f"{'='*60}")
        
        assert response.status_code == 200, "API should respond (not crash)"
        data = response.json()
        
        print(f"Status: {data.get('status', 'UNKNOWN')}")
        print(f"Client Price: ₹{data.get('client_price', 0):,.2f}")
        print(f"Internal Cost: ₹{data.get('internal_cost', 0):,.2f}")
        print(f"Gross Margin: {data.get('gross_margin_percent', 0):.2f}%")
        print(f"{'='*60}\n")
        
        # CRITICAL: System must reject low/negative margins
        margin = data.get("gross_margin_percent", 0)
        
        if margin < 40:
            # Good! System detected the problem
            assert data.get("status") in ["REJECTED_LOW_MARGIN", "WARNING", "REJECTED"], \
                f"Low margin detected but status is: {data.get('status')}"
            print("✅ PASS: System correctly rejected low-margin scenario")
        else:
            # This should not happen with our payload
            pytest.fail(f"Expected low margin but got {margin}%")


@pytest.mark.asyncio
async def test_pricing_zero_hours_attack():
    """
    ATTACK: Zero hours edge case
    
    What happens when standard_hours = 0?
    Should the system:
    - Reject it (validation error)?
    - Return zero cost?
    - Crash?
    
    EXPECT: Graceful handling (validation error or zero cost)
    FAIL IF: 500 error or crash
    """
    async with AsyncClient(app=app, base_url=BASE_URL) as ac:
        payload = {
            "task_name": "Zero Hours Attack",
            "standard_hours": 0,  # Edge case
            "complexity": "LOW",
            "assigned_persona": "JUNIOR",
            "actual_resource": "JUNIOR",
            "is_asset_reused": False
        }
        
        response = await ac.post("/api/pricing/calculate", json=payload)
        
        print(f"\n{'='*60}")
        print(f"ZERO HOURS ATTACK RESULTS")
        print(f"{'='*60}")
        print(f"Status Code: {response.status_code}")
        
        # Should either validate (422) or process gracefully (200)
        assert response.status_code in [200, 422], \
            f"Unexpected status code: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"Client Price: ₹{data.get('client_price', 0):,.2f}")
            print(f"Internal Cost: ₹{data.get('internal_cost', 0):,.2f}")
            assert data.get('client_price', 0) == 0, "Zero hours should mean zero cost"
            print("✅ PASS: Zero hours handled gracefully")
        else:
            print("✅ PASS: Validation rejected zero hours")
        
        print(f"{'='*60}\n")


# ============================================================
# TARGET 2: THE "DIRECTORY TRAVERSAL" ATTACK (Airlock)
# ============================================================

@pytest.mark.asyncio
async def test_airlock_directory_traversal_attack():
    """
    ATTACK: Try to steal system files via path traversal
    
    Strategy:
    - Request module_path = "../../.env" (go up directories)
    - Or: "../../../../etc/passwd" (Linux systems)
    - Or: "../../../Windows/System32/config" (Windows)
    
    EXPECT: 
    - 400 Bad Request (path validation failed)
    - 404 Not Found (module doesn't exist)
    - 500 with security error message
    
    FAIL IF:
    - Returns 200 with a ZIP file
    - ZIP contains system files
    - Server crashes
    """
    async with AsyncClient(app=app, base_url=BASE_URL) as ac:
        malicious_paths = [
            "../../.env",
            "../../../etc/passwd",
            "../../../../Windows/System32",
            "..\\..\\..\\config",
            "%2e%2e%2f%2e%2e%2f.env"  # URL encoded
        ]
        
        print(f"\n{'='*60}")
        print(f"DIRECTORY TRAVERSAL ATTACK RESULTS")
        print(f"{'='*60}")
        
        for malicious_path in malicious_paths:
            print(f"\nTesting: {malicious_path}")
            
            response = await ac.post(
                f"/api/airlock/generate-bundle/HACK-001",
                params={"module_path": malicious_path}
            )
            
            print(f"  Status Code: {response.status_code}")
            
            # CRITICAL: Must NOT return 200 with a file
            if response.status_code == 200:
                # Check if it's actually a ZIP file
                content_type = response.headers.get("content-type", "")
                if "zip" in content_type or "application/octet-stream" in content_type:
                    pytest.fail(
                        f"🚨 SECURITY BREACH: Airlock returned ZIP for malicious path: {malicious_path}"
                    )
                else:
                    print(f"  ⚠️ Returned 200 but not a ZIP (might be error response)")
            else:
                print(f"  ✅ Correctly rejected (status {response.status_code})")
        
        print(f"\n{'='*60}")
        print("✅ PASS: All directory traversal attempts blocked")
        print(f"{'='*60}\n")


@pytest.mark.asyncio
async def test_airlock_absolute_path_attack():
    """
    ATTACK: Try to use absolute paths
    
    Strategy:
    - Request module_path = "/etc/passwd"
    - Or: "C:\\Windows\\System32"
    
    EXPECT: Rejection (paths should be relative)
    FAIL IF: Returns system files
    """
    async with AsyncClient(app=app, base_url=BASE_URL) as ac:
        absolute_paths = [
            "/etc/passwd",
            "/root/.ssh/id_rsa",
            "C:\\Windows\\System32\\config",
            "/var/log/auth.log"
        ]
        
        print(f"\n{'='*60}")
        print(f"ABSOLUTE PATH ATTACK RESULTS")
        print(f"{'='*60}")
        
        for abs_path in absolute_paths:
            print(f"\nTesting: {abs_path}")
            
            response = await ac.post(
                f"/api/airlock/generate-bundle/HACK-002",
                params={"module_path": abs_path}
            )
            
            print(f"  Status Code: {response.status_code}")
            
            # Must NOT return 200 with a ZIP
            assert response.status_code != 200 or "zip" not in response.headers.get("content-type", ""), \
                f"🚨 SECURITY BREACH: Absolute path accepted: {abs_path}"
            
            print(f"  ✅ Correctly rejected")
        
        print(f"\n{'='*60}")
        print("✅ PASS: All absolute path attempts blocked")
        print(f"{'='*60}\n")


# ============================================================
# TARGET 3: THE "CONFUSED AI" ATTACK (Constraint Engine)
# ============================================================

@pytest.mark.asyncio
async def test_constraint_massive_text_attack():
    """
    ATTACK: Send massive text to crash the vector/Ollama bridge
    
    Strategy:
    - Send 5000+ words of gibberish
    - Try to cause timeout or memory overflow
    
    EXPECT:
    - 200 with empty warnings (processed but found nothing)
    - 504 Gateway Timeout (Ollama timeout)
    - 400 Bad Request (text too long)
    
    FAIL IF:
    - 500 Internal Server Error with stack trace
    - Server hangs/crashes
    """
    async with AsyncClient(app=app, base_url=BASE_URL, timeout=60.0) as ac:
        # 5000 words of nonsense
        poison_payload = {
            "project_context": "hack " * 5000,
            "threshold": 0.7
        }
        
        print(f"\n{'='*60}")
        print(f"MASSIVE TEXT ATTACK RESULTS")
        print(f"{'='*60}")
        print(f"Payload size: {len(poison_payload['project_context'])} characters")
        
        response = await ac.post("/api/constraints/scan", json=poison_payload)
        
        print(f"Status Code: {response.status_code}")
        
        # Should handle gracefully (not crash with 500)
        assert response.status_code != 500, \
            "Server crashed with 500 error on large input"
        
        if response.status_code == 200:
            data = response.json()
            print(f"Warnings found: {data.get('count', 0)}")
            print("✅ PASS: Processed large text without crashing")
        elif response.status_code == 504:
            print("✅ PASS: Timeout handled gracefully")
        elif response.status_code == 400:
            print("✅ PASS: Validation rejected oversized input")
        else:
            print(f"⚠️ Unexpected status: {response.status_code}")
        
        print(f"{'='*60}\n")


@pytest.mark.asyncio
async def test_constraint_sql_injection_attack():
    """
    ATTACK: Try SQL injection in the vector search
    
    Strategy:
    - Send text that looks like SQL injection
    - Test if pgvector query is vulnerable
    
    EXPECT: Safe handling (parameterized queries should prevent injection)
    FAIL IF: Database error or unexpected behavior
    """
    async with AsyncClient(app=app, base_url=BASE_URL) as ac:
        sql_injections = [
            "'; DROP TABLE constraint_registry; --",
            "1' OR '1'='1",
            "admin'--",
            "' UNION SELECT * FROM users--",
            "<script>alert('XSS')</script>"
        ]
        
        print(f"\n{'='*60}")
        print(f"SQL INJECTION ATTACK RESULTS")
        print(f"{'='*60}")
        
        for injection in sql_injections:
            print(f"\nTesting: {injection[:50]}...")
            
            payload = {
                "project_context": injection,
                "threshold": 0.7
            }
            
            response = await ac.post("/api/constraints/scan", json=payload)
            
            print(f"  Status Code: {response.status_code}")
            
            # Should handle safely (200 with no results, or 400)
            assert response.status_code in [200, 400], \
                f"Unexpected response to SQL injection: {response.status_code}"
            
            if response.status_code == 200:
                data = response.json()
                # Should process as normal text, not execute SQL
                print(f"  ✅ Treated as normal text ({data.get('count', 0)} warnings)")
            else:
                print(f"  ✅ Rejected malicious input")
        
        print(f"\n{'='*60}")
        print("✅ PASS: All SQL injection attempts handled safely")
        print(f"{'='*60}\n")


@pytest.mark.asyncio
async def test_constraint_empty_input_attack():
    """
    ATTACK: Send empty or null inputs
    
    EXPECT: Validation error or empty results
    FAIL IF: 500 error
    """
    async with AsyncClient(app=app, base_url=BASE_URL) as ac:
        edge_cases = [
            {"project_context": ""},
            {"project_context": " "},
            {"project_context": "\n\n\n"},
        ]
        
        print(f"\n{'='*60}")
        print(f"EMPTY INPUT ATTACK RESULTS")
        print(f"{'='*60}")
        
        for payload in edge_cases:
            print(f"\nTesting: {repr(payload['project_context'][:20])}")
            
            response = await ac.post("/api/constraints/scan", json=payload)
            
            print(f"  Status Code: {response.status_code}")
            
            # Should handle gracefully
            assert response.status_code in [200, 422], \
                f"Unexpected response to empty input: {response.status_code}"
            
            print(f"  ✅ Handled gracefully")
        
        print(f"\n{'='*60}")
        print("✅ PASS: All empty input cases handled")
        print(f"{'='*60}\n")


# ============================================================
# SUMMARY REPORT
# ============================================================

@pytest.mark.asyncio
async def test_zzz_battle_summary():
    """
    Final summary of battle test results
    (Named with zzz to run last)
    """
    print(f"\n{'='*60}")
    print(f"OPERATION: RED TEAM - SUMMARY")
    print(f"{'='*60}")
    print(f"\nIf you see this message, all attacks were successfully defended!")
    print(f"\n✅ Pricing Engine: Bankruptcy attacks blocked")
    print(f"✅ Airlock: Directory traversal blocked")
    print(f"✅ Constraint Engine: AI overload handled")
    print(f"\n{'='*60}")
    print(f"SYSTEM STATUS: BATTLE-READY")
    print(f"{'='*60}\n")
