# EduSphere Pro — Admin API Shartnomasi (ADMIN_API_CONTRACT.md)

**Versiya:** 3.0.0-PROD  
**Sana:** 2026-09-05  

---

## 1. Autentifikatsiya va Sessiya Boshqaruvi

### `POST /api/auth/login`
- **Tavsif:** Foydalanuvchi tizimga kirishi.
- **Ruxsat:** Public
- **Request Body:**
  ```json
  { "email": "admin@edusphere.school", "password": "password123" }
  ```
- **Response Shape:**
  ```json
  {
    "success": true,
    "token": "jwt-token-string",
    "user": { "id": "usr-admin", "name": "Direktor", "role": "admin", "schoolId": "school-71-tashkent" }
  }
  ```
- **Xatoliklar:** `400 Bad Request` (noto‘g‘ri format), `401 Unauthorized` (parol xato).

---

## 2. Maktab Boshqaruvi va Monitoring API

### `GET /api/admin/kpi`
- **Tavsif:** Maktabning real vaqt KPI ko‘rsatkichlari, ogohlantirishlar va sinflar reytingi.
- **Ruxsat:** `ADMIN`
- **Response Shape:** `AdminKPIData`
  ```json
  {
    "totalStudents": 1000,
    "activeStudents": 1000,
    "totalTeachers": 70,
    "activeTeachers": 70,
    "totalClasses": 26,
    "totalSubjects": 18,
    "todayAttendanceRate": 96.4,
    "absentStudentsCount": 36,
    "lateStudentsCount": 12,
    "averageGrade": 4.12,
    "genderDistribution": { "male": 485, "female": 515 },
    "classBreakdown": [...],
    "urgentAlerts": { "atRiskStudents": [...], "lowAttendanceClasses": [...], "delayedTeachers": [...] },
    "classRanking": [...]
  }
  ```

### `GET /api/admin/monitoring/rankings?type=all`
- **Tavsif:** Shaffof vaznli formulalar asosidagi reytinglar.
- **Ruxsat:** `ADMIN`
- **Response Shape:**
  ```json
  {
    "students": [ { "rank": 1, "name": "...", "totalScore": 98.4, "trend": "up" } ],
    "teachers": [ { "rank": 1, "name": "...", "conductedSessionsCount": 18, "totalScore": 96.2 } ],
    "classes": [ { "rank": 1, "className": "10-A", "attendanceRate": 98.2, "avgGrade": 4.45 } ],
    "weights": { "attendance": 0.4, "grades": 0.4, "homework": 0.2 }
  }
  ```

### `GET, POST, PUT, DELETE /api/admin/rooms`
- **Tavsif:** Maktab xonalari va laboratoriyalari CRUD boshqaruvi.
- **Ruxsat:** `ADMIN`
- **Request Body (POST/PUT):**
  ```json
  { "code": "ROOM-101", "name": "101-kabinet (Matematika)", "capacity": 30, "floor": 1, "type": "classroom", "equipment": ["smart_board", "projector"] }
  ```
- **Response:** `RoomRecord`

---

## 3. Asosiy Akademik Relyatsion Modellar CRUD

### `GET, POST, PUT, DELETE /api/students`
- **Ruxsat:** `ADMIN` (Write), `ADMIN`/`TEACHER` (Read)
- **Request Body (POST/PUT):**
  ```json
  { "name": "Azamat Alimov", "grade": "7-A", "iin": "10101201012345", "parentName": "Dilnoza Alimova", "parentPhone": "+996555123456" }
  ```
- **Xavfsizlik:** 14-xonali IIN Modulo 11 tekshiruvi. 512-o‘lchamli biometrik vektorlar umumiy ro‘yxatda yashiriladi.

### `GET, POST, PUT, DELETE /api/teachers`
- **Ruxsat:** `ADMIN` (Write), Barchasi (Read)
- **Request Body (POST/PUT):**
  ```json
  { "name": "Aygul Asanova", "email": "aygul@edusphere.school", "phone": "+996555987654", "subjects": ["sbj-math-primary"], "assignedClasses": ["5-A", "5-B"], "totalLessonsWeekly": 20 }
  ```
- **Validatsiya:** Unikal email va telefon raqam, soatlar 1..40 oralig‘ida.

### `GET, POST, PUT, DELETE /api/classes`
- **Ruxsat:** `ADMIN` (Write), Barchasi (Read)
- **Validatsiya:** O‘quvchilari mavjud sinfni o‘chirish `409 Conflict` bilan bloklanadi.

### `GET, POST, PUT, DELETE /api/subjects`
- **Ruxsat:** `ADMIN` (Write), Barchasi (Read)
- **Validatsiya:** KAO davlat standarti kodlari, unikal fan kodi.

---

## 4. Dars Jadvali, Davomat va Elektron Jurnal

### `GET, POST, PUT /api/schedules`
- **Ruxsat:** `ADMIN` (Write), Barchasi (Read)
- **To‘qnashuv Blokirovkasi:** Teacher, Class va Room to‘qnashuvlari `409 Conflict` bilan to‘liq bloklanadi.

### `POST /api/lesson-sessions`
- **Ruxsat:** `TEACHER`, `ADMIN`
- **Request Body:**
  ```json
  {
    "className": "7-A",
    "subject": "Algebra",
    "date": "2026-09-05",
    "period": 2,
    "topic": "Chiziqli tenglamalar sistemasi",
    "attendance": { "present": ["stu-0001", "stu-0002"], "absent": [], "late": [] },
    "grades": { "stu-0001": 5, "stu-0002": 4 },
    "homework": "14-mashq, 1-4-misollar"
  }
  ```
- **Sinxronizatsiya:** Davomat, baholar va KTP mavzusi atomik saqlanadi.

---

## 5. Xavfsizlik va Davlat Hisobotlari

### `GET /api/admin/audit-logs`
- **Ruxsat:** `ADMIN`
- **Xususiyati:** O‘zgarmas (immutable) xavfsizlik audit jurnali.

### `GET /api/reports/73-osh`
- **Ruxsat:** `ADMIN`
- **Response:** `Report73OSH` (Davlat statistik shakli).

### `GET /api/reports/tabel?studentId=...`
- **Ruxsat:** `ADMIN`, `TEACHER`, `PARENT`
- **Response:** `KyrgyzTabelDocument` (Davlat Tabeli).

