# Operation: Red Team - Battle Tests

## Overview

This is NOT unit testing. This is WAR.

We are trying to:
- 🏦 **Rob the bank** (Pricing Engine)
- 💣 **Crash the AI** (Constraint Engine)  
- 🔓 **Bypass security** (Airlock)

If the system survives, it's battle-ready.

---

## Quick Start

### Run All Battle Tests
```bash
# From project root
python run_battle_tests.py

# Or directly with pytest
cd backend
pytest tests/battle_test.py -v -s
```

### Run Specific Attack
```bash
cd backend

# Pricing attacks only
pytest tests/battle_test.py::test_pricing_bankruptcy_attack -v -s

# Airlock attacks only
pytest tests/battle_test.py::test_airlock_directory_traversal_attack -v -s

# Constraint attacks only
pytest tests/battle_test.py::test_constraint_massive_text_attack -v -s
```

---

## The Three Targets

### 1. Pricing Engine - Bankruptcy Attack
**Goal**: Force negative margin scenario

**Attack**: 
- Large job (100 hours)
- Charge client JUNIOR rate (₹1,500/hr)
- Use SENIOR resource (₹2,000/hr)
- Result: -₹20,000 margin

**Expected**: `REJECTED_LOW_MARGIN`  
**FAIL IF**: Returns `APPROVED`

---

### 2. Airlock - Directory Traversal Attack
**Goal**: Steal system files

**Attack**:
- Request `../../.env`
- Request `/etc/passwd`
- Request `C:\\Windows\\System32`

**Expected**: 404 or 400 error  
**FAIL IF**: Returns ZIP with system files

---

### 3. Constraint Engine - AI Overload Attack
**Goal**: Crash the vector search

**Attack**:
- Send 5,000+ words of gibberish
- Send SQL injection attempts
- Send empty/null inputs

**Expected**: Graceful handling (200, 504, or 400)  
**FAIL IF**: 500 error or server crash

---

## Success Criteria

### ✅ All Tests Pass
**Status**: BATTLE-READY  
**Action**: Proceed to production

### ⚠️ Some Tests Fail
**Status**: VULNERABILITIES DETECTED  
**Action**: Fix issues, re-run tests

### ❌ Critical Failures
**Status**: SECURITY BREACH  
**Action**: STOP. Fix immediately.

---

## Test Results Interpretation

### Pricing Tests
```
✅ PASS: System correctly rejected low-margin scenario
✅ PASS: Zero hours handled gracefully
```

### Airlock Tests
```
✅ PASS: All directory traversal attempts blocked
✅ PASS: All absolute path attempts blocked
```

### Constraint Tests
```
✅ PASS: Processed large text without crashing
✅ PASS: All SQL injection attempts handled safely
✅ PASS: All empty input cases handled
```

---

## Common Failures & Fixes

### Pricing Accepts Negative Margin
**Fix**: Add margin validation in `pricing_service.py`

### Airlock Returns System Files
**Fix**: Add path sanitization in `airlock_service.py`

### Constraint Engine Crashes
**Fix**: Add input truncation and error handling in `embedding.py`

---

## Documentation

Full documentation: [operation_red_team.md](../../../.gemini/antigravity/brain/b196b7d0-627e-43c6-b956-98bf4f6b65e4/operation_red_team.md)

---

**Auditor**: Mr. X  
**Mission**: ASSAULT THE API  
**Status**: READY FOR BATTLE
