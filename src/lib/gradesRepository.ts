/**
 * Grades Repository (Firestore-First, Multi-Role RBAC)
 * 
 * Production flow:
 * - TEACHER: POST /api/grades (create) → Teacher owns class + subject
 * - TEACHER: GET /api/grades/class/:classId (list) → own assigned classes only
 * - TEACHER: PATCH /api/grades/:id (update) → own grade only
 * - PARENT: GET /api/grades/my-children (read-only) → own children only
 * - ADMIN: GET /api/grades (read-only) → school scope
 * 
 * Relationships (validation & aggregation):
 * - Grade: student + subject + class + academicYear + period (unique composite)
 * - Teacher must be assigned to class + subject
 * - Parent can only view own children's grades
 * - Admin scoped by schoolId
 */

import type { Firestore } from "firebase-admin/firestore";

interface CreateGradeInput {
  studentId: string;
  className: string; // e.g., "7-A"
  classId?: string; // Firestore class doc ID
  subject: string; // Subject ID or name
  subjectId?: string;
  score: number; // 0-100
  gradeType: "assignment" | "quiz" | "midterm" | "final" | "project" | "homework";
  period?: string; // "1-chorak", "2-chorak", "annual"
  academicYear: string; // "2025-2026"
  maxScore?: number; // Default 100
  notes?: string;
  teacheId: string; // Teacher UID
  schoolId: string;
}

interface UpdateGradeInput {
  id: string;
  score?: number;
  gradeType?: string;
  notes?: string;
  updatedBy: string; // Teacher UID
  schoolId: string;
}

interface GradeAggregation {
  studentId: string;
  subject: string;
  className: string;
  academicYear: string;
  totalScores: number[];
  average: number;
  letterGrade: string;
  gradeCount: number;
  lastUpdated: string;
}

/**
 * Calculate letter grade (US-style: A, B, C, D, F)
 */
function calculateLetterGrade(average: number): string {
  if (average >= 90) return "A";
  if (average >= 80) return "B";
  if (average >= 70) return "C";
  if (average >= 60) return "D";
  return "F";
}

export class TeacherGradesRepository {
  constructor(
    private db: Firestore,
    private schoolId: string
  ) {}

  /**
   * Check for duplicate grade:
   * - Same student + subject + class + academicYear + period
   * - Return: { isDuplicate: boolean, conflictingId?: string }
   */
  async checkDuplicate(
    studentId: string,
    subject: string,
    className: string,
    academicYear: string,
    period: string = "annual"
  ): Promise<{ isDuplicate: boolean; conflictingId?: string }> {
    const query = this.db
      .collection("grades")
      .where("schoolId", "==", this.schoolId)
      .where("studentId", "==", studentId)
      .where("subject", "==", subject)
      .where("className", "==", className)
      .where("academicYear", "==", academicYear)
      .where("period", "==", period)
      .where("gradeType", "==", "final"); // Only one final grade per period

    const snap = await query.limit(1).get();

    if (!snap.empty) {
      return {
        isDuplicate: true,
        conflictingId: snap.docs[0].id,
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Validate teacher can create grade for this class + subject
   */
  async validateTeacherAccess(
    teacherId: string,
    className: string,
    subjectId: string
  ): Promise<{ authorized: boolean; reason?: string }> {
    const teacherSnap = await this.db.collection("teachers").doc(teacherId).get();
    if (!teacherSnap.exists) {
      return { authorized: false, reason: "O'qituvchi topilmadi" };
    }

    const teacher = teacherSnap.data()!;

    // Check if teacher is assigned to this class
    const assignedClasses = (teacher.assignedClasses || []) as string[];
    if (!assignedClasses.includes(className)) {
      return { authorized: false, reason: `O'qituvchi ${className} sinfiga biriktirilmagan` };
    }

    // Check if teacher teaches this subject
    const subjects = (teacher.subjectSpecialties || teacher.subjects || []) as string[];
    if (!subjects.includes(subjectId) && !subjects.some((s) => s.toLowerCase().includes(subjectId.toLowerCase()))) {
      return { authorized: false, reason: `O'qituvchi ${subjectId} fanini o'qitmaydi` };
    }

    return { authorized: true };
  }

  /**
   * Create grade (Firestore transaction)
   */
  async createGrade(input: CreateGradeInput): Promise<{
    gradeId: string;
    studentName: string;
    score: number;
    message: string;
  }> {
    const now = new Date().toISOString();
    const gradeId = `grd-${Date.now()}`;
    const period = input.period || "annual";

    // Validate teacher access
    const accessCheck = await this.validateTeacherAccess(input.teacheId, input.className, input.subjectId || input.subject);
    if (!accessCheck.authorized) {
      throw new Error(accessCheck.reason);
    }

    // Check for duplicates (final grades only)
    if (input.gradeType === "final") {
      const dupCheck = await this.checkDuplicate(
        input.studentId,
        input.subject,
        input.className,
        input.academicYear,
        period
      );
      if (dupCheck.isDuplicate) {
        throw new Error(
          `Ushbu o'quvchi uchun ${period} davomida ${input.subject} uchun oxirgi baho allaqachon kiritilgan`
        );
      }
    }

    // Validate student exists
    const studentSnap = await this.db.collection("students").doc(input.studentId).get();
    if (!studentSnap.exists) {
      throw new Error("O'quvchi topilmadi");
    }

    const student = studentSnap.data()!;
    const maxScore = input.maxScore || 100;
    const percentage = Math.round((input.score / maxScore) * 100);

    return this.db.runTransaction(async (transaction) => {
      // 1. Create Grade
      const gradeData = {
        id: gradeId,
        schoolId: input.schoolId || this.schoolId,
        studentId: input.studentId,
        studentName: student.fullName || student.firstName + " " + student.lastName,
        className: input.className,
        classId: input.classId || null,
        subject: input.subject,
        subjectId: input.subjectId || null,
        score: input.score,
        maxScore,
        percentage,
        gradeType: input.gradeType,
        letterGrade: calculateLetterGrade(percentage),
        period,
        academicYear: input.academicYear,
        notes: input.notes || "",
        teacherId: input.teacheId,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };

      const gradeRef = this.db.collection("grades").doc(gradeId);
      transaction.set(gradeRef, gradeData);

      // 2. Update student aggregated stats
      const studentRef = this.db.collection("students").doc(input.studentId);
      const studentCurrent = studentSnap.data()!;

      // Recalculate average for this subject
      const subjectGradesQuery = this.db
        .collection("grades")
        .where("schoolId", "==", input.schoolId || this.schoolId)
        .where("studentId", "==", input.studentId)
        .where("subject", "==", input.subject)
        .where("className", "==", input.className)
        .where("academicYear", "==", input.academicYear);

      const allGradesSnap = await transaction.get(subjectGradesQuery as any);
      const allScores = allGradesSnap.docs.map((doc) => (doc.data() as any).percentage);
      allScores.push(percentage);

      const newAverage = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
      transaction.update(studentRef, {
        avgGrade: newAverage,
        updatedAt: now,
      });

      // 3. Audit Log
      const auditRef = this.db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        actorUid: input.teacheId,
        actorRole: "TEACHER",
        schoolId: input.schoolId || this.schoolId,
        action: "GRADE_CREATED",
        entity: "grades",
        entityId: gradeId,
        newValue: {
          studentName: student.fullName || student.firstName + " " + student.lastName,
          subject: input.subject,
          score: input.score,
          percentage,
          className: input.className,
        },
        timestamp: now,
      });

      return {
        gradeId,
        studentName: student.fullName || student.firstName + " " + student.lastName,
        score: input.score,
        message: `Baho muvaffaqiyatli kiritildi: ${student.firstName} (${percentage}%)`,
      };
    });
  }

  /**
   * Get grades for teacher's assigned classes
   */
  async getGradesByClass(
    teacherId: string,
    classId: string,
    subject?: string,
    academicYear?: string
  ): Promise<any[]> {
    let query: any = this.db
      .collection("grades")
      .where("schoolId", "==", this.schoolId)
      .where("classId", "==", classId);

    if (subject) {
      query = query.where("subject", "==", subject);
    }

    if (academicYear) {
      query = query.where("academicYear", "==", academicYear);
    }

    const snap = await query.limit(500).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Get student's grades (all subjects + classes)
   */
  async getStudentGrades(studentId: string, academicYear?: string): Promise<any[]> {
    let query: any = this.db.collection("grades").where("schoolId", "==", this.schoolId).where("studentId", "==", studentId);

    if (academicYear) {
      query = query.where("academicYear", "==", academicYear);
    }

    const snap = await query.limit(500).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Get grade by ID
   */
  async getGrade(gradeId: string): Promise<any | null> {
    const snap = await this.db.collection("grades").doc(gradeId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }

  /**
   * Update grade (score, notes, gradeType)
   */
  async updateGrade(input: UpdateGradeInput): Promise<void> {
    const now = new Date().toISOString();

    return this.db.runTransaction(async (transaction) => {
      const gradeRef = this.db.collection("grades").doc(input.id);
      const gradeSnap = await transaction.get(gradeRef);

      if (!gradeSnap.exists) {
        throw new Error("Baho topilmadi");
      }

      const grade = gradeSnap.data()!;

      // Teacher can only update own grades
      if (grade.teacherId !== input.updatedBy && grade.schoolId === input.schoolId) {
        throw new Error("Siz faqat o'z baholaringizni tahrirlay olasiz");
      }

      const updates: any = {
        updatedAt: now,
        version: (grade.version || 0) + 1,
      };

      if (input.score !== undefined) {
        const maxScore = grade.maxScore || 100;
        const percentage = Math.round((input.score / maxScore) * 100);
        updates.score = input.score;
        updates.percentage = percentage;
        updates.letterGrade = calculateLetterGrade(percentage);
      }

      if (input.gradeType !== undefined) {
        updates.gradeType = input.gradeType;
      }

      if (input.notes !== undefined) {
        updates.notes = input.notes;
      }

      transaction.update(gradeRef, updates);

      // Recalculate student average (if score changed)
      if (input.score !== undefined) {
        const studentRef = this.db.collection("students").doc(grade.studentId);
        const allGradesSnap = await transaction.get(
          this.db
            .collection("grades")
            .where("schoolId", "==", input.schoolId)
            .where("studentId", "==", grade.studentId)
            .where("subject", "==", grade.subject)
            .where("className", "==", grade.className)
            .where("academicYear", "==", grade.academicYear) as any
        );

        const scores = allGradesSnap.docs.map((doc) => (doc.data() as any).percentage);
        const newAverage = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        transaction.update(studentRef, {
          avgGrade: newAverage,
          updatedAt: now,
        });
      }

      // Audit Log
      const auditRef = this.db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        actorUid: input.updatedBy,
        actorRole: "TEACHER",
        schoolId: input.schoolId,
        action: "GRADE_UPDATED",
        entity: "grades",
        entityId: input.id,
        oldValue: { score: grade.score, percentage: grade.percentage },
        newValue: updates,
        timestamp: now,
      });
    });
  }

  /**
   * Get class-wide aggregation (average, distribution, statistics)
   */
  async getClassAggregation(
    className: string,
    subject: string,
    academicYear: string
  ): Promise<{
    className: string;
    subject: string;
    classAverage: number;
    distribution: Record<string, number>;
    studentScores: Array<{ studentName: string; average: number; letterGrade: string }>;
  }> {
    const snap = await this.db
      .collection("grades")
      .where("schoolId", "==", this.schoolId)
      .where("className", "==", className)
      .where("subject", "==", subject)
      .where("academicYear", "==", academicYear)
      .get();

    const grades = snap.docs.map((doc) => doc.data()) as any[];

    // Group by student
    const studentMap = new Map<string, number[]>();
    for (const grade of grades) {
      if (!studentMap.has(grade.studentId)) {
        studentMap.set(grade.studentId, []);
      }
      studentMap.get(grade.studentId)!.push((grade as any).percentage);
    }

    // Calculate per-student averages
    const studentScores: Array<{ studentName: string; average: number; letterGrade: string }> = [];
    let totalScore = 0;
    for (const [studentId, scores] of studentMap.entries()) {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const student = grades.find((g) => g.studentId === studentId);
      studentScores.push({
        studentName: student?.studentName || studentId,
        average: avg,
        letterGrade: calculateLetterGrade(avg),
      });
      totalScore += avg;
    }

    const classAverage = Math.round(totalScore / studentScores.length);

    // Grade distribution
    const distribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const score of studentScores) {
      const grade = score.letterGrade.charAt(0);
      distribution[grade]++;
    }

    return {
      className,
      subject,
      classAverage,
      distribution,
      studentScores,
    };
  }
}

/**
 * ParentGradesRepository - Read-only filtered access to own children's grades
 */
export class ParentGradesRepository {
  constructor(
    private db: Firestore,
    private schoolId: string
  ) {}

  /**
   * Get own children's grades (filtered by childrenIds)
   */
  async getChildrenGrades(childrenIds: string[], academicYear?: string): Promise<any[]> {
    if (!Array.isArray(childrenIds) || childrenIds.length === 0) {
      return [];
    }

    let query: any = this.db
      .collection("grades")
      .where("schoolId", "==", this.schoolId)
      .where("studentId", "in", childrenIds);

    if (academicYear) {
      query = query.where("academicYear", "==", academicYear);
    }

    const snap = await query.limit(1000).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Get summary per child
   */
  async getChildSummary(childId: string, academicYear?: string): Promise<{
    childId: string;
    subjects: Array<{ subject: string; average: number; gradeCount: number }>;
    overallAverage: number;
  }> {
    let query: any = this.db.collection("grades").where("schoolId", "==", this.schoolId).where("studentId", "==", childId);

    if (academicYear) {
      query = query.where("academicYear", "==", academicYear);
    }

    const snap = await query.get();
    const grades = snap.docs.map((doc) => doc.data()) as any[];

    // Group by subject
    const subjectMap = new Map<string, number[]>();
    for (const grade of grades) {
      if (!subjectMap.has(grade.subject)) {
        subjectMap.set(grade.subject, []);
      }
      subjectMap.get(grade.subject)!.push((grade as any).percentage);
    }

    const subjects: Array<{ subject: string; average: number; gradeCount: number }> = [];
    let totalScore = 0;
    let totalCount = 0;

    for (const [subject, scores] of subjectMap.entries()) {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      subjects.push({ subject, average: avg, gradeCount: scores.length });
      totalScore += avg;
      totalCount += scores.length;
    }

    const overallAverage = totalCount > 0 ? Math.round(totalScore / subjects.length) : 0;

    return {
      childId,
      subjects,
      overallAverage,
    };
  }
}

/**
 * AdminGradesRepository - School-wide read access
 */
export class AdminGradesRepository {
  constructor(
    private db: Firestore,
    private schoolId: string
  ) {}

  /**
   * Get all grades with filters
   */
  async getAllGrades(filters?: {
    className?: string;
    subject?: string;
    academicYear?: string;
  }): Promise<any[]> {
    let query: any = this.db.collection("grades").where("schoolId", "==", this.schoolId);

    if (filters?.className) {
      query = query.where("className", "==", filters.className);
    }

    if (filters?.subject) {
      query = query.where("subject", "==", filters.subject);
    }

    if (filters?.academicYear) {
      query = query.where("academicYear", "==", filters.academicYear);
    }

    const snap = await query.limit(5000).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Get school statistics
   */
  async getSchoolStatistics(academicYear: string): Promise<{
    academicYear: string;
    totalGrades: number;
    averageGrade: number;
    classAverages: Record<string, number>;
    subjectAverages: Record<string, number>;
  }> {
    const snap = await this.db
      .collection("grades")
      .where("schoolId", "==", this.schoolId)
      .where("academicYear", "==", academicYear)
      .get();

    const grades = snap.docs.map((doc) => doc.data());

    const classMap = new Map<string, number[]>();
    const subjectMap = new Map<string, number[]>();
    let totalPercentage = 0;

    const gradesTyped = grades as any[];
    for (const grade of gradesTyped) {
      totalPercentage += grade.percentage;

      if (!classMap.has(grade.className)) {
        classMap.set(grade.className, []);
      }
      classMap.get(grade.className)!.push(grade.percentage);

      if (!subjectMap.has(grade.subject)) {
        subjectMap.set(grade.subject, []);
      }
      subjectMap.get(grade.subject)!.push(grade.percentage);
    }

    const classAverages: Record<string, number> = {};
    for (const [className, scores] of classMap.entries()) {
      classAverages[className] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    const subjectAverages: Record<string, number> = {};
    for (const [subject, scores] of subjectMap.entries()) {
      subjectAverages[subject] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    const averageGrade = Math.round(totalPercentage / grades.length);

    return {
      academicYear,
      totalGrades: grades.length,
      averageGrade,
      classAverages,
      subjectAverages,
    };
  }
}
