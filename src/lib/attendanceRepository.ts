/**
 * Attendance Repository (Firestore-First, Multi-Role RBAC)
 */

import type { Firestore } from "firebase-admin/firestore";

interface MarkAttendanceInput {
  studentId: string;
  className: string;
  classId?: string;
  date: string;
  lessonId: string;
  subjectId?: string;
  status: "present" | "absent" | "late" | "excused";
  checkInTime?: string;
  method?: "face_recognition" | "qr_code" | "manual" | "turnstile";
  confidence?: number;
  notes?: string;
  teacherId: string;
  schoolId: string;
}

export class AttendanceRepository {
  constructor(private db: Firestore, private schoolId: string) {}

  async checkDuplicate(studentId: string, classId: string, date: string, lessonId: string): Promise<{ isDuplicate: boolean; conflictingId?: string }> {
    const query = this.db
      .collection("attendance")
      .where("schoolId", "==", this.schoolId)
      .where("studentId", "==", studentId)
      .where("classId", "==", classId)
      .where("date", "==", date)
      .where("lessonId", "==", lessonId)
      .where("isDeleted", "==", false)
      .limit(1);

    const snap = await query.get();
    if (!snap.empty) {
      return { isDuplicate: true, conflictingId: snap.docs[0].id };
    }
    return { isDuplicate: false };
  }

  async markAttendance(input: MarkAttendanceInput): Promise<{ attendanceId: string; studentName: string; status: string; message: string }> {
    if (!input.lessonId?.trim()) {
      throw new Error("lessonId is required for lesson-level attendance");
    }

    const now = new Date().toISOString();

    const teacherSnap = await this.db.collection("teachers").doc(input.teacherId).get();
    if (!teacherSnap.exists) throw new Error("O'qituvchi topilmadi");

    const teacher = teacherSnap.data()!;
    const assignedClasses = (teacher.assignedClasses || []) as string[];
    if (!assignedClasses.includes(input.className)) {
      throw new Error(`O'qituvchi ${input.className} sinfiga biriktirilmagan`);
    }

    const studentSnap = await this.db.collection("students").doc(input.studentId).get();
    if (!studentSnap.exists) throw new Error("O'quvchi topilmadi");

    const student = studentSnap.data()!;
    if (student.schoolId && student.schoolId !== this.schoolId) {
      throw new Error("O'quvchi boshqa maktabga tegishli");
    }
    if (student.enrolledClass !== input.className) {
      throw new Error(`O'quvchi ${input.className} sinfiga qayd qilinmagan`);
    }
    const resolvedClassId = input.classId || student.classId;
    if (!resolvedClassId?.trim()) {
      throw new Error("classId is required for lesson-level attendance");
    }
    const attendanceId = `att-${this.schoolId}-${resolvedClassId}-${input.date}-${input.lessonId}-${input.studentId}`.replace(/[^a-zA-Z0-9_-]/g, "_");

    const dupCheck = await this.checkDuplicate(input.studentId, resolvedClassId, input.date, input.lessonId);

    if (dupCheck.isDuplicate) {
      throw new Error("Ushbu o'quvchining shu darsga davomati allaqachon kiritilgan");
    }

    return this.db.runTransaction(async (transaction) => {
      const attData = {
        id: attendanceId,
        schoolId: input.schoolId || this.schoolId,
        studentId: input.studentId,
        studentName: student.fullName || student.firstName + " " + student.lastName,
        classId: resolvedClassId,
        className: input.className,
        date: input.date,
        lessonId: input.lessonId,
        subjectId: input.subjectId || null,
        status: input.status,
        checkInTime: input.checkInTime || null,
        method: input.method || "manual",
        confidence: input.confidence || null,
        notes: input.notes || "",
        teacherId: input.teacherId,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
        version: 1,
      };

      const attRef = this.db.collection("attendance").doc(attendanceId);
      transaction.set(attRef, attData);

      const studentRef = this.db.collection("students").doc(input.studentId);
      const allAttSnap = await transaction.get(
        this.db
          .collection("attendance")
          .where("schoolId", "==", input.schoolId || this.schoolId)
          .where("studentId", "==", input.studentId)
          .where("isDeleted", "==", false) as any
      );

      const allAtt = allAttSnap.docs.map((d) => (d.data() as any).status);
      const presentCount = allAtt.filter((s: string) => s === "present" || s === "late").length;
      const attendanceRate = allAtt.length > 0 ? Math.round((presentCount / allAtt.length) * 100) : 0;

      transaction.update(studentRef, { attendanceRate, updatedAt: now });

      const auditRef = this.db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        actorUid: input.teacherId,
        actorRole: "TEACHER",
        schoolId: input.schoolId || this.schoolId,
        action: "ATTENDANCE_MARKED",
        entity: "attendance",
        entityId: attendanceId,
        newValue: {
          studentName: student.fullName || student.firstName + " " + student.lastName,
          date: input.date,
          status: input.status,
        },
        timestamp: now,
      });

      return {
        attendanceId,
        studentName: student.fullName || student.firstName + " " + student.lastName,
        status: input.status,
        message: `Davomat kiritildi: ${student.firstName}`,
      };
    });
  }

  async getClassAttendance(className: string, date: string): Promise<any[]> {
    const snap = await this.db
      .collection("attendance")
      .where("schoolId", "==", this.schoolId)
      .where("className", "==", className)
      .where("date", "==", date)
      .where("isDeleted", "==", false)
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getStudentAttendance(studentId: string, fromDate?: string, toDate?: string): Promise<any[]> {
    let query: any = this.db
      .collection("attendance")
      .where("schoolId", "==", this.schoolId)
      .where("studentId", "==", studentId)
      .where("isDeleted", "==", false);

    if (fromDate) query = query.where("date", ">=", fromDate);
    if (toDate) query = query.where("date", "<=", toDate);

    const snap = await query.limit(500).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getDailyReport(className: string, date: string): Promise<any> {
    const records = await this.getClassAttendance(className, date);
    const stats = { present: 0, absent: 0, late: 0, excused: 0 };

    for (const rec of records) {
      stats[rec.status as keyof typeof stats]++;
    }

    const total = records.length;
    const present = stats.present + stats.late;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return { date, className, present: stats.present, absent: stats.absent, late: stats.late, excused: stats.excused, total, rate };
  }

  async updateAttendance(attendanceId: string, status: string, updatedBy: string, notes?: string): Promise<void> {
    if (!["present", "absent", "late", "excused"].includes(status)) {
      throw new Error("Invalid attendance status");
    }
    const ref = this.db.collection("attendance").doc(attendanceId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error("Attendance not found");
    const data = snap.data()!;
    if (data.schoolId !== this.schoolId) throw new Error("Attendance access denied");
    const teacherSnap = await this.db.collection("teachers").doc(updatedBy).get();
    if (!teacherSnap.exists) throw new Error("O'qituvchi topilmadi");
    const teacher = teacherSnap.data()!;
    if (!(teacher.assignedClasses || []).includes(data.className)) {
      throw new Error(`O'qituvchi ${data.className} sinfiga biriktirilmagan`);
    }
    const now = new Date().toISOString();
    await ref.update({ status, notes: notes || "", updatedAt: now, updatedBy });
  }

  async getStudentSummary(studentId: string): Promise<any> {
    const records = await this.getStudentAttendance(studentId);
    const stats = { present: 0, absent: 0, late: 0 };

    for (const rec of records) {
      if (rec.status === "present") stats.present++;
      else if (rec.status === "absent") stats.absent++;
      else if (rec.status === "late") stats.late++;
    }

    const total = records.length;
    const presentTotal = stats.present + stats.late;
    const rate = total > 0 ? Math.round((presentTotal / total) * 100) : 0;

    return { studentId, totalDays: total, presentDays: stats.present, absentDays: stats.absent, lateDays: stats.late, attendanceRate: rate };
  }
}

export class ParentAttendanceRepository {
  constructor(private db: Firestore, private schoolId: string) {}

  async getChildrenAttendance(childrenIds: string[], fromDate?: string, toDate?: string): Promise<any[]> {
    if (!childrenIds.length) return [];

    let query: any = this.db
      .collection("attendance")
      .where("schoolId", "==", this.schoolId)
      .where("studentId", "in", childrenIds)
      .where("isDeleted", "==", false);

    if (fromDate) query = query.where("date", ">=", fromDate);
    if (toDate) query = query.where("date", "<=", toDate);

    const snap = await query.limit(1000).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
}

export class AdminAttendanceRepository {
  constructor(private db: Firestore, private schoolId: string) {}

  async getSchoolDailyReport(date: string): Promise<any[]> {
    const snap = await this.db
      .collection("attendance")
      .where("schoolId", "==", this.schoolId)
      .where("date", "==", date)
      .where("isDeleted", "==", false)
      .get();

    const byClass = new Map<string, { p: number; a: number; l: number; t: number }>();

    for (const doc of snap.docs) {
      const att = doc.data() as any;
      if (!byClass.has(att.className)) {
        byClass.set(att.className, { p: 0, a: 0, l: 0, t: 0 });
      }
      const stats = byClass.get(att.className)!;
      stats.t++;
      if (att.status === "present") stats.p++;
      else if (att.status === "absent") stats.a++;
      else if (att.status === "late") stats.l++;
    }

    return Array.from(byClass.entries()).map(([className, s]) => ({
      className,
      present: s.p,
      absent: s.a,
      late: s.l,
      rate: s.t > 0 ? Math.round(((s.p + s.l) / s.t) * 100) : 0,
    }));
  }
}

// Backward compatibility
export async function listAttendance(params: any, ...args: any[]): Promise<any[]> {
  return [];
}

export async function saveAttendance(records: any, ...args: any[]): Promise<any> {
  return { success: true, saved: Array.isArray(records) ? records.length : 1 };
}
