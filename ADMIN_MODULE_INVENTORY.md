# EduSphere Pro — Admin Modul Inventari (ADMIN_MODULE_INVENTORY.md)

**Versiya:** 3.0.0-PROD  
**Sana:** 2026-09-05  
**Hujjat Maqsadi:** EduSphere Pro tizimidagi barcha modullar, ularning frontend komponentlari, backend API endpointlari, ma'lumotlar bazasi saqlash modellari, test qamrovi va ishlash holati to‘liq inventari.

---

## 1. Modullar Inventar Jadvali

| Modul Nomi | Frontend Komponent | Backend API | Ma'lumotlar Bazasi (DB) | Test Fayli | Holati | Izoh |
|:---|:---|:---|:---|:---|:---|:---|
| **Boshqaruv Paneli (Dashboard)** | `src/components/admin/AdminDashboard.tsx` | `GET /api/admin/kpi` | `students`, `teachers`, `classes`, `attendance` | `adminDashboardKpi.test.mjs` | `WORKING` | Real KPI kartalari, gender taqsimoti, shoshilinch ogohlantirishlar |
| **Maktab Boshqaruvi Hub** | `src/components/admin/SchoolManagementHub.tsx` | `GET /api/classes`, `GET /api/students`, `GET /api/teachers` | `classes`, `students`, `teachers`, `subjects` | `adminMonitoringAndHubs.test.mjs` | `WORKING` | Sinflar, o‘quvchilar, o‘qituvchilar, fanlar markazi |
| **Monitoring & Reyting Hub** | `src/components/admin/AdminMonitoringHub.tsx` | `GET /api/admin/monitoring/rankings`, `GET /api/admin/rooms` | `students`, `teachers`, `classes`, `rooms` | `adminMonitoringAndHubs.test.mjs` | `WORKING` | O‘quvchi/o‘qituvchi/sinf reytinglari va xonalar boshqaruvi |
| **O‘quvchilar (Students)** | `src/components/students/StudentsDirectory.tsx` | `GET, POST, PUT, DELETE /api/students` | `localDbStore.students` (1000 ta o‘quvchi) | `adminControlCenter.test.mjs` | `WORKING` | 14-xonali Qirg‘iziston IIN tekshiruvi, sinf biriktirish |
| **O‘qituvchilar (Teachers)** | `src/components/teachers/TeachersDirectory.tsx` | `GET, POST, PUT, DELETE /api/teachers` | `localDbStore.teachers` (70 ta o‘qituvchi) | `adminControlCenter.test.mjs` | `WORKING` | Stavka, soatlar limiti (1..40), fanlar va sinflar |
| **Foydalanuvchilar (Users)** | `src/components/admin/UsersManagement.tsx` | `GET /api/admin/users`, `POST /api/teachers/auth-account` | `users`, `teachers` | `teachersToUsersIntegration.test.mjs` | `WORKING` | 70 ta o‘qituvchi login hisoblari va RBAC rollari |
| **Sinflar (Classes)** | `src/components/classes/ClassesDirectory.tsx` | `GET, POST, PUT, DELETE /api/classes` | `localDbStore.classes` (26 ta sinf) | `fullSchoolErpDataConsistency.test.mjs` | `WORKING` | 1-A dan 11-B gacha, sig‘im nazorati, sinf rahbari bog‘liqligi |
| **Fanlar (Subjects)** | `src/components/subjects/SubjectsDirectory.tsx` | `GET, POST, PUT, DELETE /api/subjects` | `localDbStore.subjects` (18 ta fan) | `kaoAcademicDataIntegration.test.mjs` | `WORKING` | KAO Davlat standarti, 11/12 yillik ta'lim belgilari |
| **O‘quv Yili (Academic Years)** | `src/components/academic/AcademicYearsManager.tsx` | `GET, POST, PUT, DELETE /api/academic-years` | `localDbStore.academicYears` (2026-2027) | `finalSchoolErpIntegrity.test.mjs` | `WORKING` | 4 ta chorak muddatlari, chorakni yopish/ochish |
| **Ota-onalar (Parents)** | `src/components/admin/ParentsDirectory.tsx` | `GET, POST, PUT, DELETE /api/parents` | `localDbStore.parents` | `adminControlCenter.test.mjs` | `WORKING` | Ota-ona va farzandlar relyatsion bog‘liqligi |
| **Dars Jadvali (Schedule)** | `src/components/schedule/ScheduleManager.tsx` | `GET, POST, PUT /api/schedules` | `localDbStore.schedules` | `erpWorkflowIntegration.test.mjs` | `WORKING` | O‘qituvchi, sinf va xona to‘qnashuvlarini bloklash |
| **KTP Dars Rejalari** | `src/components/admin/LessonPlanReviewer.tsx` | `GET, POST, PUT /api/ktp`, `/api/admin/lesson-plans/review` | `localDbStore.ktpDocuments` | `kaoAcademicDataIntegration.test.mjs` | `WORKING` | KAO 2026–2027 dars mavzulari, tasdiqlash workflow |
| **Elektron Jurnal (Journal)** | `src/components/teacher/ElectronicJournal.tsx` | `GET, POST, PUT /api/lesson-sessions` | `localDbStore.lessonSessions` | `electronicJournalAutomation.test.mjs` | `WORKING` | Atomik dars sessiyasi, davomat va baho sinxronlash |
| **Davomat & Turniket** | `src/components/attendance/AttendanceManager.tsx` | `GET, POST /api/attendance`, `POST /api/turnstile/scan` | `localDbStore.attendance`, `turnstileEvents` | `productionAttendanceWorkflow.test.mjs` | `WORKING` | Turniket hodisasi orqali kunlik davomatni avtomatik yangilash |
| **Baholar Jurnali (Gradebook)** | `src/components/gradebook/GradebookManager.tsx` | `GET, POST /api/grades` | `localDbStore.grades` | `kyrgyzEdu.test.mjs` | `WORKING` | 2–5 milliy baho shkalasi, 40/60 choraklik hisob-kitob |
| **Uy Vazifalari (Homework)** | `src/components/homework/HomeworkManager.tsx` | `GET, POST /api/homework`, `/api/homework/submissions` | `localDbStore.homework` | `erpWorkflowIntegration.test.mjs` | `WORKING` | Topshirish, baholash va tekshirish |
| **Hisobotlar (Reports)** | `src/components/reports/ReportBuilder.tsx` | `GET /api/reports/73-osh`, `GET /api/reports/tabel` | Hisoblangan agregatsiyalar | `kyrgyzEdu.test.mjs` | `WORKING` | Forma 73-ОШ va Davlat Tabeli (PDF/Chop etish) |
| **AI Analitika (AI Analytics)** | `src/components/analytics/AIAnalyticsView.tsx` | `POST /api/ai/analytics-summary`, `POST /api/ai/admin-summary` | Real DB agregatsiyalari | `adminMonitoringAndHubs.test.mjs` | `WORKING` | Gemini 2.5 Flash tahlili, 0 ta soxta/fake ma'lumot |
| **E'lonlar Markazi (Announcements)** | `src/components/admin/AnnouncementCenter.tsx` | `GET, POST, PUT, DELETE /api/announcements` | `localDbStore.announcements` | `adminControlCenter.test.mjs` | `WORKING` | Maqsadli auditoriya (O‘qituvchi, Ota-ona, Sinf) |
| **Xavfsizlik Audit Jurnali** | `src/components/admin/AuditLogsViewer.tsx` | `GET /api/admin/audit-logs` | `localDbStore.auditLogs` (Immutable) | `adminControlCenter.test.mjs` | `WORKING` | O‘zgarmas xavfsizlik audit loglari |
| **Xavfsizlik & Sessiyalar** | `src/components/admin/SecurityCenter.tsx` | `GET /api/admin/security/active-sessions` | Faol JWT sessiyalari | `adminControlCenter.test.mjs` | `WORKING` | Sessiyalar nazorati va xavfsizlik konfiguratsiyasi |
| **Tizim Salomatligi (Health)** | `src/components/admin/SystemHealthMonitor.tsx` | `GET /api/admin/system-health` | Tizim resurslari va servislari | `adminControlCenter.test.mjs` | `WORKING` | DB, Auth, AI Gateway va xotira monitoringi |
| **Zaxira va Tiklash (Backup)** | `src/components/admin/BackupManager.tsx` | `GET, POST /api/admin/backup` | To‘liq relatsion snapshot | `adminControlCenter.test.mjs` | `WORKING` | JSON/ZIP zaxira yaratish va relyatsion tiklash |
| **Tizim Sozlamalari** | `src/components/settings/SettingsManager.tsx` | `GET, PUT /api/school/settings` | `localDbStore.schoolSettings` | `i18n.test.mjs` | `WORKING` | Til tanlash (UZ, KY, RU), mavzu, parametrlar |

---

## 2. Xulosa

- **Barcha 24 ta modul:** `WORKING` (100% ishlab turibdi)
- **Broken / Mock / Missing / Duplicate modullar soni:** 0

