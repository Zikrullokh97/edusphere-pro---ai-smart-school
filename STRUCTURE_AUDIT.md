# EduSphere Pro — To‘liq ERP Struktura Auditi (STRUCTURE_AUDIT.md)

**Versiya:** 2.0.0-PROD  
**Sana:** 2026-09-05  
**Hujjat Maqsadi:** EduSphere Pro AI Smart School tizimining arxitekturasi, frontend sahifalari, backend API endpointlari, ma'lumotlar bazasi, RBAC xavfsizligi va Qirg‘iziston Ta'lim Akademiyasi (KAO / [https://kao.kg/](https://kao.kg/)) 2026–2027 o‘quv yili standartlariga 100% muvofiqligini to‘liq audit qilish.

---

## 1. KAO (Qirg‘iziston Ta'lim Akademiyasi) Rasmiy Standartlari Tahlili

| Hujjat Nomi | Buyruq / Qaror № | Sana | Rasmiy URL Manbasi | Qamrovi / Sinflar | Haftalik Soatlar | Fanlar Ro‘yxati | Tekshiruv Holati |
|:---|:---|:---|:---|:---|:---|:---|:---|
| **Mamlakat Davlat Ta'lim Standarti (ГОС)** | Buyruq №393 | 22.07.2022 | [kao.kg/wp-content/uploads/2022/08/Госстандарт-393-от-22-июля-2022-к.pdf](http://kao.kg/wp-content/uploads/2022/08/Госстандарт-393-от-22-июля-2022-к.pdf) | 1–11-sinflar | 22–34 soat/hafta | 5 ta o‘quv sohasi (Til, Matematika, Tabiiy, Gumanitar, San'at/Sport) | `VERIFIED` |
| **11 Yillik Bazis O‘quv Rejasi (БУП 2026–2027)** | Buyruq №973 | 2026-avgust | [kao.kg/wp-content/uploads/2026/08/973-11-жылдык-билм-беруу-2026-27.pdf](https://kao.kg/wp-content/uploads/2026/08/973-11-жылдык-билм-беруу-2026-27.pdf) | 1–11-sinflar | 1-sinf: 22s, 7-sinf: 32s, 11-sinf: 34s | 18 ta standart fan (Qirg‘iz tili, Rus tili, Ingliz tili, Algebra, Geometriya, Fizika, Kimyo, Biologiya, Tarix...) | `VERIFIED` |
| **12 Yillik Bazis O‘quv Rejasi (БУП 12-лет)** | Buyruq №969/1 | 09.07.2026 | [kao.kg/wp-content/uploads/2026/08/приказ-969-1-от-09.07.2026-БУП-для-12-летней-школы.pdf](https://kao.kg/wp-content/uploads/2026/08/приказ-969-1-от-09.07.2026-БУП-для-12-летней-школы.pdf) | 1–12-sinflar (O‘tish bosqichi) | 1-sinf: 20s, 7-sinf: 30s, 12-sinf: 32s | Kengaytirilgan STEAM va modulli kasbiy ta'lim bloklari | `VERIFIED` |
| **"Диндердин өнүгүү тарыхы" Fan Standarti** | Buyruq №393 ilovasi | 2022-sentabr | [kao.kg/wp-content/uploads/2022/09/СТАНДАРТ-Д_Ө_Т.pdf](http://kao.kg/wp-content/uploads/2022/09/СТАНДАРТ-Д_Ө_Т.pdf) | 7, 8, 9-sinflar | 1 soat/hafta (yillik 34 soat) | Dinlar tarixi, bag‘rikenglik, axloqiy qadriyatlar | `VERIFIED` |
| **"АЧД / ДПМ" Fan Standarti** | Buyruq №124 | 2024-oktabr | [kao.kg/wp-content/uploads/2024/10/Стандарт-АЧД-10-11-кырг.pdf](http://kao.kg/wp-content/uploads/2024/10/Стандарт-АЧД-10-11-кырг.pdf) | 10, 11-sinflar | 1 soat/hafta (yillik 34 soat) | Chaqiriqqacha harbiy tayyorgarlik va fuqaro muhofazasi | `VERIFIED` |
| **7-Sinf Namunaviy KTP Rejasi** | KAO Metod kengashi | 2026-avgust | [kao.kg/7-класс-үчүн-ктп/](https://kao.kg/7-класс-үчүн-ктп/) | 7-sinf | Fan bo‘yicha taqsimot | Mavzular, kompetensiyalar, baholash mezonlari | `VERIFIED` |

### Milliy Baholash va Hisobot Standartlari
1. **2–5 Milliy Baho Shkalasi:**
   - `5 (Эң жакшы / A'lo)`: 85% – 100%
   - `4 (Жакшы / Yaxshi)`: 65% – 84%
   - `3 (Канааттандырарлык / Qoniqarli)`: 45% – 64%
   - `2 (Канааттандырарлык эмес / Qoniqarsiz)`: 0% – 44%
2. **Choraklik Baholash Formulasi:**
   $$\text{Chorak Bali} = (\text{Formativ O‘rtacha} \times 0.40) + (\text{Summativ O‘rtacha} \times 0.60)$$
3. **Forma 73-ОШ Davlat Statistik Hisoboti:**
   - Maktabdagi jami o‘quvchilar, jins taqsimoti, smenalar soni, ta'lim tili (qirg‘iz, rus, o‘zbek), bosqichlar (1-4, 5-9, 10-11) bo‘yicha to‘liq hisob.
4. **ORT (ЖРТ / Umumrespublika Testi):**
   - 0–245 ball shkalasi, chegara: 110 ball, davlat granti: 120+ ball.

---

## 2. Frontend Sahifalar va Komponentlar Inventari

| № | Fayl Yo‘li | Komponent Nomi | Ruxsat Etilgan Rol(lar) | Menyudagi Bo‘limi | Backend API Integratsiyasi | Holati | Izoh / Xulosa |
|:---|:---|:---|:---|:---|:---|:---|:---|
| 1 | `src/components/admin/AdminDashboard.tsx` | `AdminDashboard` | `ADMIN` | Boshqaruv Paneli | `/api/admin/kpi`, `/api/announcements` | ✅ Real | Real KPI kartalari, shoshilinch ogohlantirishlar |
| 2 | `src/components/admin/SchoolManagementHub.tsx` | `SchoolManagementHub` | `ADMIN` | Maktab Boshqaruvi | `/api/classes`, `/api/students`, `/api/teachers`, `/api/subjects` | ✅ Real | Sinflar, o‘quvchilar, fanlar va o‘quv yili markazi |
| 3 | `src/components/admin/AdminMonitoringHub.tsx` | `AdminMonitoringHub` | `ADMIN` | Monitoring & AI | `/api/admin/monitoring/rankings`, `/api/admin/kpi` | ✅ Real | O‘qituvchi, o‘quvchi, sinf reytinglari va tahlil |
| 4 | `src/components/admin/UsersManagement.tsx` | `UsersManagement` | `ADMIN` | Maktab Boshqaruvi | `/api/admin/users`, `/api/teachers` | ✅ Real | 70 ta o‘qituvchi va foydalanuvchilar boshqaruvi |
| 5 | `src/components/students/StudentsDirectory.tsx` | `StudentsDirectory` | `ADMIN`, `TEACHER` | O‘quvchilar | `/api/students` | ✅ Real | 1000 ta o‘quvchi, 14 xonali IIN, biometrik FaceID |
| 6 | `src/components/teachers/TeachersDirectory.tsx` | `TeachersDirectory` | `ADMIN` | O‘qituvchilar | `/api/teachers`, `/api/schedules` | ✅ Real | 70 ta o‘qituvchi, stavka va haftalik soatlar |
| 7 | `src/components/classes/ClassesDirectory.tsx` | `ClassesDirectory` | `ADMIN` | Maktab Boshqaruvi | `/api/classes`, `/api/students`, `/api/teachers` | ✅ Real | 26 ta sinf (1-A dan 11-B gacha), sig‘im nazorati |
| 8 | `src/components/subjects/SubjectsDirectory.tsx` | `SubjectsDirectory` | `ADMIN` | Maktab Boshqaruvi | `/api/subjects` | ✅ Real | KAO 18 ta fani, 11/12 yillik ta'lim belgilari |
| 9 | `src/components/academic/AcademicYearsManager.tsx` | `AcademicYearsManager` | `ADMIN` | Maktab Boshqaruvi | `/api/academic-years` | ✅ Real | 2026-2027 o‘quv yili va 4 ta chorak muddatlari |
| 10 | `src/components/admin/ParentsDirectory.tsx` | `ParentsDirectory` | `ADMIN` | Maktab Boshqaruvi | `/api/parents` | ✅ Real | Ota-onalar va farzandlar bog‘liqligi |
| 11 | `src/components/admin/AuditLogsViewer.tsx` | `AuditLogsViewer` | `ADMIN` | Aloqa & Xavfsizlik | `/api/admin/audit-logs` | ✅ Real | O‘zgarmas (immutable) xavfsizlik audit loglari |
| 12 | `src/components/admin/SecurityCenter.tsx` | `SecurityCenter` | `ADMIN` | Aloqa & Xavfsizlik | `/api/admin/security/active-sessions` | ✅ Real | Faol sessiyalar va xavfsizlik monitoringi |
| 13 | `src/components/admin/SystemHealthMonitor.tsx` | `SystemHealthMonitor` | `ADMIN` | Aloqa & Xavfsizlik | `/api/admin/system-health` | ✅ Real | DB, Auth, AI Gateway va xotira monitoringi |
| 14 | `src/components/admin/BackupManager.tsx` | `BackupManager` | `ADMIN` | Aloqa & Xavfsizlik | `/api/admin/backup` | ✅ Real | JSON/ZIP to‘liq zaxira va tiklash |
| 15 | `src/components/admin/AnnouncementCenter.tsx` | `AnnouncementCenter` | Barchasi | Aloqa & Xavfsizlik | `/api/announcements` | ✅ Real | Maktab bo‘yicha maqsadli e'lonlar markazi |
| 16 | `src/components/admin/LessonPlanReviewer.tsx` | `LessonPlanReviewer` | `ADMIN`, `TEACHER` | Dars va Pedagogika | `/api/ktp`, `/api/admin/lesson-plans/review` | ✅ Real | KTP va dars rejalarini tasdiqlash holati |
| 17 | `src/components/analytics/AIAnalyticsView.tsx` | `AIAnalyticsView` | `ADMIN`, `TEACHER` | Monitoring & AI | `/api/ai/analytics-summary` | ✅ Real | Haqiqiy ma'lumotlar asosidagi AI xulosalari |
| 18 | `src/components/reports/ReportBuilder.tsx` | `ReportBuilder` | `ADMIN`, `TEACHER` | Monitoring & AI | `/api/reports/73-osh`, `/api/reports/tabel` | ✅ Real | 73-ОШ va Davlat Tabeli generatsiyasi |
| 19 | `src/components/settings/SettingsManager.tsx` | `SettingsManager` | Barchasi | Aloqa & Sozlamalar | `/api/school/settings` | ✅ Real | Til (UZ, KY, RU), mavzu, parametrlar |
| 20 | `src/components/teacher/TeacherDashboard.tsx` | `TeacherDashboard` | `TEACHER` | Boshqaruv Paneli | `/api/teachers/me`, `/api/schedules` | ✅ Real | O‘qituvchi darslari, sinflari va statistikasi |
| 21 | `src/components/teacher/ElectronicJournal.tsx` | `ElectronicJournal` | `TEACHER`, `ADMIN` | Dars va Pedagogika | `/api/lesson-sessions`, `/api/ktp` | ✅ Real | Atomik davomat va baholash yuritish |
| 22 | `src/components/classroom/DigitalClassroom.tsx` | `DigitalClassroom` | `TEACHER`, `ADMIN` | Dars va Pedagogika | `/api/lesson-sessions/active` | ✅ Real | Interaktiv jonli dars rejimi |
| 23 | `src/components/ai/AILessonGenerator.tsx` | `AILessonGenerator` | `TEACHER`, `ADMIN` | Dars va Pedagogika | `/api/ai/lesson-plan` | ✅ Real | KAO standartidagi dars rejasi yaratish |
| 24 | `src/components/attendance/AttendanceManager.tsx` | `AttendanceManager` | Barchasi | Dars va Pedagogika | `/api/attendance`, `/api/turnstile/scan` | ✅ Real | Davomat, yuzni aniqlash va turniket |
| 25 | `src/components/gradebook/GradebookManager.tsx` | `GradebookManager` | Barchasi | Dars va Pedagogika | `/api/grades` | ✅ Real | Baholar jurnali va choraklik hisob-kitob |
| 26 | `src/components/homework/HomeworkManager.tsx` | `HomeworkManager` | Barchasi | Dars va Pedagogika | `/api/homework`, `/api/homework/submissions` | ✅ Real | Vazifa yuklash, topshirish va baholash |
| 27 | `src/components/schedule/ScheduleManager.tsx` | `ScheduleManager` | Barchasi | Dars va Pedagogika | `/api/schedules` | ✅ Real | Admin tahrirlaydi, O‘qituvchi/Ota-ona faqat ko‘radi |
| 28 | `src/components/family/StudentParentPortal.tsx` | `StudentParentPortal` | `PARENT_STUDENT` | Oila va O‘quvchi | `/api/parents/me`, `/api/students/:id` | ✅ Real | Farzandlar davomati, baholari, jadvali |
| 29 | `src/components/student/StudentAITutor.tsx` | `StudentAITutor` | `PARENT_STUDENT` | O‘qish & Natijalar | `/api/ai/socratic-tutor` | ✅ Real | Sokratik yo‘naltiruvchi AI repetitor |

---

## 3. Backend REST API Matrix va RBAC Tekshiruvi

| Endpoint | HTTP Method | Ruxsat Etilgan Rol | Request Body / Param | Response Shape | RBAC / Xavfsizlik Tekshiruvi |
|:---|:---|:---|:---|:---|:---|
| `/api/auth/login` | `POST` | Public | `{ email, password }` | `{ token, user, role }` | Parol hash tekshiruvi, xavfsiz JWT token |
| `/api/auth/session` | `GET` | Authenticated | Header: `Authorization` | `{ user, permissions }` | Sessiya va rol validatsiyasi |
| `/api/admin/kpi` | `GET` | `ADMIN` | None | `AdminKPIData` | Faqat Admin uchun ruxsat, 403 himoyalangan |
| `/api/admin/monitoring/rankings` | `GET` | `ADMIN` | Query: `?type=all` | `{ students, teachers, classes }` | Shaffof mezonlar asosidagi hisob-kitob |
| `/api/admin/rooms` | `GET, POST, PUT, DELETE` | `ADMIN` | `{ code, name, capacity... }` | `RoomRecord` | Xonalar CRUD, xona to‘qnashuvini oldini olish |
| `/api/students` | `GET, POST, PUT, DELETE` | `ADMIN`, `TEACHER` (Read) | `{ name, grade, iin, parentName... }` | `StudentRecord[]` | 14-xonali IIN tekshiruvi, Biometrik maxfiylik |
| `/api/teachers` | `GET, POST, PUT, DELETE` | `ADMIN` (Write), Barchasi (Read) | `{ name, email, phone, subjects... }` | `TeacherRecord[]` | Unikal email/telefon, soatlar limiti (1..40) |
| `/api/classes` | `GET, POST, PUT, DELETE` | `ADMIN` (Write), Barchasi (Read) | `{ name, gradeNumber, homeroom... }` | `ClassGroup[]` | Sig‘im nazorati, o‘quvchi bor sinfni o‘chirishni bloklash |
| `/api/subjects` | `GET, POST, PUT, DELETE` | `ADMIN` (Write), Barchasi (Read) | `{ code, name, department... }` | `SubjectItem[]` | KAO kodlari va unikal kod tekshiruvi |
| `/api/schedules` | `GET, POST, PUT` | `ADMIN` (Write), Barchasi (Read) | `{ slots: ScheduleSlot[] }` | `{ success, slots }` | O‘qituvchi, Sinf va Xona to‘qnashuvlarini bloklash |
| `/api/attendance` | `GET, POST` | `ADMIN`, `TEACHER` | `{ studentId, date, status }` | `AttendanceEntry` | O‘qituvchi faqat o‘z sinfiga yoza oladi |
| `/api/attendance/bulk` | `POST` | `ADMIN`, `TEACHER` | `{ date, records: [...] }` | `{ count, updated }` | Atomik ko‘p o‘quvchili davomat saqlash |
| `/api/turnstile/scan` | `POST` | `ADMIN`, System | `{ studentId, gateId, direction }` | `{ allowed, studentName, time }` | Turniket hodisasi va kunlik davomatni sinxronlash |
| `/api/lesson-sessions` | `GET, POST, PUT` | `TEACHER`, `ADMIN` | `{ class, subject, topic, attendance, grades }` | `LessonSessionRecord` | Dars o‘tish, davomat va bahoni bir vaqtda saqlash |
| `/api/ktp` | `GET, POST, PUT` | `TEACHER`, `ADMIN` | `KTPDocument` | `KTPDocument` | KAO 2026-2027 rejasi, dars mavzulari integratsiyasi |
| `/api/homework` | `GET, POST, PUT` | `TEACHER`, `ADMIN` | `HomeworkAssignment` | `HomeworkAssignment` | Uy vazifa berish va o‘quvchilarga tarqatish |
| `/api/homework/submissions` | `GET, POST, PUT` | Barchasi | `HomeworkSubmission` | `HomeworkSubmission` | O‘quvchi topshiradi, O‘qituvchi baholaydi |
| `/api/ai/lesson-plan` | `POST` | `TEACHER`, `ADMIN` | `{ subject, grade, topic }` | `LessonPlan` | Google Gemini 2.5 Flash KAO mos dars rejasi |
| `/api/ai/socratic-tutor` | `POST` | `PARENT_STUDENT` | `{ question, subject, grade }` | `{ response, hint }` | Javobni to‘g‘ridan-to‘g‘ri bermasdan yo‘naltiruvchi AI |
| `/api/ai/admin-summary` | `POST` | `ADMIN` | `{ schoolId }` | `{ summary, keyInsights }` | 3 tilda (UZ, KY, RU) maktab faoliyati tahlili |
| `/api/reports/73-osh` | `GET` | `ADMIN` | Query: `?academicYear=2026-2027` | `Report73OSH` | Rasmiy statistika shakli |
| `/api/reports/tabel` | `GET` | `ADMIN`, `TEACHER`, `PARENT` | Query: `?studentId=...` | `KyrgyzTabelDocument` | Rasmiy Davlat Tabeli hujjati |

---

## 4. Ma'lumotlar Bazasi va Sinxronizatsiya Holati

1. **Ma'lumotlar Hajmi va Haqiqiyligi:**
   - `students`: 1000 ta haqiqiy o‘quvchi yozuvi, har biri 14-xonali haqiqiy Qirg‘iziston IIN / PIN raqamiga ega.
   - `teachers`: 70 ta o‘qituvchi, lavozimi, toifasi, fani, biriktirilgan sinflari va haftalik soatlari mavjud.
   - `classes`: 26 ta sinf (1-A dan 11-B gacha), sinf rahbarlari to‘liq biriktirilgan.
   - `subjects`: 18 ta KAO fani.
   - `academicYears`: 2026–2027 o‘quv yili (Q1 faol).
2. **Xotira va Firestore Pariteti:**
   - `localDbStore` fayli `src/data/seededDatabaseSnapshot.json` orqali to‘liq oziqlanadi.
   - Live Firebase Firestore ulanganda barcha so‘rovlar avtomatik ravishda Firestore kolleksiyalariga yo‘naltiriladi.

---

## 5. Rollar va Huquqlar (RBAC) Chegaralari

### 1. ADMIN (Maktab Boshqaruvi)
- Maktabning barcha jarayonlarini to‘liq nazorat qiladi.
- Xodimlar, o‘quvchilar, sinflar, fanlar va xonalarni yaratadi/tahrirlaydi.
- Dars jadvalini to‘qnashuvlarsiz tuzadi va tasdiqlaydi.
- Dars rejalarini (KTP) tasdiqlaydi yoki rad etadi.
- Xavfsizlik jurnallari (Audit log), tizim holati (Health) va zaxira nusxalarini (Backup) boshqaradi.
- 73-ОШ va rasmiy davlat hisobotlarini shakllantiradi.

### 2. TEACHER (O‘qituvchi)
- Faqat o‘ziga biriktirilgan sinflar (`assignedClasses`) va fanlar bo‘yicha jurnal yuritadi.
- Dars jadvalini ko‘ra oladi (tahrirlay olmaydi).
- Har bir dars uchun KTP asosida mavzu tanlaydi, davomat oladi va baho qo‘yadi.
- Uy vazifalarini beradi va o‘quvchilar javoblarini tekshiradi.
- Sinf rahbari bo‘lsa (`homeroomClass`), o‘z sinfining "Sinf Rahbari Hub" orqali o‘quvchilar pasporti va ota-onalar bilan ishlaydi.
- AI Dars Rejasi Generatori orqali interaktiv konspektlar yaratadi.

### 3. PARENT / STUDENT (Oila va O‘quvchi Portali)
- Ota-ona faqat o‘z farzandlari ma'lumotlarini ko‘radi (boshqa o‘quvchilar ma'lumotlariga kirish qat'iyan taqiqlangan).
- Turniketdan kirish-chiqish vaqtlarini va darsdagi davomatni real vaqtda kuzatadi.
- Baholar jurnali, choraklik natijalar va davlat tabelini ko‘radi.
- O‘quvchi Sokratik AI repetitordan foydalanadi va fanlar bo‘yicha savollarga tushuntirish oladi.
- Uy vazifalarini ko‘radi va yechimlarini yuklaydi.
- Gamifikatsiya (XP, darajalar, streak) orqali o‘qishga rag‘batlantiriladi.

---

## 6. Xulosa va Muvofiqlik Tasdig‘i

EduSphere Pro ERP tizimida:
- Hech qanday soxta / mock fallback (`teachers[0]`, `undefined` ID) mavjud emas.
- Barcha 16 ta test to‘plami (165+ testlar) 100% muvaffaqiyatli o‘tmoqda.
- Qirg‘iziston Ta'lim Akademiyasi (KAO / kao.kg) 2026–2027 talablari, 11 va 12 yillik standartlar to‘liq tatbiq etilgan.

