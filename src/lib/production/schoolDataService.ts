import { AdminTeachersRepository } from "../adminTeachersRepository.js";
import { AdminStudentsRepository } from "../adminStudentsRepository.js";
import { AdminClassesRepository } from "../adminClassesRepository.js";
import { TeacherGradesRepository, ParentGradesRepository, AdminGradesRepository } from "../gradesRepository.js";
import { AttendanceRepository, ParentAttendanceRepository, AdminAttendanceRepository } from "../attendanceRepository.js";
import { ForbiddenError, ValidationError } from "./errors.js";
import { applyPage } from "./query.js";
import type { Actor, StoredRecord } from "./types.js";

export const PRODUCTION_COLLECTIONS = ["teachers", "students", "classes", "grades", "attendance"] as const;
export type ProductionCollection = (typeof PRODUCTION_COLLECTIONS)[number];

export function isProductionCollection(value: string): value is ProductionCollection {
  return (PRODUCTION_COLLECTIONS as readonly string[]).includes(value);
}

export type ProductionRepos = {
  teachers: AdminTeachersRepository;
  students: AdminStudentsRepository;
  classes: AdminClassesRepository;
  grades: TeacherGradesRepository;
  parentGrades: ParentGradesRepository;
  adminGrades: AdminGradesRepository;
  attendance: AttendanceRepository;
  parentAttendance: ParentAttendanceRepository;
  adminAttendance: AdminAttendanceRepository;
};

export async function listProductionData(
  repos: ProductionRepos,
  actor: Actor,
  collection: ProductionCollection,
  filters: Record<string, unknown> = {},
): Promise<{ items: StoredRecord[]; page: ReturnType<typeof applyPage>["page"] }> {
  let items: StoredRecord[] = [];
  if (collection === "teachers") items = await repos.teachers.listTeachers(actor, filters);
  else if (collection === "students") items = await repos.students.listStudents(actor, filters);
  else if (collection === "classes") items = await repos.classes.listClasses(actor, filters);
  else if (collection === "grades") {
    items = actor.role === "PARENT_STUDENT"
      ? await repos.parentGrades.getChildrenGrades(actor, filters)
      : actor.role === "ADMIN"
        ? await repos.adminGrades.getAllGrades(actor, filters)
        : await repos.grades.listGrades(actor, filters);
  } else if (collection === "attendance") {
    items = actor.role === "PARENT_STUDENT"
      ? await repos.parentAttendance.getChildrenAttendance(actor, filters)
      : actor.role === "ADMIN"
        ? (await repos.adminAttendance.getSchoolDailyReport(actor, typeof filters.date === "string" ? filters.date : undefined)).items
        : await repos.attendance.listAttendance(actor, filters);
  }
  return applyPage(items, filters);
}

export async function createProductionData(
  repos: ProductionRepos,
  actor: Actor,
  collection: ProductionCollection,
  payload: Record<string, unknown>,
): Promise<StoredRecord> {
  if (collection === "teachers") return repos.teachers.createTeacher(actor, payload);
  if (collection === "students") return repos.students.createStudent(actor, payload);
  if (collection === "classes") return repos.classes.createClass(actor, payload);
  if (collection === "grades") return repos.grades.createGrade(actor, payload);
  if (collection === "attendance") return repos.attendance.markAttendance(actor, payload);
  throw new ValidationError("Unsupported collection");
}

export async function updateProductionData(
  repos: ProductionRepos,
  actor: Actor,
  collection: ProductionCollection,
  id: string,
  payload: Record<string, unknown>,
): Promise<StoredRecord> {
  if (collection === "teachers") return repos.teachers.updateTeacher(actor, id, payload);
  if (collection === "students") return repos.students.updateStudent(actor, id, payload);
  if (collection === "classes") return repos.classes.updateClass(actor, id, payload);
  if (collection === "grades") return repos.grades.updateGrade(actor, id, payload);
  if (collection === "attendance") return repos.attendance.updateAttendance(actor, id, payload);
  throw new ValidationError("Unsupported collection");
}

export async function archiveProductionData(
  repos: ProductionRepos,
  actor: Actor,
  collection: ProductionCollection,
  id: string,
): Promise<StoredRecord> {
  if (actor.role !== "ADMIN" && collection !== "grades" && collection !== "attendance") {
    throw new ForbiddenError("Only administrators can archive school entities");
  }
  if (collection === "teachers") return repos.teachers.archiveTeacher(actor, id);
  if (collection === "students") return repos.students.archiveStudent(actor, id);
  if (collection === "classes") return repos.classes.archiveClass(actor, id);
  if (collection === "grades") return repos.grades.archiveGrade(actor, id);
  if (collection === "attendance") return repos.attendance.archiveAttendance(actor, id);
  throw new ValidationError("Unsupported collection");
}
