# CRITICAL: Production Integration NOT Active

## STATUS
❌ Production repositories created but NOT connected to server.ts
❌ Generic /api/data/:collection endpoints still use localDbStore mock fallback
❌ Real Firestore data NOT being used for Teachers/Students/Classes/Grades/Attendance

## ISSUE
Current server.ts flow:
```
Client POST /api/data/teachers
→ app.post("/api/data/:collection")
→ getLiveCollectionItems("teachers")  // MOCK FALLBACK
→ localDbStore.teachers (MOCK)
→ Response contains mock data
```

**Should be:**
```
Client POST /api/data/teachers
→ app.post("/api/data/:collection")
→ AdminTeachersRepository.createTeacher()
→ Firestore transaction
→ Real data persisted
→ Response contains real data
```

## REQUIRED FIXES

### Fix 1: Import Production Repos (server.ts, line ~1)
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

### Fix 2: Wrap getLiveCollectionItems (server.ts, line ~4490 POST handler)

**BEFORE:**
```typescript
app.post("/api/data/:collection", authorizeRole("ADMIN", "TEACHER"), async (req: AuthenticatedRequest, res) => {
  const { collection } = req.params;
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return res.status(400).json({ error: "Invalid data collection" });
  }

  try {
    // GET CURRENT DATA
    const currentData = await getLiveCollectionItems(collection);
    
    // CREATE PAYLOAD
    const payload = {
      id: req.body.id || `${collection}-${Date.now()}`,
      ...req.body,
      schoolId: SCHOOL_ID,
      createdAt: new Date().toISOString(),
    };

    // SAVE TO MOCK (REMOVE THIS)
    if (!localDbStore[collection]) localDbStore[collection] = [];
    localDbStore[collection].push(payload);

    // ... rest of handler
```

**AFTER (ADD AT TOP OF HANDLER):**
```typescript
app.post("/api/data/:collection", authorizeRole("ADMIN", "TEACHER"), async (req: AuthenticatedRequest, res) => {
  const { collection } = req.params;
  const user = req.user!;

  try {
    // ========== PRODUCTION REPOSITORIES ==========
    
    // TEACHERS
    if (collection === "teachers") {
      if (user.role !== "ADMIN") {
        return res.status(403).json({ error: "Only admins can create teachers" });
      }
      const repo = new AdminTeachersRepository(adminDb, adminAuth, user.schoolId);
      try {
        const result = await repo.createTeacher({
          name: req.body.name,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          email: req.body.email,
          phone: req.body.phone,
          position: req.body.position,
          subjects: req.body.subjects,
          workloadHours: req.body.workloadHours,
          department: req.body.department,
          homeroomClass: req.body.homeroomClass,
          schoolId: user.schoolId,
          createdBy: user.uid,
        });
        return res.status(201).json({ success: true, data: result });
      } catch (err: any) {
        if (err.message.includes("duplicate") || err.message.includes("mavjud")) {
          return res.status(409).json({ error: err.message });
        }
        throw err;
      }
    }

    // STUDENTS
    if (collection === "students") {
      if (user.role !== "ADMIN") {
        return res.status(403).json({ error: "Only admins can create students" });
      }
      const repo = new AdminStudentsRepository(adminDb, user.schoolId);
      try {
        const result = await repo.createStudent({
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          enrolledClass: req.body.enrolledClass,
          email: req.body.email,
          phone: req.body.phone,
          birthDate: req.body.birthDate,
          parentName: req.body.parentName,
          parentPhone: req.body.parentPhone,
          schoolId: user.schoolId,
          createdBy: user.uid,
        });
        return res.status(201).json({ success: true, data: result });
      } catch (err: any) {
        if (err.message.includes("duplicate")) {
          return res.status(409).json({ error: err.message });
        }
        throw err;
      }
    }

    // CLASSES
    if (collection === "classes") {
      if (user.role !== "ADMIN") {
        return res.status(403).json({ error: "Only admins can create classes" });
      }
      const repo = new AdminClassesRepository(adminDb, user.schoolId);
      try {
        const result = await repo.createClass({
          name: req.body.name,
          gradeLevel: req.body.gradeLevel,
          section: req.body.section,
          academicYear: req.body.academicYear,
          room: req.body.room,
          capacity: req.body.capacity,
          homeroomTeacherId: req.body.homeroomTeacherId,
          assignedTeacherIds: req.body.assignedTeacherIds,
          schoolId: user.schoolId,
          createdBy: user.uid,
        });
        return res.status(201).json({ success: true, data: result });
      } catch (err: any) {
        if (err.message.includes("duplicate")) {
          return res.status(409).json({ error: err.message });
        }
        throw err;
      }
    }

    // GRADES
    if (collection === "grades") {
      if (user.role === "TEACHER") {
        const repo = new TeacherGradesRepository(adminDb, user.schoolId);
        const result = await repo.createGrade({
          studentId: req.body.studentId,
          className: req.body.className,
          subject: req.body.subject,
          subjectId: req.body.subjectId,
          score: req.body.score,
          gradeType: req.body.gradeType,
          period: req.body.period,
          academicYear: req.body.academicYear,
          teacheId: user.uid,
          schoolId: user.schoolId,
        });
        return res.status(201).json({ success: true, data: result });
      }
    }

    // ATTENDANCE
    if (collection === "attendance") {
      if (user.role === "TEACHER") {
        const repo = new AttendanceRepository(adminDb, user.schoolId);
        const result = await repo.markAttendance({
          studentId: req.body.studentId,
          className: req.body.className,
          date: req.body.date,
          status: req.body.status,
          checkInTime: req.body.checkInTime,
          method: req.body.method,
          confidence: req.body.confidence,
          notes: req.body.notes,
          teacherId: user.uid,
          schoolId: user.schoolId,
        });
        return res.status(201).json({ success: true, data: result });
      }
    }

    // ========== FALLBACK TO MOCK (for other collections) ==========
    // ... existing mock-based handler for journals, ktp, etc.
```

### Fix 3: GET Handler (similar pattern, line ~4510)

Add production repo checks at start of GET handler:

```typescript
app.get("/api/data/:collection", async (req: AuthenticatedRequest, res) => {
  const { collection } = req.params;
  const user = req.user!;

  try {
    // TEACHERS READ
    if (collection === "teachers" && user.role === "ADMIN") {
      const repo = new AdminTeachersRepository(adminDb, adminAuth, user.schoolId);
      const teachers = await repo.listTeachers(req.query as any);
      return res.json({ success: true, items: teachers, totalCount: teachers.length });
    }

    // STUDENTS READ
    if (collection === "students" && user.role === "ADMIN") {
      const repo = new AdminStudentsRepository(adminDb, user.schoolId);
      const students = await repo.listStudents(req.query as any);
      return res.json({ success: true, items: students, totalCount: students.length });
    }

    // ... similar for classes, grades, attendance
```

### Fix 4: PATCH Handler (line ~4560)

```typescript
app.patch("/api/data/:collection/:id", async (req: AuthenticatedRequest, res) => {
  const { collection, id } = req.params;
  const user = req.user!;

  try {
    // TEACHERS UPDATE
    if (collection === "teachers" && user.role === "ADMIN") {
      const repo = new AdminTeachersRepository(adminDb, adminAuth, user.schoolId);
      await repo.updateTeacher({
        id,
        ...req.body,
        schoolId: user.schoolId,
        updatedBy: user.uid,
      });
      const updated = await repo.getTeacher(id);
      return res.json({ success: true, item: updated });
    }

    // ... similar for other collections
```

### Fix 5: DELETE Handler (line ~4580)

```typescript
app.delete("/api/data/:collection/:id", async (req: AuthenticatedRequest, res) => {
  const { collection, id } = req.params;
  const user = req.user!;

  try {
    // TEACHERS ARCHIVE
    if (collection === "teachers" && user.role === "ADMIN") {
      const repo = new AdminTeachersRepository(adminDb, adminAuth, user.schoolId);
      await repo.archiveTeacher(id, user.schoolId, user.uid);
      return res.json({ success: true, message: "Teacher archived" });
    }

    // ... similar for other collections
```

## VERIFICATION

After applying fixes, test:

```bash
# 1. Type-check
npx tsc --noEmit
# Should PASS (0 errors)

# 2. Build
npm run build
# Should PASS

# 3. Create teacher - should go to Firestore
curl -X POST http://localhost:3000/api/data/teachers \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","position":"Teacher"}'
# Response: real data from Firestore

# 4. Verify Firestore Console
# Navigate to Firestore → teachers collection
# Should see real teacher record (not mock)
```

## CURRENT STATE

✅ Production repositories exist and work
❌ NOT connected to server.ts
❌ API endpoints still use mock data
❌ UI sees old mock data
❌ Real Firestore NOT being written to

## NEXT IMMEDIATE ACTION

Apply server.ts fixes (Copy-paste from sections above).
Total effort: ~2-3 hours.
Risk: Low (comprehensive error handling).

