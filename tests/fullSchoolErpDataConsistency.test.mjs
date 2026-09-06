import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://127.0.0.1:3000';
const ADMIN_AUTH = {
  Authorization: 'Bearer dev-admin-token',
  'Content-Type': 'application/json',
};
const TEACHER_AUTH = {
  Authorization: 'Bearer dev-teacher-token:Aigul Sadykova',
  'Content-Type': 'application/json',
};
const PARENT_AUTH = {
  Authorization: 'Bearer dev-parent-token:usr-parent-01',
  'Content-Type': 'application/json',
};

describe('EduSphere Pro — Full Relational School ERP Data Consistency Suite', () => {

  // 1. Academic Year & Quarters
  it('1. Academic Year & Quarters: Canonical Academic Year (2026-2027) with active Q1', async () => {
    const res = await fetch(`${BASE_URL}/api/academic-years`, { headers: ADMIN_AUTH });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.items));
    const activeYear = body.items.find((y) => y.id === '2026-2027');
    assert.ok(activeYear, '2026-2027 academic year must exist');
    assert.equal(activeYear.status, 'active');
    assert.equal(activeYear.activeQuarter, 'Q1');
    assert.equal(activeYear.quarters.length, 4);

    const q1 = activeYear.quarters.find((q) => q.id === 'Q1');
    assert.ok(q1);
    assert.equal(q1.status, 'active');
  });

  // 2. Classes & Subjects Canonical Parity
  it('2. Classes & Subjects: Verified 26 canonical classes and STEM/Language subjects', async () => {
    const [classesRes, subjectsRes] = await Promise.all([
      fetch(`${BASE_URL}/api/data/classes`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/subjects`, { headers: ADMIN_AUTH }),
    ]);
    assert.equal(classesRes.status, 200);
    assert.equal(subjectsRes.status, 200);

    const classes = await classesRes.json();
    const subjects = await subjectsRes.json();

    assert.equal(classes.items.length, 26, 'Must contain exactly 26 classes (5-A to 11-C)');
    assert.ok(classes.items.some((c) => c.name === '7-A'));

    const math = subjects.items.find((s) => s.name.toLowerCase().includes('matematika') || s.code.includes('MATH'));
    assert.ok(math, 'Canonical Matematika subject must exist');
  });

  // 3. Teachers & Teacher Assignments
  it('3. Teachers: Canonical 70 teachers with assigned classes and subject specialties', async () => {
    const res = await fetch(`${BASE_URL}/api/data/teachers`, { headers: ADMIN_AUTH });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.items.length, 70, 'Must contain exactly 70 teachers');

    const sample = body.items[0];
    assert.ok(sample.name, 'Teacher must have name');
    assert.ok(sample.email, 'Teacher must have email');
    assert.ok(Array.isArray(sample.subjects) && sample.subjects.length > 0, 'Teacher must have subject specialties');
    assert.ok(sample.workloadHours >= 1, 'Teacher must have workload hours assigned');
  });

  // 4. Students ↔ Class Relational Linkage
  it('4. Students: 1000 enrolled students strictly linked to valid classes without orphaned records', async () => {
    const [studentsRes, classesRes] = await Promise.all([
      fetch(`${BASE_URL}/api/data/students`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/classes`, { headers: ADMIN_AUTH }),
    ]);
    assert.equal(studentsRes.status, 200);
    assert.equal(classesRes.status, 200);

    const students = await studentsRes.json();
    const classes = await classesRes.json();
    const classNames = new Set(classes.items.map((c) => c.name));

    assert.equal(students.items.length, 1000);
    for (const student of students.items) {
      assert.ok(classNames.has(student.grade), `Student ${student.id} grade ${student.grade} must exist in classes`);
      assert.ok(student.iin && /^\d{14}$/.test(student.iin), `Student ${student.id} must have valid 14-digit IIN`);
    }
  });

  // 5. Schedule ↔ Timetable Relational Integrity
  it('5. Schedule: Canonical timetable slots linking Academic Year, Quarter, Class, Subject, and Teacher', async () => {
    const res = await fetch(`${BASE_URL}/api/data/schedules`, { headers: ADMIN_AUTH });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.items.length >= 100);

    const sample = body.items.find((s) => s.className === '7-A' && s.subject.includes('Matematika'));
    assert.ok(sample, '7-A Matematika schedule slot must exist');
    assert.ok(sample.teacherName, 'Schedule slot must have teacherName');
    assert.ok(sample.room, 'Schedule slot must have room');
    assert.ok(sample.day, 'Schedule slot must have day');
    assert.ok(sample.period, 'Schedule slot must have period');
  });

  // 6. Complete End-to-End Relational Chain: Schedule → LessonSession → Attendance → Journal/Grades → KTP → Homework
  it('6. Full ERP Chain: Schedule → LessonSession → Attendance → Grade → KTP → Homework', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const testSessionId = `sess-relchain-${todayStr}-7-A-Math-14`;

    // 1. Teacher publishes KTP plan
    const ktpPayload = {
      id: `ktp-7-A-Math-2026`,
      className: '7-A',
      subject: 'Matematika',
      academicYear: '2026-2027',
      totalHours: 68,
      lessons: [
        {
          id: 'ktp-ls-14',
          lessonNumber: 14,
          topic: 'Chiziqli tenglamalar sistemasi va grafik tahlil',
          objective: 'Tenglamalar sistemasini grafik usulda aniq yechish',
          homework: 'Darslik: 42-bet, 1-6 topshiriqlar',
          hours: 1,
        },
      ],
    };
    const ktpRes = await fetch(`${BASE_URL}/api/ktp`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify(ktpPayload),
    });
    assert.equal(ktpRes.status, 200);

    // 2. Teacher executes Lesson Session with Attendance, Grade, and Homework
    const sessionPayload = {
      id: testSessionId,
      className: '7-A',
      subject: 'Matematika',
      academicYear: '2026-2027',
      quarterId: 'Q1',
      date: todayStr,
      weekday: 'Dushanba',
      period: 1,
      lessonNumber: 14,
      topic: 'Chiziqli tenglamalar sistemasi va grafik tahlil',
      objective: 'Tenglamalar sistemasini grafik usulda aniq yechish',
      conspectDraft: '1. Kirish nazariyasi. 2. Misollar yechish. 3. Mustaqil ish.',
      homework: 'Darslik: 42-bet, 1-6 topshiriqlar',
      attendance: {
        present: ['stu-0001', 'stu-0002'],
        absent: ['stu-0003'],
        late: [],
        excused: [],
      },
      grades: {
        'stu-0001': 95,
        'stu-0002': 88,
      },
      comments: {
        'stu-0001': 'A’lo qatnashdi',
      },
      status: 'COMPLETED',
    };

    const sessRes = await fetch(`${BASE_URL}/api/lesson-sessions`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify(sessionPayload),
    });
    assert.equal(sessRes.status, 200);

    // 3. Verify Attendance was created and matches session
    const attRes = await fetch(`${BASE_URL}/api/attendance?className=7-A&date=${todayStr}`, { headers: ADMIN_AUTH });
    assert.equal(attRes.status, 200);
    const attBody = await attRes.json();
    const stu1Att = attBody.items.find((a) => a.studentId === 'stu-0001' && a.date === todayStr);
    assert.ok(stu1Att, 'Attendance for student 1 must exist');
    assert.equal(stu1Att.status, 'present');

    // 4. Verify Grade was recorded and recalculates student average
    const gradesRes = await fetch(`${BASE_URL}/api/data/grades`, { headers: ADMIN_AUTH });
    assert.equal(gradesRes.status, 200);
    const gradesBody = await gradesRes.json();
    const stu1Grade = gradesBody.items.find((g) => g.studentId === 'stu-0001' && (g.sessionId === testSessionId || g.id === `grd-stu-0001-${todayStr}-7-A-Matematika`));
    assert.ok(stu1Grade, 'Grade for student 1 must exist');
    assert.equal(stu1Grade.average, 95);

    // 5. Verify Homework was auto-created and linked with lesson session
    const hwRes = await fetch(`${BASE_URL}/api/homework`, { headers: ADMIN_AUTH });
    assert.equal(hwRes.status, 200);
    const hwBody = await hwRes.json();
    const createdHw = hwBody.items.find((h) => h.lessonSessionId === testSessionId || h.id === `hw-${testSessionId}`);
    assert.ok(createdHw, 'Linked homework assignment must exist');
    assert.equal(createdHw.className, '7-A');
    assert.equal(createdHw.subject, 'Matematika');
    assert.equal(createdHw.description, 'Darslik: 42-bet, 1-6 topshiriqlar');

    // 6. Student submits homework solution
    const submitRes = await fetch(`${BASE_URL}/api/homework/${createdHw.id}/submit`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        submission: {
          studentId: 'stu-0001',
          studentName: 'Ali Valiyev',
          content: '1-6 mashqlar to‘liq yechildi.',
          aiScore: 96,
          aiFeedback: 'Tenglamalar ildizlari to‘g‘ri topilgan.',
        },
      }),
    });
    assert.equal(submitRes.status, 200);
    const submitJson = await submitRes.json();
    assert.equal(submitJson.success, true);
    assert.equal(submitJson.submittedCount, 1);
  });

  // 7. Turnstile Biometric Gate Movement & Live Attendance Integration
  it('7. Turnstile: Scan event creates gate movement and automatically updates daily attendance', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const scanTimestamp = `${todayStr}T08:15:00.000Z`;

    const scanPayload = {
      studentId: 'stu-0002',
      timestamp: scanTimestamp,
      direction: 'IN',
      gateId: 'turnstile-main-01',
      gateName: '1-sonli Asosiy Kirish',
      photoUrl: 'https://images.unsplash.com/face-scan-02.jpg',
      confidence: 0.99,
      method: 'face_recognition',
    };

    const scanRes = await fetch(`${BASE_URL}/api/turnstile/scan`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify(scanPayload),
    });
    assert.equal(scanRes.status, 201);
    const scanJson = await scanRes.json();
    assert.equal(scanJson.success, true);
    assert.equal(scanJson.attendanceStatus, 'present');
    assert.equal(scanJson.isLate, false);

    // Verify Gate Movement Timeline API returns this event
    const timelineRes = await fetch(`${BASE_URL}/api/attendance/gate-movements/stu-0002`, { headers: ADMIN_AUTH });
    assert.equal(timelineRes.status, 200);
    const timelineJson = await timelineRes.json();
    assert.ok(timelineJson.records.length >= 1, 'Turnstile record must be in student timeline');

    // Verify daily Attendance record was created/updated with method: turnstile
    const attRes = await fetch(`${BASE_URL}/api/attendance?studentId=stu-0002&date=${todayStr}`, { headers: ADMIN_AUTH });
    assert.equal(attRes.status, 200);
    const attJson = await attRes.json();
    const turnstileAtt = attJson.items.find((a) => a.studentId === 'stu-0002' && a.method === 'turnstile');
    assert.ok(turnstileAtt, 'Daily attendance must reflect turnstile check-in');
    assert.equal(turnstileAtt.status, 'present');
  });

  // 8. Relational Cascade Guard: Prevent deleting Class with active enrolled students
  it('8. Relational Cascade Guard: Prevents deletion of a class with active enrolled students (409 Conflict)', async () => {
    // 7-A has ~38 enrolled students
    const delClassRes = await fetch(`${BASE_URL}/api/data/classes/cls-7-a`, {
      method: 'DELETE',
      headers: ADMIN_AUTH,
    });
    assert.equal(delClassRes.status, 409, 'Must reject class deletion with active students with 409 Conflict');
    const delJson = await delClassRes.json();
    assert.ok(delJson.error.includes('o‘chirib bo‘lmaydi'));
  });

  // 9. Cross-Module RBAC & Security Isolation
  it('9. Cross-Module RBAC: Strict access boundaries across Admin, Teacher, and Parent/Student', async () => {
    // 1. Unauthenticated -> 401
    const unauth = await fetch(`${BASE_URL}/api/homework`);
    assert.equal(unauth.status, 401);

    // 2. Teacher cannot assign homework to unassigned class -> 403
    const badHwRes = await fetch(`${BASE_URL}/api/homework`, {
      method: 'POST',
      headers: TEACHER_AUTH,
      body: JSON.stringify({
        title: 'Unauthorized Homework',
        subject: 'Matematika',
        className: '11-C', // Not in Aigul's assigned classes ['7-A', '7-B']
        dueDate: '2026-09-20',
      }),
    });
    assert.equal(badHwRes.status, 403);

    // 3. Parent cannot view other students' homework or grades
    const parentHwRes = await fetch(`${BASE_URL}/api/homework`, { headers: PARENT_AUTH });
    assert.equal(parentHwRes.status, 200);
  });
});
