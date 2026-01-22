"""
Seed Script: The Fatal 5 Constraints
Populates the constraint registry with Mr. X's essential rules

Run this after the database is set up to give the system
its initial immune system.
"""
import requests
import json

# API Base URL
BASE_URL = "http://localhost:8000/api/constraints"

# The Fatal 5: Constraints that prevent common disasters
FATAL_5 = [
    {
        "category": "Infrastructure",
        "description": "App targets rural India or Tier-3 cities with poor internet connectivity and frequent network outages",
        "enforcement_rule": "MUST implement Offline-First Sync (SQLite + WatermelonDB or similar). NO real-time only WebSockets. Data must be cached locally and synced when connection is available."
    },
    {
        "category": "Database",
        "description": "App involves financial transactions, wallets, ledgers, or any money-related operations requiring ACID compliance",
        "enforcement_rule": "Database MUST be SQL (PostgreSQL or MySQL). NO MongoDB or NoSQL for financial data. ACID compliance is non-negotiable. Use transactions for all money operations."
    },
    {
        "category": "Media",
        "description": "App requires video streaming, live video calls, or high-bandwidth media delivery",
        "enforcement_rule": "Budget MUST include Bandwidth Buffer (+₹20,000 minimum). Do NOT use free-tier WebRTC servers for production. Plan for CDN costs. Implement adaptive bitrate streaming."
    },
    {
        "category": "Security",
        "description": "App handles user authentication, passwords, or sensitive personal data",
        "enforcement_rule": "MUST use industry-standard auth (OAuth 2.0, JWT with refresh tokens). NO custom crypto. NO plain text passwords. NO MD5 or SHA1 hashing. Use bcrypt/argon2 with proper salt."
    },
    {
        "category": "Scale",
        "description": "App expects more than 10,000 concurrent users or viral growth potential",
        "enforcement_rule": "MUST design for horizontal scaling from day 1. Use load balancers. Implement caching (Redis). Database read replicas. NO single points of failure. Plan for auto-scaling infrastructure."
    }
]


def seed_constraints():
    """Seed the constraint registry with the Fatal 5"""
    print("=" * 60)
    print("SEEDING CONSTRAINT REGISTRY: THE FATAL 5")
    print("=" * 60)
    print()
    
    success_count = 0
    
    for i, constraint in enumerate(FATAL_5, 1):
        print(f"{i}. {constraint['category']}: {constraint['description'][:60]}...")
        
        try:
            response = requests.post(
                f"{BASE_URL}/learn",
                json=constraint,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ Learned: {result['id']}")
                success_count += 1
            else:
                print(f"   ❌ Failed: {response.status_code} - {response.text}")
        
        except requests.exceptions.ConnectionError:
            print(f"   ❌ Cannot connect to {BASE_URL}")
            print(f"      Make sure the backend is running: uvicorn backend.app.main:app --reload")
            break
        
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        print()
    
    print("=" * 60)
    print(f"SEEDING COMPLETE: {success_count}/{len(FATAL_5)} constraints learned")
    print("=" * 60)
    
    if success_count == len(FATAL_5):
        print("\n✅ The Moat is now operational!")
        print("\nTest it:")
        print(f"  POST {BASE_URL}/scan")
        print('  Body: {"project_context": "Video app for farmers in Bihar"}')
    else:
        print("\n⚠️ Some constraints failed to load. Check the backend logs.")


if __name__ == "__main__":
    seed_constraints()
