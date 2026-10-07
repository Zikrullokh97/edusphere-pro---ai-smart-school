/**
 * Admin Students Repository (Firestore-First)
 * 
 * Production flow: Admin UI → POST /api/admin/students 
 *   → AdminStudentsRepository.createStudent()
 *   → Firestore transaction: students + classes + auditLogs
 *   → Duplicate prevention: schoolId + normalized full name + optional birthDate
 * 
 * Student ↔ Class sync: Student.enrolledClass ↔ Class.studentIds
 */

import type { Firestore } from "firebase-admin/firestore";

interface CreateStudentInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  birthDate?: string; // YYYY-MM-DD
  gender?: "M" | "F";
  bloodType?: string;
  nationality?: string;
  enrolledClass: string; // Class ID (e.g., "7-A")
  studentIdNumber?: string; // Optional school-assigned ID
  iinNumber?: string; // IIN (ID number in Kyrgyzstan/Uzbekistan)
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
  notes?: string;
  status?: "active" | "suspended" | "archived";
  schoolId: string;
  createdBy: string; // Admin UID
}

interface UpdateStudentInput {
  id: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  enrolledClass?: string; // Can change class assignment
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  address?: string;
  notes?: string;
  status?: "active" | "suspended" | "archived";
  schoolId: string;
  updatedBy: string; // Admin UID
}

/**
 * Normalize full name for duplicate detection:
 * - Trim whitespace
 * - Convert to lowercase
 * - Remove diacritics (á → a, ö → o, etc.)
 * - Remove multiple spaces
 */
function normalizeFullName(firstName: string, lastName: string): string {
  const normalize = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[áàäâ]/g, "a")
      .replace(/[éèëê]/g, "e")
      .replace(/[íìïî]/g, "i")
      .replace(/[óòöô]/g, "o")
      .replace(/[úùüû]/g, "u")
      .replace(/[ç]/g, "c")
      .replace(/\s+/g, " ")
      .trim();

  return `${normalize(firstName)} ${normalize(lastName)}`;
}

export class AdminStudentsRepository {
  constructor(
    private db: Firestore,
    private schoolId: string
  ) {}

  /**
   * Check for duplicate student:
   * - Same schoolId + normalized full name + optional birthDate
   * - Return: { isDuplicate: boolean, conflictingId?: string }
   */
  async checkDuplicate(
    firstName: string,
    lastName: string,
    birthDate?: string
  ): Promise<{ isDuplicate: boolean; conflictingId?: string }> {
    const normalized = normalizeFullName(firstName, lastName);

    let query = this.db
      .collection("students")
      .where("schoolId", "==", this.schoolId)
      .where("normalizedFullName", "==", normalized);

    if (birthDate) {
      query = query.where("birthDate", "==", birthDate) as any;
    }

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
   * Create new student (Firestore transaction)
   * 
   * Returns: { studentId, enrolledClass, message }
   */
  async createStudent(input: CreateStudentInput): Promise<{
    studentId: string;
    enrolledClass: string;
    message: string;
  }> {
    const now = new Date().toISOString();
    const studentId = `stu-${Date.now()}`;
    const fullName = input.fullName || `${input.firstName} ${input.lastName}`;
    const normalizedFullName = normalizeFullName(input.firstName, input.lastName);

    // Check for duplicates
    const dupCheck = await this.checkDuplicate(
      input.firstName,
      input.lastName,
      input.birthDate
    );
    if (dupCheck.isDuplicate) {
      throw new Error(
        `O'quvchi topilmadi: ${fullName}. Bu ism bilan o'quvchi mavjud: ID ${dupCheck.conflictingId}`
      );
    }

    // Validate class exists
    const classSnap = await this.db.collection("classes").doc(input.enrolledClass).get();
    if (!classSnap.exists) {
      throw new Error(`Sinf topilmadi: ${input.enrolledClass}`);
    }

    return this.db.runTransaction(async (transaction) => {
      // 1. Create Student record
      const studentData = {
        id: studentId,
        schoolId: input.schoolId || this.schoolId,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        middleName: input.middleName || "",
        fullName,
        normalizedFullName,
        email: (input.email || `student_${studentId}@school.local`).toLowerCase(),
        phone: input.phone || "",
        birthDate: input.birthDate || null,
        gender: input.gender || null,
        bloodType: input.bloodType || null,
        nationality: input.nationality || "Kyrgyzstan",
        enrolledClass: input.enrolledClass,
        studentIdNumber: input.studentIdNumber || null,
        iinNumber: input.iinNumber || null,
        parentName: input.parentName || "",
        parentPhone: input.parentPhone || "",
        parentEmail: input.parentEmail || "",
        guardianName: input.guardianName || "",
        guardianPhone: input.guardianPhone || "",
        address: input.address || "",
        notes: input.notes || "",
        status: input.status || "active",
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy,
        version: 1,
        attendanceRate: 0,
        avgGrade: 0,
      };

      const studentRef = this.db.collection("students").doc(studentId);
      transaction.set(studentRef, studentData);

      // 2. Link student to class (bidirectional)
      const classRef = this.db.collection("classes").doc(input.enrolledClass);
      const classData = classSnap.data()!;
      const currentStudents = (classData.studentIds || []) as string[];

      transaction.update(classRef, {
        studentIds: Array.from(new Set([...currentStudents, studentId])),
        updatedAt: now,
      });

      // 3. Audit Log
      const auditRef = this.db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        actorUid: input.createdBy,
        actorRole: "ADMIN",
        schoolId: input.schoolId || this.schoolId,
        action: "STUDENT_CREATED",
        entity: "students",
        entityId: studentId,
        newValue: {
          name: fullName,
          enrolledClass: input.enrolledClass,
          email: studentData.email,
        },
        timestamp: now,
      });

      return {
        studentId,
        enrolledClass: input.enrolledClass,
        message: `O'quvchi muvaffaqiyatli yaratildi: ${fullName}`,
      };
    });
  }

  /**
   * List students with filtering (schoolId, status, class)
   */
  async listStudents(filters?: {
    status?: string;
    enrolledClass?: string;
    searchName?: string;
  }): Promise<any[]> {
    let query: any = this.db
      .collection("students")
      .where("schoolId", "==", this.schoolId);

    if (filters?.status && filters.status !== "ALL") {
      query = query.where("status", "==", filters.status);
    }

    if (filters?.enrolledClass && filters.enrolledClass !== "ALL") {
      query = query.where("enrolledClass", "==", filters.enrolledClass);
    }

    const snap = await query.limit(1000).get();
    let students = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (filters?.searchName) {
      const q = filters.searchName.toLowerCase();
      students = students.filter((s: any) =>
        s.fullName.toLowerCase().includes(q) ||
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }

    return students;
  }

  /**
   * Get single student by ID
   */
  async getStudent(studentId: string): Promise<any | null> {
    const snap = await this.db.collection("students").doc(studentId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }

  /**
   * Update student details (class reassignment triggers relational update)
   */
  async updateStudent(input: UpdateStudentInput): Promise<void> {
    const { id, schoolId, updatedBy, ...updates } = input;
    const now = new Date().toISOString();

    return this.db.runTransaction(async (transaction) => {
      const studentRef = this.db.collection("students").doc(id);
      const studentSnap = await transaction.get(studentRef);

      if (!studentSnap.exists) {
        throw new Error("O'quvchi topilmadi");
      }

      const currentStudent = studentSnap.data()!;
      const oldClass = currentStudent.enrolledClass;
      const newClass = updates.enrolledClass;

      // 1. Update student
      const studentPatch = {
        ...updates,
        updatedAt: now,
        version: (currentStudent.version || 0) + 1,
      };

      transaction.update(studentRef, studentPatch);

      // 2. Handle class reassignment (bidirectional sync)
      if (newClass && newClass !== oldClass) {
        // Remove from old class
        if (oldClass) {
          const oldClassRef = this.db.collection("classes").doc(oldClass);
          const oldClassSnap = await transaction.get(oldClassRef);
          if (oldClassSnap.exists) {
            const oldStudentIds = (oldClassSnap.data()!.studentIds || []) as string[];
            transaction.update(oldClassRef, {
              studentIds: oldStudentIds.filter((sid) => sid !== id),
              updatedAt: now,
            });
          }
        }

        // Add to new class
        const newClassRef = this.db.collection("classes").doc(newClass);
        const newClassSnap = await transaction.get(newClassRef);
        if (newClassSnap.exists) {
          const newStudentIds = (newClassSnap.data()!.studentIds || []) as string[];
          if (!newStudentIds.includes(id)) {
            transaction.update(newClassRef, {
              studentIds: [...newStudentIds, id],
              updatedAt: now,
            });
          }
        }
      }

      // 3. Audit Log
      const auditRef = this.db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        actorUid: updatedBy,
        actorRole: "ADMIN",
        schoolId,
        action: "STUDENT_UPDATED",
        entity: "students",
        entityId: id,
        oldValue: {
          enrolledClass: oldClass,
          firstName: currentStudent.firstName,
          lastName: currentStudent.lastName,
        },
        newValue: studentPatch,
        timestamp: now,
      });
    });
  }

  /**
   * Archive student (soft delete)
   */
  async archiveStudent(studentId: string, schoolId: string, archivedBy: string): Promise<void> {
    const now = new Date().toISOString();

    return this.db.runTransaction(async (transaction) => {
      const studentRef = this.db.collection("students").doc(studentId);
      const studentSnap = await transaction.get(studentRef);

      if (!studentSnap.exists) {
        throw new Error("O'quvchi topilmadi");
      }

      const student = studentSnap.data()!;

      // 1. Soft delete
      transaction.update(studentRef, {
        status: "archived",
        archivedAt: now,
        archivedBy,
      });

      // 2. Remove from enrolled class
      if (student.enrolledClass) {
        const classRef = this.db.collection("classes").doc(student.enrolledClass);
        const classSnap = await transaction.get(classRef);
        if (classSnap.exists) {
          const studentIds = (classSnap.data()!.studentIds || []) as string[];
          transaction.update(classRef, {
            studentIds: studentIds.filter((sid) => sid !== studentId),
            updatedAt: now,
          });
        }
      }

      // 3. Audit Log
      const auditRef = this.db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        actorUid: archivedBy,
        actorRole: "ADMIN",
        schoolId,
        action: "STUDENT_ARCHIVED",
        entity: "students",
        entityId: studentId,
        oldValue: { status: student.status },
        newValue: { status: "archived" },
        timestamp: now,
      });
    });
  }

  /**
   * Bulk import students (for seeding or mass enrollment)
   * Returns: { imported: number, duplicates: number, errors: any[] }
   */
  async bulkImportStudents(
    students: CreateStudentInput[]
  ): Promise<{ imported: number; duplicates: number; errors: any[] }> {
    let imported = 0;
    let duplicates = 0;
    const errors: any[] = [];

    for (const student of students) {
      try {
        await this.createStudent(student);
        imported++;
      } catch (err: any) {
        if (err.message.includes("topilmadi")) {
          duplicates++;
        } else {
          errors.push({ student: student.firstName, error: err.message });
        }
      }
    }

    return { imported, duplicates, errors };
  }
}
