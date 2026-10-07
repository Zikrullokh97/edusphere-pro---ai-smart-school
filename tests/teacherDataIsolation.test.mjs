import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = 'http://localhost:3000';

test('1. Multi-Teacher Identity & Profile Claims Isolation', async () => {
  const teacherAccounts = [
    { email: 'teacher_1@edusphere.school', expectedId: 'tch-001', expectedName: 'Rahimova Ziyoda', expectedClass: '5-A' },
    { email: 'teacher_2@edusphere.school', expectedId: 'tch-002', expectedName: 'Valiyevov Bekzod', expectedClass: '5-B' },
    { email: 'teacher_10@edusphere.school', expectedId: 'tch-010', expectedName: 'Ismoilovov Farrux' },
    { email: 'teacher_25@edusphere.school', expectedId: 'tch-025' },
    { email: 'teacher_50@edusphere.school', expectedId: 'tch-050' },
  ];

  for (const acc of teacherAccounts) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: acc.email, password: '123456' }),
    });

    assert.equal(res.status, 200, `Login should succeed for ${acc.email}`);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.user.role, 'teacher');
    assert.equal(data.user.teacherId, acc.expectedId);
    assert.equal(data.user.schoolId, 'school-71-tashkent');

    if (acc.expectedName) {
      assert.equal(data.user.name, acc.expectedName, `Teacher name must match ${acc.expectedName}`);
    }

    if (acc.expectedClass) {
      assert.ok(data.user.assignedClasses.includes(acc.expectedClass), `Must include assigned class ${acc.expectedClass}`);
    }

    assert.ok(data.token, 'Must return authentication token');
  }
});

test('2. Strict Teacher Schedule Isolation & Zero Cross-Teacher Slot Contamination', async () => {
  const tokenTch1 = 'dev-token-usr-tch-001';
  const tokenTch2 = 'dev-token-usr-tch-002';

  const res1 = await fetch(`${baseUrl}/api/teacher/schedule`, {
    headers: { Authorization: `Bearer ${tokenTch1}` },
  });
  assert.equal(res1.status, 200);
  const sched1 = await res1.json();
  assert.equal(sched1.teacherId, 'tch-001');
  assert.equal(sched1.isReadOnly, true);

  const res2 = await fetch(`${baseUrl}/api/teacher/schedule`, {
    headers: { Authorization: `Bearer ${tokenTch2}` },
  });
  assert.equal(res2.status, 200);
  const sched2 = await res2.json();
  assert.equal(sched2.teacherId, 'tch-002');
  assert.equal(sched2.isReadOnly, true);

  for (const slot of sched1.slots) {
    assert.notEqual(slot.teacherId, 'tch-002', 'Teacher 1 schedule must not contain Teacher 2 slots');
    if (slot.teacherName) {
      assert.ok(!slot.teacherName.toLowerCase().includes('jasur'), 'Teacher 1 schedule must not contain Teacher 2 name');
    }
  }

  for (const slot of sched2.slots) {
    assert.notEqual(slot.teacherId, 'tch-001', 'Teacher 2 schedule must not contain Teacher 1 slots');
    if (slot.teacherName) {
      assert.ok(!slot.teacherName.toLowerCase().includes('ziyoda'), 'Teacher 2 schedule must not contain Teacher 1 name');
    }
  }
});

test('3. Teacher Dashboard Data Isolation & Distinct KPI Aggregations', async () => {
  const tokenTch1 = 'dev-token-usr-tch-001';
  const tokenTch2 = 'dev-token-usr-tch-002';

  const res1 = await fetch(`${baseUrl}/api/teacher/dashboard`, {
    headers: { Authorization: `Bearer ${tokenTch1}` },
  });
  assert.equal(res1.status, 200);
  const data1 = await res1.json();
  assert.equal(data1.teacherId, 'tch-001');
  assert.equal(data1.teacherName, 'Rahimova Ziyoda');

  const res2 = await fetch(`${baseUrl}/api/teacher/dashboard`, {
    headers: { Authorization: `Bearer ${tokenTch2}` },
  });
  assert.equal(res2.status, 200);
  const data2 = await res2.json();
  assert.equal(data2.teacherId, 'tch-002');
  assert.equal(data2.teacherName, 'Valiyevov Bekzod');

  assert.notEqual(data1.teacherName, data2.teacherName);
});

test('4. KTP Plan Submission Ownership & Unauthorized Class Guard', async () => {
  const tokenTch1 = 'dev-token-usr-tch-001';

  const ktpId = `ktp-iso-${Date.now()}`;
  const validKtpRes = await fetch(`${baseUrl}/api/ktp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenTch1}`,
    },
    body: JSON.stringify({
      id: ktpId,
      className: '5-A',
      subject: 'Algebra',
      academicYear: '2026-2027',
      totalHours: 68,
      lessons: [{ lessonNumber: 1, topic: 'Sonli ifodalar', hours: 1 }],
    }),
  });
  assert.equal(validKtpRes.status, 200, 'Teacher can submit KTP for assigned class');
  const validData = await validKtpRes.json();
  assert.equal(validData.item.teacherId, 'usr-tch-001');
  assert.equal(validData.item.teacherName, 'Rahimova Ziyoda');

  const invalidKtpRes = await fetch(`${baseUrl}/api/ktp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenTch1}`,
    },
    body: JSON.stringify({
      id: `ktp-invalid-${Date.now()}`,
      className: '11-B',
      subject: 'Algebra',
      academicYear: '2026-2027',
      totalHours: 68,
      lessons: [{ lessonNumber: 1, topic: 'Hosilalar', hours: 1 }],
    }),
  });
  assert.equal(invalidKtpRes.status, 403, 'Teacher must be forbidden from submitting KTP for unassigned class');
});

test('5. Electronic Journal Session Tracking & Unauthorized Class Guard', async () => {
  const tokenTch1 = 'dev-token-usr-tch-001';

  const lessonId = `lsn-iso-${Date.now()}`;
  const startRes = await fetch(`${baseUrl}/api/teacher/lessons/${lessonId}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenTch1}`,
    },
    body: JSON.stringify({
      className: '5-A',
      subject: 'Algebra',
      topic: 'Sonli ifodalar va tenglamalar',
      room: '101-kabinet',
    }),
  });
  assert.equal(startRes.status, 200, 'Teacher can start lesson in assigned class');
  const startData = await startRes.json();
  assert.equal(startData.session.teacherId, 'usr-tch-001');
  assert.equal(startData.session.status, 'active');

  const invalidStartRes = await fetch(`${baseUrl}/api/teacher/lessons/lsn-unauth-99/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenTch1}`,
    },
    body: JSON.stringify({
      className: '11-A',
      subject: 'Algebra',
      topic: 'Limitlar',
      room: '201-kabinet',
    }),
  });
  assert.equal(invalidStartRes.status, 403, 'Teacher cannot start lesson in unassigned class');
});

test('6. Homework Management Isolation & Cross-Teacher Grading Guard', async () => {
  const tokenTch1 = 'dev-token-usr-tch-001';
  const tokenTch2 = 'dev-token-usr-tch-002';

  const hwId = `hw-iso-${Date.now()}`;
  const createHwRes = await fetch(`${baseUrl}/api/homework`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenTch1}`,
    },
    body: JSON.stringify({
      id: hwId,
      title: '5-A Algebra Uy Vazifasi',
      subject: 'Algebra',
      className: '5-A',
      dueDate: '2026-09-20',
      description: 'Misollarni yechish',
    }),
  });
  assert.equal(createHwRes.status, 201);
  const hwData = await createHwRes.json();
  assert.equal(hwData.item.teacherId, 'usr-tch-001');
  assert.equal(hwData.item.teacherName, 'Rahimova Ziyoda');

  const studentToken = 'dev-token-usr-student-1';
  const submitRes = await fetch(`${baseUrl}/api/homework/${hwId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      studentId: 'stu-0001',
      studentName: 'Ali Nurdinov',
      submissionText: 'Yechimlar to‘liq bajarildi',
    }),
  });
  assert.equal(submitRes.status, 200);

  const unrelatedChildSubmitRes = await fetch(`${baseUrl}/api/homework/${hwId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      studentId: 'stu-0003',
      submissionText: 'Unrelated child submission must be rejected',
    }),
  });
  assert.equal(unrelatedChildSubmitRes.status, 403, 'Parent must not submit for an unrelated child');

  const missingHomeworkSubmitRes = await fetch(`${baseUrl}/api/homework/hw-does-not-exist/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      studentId: 'stu-0001',
      submissionText: 'Missing homework must not be created implicitly',
    }),
  });
  assert.equal(missingHomeworkSubmitRes.status, 404, 'Unknown homework must not be created by submission');

  const unauthGradeRes = await fetch(`${baseUrl}/api/homework/${hwId}/grade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenTch2}`,
    },
    body: JSON.stringify({
      studentId: 'stu-0001',
      grade: 5,
      teacherFeedback: 'Yaxshi',
    }),
  });
  assert.equal(unauthGradeRes.status, 403, 'Teacher 2 must be blocked from grading Teacher 1 homework');

  const authGradeRes = await fetch(`${baseUrl}/api/homework/${hwId}/grade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenTch1}`,
    },
    body: JSON.stringify({
      studentId: 'stu-0001',
      grade: 5,
      teacherFeedback: 'A’lo darajada bajarildi',
    }),
  });
  assert.equal(authGradeRes.status, 200, 'Teacher 1 can grade their own homework');

  const teacher2UpdateRes = await fetch(`${baseUrl}/api/data/homework/${hwId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenTch2}`,
    },
    body: JSON.stringify({ title: 'Unauthorized overwrite', teacherId: 'usr-tch-002' }),
  });
  assert.equal(teacher2UpdateRes.status, 403, 'Teacher 2 must not update Teacher 1 homework');

  const teacher2DeleteRes = await fetch(`${baseUrl}/api/data/homework/${hwId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenTch2}` },
  });
  assert.equal(teacher2DeleteRes.status, 403, 'Teacher 2 must not delete Teacher 1 homework');

  const teacher2MissingGradeRes = await fetch(`${baseUrl}/api/homework/unknown-homework/grade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenTch2}`,
    },
    body: JSON.stringify({ studentId: 'stu-0001', grade: 5 }),
  });
  assert.equal(teacher2MissingGradeRes.status, 404, 'Grading must not create missing homework');
});

test('8. Teacher Student, Subject, KTP, and Lesson Ownership Guards', async () => {
  const tokenTch1 = 'dev-token-usr-tch-001';
  const tokenTch2 = 'dev-token-usr-tch-002';

  const foreignAttendanceRes = await fetch(`${baseUrl}/api/attendance/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTch1}` },
    body: JSON.stringify({
      studentId: 'stu-0040',
      status: 'present',
      date: '2026-09-12',
      className: '5-A',
      classId: 'cls-5-a',
      lessonId: 'session-isolation-test',
    }),
  });
  assert.equal(foreignAttendanceRes.status, 403, 'Teacher must not mutate a student outside the assigned class');

  const foreignGradeRes = await fetch(`${baseUrl}/api/grades/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTch1}` },
    body: JSON.stringify({ studentId: 'stu-0001', className: '5-A', subject: 'Physics', field: 'score', value: 80, updatedAverage: 80 }),
  });
  assert.equal(foreignGradeRes.status, 403, 'Teacher must not mutate an unassigned subject grade');

  const teacher2KtpId = `ktp-teacher2-${Date.now()}`;
  const teacher2KtpRes = await fetch(`${baseUrl}/api/ktp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTch2}` },
    body: JSON.stringify({ id: teacher2KtpId, className: '5-B', subject: 'Geometriya', lessons: [{ lessonNumber: 1, topic: 'Uchburchaklar' }] }),
  });
  assert.equal(teacher2KtpRes.status, 200);

  const teacher1KtpMutationRes = await fetch(`${baseUrl}/api/ktp/${teacher2KtpId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTch1}` },
    body: JSON.stringify({ status: 'approved' }),
  });
  assert.equal(teacher1KtpMutationRes.status, 403, 'Teacher must not mutate another teacher KTP');

  const teacher2LessonId = `lesson-teacher2-${Date.now()}`;
  const teacher2LessonRes = await fetch(`${baseUrl}/api/teacher/lessons/${teacher2LessonId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTch2}` },
    body: JSON.stringify({ className: '5-B', subject: 'Geometriya', topic: 'Uchburchaklar' }),
  });
  assert.equal(teacher2LessonRes.status, 200);

  const teacher1LessonFinishRes = await fetch(`${baseUrl}/api/teacher/lessons/${teacher2LessonId}/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTch1}` },
    body: JSON.stringify({ className: '5-B', subject: 'Geometriya', entries: [] }),
  });
  assert.equal(teacher1LessonFinishRes.status, 403, 'Teacher must not finish another teacher lesson');
});

test('9. Parent Child Ownership Guards on Reads and Mutations', async () => {
  const parentToken = 'dev-parent-token';

  const foreignStudentRes = await fetch(`${baseUrl}/api/mastery/student/stu-0003`, {
    headers: { Authorization: `Bearer ${parentToken}` },
  });
  assert.equal(foreignStudentRes.status, 403, 'Parent must not read foreign child mastery');

  const foreignSubmissionRes = await fetch(`${baseUrl}/api/homework/does-not-matter/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${parentToken}` },
    body: JSON.stringify({ studentId: 'stu-0003', submissionText: 'forged parent child' }),
  });
  assert.equal(foreignSubmissionRes.status, 403, 'Parent must not submit for a foreign child');

  const missingHomeworkRes = await fetch(`${baseUrl}/api/homework/does-not-matter/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${parentToken}` },
    body: JSON.stringify({ studentId: 'stu-0001', submissionText: 'unknown homework' }),
  });
  assert.equal(missingHomeworkRes.status, 404, 'Unknown homework must return 404 for an owned child');

  const visibleStudentsRes = await fetch(`${baseUrl}/api/data/students`, {
    headers: { Authorization: `Bearer ${parentToken}` },
  });
  assert.equal(visibleStudentsRes.status, 200);
  const visibleStudents = await visibleStudentsRes.json();
  assert.ok(visibleStudents.items.every((student) => ['stu-0001', 'stu-0002'].includes(student.id)), 'Parent student list must contain only linked children');
});

test('7. Student Profile Scoping & Cross-Class Privacy Guard', async () => {
  const tokenTch1 = 'dev-token-usr-tch-001';

  const resAssigned = await fetch(`${baseUrl}/api/teacher/students/stu-0001`, {
    headers: { Authorization: `Bearer ${tokenTch1}` },
  });
  assert.equal(resAssigned.status, 200, 'Teacher can access student in assigned class');
  const dataAssigned = await resAssigned.json();
  assert.equal(dataAssigned.student.grade, '5-A');

  const resUnassigned = await fetch(`${baseUrl}/api/teacher/students/stu-0999`, {
    headers: { Authorization: `Bearer ${tokenTch1}` },
  });
  assert.equal(resUnassigned.status, 403, 'Teacher must be forbidden from accessing students in unassigned classes');
});

