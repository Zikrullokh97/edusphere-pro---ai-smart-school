# SERVER.TS PRODUCTION INTEGRATION - IMPLEMENTATION COMPLETE

## ✅ COMPLETED

### 1. Imports Added (Line 28-39)
✅ AdminTeachersRepository
✅ AdminStudentsRepository  
✅ AdminClassesRepository
✅ TeacherGradesRepository
✅ ParentGradesRepository
✅ AdminGradesRepository
✅ AttendanceRepository
✅ ParentAttendanceRepository
✅ AdminAttendanceRepository

### 2. POST /api/data/:collection Handler (Line 4358+)
✅ TEACHERS create → AdminTeachersRepository.createTeacher()
✅ STUDENTS create → AdminStudentsRepository.createStudent()
✅ CLASSES create → AdminClassesRepository.createClass()
✅ GRADES create → TeacherGradesRepository.createGrade() (TEACHER only)
✅ ATTENDANCE create → AttendanceRepository.markAttendance() (TEACHER only)

Status codes:
✅ 201 for successful creation (Firestore)
✅ 409 for duplicate conflicts
✅ 400 for validation errors
✅ 403 for role/RBAC denial
✅ 500 for server errors

Fallback: Mock-based handler still active for other collections (ktp, journals, etc.)

## ⏳ REMAINING WORK

### 3. GET /api/data/:collection Handler (Line ~4318)
NEEDS: Production repo read methods at handler start

Pattern to add:
```typescript
if (collection === "teachers" && user.role === "ADMIN") {
  const repo = new AdminTeachersRepository(adminDb, adminAuth, user.schoolId);
  const teachers = await repo.listTeachers(req.query as any);
  return res.json({ success: true, items: teachers, totalCount: teachers.length });
}
// ... similar for students, classes, grades, attendance
```

### 4. PATCH /api/data/:collection/:id Handler (Line ~4420)
NEEDS: Production repo update methods at handler start

Pattern:
```typescript
if (collection === "teachers" && user.role === "ADMIN") {
  const repo = new AdminTeachersRepository(adminDb, adminAuth, user.schoolId);
  await repo.updateTeacher({
    id: req.params.id,
    ...req.body,
    schoolId: user.schoolId,
    updatedBy: user.uid,
  });
  const updated = await repo.getTeacher(req.params.id);
  return res.json({ success: true, item: updated });
}
```

### 5. DELETE /api/data/:collection/:id Handler (Line ~4468)
NEEDS: Production repo archive/delete methods at handler start

Pattern:
```typescript
if (collection === "teachers" && user.role === "ADMIN") {
  const repo = new AdminTeachersRepository(adminDb, adminAuth, user.schoolId);
  await repo.archiveTeacher(req.params.id, user.schoolId, user.uid);
  return res.json({ success: true, message: "Teacher archived" });
}
```

## NEXT IMMEDIATE STEPS

1. Type-check to verify POST changes compile
2. Apply GET handler changes (copy-paste pattern above)
3. Apply PATCH handler changes
4. Apply DELETE handler changes
5. Type-check again
6. Build & test
7. Firestore verification

