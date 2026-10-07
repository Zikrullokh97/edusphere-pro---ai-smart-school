/**
 * Production API Integration Layer
 * Maps existing /api/data endpoints to Production Repositories
 * 
 * Replaces mock data with real Firestore CRUD
 * All writes go through production repositories + transactions
 * All reads validate schoolId + role-based access
 */

import { Request, Response } from "express";
import { AdminTeachersRepository } from "./adminTeachersRepository.js";
import { AdminStudentsRepository } from "./adminStudentsRepository.js";
import { AdminClassesRepository } from "./adminClassesRepository.js";
import { TeacherGradesRepository, ParentGradesRepository, AdminGradesRepository } from "./gradesRepository.js";
import { AttendanceRepository, ParentAttendanceRepository, AdminAttendanceRepository } from "./attendanceRepository.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: "ADMIN" | "TEACHER" | "PARENT_STUDENT";
    schoolId: string;
    teacherId?: string;
    studentId?: string;
    parentId?: string;
    childrenIds?: string[];
    assignedClasses?: string[];
  };
}

/**
 * Integration handler — routes collection to appropriate repository
 * CRITICAL: Never trust client-supplied schoolId/studentId/teacherId
 * Always derive from authenticated user context
 */
export async function handleDataOperation(
  method: "POST" | "GET" | "PATCH" | "DELETE",
  collection: string,
  req: AuthenticatedRequest,
  res: Response,
  adminDb: any,
  adminAuth: any
) {
  const user = req.user!;

  try {
    // ============ TEACHERS COLLECTION ============
    if (collection === "teachers") {
      if (user.role !== "ADMIN") {
        return res.status(403).json({ error: "Only admins can manage teachers" });
      }

      const teachersRepo = new AdminTeachersRepository(adminDb, adminAuth, user.schoolId);

      if (method === "POST") {
        const result = await teachersRepo.createTeacher({
          ...req.body,
          schoolId: user.schoolId, // Override client value
          createdBy: user.uid,
        });
        return res.status(201).json({ success: true, data: result });
      }

      if (method === "GET") {
        if (req.params.id) {
          const teacher = await teachersRepo.getTeacher(req.params.id);
          if (!teacher) return res.status(404).json({ error: "Teacher not found" });
          return res.json({ success: true, item: teacher });
        }
        const teachers = await teachersRepo.listTeachers(req.query as any);
        return res.json({ success: true, items: teachers, totalCount: teachers.length });
      }

      if (method === "PATCH") {
        await teachersRepo.updateTeacher({
          id: req.params.id,
          ...req.body,
          schoolId: user.schoolId,
          updatedBy: user.uid,
        });
        const updated = await teachersRepo.getTeacher(req.params.id);
        return res.json({ success: true, item: updated });
      }

      if (method === "DELETE") {
        await teachersRepo.archiveTeacher(req.params.id, user.schoolId, user.uid);
        return res.json({ success: true, message: "Teacher archived" });
      }
    }

    // ============ STUDENTS COLLECTION ============
    if (collection === "students") {
      if (user.role !== "ADMIN") {
        return res.status(403).json({ error: "Only admins can manage students" });
      }

      const studentsRepo = new AdminStudentsRepository(adminDb, user.schoolId);

      if (method === "POST") {
        const result = await studentsRepo.createStudent({
          ...req.body,
          schoolId: user.schoolId,
          createdBy: user.uid,
        });
        return res.status(201).json({ success: true, data: result });
      }

      if (method === "GET") {
        if (req.params.id) {
          const student = await studentsRepo.getStudent(req.params.id);
          if (!student) return res.status(404).json({ error: "Student not found" });
          return res.json({ success: true, item: student });
        }
        const students = await studentsRepo.listStudents(req.query as any);
        return res.json({ success: true, items: students, totalCount: students.length });
      }

      if (method === "PATCH") {
        await studentsRepo.updateStudent({
          id: req.params.id,
          ...req.body,
          schoolId: user.schoolId,
          updatedBy: user.uid,
        });
        const updated = await studentsRepo.getStudent(req.params.id);
        return res.json({ success: true, item: updated });
      }

      if (method === "DELETE") {
        await studentsRepo.archiveStudent(req.params.id, user.schoolId, user.uid);
        return res.json({ success: true, message: "Student archived" });
      }
    }

    // ============ CLASSES COLLECTION ============
    if (collection === "classes") {
      if (user.role !== "ADMIN") {
        return res.status(403).json({ error: "Only admins can manage classes" });
      }

      const classesRepo = new AdminClassesRepository(adminDb, user.schoolId);

      if (method === "POST") {
        const result = await classesRepo.createClass({
          ...req.body,
          schoolId: user.schoolId,
          createdBy: user.uid,
        });
        return res.status(201).json({ success: true, data: result });
      }

      if (method === "GET") {
        if (req.params.id) {
          const cls = await classesRepo.getClass(req.params.id);
          if (!cls) return res.status(404).json({ error: "Class not found" });
          return res.json({ success: true, item: cls });
        }
        const classes = await classesRepo.listClasses(req.query as any);
        return res.json({ success: true, items: classes, totalCount: classes.length });
      }

      if (method === "PATCH") {
        await classesRepo.updateClass({
          id: req.params.id,
          ...req.body,
          schoolId: user.schoolId,
          updatedBy: user.uid,
        });
        const updated = await classesRepo.getClass(req.params.id);
        return res.json({ success: true, item: updated });
      }

      if (method === "DELETE") {
        await classesRepo.archiveClass(req.params.id, user.schoolId, user.uid);
        return res.json({ success: true, message: "Class archived" });
      }
    }

    // ============ GRADES COLLECTION ============
    if (collection === "grades") {
      if (user.role === "TEACHER") {
        const gradesRepo = new TeacherGradesRepository(adminDb, user.schoolId);

        if (method === "POST") {
          const result = await gradesRepo.createGrade({
            ...req.body,
            schoolId: user.schoolId,
            teacherId: user.uid,
          });
          return res.status(201).json({ success: true, data: result });
        }

        if (method === "GET") {
          if (req.params.id) {
            const grade = await gradesRepo.getGrade(req.params.id);
            if (!grade) return res.status(404).json({ error: "Grade not found" });
            return res.json({ success: true, item: grade });
          }
          const grades = await gradesRepo.getGradesByClass(
            user.uid,
            req.query.classId as string,
            req.query.subject as string,
            req.query.academicYear as string
          );
          return res.json({ success: true, items: grades, totalCount: grades.length });
        }

        if (method === "PATCH") {
          await gradesRepo.updateGrade({
            id: req.params.id,
            ...req.body,
            schoolId: user.schoolId,
            updatedBy: user.uid,
          });
          const updated = await gradesRepo.getGrade(req.params.id);
          return res.json({ success: true, item: updated });
        }
      }

      if (user.role === "PARENT_STUDENT") {
        const gradesRepo = new ParentGradesRepository(adminDb, user.schoolId);

        if (method === "GET") {
          const grades = await gradesRepo.getChildrenGrades(
            user.childrenIds || [],
            req.query.academicYear as string
          );
          return res.json({ success: true, items: grades, totalCount: grades.length });
        }
      }

      if (user.role === "ADMIN") {
        const gradesRepo = new AdminGradesRepository(adminDb, user.schoolId);

        if (method === "GET") {
          const grades = await gradesRepo.getAllGrades(req.query as any);
          return res.json({ success: true, items: grades, totalCount: grades.length });
        }
      }
    }

    // ============ ATTENDANCE COLLECTION ============
    if (collection === "attendance") {
      if (user.role === "TEACHER") {
        const attRepo = new AttendanceRepository(adminDb, user.schoolId);

        if (method === "POST") {
          const lessonId = req.body.lessonId || req.body.lessonSessionId;
          if (typeof lessonId !== "string" || !lessonId.trim()) {
            return res.status(400).json({ error: "lessonId (lesson session ID) is required for new attendance writes" });
          }
          const result = await attRepo.markAttendance({
            ...req.body,
            schoolId: user.schoolId,
            teacherId: user.uid,
            lessonId: lessonId.trim(),
          });
          return res.status(201).json({ success: true, data: result });
        }

        if (method === "GET") {
          if (req.params.id) {
            // Single record
            const att = await adminDb.collection("attendance").doc(req.params.id).get();
            if (!att.exists) return res.status(404).json({ error: "Attendance not found" });
            const data = att.data();
            if (data.schoolId !== user.schoolId) return res.status(403).json({ error: "Access denied" });
            return res.json({ success: true, item: { id: att.id, ...data } });
          }

          // List by class/student/date
          let query: any = adminDb.collection("attendance").where("schoolId", "==", user.schoolId);

          if (req.query.classId) query = query.where("classId", "==", req.query.classId);
          if (req.query.className) query = query.where("className", "==", req.query.className);
          if (req.query.studentId) query = query.where("studentId", "==", req.query.studentId);
          if (req.query.date) query = query.where("date", "==", req.query.date);
          if (req.query.lessonId) query = query.where("lessonId", "==", req.query.lessonId);
          if (req.query.status) query = query.where("status", "==", req.query.status);

          const snap = await query.limit(500).get();
          const records = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          return res.json({ success: true, items: records, totalCount: records.length });
        }

        if (method === "PATCH") {
          await attRepo.updateAttendance(req.params.id, req.body.status, user.uid, req.body.notes);
          const updated = await adminDb.collection("attendance").doc(req.params.id).get();
          return res.json({ success: true, item: { id: updated.id, ...updated.data() } });
        }

        if (method === "DELETE") {
          const ref = adminDb.collection("attendance").doc(req.params.id);
          const existing = await ref.get();
          if (!existing.exists) return res.status(404).json({ error: "Attendance not found" });
          const data = existing.data() || {};
          if (data.schoolId !== user.schoolId) return res.status(403).json({ error: "Access denied" });
          if (!user.assignedClasses?.includes(data.className)) return res.status(403).json({ error: "Teacher is not assigned to this class" });
          await ref.update({
            isDeleted: true,
            archivedAt: new Date().toISOString(),
            archivedBy: user.uid,
            updatedAt: new Date().toISOString(),
          });
          return res.json({ success: true, message: "Attendance archived" });
        }
      }

      if (user.role === "PARENT_STUDENT") {
        const attRepo = new ParentAttendanceRepository(adminDb, user.schoolId);

        if (method === "GET") {
          const records = await attRepo.getChildrenAttendance(
            user.childrenIds || [],
            req.query.fromDate as string,
            req.query.toDate as string
          );
          return res.json({ success: true, items: records, totalCount: records.length });
        }
      }

      if (user.role === "ADMIN") {
        const attRepo = new AdminAttendanceRepository(adminDb, user.schoolId);

        if (method === "GET") {
          const report = await attRepo.getSchoolDailyReport(req.query.date as string);
          return res.json({ success: true, stats: report });
        }
      }
    }

    // ============ FALLBACK ============
    return res.status(400).json({ error: `Collection '${collection}' not supported yet` });
  } catch (error: any) {
    console.error(`${method} /${collection} error:`, error);

    if (error.message.includes("duplicate") || error.message.includes("mavjud")) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message.includes("topilmadi") || error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes("403") || error.message.includes("denied")) {
      return res.status(403).json({ error: error.message });
    }

    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
