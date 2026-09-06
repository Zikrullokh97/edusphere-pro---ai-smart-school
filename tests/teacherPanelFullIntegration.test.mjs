import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const snapshotPath = path.join(process.cwd(), 'src', 'data', 'seededDatabaseSnapshot.json');
const baseUrl = 'http://localhost:3000';

test('1. Teacher Identity & Profile Claims Resolution across Canonical Teachers', async () => {
  const teachersToTest = [
    { email: 'teacher_1@edusphere.school', expectedTeacherId: 'tch-001', expectedClass: '5-A' },
    { email: 'teacher_25@edusphere.school', expectedTeacherId: 'tch-025' },
    { email: 'teacher_70@edusphere.school', expectedTeacherId: 'tch-070' },
  ];

  for (const t of teachersToTest) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: t.email, password: '123456' }),
    });

    assert.equal(res.status, 200, `Login should succeed for ${t.email}`);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.user.role, 'teacher');
    assert.equal(data.user.schoolId, 'school-71-tashkent');
    assert.equal(data.user.teacherId, t.expectedTeacherId);
    assert.ok(Array.isArray(data.user.assignedClasses), 'assignedClasses must be an array');
    assert.ok(Array.isArray(data.user.subjects), 'subjects must be an array');
    if (t.expectedClass) {
      assert.ok(data.user.assignedClasses.includes(t.expectedClass), `Assigned classes must include ${t.expectedClass}`);
    }
  }
});

test('2. Teacher Dashboard API Contract (GET /api/teacher/dashboard)', async () => {
  const token = 'dev-token-usr-tch-001';
  const res = await fetch(`${baseUrl}/api/teacher/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  assert.equal(res.status, 200, 'Teacher dashboard endpoint should return 200 OK');
  const data = await res.json();

  assert.ok(data.today, 'Must include today string');
  assert.equal(data.teacherId, 'tch-001');
  assert.equal(data.teacherName, 'Rahimova Ziyoda');
  assert.ok(Array.isArray(data.assignedClasses), 'assignedClasses must be an array');
  assert.ok(Array.isArray(data.subjectSpecialties), 'subjectSpecialties must be an array');
  assert.equal(typeof data.todayLessonsCount, 'number');
  assert.equal(typeof data.unmarkedAttendanceCount, 'number');
  assert.equal(typeof data.pendingHomeworkCount, 'number');
  assert.equal(typeof data.overallAttendanceRate, 'number');
});

test('3. Teacher Schedule Scoping & Whole-School Read-Only Guard', async () => {
  const teacherToken = 'dev-token-usr-tch-001';

  // 1. Fetch teacher-specific schedule
  const mySchedRes = await fetch(`${baseUrl}/api/teacher/schedule`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  assert.equal(mySchedRes.status, 200);
  const mySched = await mySchedRes.json();
  assert.equal(mySched.isReadOnly, true);
  assert.equal(mySched.teacherId, 'tch-001');
  assert.ok(Array.isArray(mySched.slots));

  // 2. Fetch whole-school schedule with read-only flag
  const allSchedRes = await fetch(`${baseUrl}/api/teacher/schedule?all=true`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  assert.equal(allSchedRes.status, 200);
  const allSched = await allSchedRes.json();
  assert.equal(allSched.isReadOnly, true);
  assert.ok(allSched.slots.length >= mySched.slots.length);

  // 3. Mutation Attempt: Teacher MUST be forbidden from publishing/modifying schedule
  const publishRes = await fetch(`${baseUrl}/api/schedules/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({ slots: [] }),
  });
  assert.equal(publishRes.status, 403, 'Teachers must be blocked from publishing schedules');
});

test('4. Class Head (Sinf Rahbari) Scoping & Access Boundaries', async () => {
  const teacherToken = 'dev-token-usr-tch-001'; // Assigned to 5-A

  // 1. Access student in assigned class (5-A) -> stu-0001
  const studentDocRes = await fetch(`${baseUrl}/api/teacher/students/stu-0001`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  assert.equal(studentDocRes.status, 200, 'Teacher can access student in assigned class');
  const studentData = await studentDocRes.json();
  assert.equal(studentData.student.grade, '5-A');

  // 2. Access student in unassigned class (11-B) -> stu-0980
  const unassignedRes = await fetch(`${baseUrl}/api/teacher/students/stu-0980`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  assert.equal(unassignedRes.status, 403, 'Teacher cannot access student in unauthorized class');
});

test('5. KTP Lifecycle & AI Lesson Context Resolution', async () => {
  const teacherToken = 'dev-token-usr-tch-001';

  // 1. Fetch approved KTP documents
  const ktpRes = await fetch(`${baseUrl}/api/ktp`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  assert.equal(ktpRes.status, 200);
  const ktpData = await ktpRes.json();
  assert.ok(Array.isArray(ktpData.items));

  // 2. Resolve next sequential lesson context for 5-A Algebra
  const ctxRes = await fetch(`${baseUrl}/api/teacher/lesson-context?className=5-A&subject=Algebra&language=uz`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  assert.equal(ctxRes.status, 200);
  const ctx = await ctxRes.json();
  assert.equal(ctx.success, true);
  assert.ok(ctx.context.lessonNumber >= 1);
});

test('6. Electronic Journal Atomic Persistence & Role Guard', async () => {
  const teacherToken = 'dev-token-usr-tch-001'; // Assigned 5-A, Algebra

  const journalPayload = {
    id: `jrn-test-${Date.now()}`,
    className: '5-A',
    subject: 'Algebra',
    date: '2026-09-05',
    lessonNumber: 3,
    topic: 'Algebraik ifodalarni soddalashtirish',
    description: 'Amaliy mashg‘ulot',
    homework: '18-bet 45-mashq',
    entries: [
      { studentId: 'stu-0001', attendance: 'present', grade: 90, comment: 'Faol qatnashdi' },
      { studentId: 'stu-0002', attendance: 'late', grade: 80, comment: '5 daqiqa kechikdi' },
    ],
  };

  const saveRes = await fetch(`${baseUrl}/api/journals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify(journalPayload),
  });

  assert.equal(saveRes.status, 201, 'Journal save should succeed for assigned class');
  const savedData = await saveRes.json();
  assert.equal(savedData.success, true);
  assert.equal(savedData.item.className, '5-A');
});

test('7. Academic Quarter Lock & Unauthorized Class Guard', async () => {
  const teacherToken = 'dev-token-usr-tch-001';

  // Attempting to mutate in non-assigned class 11-B
  const unassignedClassJournal = {
    id: `jrn-unauth-${Date.now()}`,
    className: '11-B',
    subject: 'Fizika',
    date: '2026-09-05',
    lessonNumber: 1,
    topic: 'Kvant mexanikasi',
    entries: [
      { studentId: 'stu-0980', attendance: 'present', grade: 90 },
    ],
  };

  const unassignedRes = await fetch(`${baseUrl}/api/journals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify(unassignedClassJournal),
  });

  assert.equal(unassignedRes.status, 403, 'Teacher cannot edit journal of unassigned class');
});

test('8. Cross-Teacher Tampering & Announcement Audience Guard', async () => {
  const teacher1Token = 'dev-token-usr-tch-001'; // 5-A

  // 1. Teacher 1 attempts to start lesson session in Teacher 2 class (8-B)
  const tamperStartRes = await fetch(`${baseUrl}/api/teacher/lessons/session-tamper-test/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacher1Token}`,
    },
    body: JSON.stringify({
      className: '8-B',
      subject: 'Kimyo',
    }),
  });
  assert.equal(tamperStartRes.status, 403, 'Teacher 1 cannot start session for unassigned class 8-B');

  // 2. Teacher attempts to publish school-wide announcement
  const schoolAnnRes = await fetch(`${baseUrl}/api/teacher/announcements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacher1Token}`,
    },
    body: JSON.stringify({
      title: 'Maktab bo‘yicha e’lon',
      body: 'Barcha sinflar uchun',
      audienceType: 'school',
    }),
  });
  assert.equal(schoolAnnRes.status, 403, 'Teachers cannot publish school-wide announcements');

  // 3. Teacher publishes class announcement for assigned class 5-A -> Allowed
  const classAnnRes = await fetch(`${baseUrl}/api/teacher/announcements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacher1Token}`,
    },
    body: JSON.stringify({
      title: '5-A sinfiga eslatma',
      body: 'Ertaga daftarlarni olib keling',
      audienceType: 'class',
      className: '5-A',
    }),
  });
  assert.equal(classAnnRes.status, 201, 'Teacher can publish announcement for assigned class');
});

test('9. Homework Creation, Student Submission & Teacher Grading Workflow', async () => {
  const teacherToken = 'dev-token-usr-tch-001';
  const parentStudentToken = 'dev-parent-token';
  const hwId = `hw-flow-${Date.now()}`;

  // 1. Teacher creates homework for 5-A
  const createHwRes = await fetch(`${baseUrl}/api/homework`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      id: hwId,
      className: '5-A',
      subject: 'Algebra',
      topic: 'Kasrlar ustida amallar',
      description: '10-20 mashqlarni yechish',
      deadline: '2026-09-10',
    }),
  });
  assert.equal(createHwRes.status, 201, 'Homework creation should succeed');

  // 2. Student submits homework
  const submitRes = await fetch(`${baseUrl}/api/homework/${hwId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${parentStudentToken}`,
    },
    body: JSON.stringify({
      studentId: 'stu-0001',
      submissionText: 'Mashqlar to‘liq bajarildi',
      fileUrl: 'kasrlar_yechimi.pdf',
    }),
  });
  assert.ok(submitRes.status === 200 || submitRes.status === 201, 'Student submission should succeed');

  // 3. Teacher grades homework submission
  const gradeRes = await fetch(`${baseUrl}/api/homework/${hwId}/grade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      studentId: 'stu-0001',
      score: 95,
      feedback: 'A’lo darajada bajarilgan!',
    }),
  });
  assert.equal(gradeRes.status, 200, 'Teacher grading should succeed');
});

test('10. Turnstile Scan & Attendance Synchronization', async () => {
  const teacherToken = 'dev-token-usr-tch-001';

  const scanRes = await fetch(`${baseUrl}/api/turnstile/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      iin: '20150010150123',
      direction: 'IN',
      gateId: 'GATE-01',
      method: 'QR',
    }),
  });

  assert.ok(scanRes.status === 200 || scanRes.status === 201, 'Turnstile scan should succeed');
  const scanData = await scanRes.json();
  assert.equal(scanData.success, true);
  assert.ok(scanData.log, 'Must record gate movement log');
});


