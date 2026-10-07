/**
 * Admin Teachers Repository (Firestore-First)
 * 
 * Production flow: Admin UI → POST /api/admin/teachers → repository.createTeacher()
 *   → Firestore transaction: teachers + users + auditLogs
 * 
 * No fallback to localDbStore for writes. Reads check Firestore first → fallback if offline.
 */

import type { Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";

interface CreateTeacherInput {
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string; // e.g., "Fan o'qituvchisi", "Sinf rahbari"
  subjects?: string[];
  subjectSpecialties?: string[];
  workloadHours?: number;
  department?: string;
  homeroomClass?: string | null;
  room?: string;
  status?: "active" | "inactive" | "archived";
  schoolId: string;
  createdBy: string; // Admin UID
}

interface UpdateTeacherInput {
  id: string;
  name?: string;
  position?: string;
  workloadHours?: number;
  subjects?: string[];
  subjectSpecialties?: string[];
  homeroomClass?: string | null;
  department?: string;
  phone?: string;
  email?: string;
  room?: string;
  status?: "active" | "inactive" | "archived";
  schoolId: string;
  updatedBy: string; // Admin UID
}

export class AdminTeachersRepository {
  constructor(
    private db: Firestore,
    private auth: Auth,
    private schoolId: string
  ) {}

  /**
   * Create new teacher + auto-provision user account (Firestore transaction)
   * 
   * Returns: { teacherId, userId, email, temporaryPassword }
   */
  async createTeacher(input: CreateTeacherInput): Promise<{
    teacherId: string;
    userId: string;
    email: string;
    temporaryPassword: string;
  }> {
    const now = new Date().toISOString();
    const teacherId = `tch-${Date.now()}`;
    const email = (input.email || `teacher_${teacherId}@school.local`).toLowerCase();

    let createdUserId = "";
    let tempPassword = "";

    // 1. Create user account in Firebase Auth
    if (!email.includes("@")) {
      throw new Error("Yaroqli elektron pochta manzili talab qilinadi");
    }

    try {
      // Generate temporary password
      const crypto = require("crypto");
      tempPassword = crypto.randomBytes(16).toString("base64");

      // Create user in Firebase Auth
      const userRecord = await this.auth.createUser({
        email,
        displayName: input.name,
        phoneNumber: input.phone,
        password: tempPassword,
        disabled: false,
      });
      createdUserId = userRecord.uid;

      // Set force password change flag
      await this.auth.setCustomUserClaims(createdUserId, {
        forcePasswordChange: true,
      });
    } catch (err: any) {
      // If email already exists, use existing user
      if (err.code === "auth/email-already-exists") {
        const existingUser = await this.auth.getUserByEmail(email);
        createdUserId = existingUser.uid;
      } else {
        throw err;
      }
    }

    // 2. Create teacher record + user profile (Firestore transaction)
    return this.db.runTransaction(async (transaction) => {
      // Create Teacher
      const teacherData = {
        id: teacherId,
        schoolId: input.schoolId || this.schoolId,
        name: input.name.trim(),
        firstName: input.firstName || "",
        lastName: input.lastName || "",
        email,
        phone: input.phone || "",
        position: input.position || "Fan o'qituvchisi",
        subjects: input.subjects || [],
        subjectSpecialties: input.subjectSpecialties || input.subjects || [],
        workloadHours: input.workloadHours || 20,
        department: input.department || "Umumiy",
        homeroomClass: input.homeroomClass || null,
        room: input.room || "",
        status: input.status || "active",
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy,
        version: 1,
      };

      const teacherRef = this.db.collection("teachers").doc(teacherId);
      transaction.set(teacherRef, teacherData);

      // Create/Update User Profile
      const userProfileData = {
        uid: createdUserId,
        displayName: input.name,
        email,
        phoneNumber: input.phone || "",
        role: "TEACHER",
        schoolId: input.schoolId || this.schoolId,
        teacherId,
        subjects: input.subjects || [],
        subjectSpecialties: input.subjectSpecialties || input.subjects || [],
        assignedClasses: input.homeroomClass ? [input.homeroomClass] : [],
        homeroomClass: input.homeroomClass || null,
        workloadHours: input.workloadHours || 20,
        forcePasswordChange: true,
        disabled: false,
        createdAt: now,
        updatedAt: now,
      };

      const userRef = this.db.collection("users").doc(createdUserId);
      transaction.set(userRef, userProfileData, { merge: true });

      // Audit Log
      const auditRef = this.db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        actorUid: input.createdBy,
        actorRole: "ADMIN",
        schoolId: input.schoolId || this.schoolId,
        action: "TEACHER_CREATED",
        entity: "teachers",
        entityId: teacherId,
        newValue: teacherData,
        timestamp: now,
      });

      return {
        teacherId,
        userId: createdUserId,
        email,
        temporaryPassword: tempPassword,
      };
    });
  }

  /**
   * Update teacher details (name, workload, specialties, homeroom)
   * Bidirectional sync: Teacher.homeroomClass → Class.homeroomTeacherId
   */
  async updateTeacher(input: UpdateTeacherInput): Promise<void> {
    const { id, schoolId, updatedBy, ...updates } = input;
    const now = new Date().toISOString();

    return this.db.runTransaction(async (transaction) => {
      // 1. Get current teacher to detect homeroom change
      const teacherRef = this.db.collection("teachers").doc(id);
      const teacherSnap = await transaction.get(teacherRef);

      if (!teacherSnap.exists) {
        throw new Error("O'qituvchi topilmadi");
      }

      const currentTeacher = teacherSnap.data()!;
      const oldHomeroom = currentTeacher.homeroomClass;
      const newHomeroom = updates.homeroomClass;

      // 2. Update teacher record
      const teacherPatch = {
        ...updates,
        updatedAt: now,
        version: (currentTeacher.version || 0) + 1,
      };

      transaction.update(teacherRef, teacherPatch);

      // 3. Bidirectional sync: Update classes
      // 3a. Clear old homeroom class if changed
      if (oldHomeroom && oldHomeroom !== newHomeroom) {
        const oldClassRef = this.db.collection("classes").doc(oldHomeroom);
        const oldClassSnap = await transaction.get(oldClassRef);
        if (oldClassSnap.exists && oldClassSnap.data()?.homeroomTeacherId === id) {
          transaction.update(oldClassRef, {
            homeroomTeacher: "Biriktirilmagan",
            homeroomTeacherId: null,
            homeroomTeacherPhone: null,
            updatedAt: now,
          });
        }
      }

      // 3b. Set new homeroom class
      if (newHomeroom && newHomeroom !== "none" && newHomeroom !== oldHomeroom) {
        const newClassRef = this.db.collection("classes").doc(newHomeroom);
        const newClassSnap = await transaction.get(newClassRef);
        if (newClassSnap.exists) {
          transaction.update(newClassRef, {
            homeroomTeacher: currentTeacher.name,
            homeroomTeacherId: id,
            homeroomTeacherPhone: currentTeacher.phone || "",
            updatedAt: now,
          });
        }
      }

      // 4. Update user profile if email/name/subjects changed
      if (currentTeacher.email && updates.email) {
        const userRef = this.db.collection("users").doc(currentTeacher.email); // Assumed user.uid == email
        const userSnap = await transaction.get(userRef);
        if (userSnap.exists) {
          const userPatch: Record<string, any> = {
            displayName: updates.name || currentTeacher.name,
            phoneNumber: updates.phone || currentTeacher.phone,
            subjectSpecialties: updates.subjectSpecialties || currentTeacher.subjectSpecialties,
            homeroomClass: newHomeroom || null,
            updatedAt: now,
          };
          transaction.update(userRef, userPatch);
        }
      }

      // 5. Audit Log
      const auditRef = this.db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        actorUid: updatedBy,
        actorRole: "ADMIN",
        schoolId,
        action: "TEACHER_UPDATED",
        entity: "teachers",
        entityId: id,
        oldValue: { homeroomClass: oldHomeroom, workloadHours: currentTeacher.workloadHours },
        newValue: { ...teacherPatch },
        timestamp: now,
      });
    });
  }

  /**
   * Delete teacher (soft delete to "archived" status)
   * Unlinks from classes and nullifies homeroom relationships
   */
  async archiveTeacher(teacherId: string, schoolId: string, archivedBy: string): Promise<void> {
    const now = new Date().toISOString();

    return this.db.runTransaction(async (transaction) => {
      const teacherRef = this.db.collection("teachers").doc(teacherId);
      const teacherSnap = await transaction.get(teacherRef);

      if (!teacherSnap.exists) {
        throw new Error("O'qituvchi topilmadi");
      }

      const teacher = teacherSnap.data()!;

      // 1. Soft delete teacher (archive status)
      transaction.update(teacherRef, {
        status: "archived",
        archivedAt: now,
        archivedBy,
        updatedAt: now,
      });

      // 2. Unlink from homeroom class
      if (teacher.homeroomClass) {
        const classRef = this.db.collection("classes").doc(teacher.homeroomClass);
        const classSnap = await transaction.get(classRef);
        if (classSnap.exists && classSnap.data()?.homeroomTeacherId === teacherId) {
          transaction.update(classRef, {
            homeroomTeacher: "Biriktirilmagan",
            homeroomTeacherId: null,
            updatedAt: now,
          });
        }
      }

      // 3. Disable user account
      if (teacher.email) {
        try {
          // Note: User disabling should be done via Auth API, not Firestore
          // This is a placeholder — real implementation via adminAuth.updateUser()
        } catch {}
      }

      // 4. Audit Log
      const auditRef = this.db.collection("auditLogs").doc();
      transaction.set(auditRef, {
        actorUid: archivedBy,
        actorRole: "ADMIN",
        schoolId,
        action: "TEACHER_ARCHIVED",
        entity: "teachers",
        entityId: teacherId,
        oldValue: { status: teacher.status },
        newValue: { status: "archived" },
        timestamp: now,
      });
    });
  }

  /**
   * List teachers (Firestore first, with optional filtering)
   */
  async listTeachers(
    filters?: { department?: string; status?: string; assignedClass?: string }
  ): Promise<any[]> {
    let query = this.db.collection("teachers").where("schoolId", "==", this.schoolId);

    if (filters?.status && filters.status !== "ALL") {
      query = query.where("status", "==", filters.status) as any;
    }

    const snap = await query.limit(500).get();
    const teachers = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (filters?.department && filters.department !== "ALL") {
      return teachers.filter((t: any) => t.department === filters.department);
    }

    return teachers;
  }

  /**
   * Get single teacher by ID
   */
  async getTeacher(teacherId: string): Promise<any | null> {
    const snap = await this.db.collection("teachers").doc(teacherId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }
}
