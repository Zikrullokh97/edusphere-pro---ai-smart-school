export type Role = "ADMIN" | "TEACHER" | "PARENT_STUDENT";

export type Actor = {
  uid: string;
  role: Role;
  schoolId: string;
  teacherId?: string;
  studentId?: string;
  childrenIds?: string[];
  assignedClasses?: string[];
  subjectSpecialties?: string[];
  homeroomClass?: string;
  displayName?: string;
};

export type EntityStatus = "ACTIVE" | "ARCHIVED";

export type StoredRecord = {
  id: string;
  schoolId: string;
  status?: EntityStatus | string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  archivedAt?: string;
  archivedBy?: string;
  [key: string]: unknown;
};

export type ListFilter = Record<string, string | number | boolean | undefined>;
