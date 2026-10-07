export type UserRole = 'admin' | 'teacher' | 'parent_student';
export type AppLanguage = 'en' | 'uz' | 'ky' | 'ru';

export function normalizeUserRole(value: unknown): UserRole {
  if (typeof value !== 'string') return 'parent_student';
  const v = value.toLowerCase().trim();
  if (v === 'admin' || v === 'administrator') return 'admin';
  if (v === 'teacher') return 'teacher';
  if (v === 'parent_student' || v === 'student' || v === 'parent' || v === 'parentstudent') return 'parent_student';
  return 'parent_student';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  schoolId: string;
  schoolName: string;
  // Specific role metadata
  teacherId?: string;
  homeroomClass?: string;
  workloadHours?: number;
  subjects?: string[];
  phoneNumber?: string;
  subjectSpecialties?: string[];
  assignedClasses?: string[];
  gradeLevel?: string;
  studentId?: string;
  xp?: number;
  level?: number;
  streakDays?: number;
  childrenIds?: string[];
}

export interface StudentRecord {
  id: string;
  name: string;
  studentId: string;
  avatar: string;
  grade: string; // e.g. "7-A"
  parentName: string;
  parentPhone: string;
  email: string;
  attendanceRate: number; // percentage
  avgGrade: number; // out of 100
  homeworkCompletionRate: number; // percentage
  xp: number;
  level: number;
  streakDays: number;
  riskStatus: 'safe' | 'low_risk' | 'medium_risk' | 'critical' | 'warning';
  riskReason?: string;
  strengths: string[];
  weaknesses: string[];
  badges: string[];
  recentFaceConfidence?: number;
  schoolId?: string;
  version?: number;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  iin?: string; // 14-digit Kyrgyz PIN / IIN
  birthDate?: string;
  currentQuarterGrade?: number;
  classId?: string;
  age?: number;
  language?: 'ky' | 'ru' | 'uz' | string;
  birthPlace?: string;
  nationality?: string;
  citizenship?: string;
  address?: string;
  region?: string;
  enrollmentDate?: string;
  previousSchool?: string;
  educationLanguage?: 'ky' | 'ru' | 'uz';
  status?: 'active' | 'inactive' | 'transferred' | 'graduated';
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  emergencyContact?: string;
  achievements?: string[];
  documents?: string[];
  transferHistory?: { fromSchool: string; toSchool: string; date: string; reason?: string; status: string }[];
  supportNotes?: string;
}

export interface TeacherRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  position?: string; // e.g. "Kafedra mudiri", "Bosh o'qituvchi", "Metodist", "Sinf rahbari", "Oliy toifali fan o'qituvchisi"
  qualification?: string; // e.g. "Oliy toifa", "1-toifa", "2-toifa", "Mutaxassis", "Magistr", "PhD"
  department?: 'STEM' | 'Humanities' | 'Science' | 'Sports' | 'Technology' | 'Languages';
  rateType?: string; // e.g. "1.0 stavka (20 soat)", "1.5 stavka (30 soat)", "0.5 stavka (10 soat)"
  homeroomClass?: string; // e.g. "7-A", "8-B", "none"
  experienceYears?: number;
  subject?: string;
  subjects: string[];
  subjectSpecialties?: string[];
  classes?: string[];
  assignedClasses: string[];
  totalLessonsWeekly: number;
  workloadHours?: number;
  homeroomClassId?: string;
  aiPlansGenerated?: number;
  rating: number;
  room: string;
  status?: 'active' | 'inactive' | 'on_leave' | 'probation';
  joinedDate?: string;
  schoolId?: string;
  version?: number;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  employeeId?: string;
  specialization?: string;
  education?: string;
  university?: string;
  diploma?: string;
  certification?: string;
  attestation?: string;
  hireDate?: string;
  pedagogicalExperienceYears?: number;
  documents?: string[];
}

export interface ClassGroup {
  id: string;
  name: string; // e.g. "7-A"
  gradeNumber: number;
  academicYear?: string;
  subject?: string;
  teacherId?: string;
  ownerUid?: string;
  gradeLevel?: number;
  section?: string;
  shift?: string;
  language?: string;
  subjects?: string[];
  teacher?: string;
  homeroomTeacher: string;
  homeroomTeacherId?: string;
  homeroomTeacherPhone?: string;
  capacity?: number;
  studentCount: number;
  room: string;
  attendanceAvg?: number;
  gradeAvg?: number;
  schoolId?: string;
  version?: number;
}

export interface KAOSourceProvenance {
  organization: string; // e.g. "Кыргыз билим берүү академиясы (КББА / КАО)"
  url: string; // e.g. "https://kao.kg/..."
  documentTitle: string; // e.g. "Предметтик стандарт (Приказ МОН КР №393)"
  documentYear: string; // e.g. "2022" or "2026"
  verifiedAt: string; // ISO 8601 timestamp
  status: 'VERIFIED' | 'NOT_VERIFIED' | 'MATCH';
}

export type EducationSystemId = '11_YEAR' | '12_YEAR' | 'BOTH';

export interface SubjectItem {
  id: string;
  name: string;
  nameKy?: string;
  nameRu?: string;
  nameUz?: string;
  localizedNames?: {
    ky: string;
    ru: string;
    uz: string;
  };
  code: string;
  icon?: string;
  department: string;
  color?: string;
  hoursPerWeek?: number;
  annualHours?: number;
  educationSystem?: EducationSystemId;
  mandatory?: boolean;
  gradeFrom?: number;
  gradeTo?: number;
  languageOfInstruction?: ('kyrgyz' | 'russian' | 'uzbek')[];
  source?: KAOSourceProvenance;
  teachers?: string[];
  teacherIds?: string[];
  headTeacher?: string;
  headTeacherId?: string;
  description?: string;
  gradeLevels?: string[];
  schoolId?: string;
  version?: number;
}

export interface ScheduleSlot {
  id: string;
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
  period: number; // 1 to 7
  time: string; // "08:00 - 08:45"
  subject: string;
  className: string;
  teacherName: string;
  teacherId?: string;
  room: string;
  classId?: string;
  academicYear?: string;
  subjectId?: string;
  startTime?: string;
  endTime?: string;
  lessonNumber?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  hasConflict?: boolean;
}

export interface WeeklyScheduleDraft {
  day: ScheduleSlot['day'];
  period: number;
  startTime: string;
  endTime: string;
  room: string;
}

export interface CreateClassWithScheduleInput {
  classData: Pick<ClassGroup, 'name' | 'gradeNumber' | 'section' | 'room'> & {
    academicYear: string;
    subject: string;
    language?: string;
    capacity?: number;
    teacherId?: string;
  };
  schedules: WeeklyScheduleDraft[];
}

export interface TeacherWorkload {
  teacherId: string;
  teacherName: string;
  avatar: string;
  subject: string;
  assignedClasses: string[];
  targetHoursWeekly: number;
  allocatedHoursWeekly: number;
  maxHoursPerDay: number;
  preferredRoom: string;
  department: 'STEM' | 'Humanities' | 'Science' | 'Sports' | 'Technology';
  position?: string;
  rateType?: string;
  homeroomClass?: string;
}

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

export interface AttendanceEntry {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string;
  lessonId: string;
  status: AttendanceStatus;
  time?: string;
  checkInTime?: string;
  method: 'face_recognition' | 'manual' | 'qr_code' | 'nfc';
  confidence?: number;
  note?: string;
  schoolId?: string;
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  markedBy?: string;
  timestamp?: string;
  version?: number;
}

export type AttendanceRecord = AttendanceEntry;

export interface GradeColumn {
  id: string;
  title: string;
  type: 'homework' | 'quiz' | 'midterm' | 'exam' | 'project' | 'participation';
  maxScore: number;
  date: string;
  weight: number;
}

export interface GradeEntry {
  id?: string;
  studentId: string;
  studentName: string;
  className?: string;
  subject?: string;
  scores?: Record<string, number>;
  homework: number[];
  quizzes: number[];
  midterm: number;
  finalExam: number;
  average: number;
  letter?: string;
  schoolId?: string;
  assessmentId?: string;
  teacherId?: string;
  version?: number;
}

export interface HomeworkAssignment {
  id: string;
  title: string;
  subject: string;
  className: string;
  teacherName?: string;
  dueDate: string;
  createdAt?: string;
  instructions?: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'adaptive';
  totalAssigned?: number;
  totalStudents?: number;
  submittedCount: number;
  xpReward?: number;
  materials?: string[];
  rubricCriteria?: { name: string; maxPts: number }[];
  submissions: StudentSubmission[];
  schoolId?: string;
  teacherId?: string;
  version?: number;
}

export interface StudentSubmission {
  id: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  aiScore: number;
  aiFeedback: string;
  teacherApproved?: boolean;
  imageUrl?: string;
  status?: string;
  homeworkId?: string;
  version?: number;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  studentName: string;
  className: string;
  subject: string;
  submittedAt: string;
  content: string;
  status: 'submitted' | 'graded' | 'late' | 'pending';
  grade?: number;
  aiFeedback?: string;
  teacherFeedback?: string;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'academic' | 'streak' | 'participation' | 'olympiad';
  unlockedAt?: string;
  isUnlocked: boolean;
  xpReward: number;
}

export interface AIInsightItem {
  id: string;
  type: 'warning' | 'success' | 'intervention';
  title: string;
  description: string;
  recommendation: string;
  impact: string;
  timestamp: string;
  dismissed?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'homework' | 'grade' | 'attendance' | 'announcement' | 'ai_alert';
  timeAgo: string;
  isRead: boolean;
  actionUrl?: string;
  schoolId?: string;
  userId?: string;
  version?: number;
}

export interface Assessment {
  id: string;
  schoolId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  type: GradeColumn['type'];
  title: string;
  maxScore: number;
  weight: number;
  date: string;
  version?: number;
}

export interface AuditLog {
  actorId: string;
  actorRole: string;
  schoolId: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: string;
}

export interface AILessonSection {
  id: string;
  title: string;
  content: string;
  teacherNotes?: string;
  quizQuestions?: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }[];
}

export interface AILessonPlan {
  title: string;
  duration: string;
  lessonStyle: string;
  source: string;
  objectives: string[];
  sections: AILessonSection[];
}

export interface LessonPlan {
  subject: string;
  grade: string;
  topic: string;
  duration: string;
  objectives: string[];
  warmupHook: string;
  coreConcept: string;
  teamChallenge: string;
  formativeQuiz: { question: string; answer: string }[];
  differentiatedHomework: {
    easy: string;
    medium: string;
    hard: string;
  };
}

export interface SchoolDocument {
  id: string;
  title: string;
  category: 'pedagogical' | 'homeroom' | 'regulatory' | 'portfolio';
  docType: 'ktm' | 'lesson_plan' | 'meeting_minutes' | 'social_passport' | 'order' | 'curriculum' | 'certificate' | 'report';
  subject?: string;
  gradeLevel?: string;
  author: string;
  date: string;
  fileSize: string;
  format: 'PDF' | 'DOCX' | 'XLSX';
  downloadUrl?: string;
  description: string;
  status: 'approved' | 'in_review' | 'draft' | 'official';
  contentPreview?: string;
  tags?: string[];
  isAiGenerated?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface SchoolSettings {
  id: string;
  schoolId: string;
  schoolName: string;
  city: string;
  socraticStrictness: string;
  telegramAlerts: boolean;
  autoGradingEnabled: boolean;
  faceIdThreshold: string;
  academicYear?: string;
  semester?: string;
  updatedAt?: string;
  updatedBy?: string;
  version?: number;
}

export type QuarterId = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type AcademicPeriodStatus = 'upcoming' | 'active' | 'closed';

export interface QuarterPeriod {
  id: QuarterId;
  name: string; // e.g. "1-четверть (Q1)"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: AcademicPeriodStatus;
}

export interface AcademicYearRecord {
  id: string; // e.g. "2026-2027"
  name: string; // "2026–2027 Окуу жылы"
  startDate: string;
  endDate: string;
  status: 'active' | 'archived' | 'planned';
  activeQuarter: QuarterId;
  quarters: QuarterPeriod[];
  schoolId?: string;
  version?: number;
}

export interface KTPLessonItem {
  id: string;
  lessonNumber: number;
  date?: string;
  scheduledDate?: string;
  quarterId?: QuarterId;
  topic: string;
  objective?: string;
  content?: string;
  homework?: string;
  hours?: number;
  materials?: string[];
  competencies?: string[];
  learningOutcomes?: string[];
  learningOutcomeId?: string;
  learningOutcomeCode?: string;
  cognitiveLevel?: CognitiveLevel;
  source?: KAOSourceProvenance;
}

export interface KTPDocument {
  id: string;
  schoolId?: string;
  teacherId: string;
  teacherName: string;
  className: string;
  subject: string;
  subjectId?: string;
  academicYear: string;
  educationSystem?: EducationSystemId;
  totalHours: number;
  lessons: KTPLessonItem[];
  uploadedAt: string;
  fileName?: string;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  source?: KAOSourceProvenance;
}

export interface BasicCurriculumSubjectAllocation {
  subjectCode: string;
  subjectNameKy: string;
  subjectNameRu: string;
  subjectNameUz: string;
  weeklyHours: number;
  annualHours: number;
  isMandatory: boolean;
  department: string;
}

export interface BasicCurriculumPlan {
  id: string;
  educationSystem: EducationSystemId;
  academicYear: string;
  languageOfInstruction: 'kyrgyz' | 'russian' | 'uzbek';
  educationLevel: 'primary' | 'middle' | 'senior';
  grade: number;
  weeklyTotalHoursMin: number;
  weeklyTotalHoursMax: number;
  annualTotalHours: number;
  subjects: BasicCurriculumSubjectAllocation[];
  source: KAOSourceProvenance;
}

export interface KTPScheduleReconciliationResult {
  className: string;
  subject: string;
  ktpPlannedHours: number;
  scheduledWeeklyHours: number;
  scheduledAnnualHours: number;
  difference: number;
  status: 'MATCH' | 'UNDERLOAD' | 'OVERLOAD' | 'NO_SCHEDULE' | 'NO_KTP';
  warning?: string;
}

export interface LessonMaterial {
  id: string;
  title: string;
  type: 'textbook' | 'conspect' | 'presentation' | 'worksheet' | 'video' | 'test';
  url?: string;
  className?: string;
  subject?: string;
  topic?: string;
}

export interface LessonSessionRecord {
  id: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  className: string;
  subject: string;
  academicYear: string;
  quarterId: QuarterId;
  date: string;
  weekday: string;
  period: number;
  lessonNumber: number;
  topic: string;
  objective?: string;
  conspectDraft?: string;
  homework?: string;
  materials?: LessonMaterial[];
  learningOutcomeId?: string;
  learningOutcomeCode?: string;
  cognitiveLevel?: CognitiveLevel;
  planned?: {
    topic: string;
    objective?: string;
    homework?: string;
    hours?: number;
  };
  actual?: {
    topic: string;
    homework?: string;
    status: 'completed' | 'partial' | 'rescheduled' | 'cancelled';
    deviationReason?: string;
  };
  attendance: {
    present: string[];
    absent: string[];
    late: string[];
    excused: string[];
  };
  grades: Record<string, number>;
  comments: Record<string, string>;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  ktpLessonId?: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  actorName?: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  schoolId?: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}

export interface SystemHealthMetrics {
  status: 'HEALTHY' | 'WARNING' | 'ERROR' | 'OFFLINE';
  uptimeSeconds: number;
  serverTime: string;
  latencyMs: number;
  memoryUsageMB: number;
  activeSessions: number;
  services: {
    database: { status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE'; pingMs: number };
    authentication: { status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE'; activeTokens: number };
    aiGateway: { status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE'; model: string };
    storage: { status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE'; usedMB: number };
    syncHub: { status: 'HEALTHY' | 'DEGRADED' | 'OFFLINE'; queueLength: number };
  };
}

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  audience: 'ALL' | 'TEACHERS' | 'STUDENTS' | 'PARENTS' | 'CLASS';
  targetClass?: string;
  senderName: string;
  senderRole: string;
  schoolId: string;
  createdAt: string;
  expiresAt?: string;
  isRead?: boolean;
}

export interface LessonPlanApprovalItem {
  id: string;
  teacherId: string;
  teacherName: string;
  className: string;
  subject: string;
  topic: string;
  date: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REVISION_REQUESTED' | 'REJECTED';
  reviewerComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ParentRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: 'father' | 'mother' | 'guardian';
  childrenIds: string[];
  childrenNames?: string[];
  address?: string;
  occupation?: string;
  emergencyContact?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface AdminKPIData {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  activeTeachers: number;
  totalParents: number;
  totalClasses: number;
  totalSubjects: number;
  todayAttendanceRate: number;
  absentStudentsCount: number;
  lateStudentsCount: number;
  averageGrade: number;
  homeworkCompletionRate: number;
  activeUsersCount: number;
  pendingRequestsCount: number;
  systemHealthStatus: 'HEALTHY' | 'WARNING' | 'ERROR';
  genderDistribution: { male: number; female: number };
  classBreakdown: Array<{ name: string; count: number; max: number; attendanceRate: number }>;
  teacherWorkloads: Array<{ name: string; subject: string; hours: number }>;
  classRanking?: Array<{ className: string; rank: number; score: number; attendanceRate: number; avgGrade: number; studentCount: number }>;
  urgentAlerts?: {
    atRiskStudents: Array<{ id: string; name: string; grade: string; avgGrade: number; attendanceRate: number; riskReason: string }>;
    lowAttendanceClasses: Array<{ name: string; attendanceRate: number; studentCount: number; homeroomTeacher: string }>;
    delayedTeachers: Array<{ id: string; name: string; subject: string; conductedSessions: number; expectedSessions: number }>;
  };
}

export interface RoomRecord {
  id: string;
  name: string; // e.g. "101-kabinet (Matematika)", "204-Laboratoriya"
  code: string; // e.g. "ROOM-101", "LAB-CHEM"
  floor: number;
  building?: string;
  capacity: number;
  type: 'classroom' | 'laboratory' | 'computer_lab' | 'gym' | 'workshop' | 'auditorium';
  equipment: string[]; // e.g. ["smart_board", "projector", "30_pcs", "wi_fi"]
  assignedTeacherId?: string;
  assignedTeacherName?: string;
  assignedClass?: string;
  status: 'active' | 'maintenance' | 'reserved';
  schoolId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentRankingItem {
  rank: number;
  studentId: string;
  name: string;
  grade: string;
  avgGrade: number;
  attendanceRate: number;
  homeworkCompletionRate: number;
  totalScore: number;
  trend: 'up' | 'stable' | 'down';
}

export interface TeacherRankingItem {
  rank: number;
  teacherId: string;
  name: string;
  subject: string;
  assignedClasses: string[];
  workloadHours: number;
  conductedSessionsCount: number;
  studentAvgScore: number;
  totalScore: number;
  trend: 'up' | 'stable' | 'down';
}

export interface ClassRankingItem {
  rank: number;
  className: string;
  homeroomTeacher: string;
  studentCount: number;
  avgGrade: number;
  attendanceRate: number;
  homeworkCompletionRate: number;
  totalScore: number;
  trend: 'up' | 'stable' | 'down';
}

export interface RiskAlertItem {
  id: string;
  level: 'CRITICAL' | 'WARNING' | 'ATTENTION';
  entityType: 'STUDENT' | 'CLASS' | 'TEACHER';
  entityName: string;
  entitySubtext: string;
  metrics: { label: string; value: string | number }[];
  primaryReason: string;
  recommendedAction: string;
}

// ==========================================
// Standards-Based Learning & Curriculum Hierarchy Types
// Hierarchy: Standard -> Basic Curriculum (BUP) -> Subject Standard -> Curriculum -> Grade -> Subject -> Learning Outcome (LO) -> Unit -> Topic -> Lesson -> Resource -> Activity -> Assessment -> Student Mastery
// ==========================================

export type CognitiveLevel = 'reproductive' | 'productive' | 'creative';
export type AssessmentType = 'diagnostic' | 'formative' | 'summative' | 'pisa_task';
export type LOMasteryStatus = 'not_started' | 'developing' | 'mastered' | 'exceeded';

export interface LearningOutcome {
  id: string; // e.g. "LO-MATH-5-001", "LO-KYRLANG-7-002"
  code: string; // e.g. "5.MATH.NUM.01"
  subjectId: string;
  subjectCode: string;
  grade: number; // 1..12
  unitNumber: number;
  unitTitle: string; // e.g. "Natural Sonlar va Kasrlar" / "Натуралдык сандар"
  topic: string;
  title: string;
  description: {
    uz: string;
    ru: string;
    ky: string;
    en: string;
  };
  cognitiveLevel: CognitiveLevel; // PISA taxonomy: reproductive, productive, creative
  standardVersion: string; // e.g. "KAO-STD-2026-V1"
  curriculumFramework: '11_YEAR' | '12_YEAR';
  recommendedHours: number;
  criteria: string[];
  sampleTasks?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CurriculumStandard {
  id: string;
  code: string; // e.g. "STD-KYR-2026-STEM"
  title: string;
  nameKy: string;
  nameRu: string;
  nameUz: string;
  authority: 'KAO' | 'MON_KR';
  framework: '11_YEAR' | '12_YEAR';
  orderNumber: string; // e.g. "№973" or "№969/1"
  version: string;
  effectiveYear: string; // "2026-2027"
  status: 'active' | 'draft' | 'deprecated';
  domains: Array<{
    code: string;
    nameKy: string;
    nameRu: string;
    nameUz: string;
    learningOutcomesCount: number;
  }>;
}

export interface CurriculumVersion {
  id: string;
  standardId: string;
  name: string;
  framework: '11_YEAR' | '12_YEAR';
  orderNumber: string;
  academicYear: string;
  status: 'active' | 'draft' | 'archived';
  description: string;
  totalOutcomesCount: number;
  lastUpdated: string;
}

export interface PedagogicalResource {
  id: string;
  learningOutcomeId: string;
  subjectCode: string;
  grade: number;
  type: 'lesson_plan' | 'presentation' | 'worksheet' | 'lab_guide' | 'rubric' | 'video' | 'interactive';
  title: string;
  description?: string;
  author: string;
  language: 'ky' | 'ru' | 'uz' | 'en';
  fileUrl?: string;
  contentSnippet?: string;
  cognitiveLevel?: CognitiveLevel;
  tags: string[];
  downloadsCount?: number;
  likesCount?: number;
  createdAt: string;
}

export interface AssessmentRubricCriterion {
  id: string;
  name: string;
  maxScore: number;
  levelDescriptions: {
    exceeded: string;
    mastered: string;
    developing: string;
    not_started: string;
  };
}

export interface AssessmentItem {
  id: string;
  learningOutcomeId: string;
  type: AssessmentType;
  cognitiveLevel: CognitiveLevel;
  question: string;
  maxScore: number;
  rubric: AssessmentRubricCriterion[];
  sampleSolution?: string;
  timeLimitMinutes?: number;
}

export interface StudentLOMastery {
  studentId: string;
  studentName?: string;
  learningOutcomeId: string;
  learningOutcomeCode: string;
  learningOutcomeTitle: string;
  subjectCode: string;
  grade: number;
  masteryScore: number; // 0..100%
  status: LOMasteryStatus;
  cognitiveLevel: CognitiveLevel;
  assessmentsCompleted: number;
  lastAssessedAt: string;
  teacherFeedback?: string;
  evidenceSessionIds?: string[];
}

export interface ClassLOMasteryOverview {
  className: string;
  subjectCode: string;
  learningOutcomeId: string;
  learningOutcomeCode: string;
  learningOutcomeTitle: string;
  totalStudents: number;
  masteredCount: number;
  developingCount: number;
  atRiskCount: number;
  averageMasteryScore: number; // 0..100%
  status: 'proficient' | 'satisfactory' | 'needs_attention' | 'critical';
}

