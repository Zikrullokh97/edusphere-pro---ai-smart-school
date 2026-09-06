# EduSphere Pro — Ma'lumotlar Relyatsion Strukturasi (DATA_RELATIONSHIPS.md)

**Versiya:** 3.0.0-PROD  
**Sana:** 2026-09-05  

---

## 1. Identifikatorlar (ID) va Relyatsion Bog‘liqlik Modeli

```mermaid
erDiagram
    SCHOOL ||--o{ USER : contains
    SCHOOL ||--o{ STUDENT : enrolls
    SCHOOL ||--o{ TEACHER : employs
    SCHOOL ||--o{ CLASS : organizes
    SCHOOL ||--o{ SUBJECT : teaches
    SCHOOL ||--o{ ACADEMIC_YEAR : schedules

    USER ||--o| TEACHER : "links via teacherId"
    USER ||--o| PARENT : "links via parentId"
    USER ||--o| STUDENT : "links via studentId"

    TEACHER ||--o{ TEACHER_ASSIGNMENT : has
    TEACHER_ASSIGNMENT }|--|| SUBJECT : teaches
    TEACHER_ASSIGNMENT }|--|| CLASS : in

    CLASS ||--o| TEACHER : "homeroomTeacherId"
    CLASS ||--o{ STUDENT : "contains students"

    PARENT ||--o{ PARENT_STUDENT_RELATION : has
    PARENT_STUDENT_RELATION }|--|| STUDENT : "linked child"

    ACADEMIC_YEAR ||--o{ QUARTER : contains
    CLASS ||--o{ SCHEDULE_SLOT : timetabled
    SUBJECT ||--o{ SCHEDULE_SLOT : slot_subject
    TEACHER ||--o{ SCHEDULE_SLOT : slot_teacher

    SCHEDULE_SLOT ||--o{ LESSON_SESSION : creates
    LESSON_SESSION ||--o{ ATTENDANCE_ENTRY : records
    LESSON_SESSION ||--o{ GRADE_ENTRY : evaluates
    LESSON_SESSION ||--o{ HOMEWORK : assigns
    HOMEWORK ||--o{ HOMEWORK_SUBMISSION : receives
```

---

## 2. Asosiy Identifikatorlar va Validatsiya Qoidalari

1. **`schoolId`**: Maktabning yagona IDsi (masalan, `school-71-tashkent`). Barcha ma'lumotlar shu ID orqali izolyatsiya qilinadi (Multi-tenant xavfsizligi).
2. **`userId`**: Firebase Auth UID yoki tizim foydalanuvchi identifikatori (`usr-admin`, `usr-teacher-01` ...).
3. **`teacherId`**: O‘qituvchining rasmiy xodim kodi (`tch-001` ... `tch-070`). 70 ta o‘qituvchining barchasi o‘z `userId` va `TeacherRecord`iga ega.
4. **`studentId`**: O‘quvchining yagona kodi (`stu-0001` ... `stu-1000`). Har bir o‘quvchida:
   - 14-xonali haqiqiy Qirg‘iziston IIN / PIN kodi;
   - `classId` (masalan, `cls-7a`);
   - Biometrik Face ID deskriptori.
5. **`parentId`**: Ota-onaning identifikatori (`par-001` ...). Har bir ota-ona `childrenIds` massivi orqali o‘z farzandlariga bog‘lanadi.
6. **`classId`**: Sinf identifikatori (`cls-1a` ... `cls-11b`). Har bir sinf `homeroomTeacherId` orqali sinf rahbariga ega.
7. **`subjectId`**: KAO davlat standarti bo‘yicha fan kodi (`sbj-kyr-lang`, `sbj-algebra`, `sbj-physics` ...).

---

## 3. Relyatsion Kaskadli Himoya (Data Safety Invariants)
- O‘quvchilari mavjud bo‘lgan sinfni o‘chirish qat'iyan taqiqlanadi (`409 Conflict`).
- O‘qituvchi haftalik soatlari chegaralangan (1..40 soat oralig‘ida).
- Dars jadvalida bir vaqtning o‘zida bir o‘qituvchi, sinf yoki xona 2 ta joyda bo‘lishi mumkin emas (`409 Conflict`).

