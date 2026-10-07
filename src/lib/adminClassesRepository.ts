/**
 * Admin Classes Repository (Firestore-First)
 * 
 * Production flow: Admin UI → POST /api/admin/classes 
 *   → AdminClassesRepository.createClass()
 *   → Firestore transaction: classes + teachers + auditLogs
 *   → Duplicate prevention: schoolId + academicYear + gradeLevel + section
 * 
 * Relationships (bidirectional, transaction-safe):
 * - Class ↔ Homeroom Teacher (Teacher.homeroomClass = classId)
 * - Class ↔ Students (Class.studentIds, Student.enrolledClass)
 * - Class ↔ Teachers (Class.assignedTeacherIds, Teacher.assignedClasses)
 */

import type { Firestore } from "firebase-admin/firestore";

interface CreateClassInput {
  name: string; // e.g., "7-A", "10-B"
  gradeLevel: number; // 1-11
  section: string; // "A", "B", "C", etc.
  academicYear: string; // "2025-2026"
  room?: string; // "Room 304", "Lab 1"
  capacity?: number;
  homeroomTeacherId?: string; // Teacher ID who is class homeroom teacher
  assignedTeacherIds?: string[]; // Subject teachers
  notes?: string;
  status?: "active" | "inactive" | "archived";
  schoolId: string;
  createdBy: string; // Admin UID
}

interface UpdateClassInput {
  id: string;
  name?: string;
  gradeLevel?: number;
  section?: string;
  room?: string;
  capacity?: number;
  homeroomTeacherId?: string; // Can change homeroom teacher
  assignedTeacherIds?: string[]; // Can add/remove subject teachers
  notes?: string;
  status?: "active" | "inactive" | "archived";
  schoolId: string;
  updatedBy: string; // Admin UID
}

export class AdminClassesRepository {
  constructor(
    private db: Firestore,
    private schoolId: string
  ) {}

  /**
   * Check for duplicate class:
   * - Same schoolId + academicYear + gradeLevel + section
   * - Return: { isDuplicate: boolean, conflictingId?: string }
   */
  async checkDuplicate(
    gradeLevel: number,
    section: string,
    academicYear: string
  ): Promise<{ isDuplicate: boolean; conflictingId?: string }> {
    const query = this.db
      .collection("classes")
      .where("schoolId", "==", this.schoolId)
      .where("gradeLevel", "==", gradeLevel)
      .where("section", "==", section.toUpperCase())
      .where("academicYear", "==", academicYear);

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
   * Create new class (Firestore transaction)
   * 
   * Returns: { classId, name, message }
   */
  async createClass(input: CreateClassInput): Promise<{
    classId: string;
    name: string;
    message: string;
  }> {
    const now = new Date().toISOString();
    const classId = `cls-${input.gradeLevel}-${input.section.toLowerCase()}-${Date.now()}`;
    const name = input.name || `${input.gradeLevel}-${input.section}`;
    const section = input.section.toUpperCase();

    // Check for duplicates
    const dupCheck = await this.checkDuplicate(input.gradeLevel, input.section, input.academicYear);
    if (dupCheck.isDuplicate) {
      throw new Error(`Sinf mavjud: ${name} (ID: ${dupCheck.conflictingId})`);
    }

    // Validate homeroom teacher exists (if provided)
    if (input.homeroomTeacherId) {
      const teacherSnap = await this.db
        .collection("teachers")
        .doc(input.homeroomTeacherId)
        .get();
      if (!teacherSnap.exists) {
        throw new Error(`O'qituvchi topilmadi: ${input.homeroomTeacherId}`);
      }
    }

    return this.db.runTransaction(async (transaction) => {
      // 1. Create Class
      const classData = {
        id: classId,
        schoolId: input.schoolId || this.schoolId,
        name,
        gradeLevel: input.gradeLevel,
        section,
        academicYear: input.academicYear,
        room: input.room || "",
        capacity: input.capacity || 35,
        homeroomTeacherId: input.homeroomTeacherId || null,
        homeroomTeacherName: "",
        assignedTeacherIds: Array.isArray(input.assignedTeacherIds)
          ? input.assignedTeacherIds.filter(Boolean)
          : [],
        studentIds: [],
        studentCount: 0,
        notes: input.notes || "",
        status: input.status || "active",
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy,
        version: 1,
      };

      const classRef = this.db.collection("classes").doc(classId);
      transaction.set(classRef, classData);

      // 2. Link homeroom teacher (bidirectional)
      if (input.homeroomTeacherId) {
        const teacherRef = this.db.collection("teachers").doc(input.homeroomTeacherId);
        const teacherSnap = await transaction.get(teacherRef);
        if (teacherSnap.exists) {
          const teacher = teacherSnap.data()!;
          transaction.update(teacherRef, {
            homeroomClass: classId,
            homeroomClassName: name,
            updatedAt: now,
          });

          // Update class with teacher name
          transaction.update(classRef, {
            homeroomTeacherName: teacher.name || "",
          });
        }
      }

      // 3. Link assigned teachers
      if (input.assignedTeacherIds && input.assignedTeacherIds.length > 0) {
        for (const teacherId of input.assignedTeacherIds) {
          if (!teacherId) continue;
          const teacherRef = this.db.collection("teachers").doc(teacherId);
          const teacherSnap = await transaction.get(teacherRef);
          if (teacherSnap.exists) {
            const teacher = teacherSnap.data()!;
            const currentClasses = (teacher.assignedClasses || []) as string[];
            if (!currentClasses.includes(classId)) {
              transaction.update(teacherRef, {
                assignedClasses: Array.from(new Set([...currentClasses, classId])),
                updatedAt: now,
              });
            }
          }
        }
      }

      // 4. Audit Log
      const auditRef = this.db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        actorUid: input.createdBy,
        actorRole: "ADMIN",
        schoolId: input.schoolId || this.schoolId,
        action: "CLASS_CREATED",
        entity: "classes",
        entityId: classId,
        newValue: {
          name,
          gradeLevel: input.gradeLevel,
          section,
          academicYear: input.academicYear,
          homeroomTeacherId: input.homeroomTeacherId,
        },
        timestamp: now,
      });

      return {
        classId,
        name,
        message: `Sinf muvaffaqiyatli yaratildi: ${name}`,
      };
    });
  }

  /**
   * List classes with filtering
   */
  async listClasses(filters?: {
    academicYear?: string;
    gradeLevel?: number;
    status?: string;
  }): Promise<any[]> {
    let query: any = this.db.collection("classes").where("schoolId", "==", this.schoolId);

    if (filters?.academicYear) {
      query = query.where("academicYear", "==", filters.academicYear);
    }

    if (filters?.gradeLevel) {
      query = query.where("gradeLevel", "==", filters.gradeLevel);
    }

    if (filters?.status && filters.status !== "ALL") {
      query = query.where("status", "==", filters.status);
    }

    const snap = await query.limit(500).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Get single class by ID
   */
  async getClass(classId: string): Promise<any | null> {
    const snap = await this.db.collection("classes").doc(classId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }

  /**
   * Update class details (homeroom teacher change triggers relational update)
   */
  async updateClass(input: UpdateClassInput): Promise<void> {
    const { id, schoolId, updatedBy, ...updates } = input;
    const now = new Date().toISOString();

    return this.db.runTransaction(async (transaction) => {
      const classRef = this.db.collection("classes").doc(id);
      const classSnap = await transaction.get(classRef);

      if (!classSnap.exists) {
        throw new Error("Sinf topilmadi");
      }

      const currentClass = classSnap.data()!;
      const oldHomeroomTeacherId = currentClass.homeroomTeacherId;
      const newHomeroomTeacherId = updates.homeroomTeacherId;

      // 1. Update class
      const classPatch = {
        ...updates,
        updatedAt: now,
        version: (currentClass.version || 0) + 1,
      };

      transaction.update(classRef, classPatch);

      // 2. Handle homeroom teacher change (bidirectional)
      if (newHomeroomTeacherId !== undefined && newHomeroomTeacherId !== oldHomeroomTeacherId) {
        // Unlink old homeroom teacher
        if (oldHomeroomTeacherId) {
          const oldTeacherRef = this.db.collection("teachers").doc(oldHomeroomTeacherId);
          const oldTeacherSnap = await transaction.get(oldTeacherRef);
          if (oldTeacherSnap.exists) {
            transaction.update(oldTeacherRef, {
              homeroomClass: null,
              homeroomClassName: null,
              updatedAt: now,
            });
          }
        }

        // Link new homeroom teacher
        if (newHomeroomTeacherId && newHomeroomTeacherId !== "none") {
          const newTeacherRef = this.db.collection("teachers").doc(newHomeroomTeacherId);
          const newTeacherSnap = await transaction.get(newTeacherRef);
          if (newTeacherSnap.exists) {
            const newTeacher = newTeacherSnap.data()!;
            transaction.update(newTeacherRef, {
              homeroomClass: id,
              homeroomClassName: currentClass.name,
              updatedAt: now,
            });

            // Update class with new teacher name
            transaction.update(classRef, {
              homeroomTeacherName: newTeacher.name || "",
            });
          }
        }
      }

      // 3. Handle assigned teachers change
      if (updates.assignedTeacherIds) {
        const oldTeacherIds = (currentClass.assignedTeacherIds || []) as string[];
        const newTeacherIds = updates.assignedTeacherIds as string[];

        // Remove class from old teachers
        for (const oldId of oldTeacherIds) {
          if (!newTeacherIds.includes(oldId) && oldId !== oldHomeroomTeacherId) {
            const oldTeacherRef = this.db.collection("teachers").doc(oldId);
            const oldTeacherSnap = await transaction.get(oldTeacherRef);
            if (oldTeacherSnap.exists) {
              const oldTeacher = oldTeacherSnap.data()!;
              const assignedClasses = (oldTeacher.assignedClasses || []) as string[];
              transaction.update(oldTeacherRef, {
                assignedClasses: assignedClasses.filter((cid) => cid !== id),
                updatedAt: now,
              });
            }
          }
        }

        // Add class to new teachers
        for (const newId of newTeacherIds) {
          if (!oldTeacherIds.includes(newId) && newId !== newHomeroomTeacherId) {
            const newTeacherRef = this.db.collection("teachers").doc(newId);
            const newTeacherSnap = await transaction.get(newTeacherRef);
            if (newTeacherSnap.exists) {
              const newTeacher = newTeacherSnap.data()!;
              const assignedClasses = (newTeacher.assignedClasses || []) as string[];
              if (!assignedClasses.includes(id)) {
                transaction.update(newTeacherRef, {
                  assignedClasses: [...assignedClasses, id],
                  updatedAt: now,
                });
              }
            }
          }
        }
      }

      // 4. Audit Log
      const auditRef = this.db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        actorUid: updatedBy,
        actorRole: "ADMIN",
        schoolId,
        action: "CLASS_UPDATED",
        entity: "classes",
        entityId: id,
        oldValue: {
          homeroomTeacherId: oldHomeroomTeacherId,
          assignedTeacherIds: currentClass.assignedTeacherIds,
        },
        newValue: classPatch,
        timestamp: now,
      });
    });
  }

  /**
   * Archive class (soft delete)
   * Unlinks all students and teachers (prevents orphan data)
   */
  async archiveClass(classId: string, schoolId: string, archivedBy: string): Promise<void> {
    const now = new Date().toISOString();

    return this.db.runTransaction(async (transaction) => {
      const classRef = this.db.collection("classes").doc(classId);
      const classSnap = await transaction.get(classRef);

      if (!classSnap.exists) {
        throw new Error("Sinf topilmadi");
      }

      const cls = classSnap.data()!;

      // 1. Soft delete
      transaction.update(classRef, {
        status: "archived",
        archivedAt: now,
        archivedBy,
      });

      // 2. Unlink homeroom teacher
      if (cls.homeroomTeacherId) {
        const teacherRef = this.db.collection("teachers").doc(cls.homeroomTeacherId);
        const teacherSnap = await transaction.get(teacherRef);
        if (teacherSnap.exists) {
          transaction.update(teacherRef, {
            homeroomClass: null,
            homeroomClassName: null,
            updatedAt: now,
          });
        }
      }

      // 3. Unlink assigned teachers
      if (cls.assignedTeacherIds && cls.assignedTeacherIds.length > 0) {
        for (const teacherId of cls.assignedTeacherIds) {
          const teacherRef = this.db.collection("teachers").doc(teacherId);
          const teacherSnap = await transaction.get(teacherRef);
          if (teacherSnap.exists) {
            const teacher = teacherSnap.data()!;
            const assignedClasses = (teacher.assignedClasses || []) as string[];
            transaction.update(teacherRef, {
              assignedClasses: assignedClasses.filter((cid) => cid !== classId),
              updatedAt: now,
            });
          }
        }
      }

      // 4. Unlink students (set their enrolledClass to null)
      if (cls.studentIds && cls.studentIds.length > 0) {
        for (const studentId of cls.studentIds) {
          const studentRef = this.db.collection("students").doc(studentId);
          const studentSnap = await transaction.get(studentRef);
          if (studentSnap.exists) {
            transaction.update(studentRef, {
              enrolledClass: null,
              updatedAt: now,
            });
          }
        }
      }

      // 5. Audit Log
      const auditRef = this.db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        actorUid: archivedBy,
        actorRole: "ADMIN",
        schoolId,
        action: "CLASS_ARCHIVED",
        entity: "classes",
        entityId: classId,
        oldValue: { status: cls.status },
        newValue: { status: "archived" },
        timestamp: now,
      });
    });
  }

  /**
   * Add student to class (bidirectional)
   */
  async enrollStudent(classId: string, studentId: string, updatedBy: string): Promise<void> {
    const now = new Date().toISOString();

    return this.db.runTransaction(async (transaction) => {
      const classRef = this.db.collection("classes").doc(classId);
      const studentRef = this.db.collection("students").doc(studentId);

      const classSnap = await transaction.get(classRef);
      const studentSnap = await transaction.get(studentRef);

      if (!classSnap.exists) {
        throw new Error("Sinf topilmadi");
      }
      if (!studentSnap.exists) {
        throw new Error("O'quvchi topilmadi");
      }

      const cls = classSnap.data()!;
      const student = studentSnap.data()!;

      // Unlink from old class
      if (student.enrolledClass && student.enrolledClass !== classId) {
        const oldClassRef = this.db.collection("classes").doc(student.enrolledClass);
        const oldClassSnap = await transaction.get(oldClassRef);
        if (oldClassSnap.exists) {
          const oldStudentIds = (oldClassSnap.data()!.studentIds || []) as string[];
          transaction.update(oldClassRef, {
            studentIds: oldStudentIds.filter((sid) => sid !== studentId),
            updatedAt: now,
          });
        }
      }

      // Link to new class
      const studentIds = (cls.studentIds || []) as string[];
      if (!studentIds.includes(studentId)) {
        transaction.update(classRef, {
          studentIds: [...studentIds, studentId],
          updatedAt: now,
        });
      }

      // Update student
      transaction.update(studentRef, {
        enrolledClass: classId,
        updatedAt: now,
      });

      // Audit
      const auditRef = this.db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        actorUid: updatedBy,
        actorRole: "ADMIN",
        schoolId: cls.schoolId,
        action: "STUDENT_ENROLLED",
        entity: "classes",
        entityId: classId,
        newValue: { studentId, className: cls.name },
        timestamp: now,
      });
    });
  }
}
