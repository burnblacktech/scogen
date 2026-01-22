"""
Battle Test Runner
Quick script to execute Operation Red Team tests
"""
import subprocess
import sys

print("=" * 60)
print("OPERATION: RED TEAM")
print("=" * 60)
print()
print("Preparing to assault the API...")
print("Targets:")
print("  1. Pricing Engine (Bankruptcy Attack)")
print("  2. Airlock (Directory Traversal)")
print("  3. Constraint Engine (AI Overload)")
print()
print("=" * 60)
print()

# Run pytest with verbose output
result = subprocess.run(
    [
        sys.executable,
        "-m",
        "pytest",
        "tests/battle_test.py",
        "-v",
        "-s",
        "--tb=short"
    ],
    cwd="backend"
)

print()
print("=" * 60)
if result.returncode == 0:
    print("✅ SYSTEM STATUS: BATTLE-READY")
else:
    print("❌ SYSTEM STATUS: VULNERABILITIES DETECTED")
    print("   Review failures above and implement fixes")
print("=" * 60)

sys.exit(result.returncode)
