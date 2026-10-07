/**
 * server.ts Integration Patch
 * Replace mock-based collection handler with production repositories
 * 
 * Apply after existing imports, before app.listen():
 */

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

/**
 * Replace existing POST /api/data/:collection handler
 * 
 * Find line ~4347 in server.ts:
 *   app.post("/api/data/:collection", authorizeRole("ADMIN", "TEACHER"), async (req: AuthenticatedRequest, res) => {
 * 
 * Replace entire handler body with:
 */

const newPostDataHandler = `
app.post("/api/data/:collection", authorizeRole("ADMIN", "TEACHER"), async (req: AuthenticatedRequest, res) => {
  const { collection } = req.params;
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return res.status(400).json({ error: "Invalid data collection" });
  }

  const user = req.user!;
  const schoolId = user.schoolId;

  try {
    // ============ PRODUCTION REPOSITORIES ============
    
    // TEACHERS
    if (collection === "teachers") {
      if (user.role !== "ADMIN") {
        return res.status(403).json({ error: "Only admins can create teachers" });
      }
      const repo = new AdminTeachersRepository(adminDb, adminAuth, schoolId);
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
        schoolId,
        createdBy: user.uid,
      });
      return res.status(201).json({ success: true, data: result });
    }

    // STUDENTS
    if (collection === "students") {
      if (user.role !== "ADMIN") {
        return res.status(403).json({ error: "Only admins can create students" });
      }
      const repo = new AdminStudentsRepository(adminDb, schoolId);
      const result = await repo.createStudent({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        enrolledClass: req.body.enrolledClass,
        email: req.body.email,
        phone: req.body.phone,
        birthDate: req.body.birthDate,
        parentName: req.body.parentName,
        parentPhone: req.body.parentPhone,
        schoolId,
        createdBy: user.uid,
      });
      return res.status(201).json({ success: true, data: result });
    }

    // CLASSES
    if (collection === "classes") {
      if (user.role !== "ADMIN") {
        return res.status(403).json({ error: "Only admins can create classes" });
      }
      const repo = new AdminClassesRepository(adminDb, schoolId);
      const result = await repo.createClass({
        name: req.body.name,
        gradeLevel: req.body.gradeLevel,
        section: req.body.section,
        academicYear: req.body.academicYear,
        room: req.body.room,
        capacity: req.body.capacity,
        homeroomTeacherId: req.body.homeroomTeacherId,
        assignedTeacherIds: req.body.assignedTeacherIds,
        schoolId,
        createdBy: user.uid,
      });
      return res.status(201).json({ success: true, data: result });
    }

    // GRADES
    if (collection === "grades") {
      if (user.role === "TEACHER") {
        const repo = new TeacherGradesRepository(adminDb, schoolId);
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
          schoolId,
        });
        return res.status(201).json({ success: true, data: result });
      }
      return res.status(403).json({ error: "Grades can only be created by teachers" });
    }

    // ATTENDANCE
    if (collection === "attendance") {
      if (user.role === "TEACHER") {
        const repo = new AttendanceRepository(adminDb, schoolId);
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
          schoolId,
        });
        return res.status(201).json({ success: true, data: result });
      }
      return res.status(403).json({ error: "Attendance can only be created by teachers" });
    }

    // ============ FALLBACK TO MOCK (non-production collections) ============
    // For other collections, use existing mock-based handler
    // ... existing payload creation logic ...
    
    return res.status(400).json({ error: \`Collection '\${collection}' handler not implemented\` });

  } catch (error: any) {
    console.error(\`POST /api/data/\${collection} error:\`, error);
    
    if (error.message.includes("duplicate") || error.message.includes("mavjud")) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message.includes("topilmadi")) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes("403") || error.message.includes("denied")) {
      return res.status(403).json({ error: error.message });
    }
    
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});
`;

/**
 * Similarly, update GET /api/data/:collection handler
 * 
 * Find line ~4510 in server.ts:
 *   app.get("/api/data/:collection", async (req: AuthenticatedRequest, res) => {
 * 
 * Add at start of handler:
 */

const getDataEnhancements = `
// Add after user access check:
const user = req.user!;
const schoolId = user.schoolId;

// TEACHERS - read
if (collection === "teachers" && user.role === "ADMIN") {
  const repo = new AdminTeachersRepository(adminDb, adminAuth, schoolId);
  const teachers = await repo.listTeachers(req.query as any);
  return res.json({ success: true, items: teachers, totalCount: teachers.length });
}

// STUDENTS - read
if (collection === "students" && user.role === "ADMIN") {
  const repo = new AdminStudentsRepository(adminDb, schoolId);
  const students = await repo.listStudents(req.query as any);
  return res.json({ success: true, items: students, totalCount: students.length });
}

// CLASSES - read
if (collection === "classes" && user.role === "ADMIN") {
  const repo = new AdminClassesRepository(adminDb, schoolId);
  const classes = await repo.listClasses(req.query as any);
  return res.json({ success: true, items: classes, totalCount: classes.length });
}

// GRADES - read
if (collection === "grades") {
  if (user.role === "TEACHER") {
    const repo = new TeacherGradesRepository(adminDb, schoolId);
    const grades = await repo.getGradesByClass(user.uid, req.query.classId as string, req.query.subject as string, req.query.academicYear as string);
    return res.json({ success: true, items: grades, totalCount: grades.length });
  }
  if (user.role === "PARENT") {
    const repo = new ParentGradesRepository(adminDb, schoolId);
    const grades = await repo.getChildrenGrades(user.childrenIds || [], req.query.academicYear as string);
    return res.json({ success: true, items: grades, totalCount: grades.length });
  }
  if (user.role === "ADMIN") {
    const repo = new AdminGradesRepository(adminDb, schoolId);
    const grades = await repo.getAllGrades(req.query as any);
    return res.json({ success: true, items: grades, totalCount: grades.length });
  }
}

// ATTENDANCE - read
if (collection === "attendance") {
  if (user.role === "TEACHER") {
    const repo = new AttendanceRepository(adminDb, schoolId);
    let query: any = adminDb.collection("attendance").where("schoolId", "==", schoolId);
    if (req.query.classId) query = query.where("classId", "==", req.query.classId);
    if (req.query.date) query = query.where("date", "==", req.query.date);
    if (req.query.status) query = query.where("status", "==", req.query.status);
    const snap = await query.limit(500).get();
    const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ success: true, items: records, totalCount: records.length });
  }
  if (user.role === "PARENT") {
    const repo = new ParentAttendanceRepository(adminDb, schoolId);
    const records = await repo.getChildrenAttendance(user.childrenIds || [], req.query.fromDate as string, req.query.toDate as string);
    return res.json({ success: true, items: records, totalCount: records.length });
  }
}

// Continue with existing mock-based handler for other collections...
`;

/**
 * Update PATCH /api/data/:collection/:id handler
 * 
 * Find line ~4560 in server.ts:
 *   app.patch("/api/data/:collection/:id", ...)
 * 
 * Add production repository updates:
 */

const patchDataEnhancements = `
// Add at start of handler:
const user = req.user!;
const schoolId = user.schoolId;

if (collection === "teachers" && user.role === "ADMIN") {
  const repo = new AdminTeachersRepository(adminDb, adminAuth, schoolId);
  await repo.updateTeacher({
    id: req.params.id,
    ...req.body,
    schoolId,
    updatedBy: user.uid,
  });
  const updated = await repo.getTeacher(req.params.id);
  return res.json({ success: true, item: updated });
}

if (collection === "students" && user.role === "ADMIN") {
  const repo = new AdminStudentsRepository(adminDb, schoolId);
  await repo.updateStudent({
    id: req.params.id,
    ...req.body,
    schoolId,
    updatedBy: user.uid,
  });
  const updated = await repo.getStudent(req.params.id);
  return res.json({ success: true, item: updated });
}

if (collection === "classes" && user.role === "ADMIN") {
  const repo = new AdminClassesRepository(adminDb, schoolId);
  await repo.updateClass({
    id: req.params.id,
    ...req.body,
    schoolId,
    updatedBy: user.uid,
  });
  const updated = await repo.getClass(req.params.id);
  return res.json({ success: true, item: updated });
}

if (collection === "grades" && user.role === "TEACHER") {
  const repo = new TeacherGradesRepository(adminDb, schoolId);
  await repo.updateGrade({
    id: req.params.id,
    ...req.body,
    schoolId,
    updatedBy: user.uid,
  });
  const updated = await repo.getGrade(req.params.id);
  return res.json({ success: true, item: updated });
}

if (collection === "attendance" && user.role === "TEACHER") {
  const repo = new AttendanceRepository(adminDb, schoolId);
  await repo.updateAttendance(req.params.id, req.body.status, user.uid, req.body.notes);
  const updated = await adminDb.collection("attendance").doc(req.params.id).get();
  return res.json({ success: true, item: { id: updated.id, ...updated.data() } });
}

// Continue with existing logic...
`;

/**
 * Update DELETE /api/data/:collection/:id handler
 * 
 * Add at start:
 */

const deleteDataEnhancements = `
const user = req.user!;
const schoolId = user.schoolId;

if (collection === "teachers" && user.role === "ADMIN") {
  const repo = new AdminTeachersRepository(adminDb, adminAuth, schoolId);
  await repo.archiveTeacher(req.params.id, schoolId, user.uid);
  return res.json({ success: true, message: "Teacher archived" });
}

if (collection === "students" && user.role === "ADMIN") {
  const repo = new AdminStudentsRepository(adminDb, schoolId);
  await repo.archiveStudent(req.params.id, schoolId, user.uid);
  return res.json({ success: true, message: "Student archived" });
}

if (collection === "classes" && user.role === "ADMIN") {
  const repo = new AdminClassesRepository(adminDb, schoolId);
  await repo.archiveClass(req.params.id, schoolId, user.uid);
  return res.json({ success: true, message: "Class archived" });
}

if (collection === "attendance" && user.role === "TEACHER") {
  await adminDb.collection("attendance").doc(req.params.id).update({
    status: "ARCHIVED",
    archivedAt: new Date().toISOString(),
    archivedBy: user.uid,
  });
  return res.json({ success: true, message: "Attendance archived" });
}

// Continue with existing logic...
`;
