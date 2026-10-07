/**
 * Production Repository Exports
 * Central point for all data layer access
 */

export { AdminTeachersRepository } from "./adminTeachersRepository.js";
export { AdminStudentsRepository } from "./adminStudentsRepository.js";
export { AdminClassesRepository } from "./adminClassesRepository.js";
export { TeacherGradesRepository, ParentGradesRepository, AdminGradesRepository } from "./gradesRepository.js";
export { AttendanceRepository, ParentAttendanceRepository, AdminAttendanceRepository } from "./attendanceRepository.js";

export { handleDataOperation, type AuthenticatedRequest } from "./productionIntegration.js";
