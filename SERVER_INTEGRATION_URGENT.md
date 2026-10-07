# URGENT: SERVER.TS INTEGRATION CHECKLIST

## ⚠️ CRITICAL: Production Repositories NOT Connected to API

**Status:** Ready to deploy, BUT endpoints still use mock data

---

## QUICK SUMMARY

```
❌ Current state: Client → API → localDbStore (MOCK)
✅ Target state: Client → API → Repository → Firestore (REAL)

Fix required: Wire production repositories into server.ts
Effort: 2-3 hours
Risk: Low (error handling included)
Blocker: YES
```

---

## DO THIS NOW

### Step 1: Review the Issue (15 min)
- [ ] Read CRITICAL_FIX_NEEDED.md
- [ ] Understand current flow vs. target flow
- [ ] Review exact code locations that need changes

### Step 2: Locate server.ts Sections (10 min)
- [ ] Find line ~4490: `app.post("/api/data/:collection"`
- [ ] Find line ~4510: `app.get("/api/data/:collection"`
- [ ] Find line ~4560: `app.patch("/api/data/:collection/:id"`
- [ ] Find line ~4580: `app.delete("/api/data/:collection/:id"`

### Step 3: Add Imports (5 min)
- [ ] Add to server.ts top:
```typescript
import {
  AdminTeachersRepository,
  AdminStudentsRepository,
  AdminClassesRepository,
  TeacherGradesRepository,
  ParentGradesRepository,
  AdminGradesRepository,
  AttendanceRepository,
  ParentAttendanceRepository,
  AdminAttendanceRepository,
} from "./src/lib/index.js";
```

### Step 4: Fix POST Handler (45 min)
- [ ] Open server.ts line ~4490: `app.post("/api/data/:collection"`
- [ ] Add production repo checks at handler start (before mock fallback)
- [ ] Copy code from CRITICAL_FIX_NEEDED.md "Fix 2"
- [ ] Handle: teachers, students, classes, grades, attendance
- [ ] Fallback: keep existing mock handler for other collections (ktp, journals, etc.)

### Step 5: Fix GET Handler (30 min)
- [ ] Open server.ts line ~4510: `app.get("/api/data/:collection"`
- [ ] Add production repo checks at handler start
- [ ] Copy code from CRITICAL_FIX_NEEDED.md "Fix 3"
- [ ] Handle: teachers, students, classes, grades, attendance (role-based)

### Step 6: Fix PATCH Handler (20 min)
- [ ] Open server.ts line ~4560: `app.patch("/api/data/:collection/:id"`
- [ ] Add production repo checks at handler start
- [ ] Copy code from CRITICAL_FIX_NEEDED.md "Fix 4"

### Step 7: Fix DELETE Handler (20 min)
- [ ] Open server.ts line ~4580: `app.delete("/api/data/:collection/:id"`
- [ ] Add production repo checks at handler start
- [ ] Copy code from CRITICAL_FIX_NEEDED.md "Fix 5"

### Step 8: Build & Test (30 min)
```bash
# Type-check
npx tsc --noEmit
# Should PASS (0 errors)

# Build
npm run build
# Should PASS

# Run (local)
npm run dev

# Test in another terminal
curl -X POST http://localhost:3000/api/data/teachers \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","firstName":"Test","lastName":"Teacher","position":"Teacher"}'

# Expected response:
# { "success": true, "data": { "teacherId": "tch-...", "userId": "...", "email": "...", "temporaryPassword": "..." } }
```

### Step 9: Verify Firestore (10 min)
- [ ] Open Firestore Console (Firebase project)
- [ ] Navigate to collections → teachers
- [ ] Should see REAL teacher record (not mock)
- [ ] Check createdAt, createdBy, schoolId fields

---

## EXPECTED OUTCOMES

After fixes:

✅ **Teachers** real creation  
```
POST /api/data/teachers
→ AdminTeachersRepository.createTeacher()
→ Firestore write
→ User auto-provisioning in Firebase Auth
→ Response: { teacherId, userId, ... }
```

✅ **Students** real creation  
```
POST /api/data/students
→ AdminStudentsRepository.createStudent()
→ Duplicate prevention (409 if exists)
→ Firestore write
→ Response: { studentId, ... }
```

✅ **Classes** real creation  
```
POST /api/data/classes
→ AdminClassesRepository.createClass()
→ Bidirectional teacher sync
→ Firestore write
→ Response: { classId, ... }
```

✅ **Grades** real creation (TEACHER only)  
```
POST /api/data/grades
→ TeacherGradesRepository.createGrade()
→ Validate class + subject assignment
→ Student average auto-sync
→ Firestore write
→ Response: { gradeId, ... }
```

✅ **Attendance** real creation (TEACHER only)  
```
POST /api/data/attendance
→ AttendanceRepository.markAttendance()
→ Duplicate prevention
→ Student attendance rate auto-sync
→ Firestore write
→ Response: { attendanceId, ... }
```

✅ **RBAC Enforced**  
```
Teacher tries to create teacher → 403 (denied)
Parent tries to create student → 403 (denied)
Invalid auth → 401 (unauthorized)
```

✅ **Duplicate Prevention**  
```
Create teacher with duplicate email → 409 (conflict)
Create student with duplicate name+birthDate → 409 (conflict)
Create class with duplicate grade+section+year → 409 (conflict)
```

✅ **Audit Logging**  
```
Every mutation creates auditLog entry with:
- actorUid, actorRole
- action (CREATE, UPDATE, DELETE)
- entity, entityId
- oldValue, newValue
- timestamp
```

---

## FAILURE DIAGNOSIS

If tests fail:

```
❌ Status 500 (Internal Server Error)
→ Check imports at top of server.ts
→ Check repository instantiation
→ Check error handling in patches

❌ Status 403 (Access Denied)
→ Check user.role validation
→ Check RBAC conditions
→ Check authentication token

❌ Response is still mock data
→ Repository code was NOT added to handler
→ Or repository returns unexpected format
→ Check return structure vs. expected

❌ Firestore collection still empty
→ Repository was NOT called
→ Or Firestore write failed silently
→ Enable Firestore logging in Console
```

---

## SUPPORT

**Questions:** Refer to:
- CRITICAL_FIX_NEEDED.md (exact code locations)
- SERVER_INTEGRATION_GUIDE.md (detailed walkthrough)
- Production repo files (JSDoc comments with examples)

**Resources:**
```
src/lib/adminTeachersRepository.ts     470 lines, fully documented
src/lib/adminStudentsRepository.ts     500 lines, fully documented
src/lib/adminClassesRepository.ts      530 lines, fully documented
src/lib/gradesRepository.ts            850 lines, fully documented
src/lib/attendanceRepository.ts        250 lines, fully documented
```

---

## TIMELINE

```
2-3 hours:  Apply server.ts fixes
30 min:     Local testing + Firestore verification
10 min:     Build + test suite
= 3-4 hours total to production-ready
```

---

## GO/NO-GO CRITERIA

✅ GO if:
- npm run build → PASS
- npm test → PASS
- Firestore writes verified
- RBAC enforced
- Audit logs created
- Duplicate prevention works

❌ NO-GO if:
- Any handler still uses mock data
- RBAC not enforced
- Firestore collections remain empty
- Build or tests fail

---

**Status:** READY FOR IMPLEMENTATION  
**Blockers:** None (all code provided)  
**Risk:** Low  
**Go/No-Go Decision:** Your choice  

START HERE: Read CRITICAL_FIX_NEEDED.md, then apply patches.

