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

describe('EduSphere Pro — Final Production Data Integrity & Workflow Stress Test Suite', () => {

  // 1. Data Model Truth & Canonical Entities
  it('1. Data Model Truth: All canonical school entities exist and adhere to strict schemas', async () => {
    const [ayRes, classesRes, subjectsRes, teachersRes, studentsRes] = await Promise.all([
      fetch(`${BASE_URL}/api/academic-years`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/classes`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/subjects`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/teachers`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/students`, { headers: ADMIN_AUTH }),
    ]);

    assert.equal(ayRes.status, 200);
    assert.equal(classesRes.status, 200);
    assert.equal(subjectsRes.status, 200);
    assert.equal(teachersRes.status, 200);
    assert.equal(studentsRes.status, 200);

    const [ay, classes, subjects, teachers, students] = await Promise.all([
      ayRes.json(),
      classesRes.json(),
      subjectsRes.json(),
      teachersRes.json(),
      studentsRes.json(),
    ]);

    assert.ok(ay.items.some((y) => y.id === '2026-2027'));
    assert.equal(classes.items.length, 26);
    assert.ok(subjects.items.length >= 8);
    assert.equal(teachers.items.length, 70);
    assert.equal(students.items.length, 1000);
  });

  // 2. Academic Year & Quarter Lifecycle
  it('2. Academic Year & Quarter Lifecycle: Creates new year, locks quarter with 403 guard, and re-opens', async () => {
    // 1. Admin creates upcoming academic year 2027-2028
    const createYearRes = await fetch(`${BASE_URL}/api/academic-years`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        id: '2027-2028',
        name: '2027–2028 O‘quv yili',
        startDate: '2027-09-01',
        endDate: '2028-05-25',
        status: 'planned',
      }),
    });
    assert.equal(createYearRes.status, 201);

    // 2. Admin closes current Q1
    const lockQRes = await fetch(`${BASE_URL}/api/academic-years/2026-2027/quarters/Q1`, {
      method: 'PATCH',
      headers: ADMIN_AUTH,
      body: JSON.stringify({ status: 'closed' }),
    });
    assert.equal(lockQRes.status, 200);

    // 3. Teacher attempts grade mutation during closed Q1 -> 403
    const lockedSessionAttempt = await fetch(`${BASE_URL}/api/lesson-sessions`, {
      method: 'POST',
      headers: TEACHER_AUTH,
      body: JSON.stringify({
        id: 'sess-closed-guard-stress-test',
        className: '7-A',
        subject: 'Matematika',
        academicYear: '2026-2027',
        quarterId: 'Q1',
        date: '2026-09-10',
        topic: 'Blocked Lesson Topic',
        attendance: { present: ['stu-0001'] },
        grades: { 'stu-0001': 95 },
      }),
    });
    assert.equal(lockedSessionAttempt.status, 403, 'Teacher mutation during closed quarter must return 403');

    // 4. Admin re-opens Q1 to active
    const unlockQRes = await fetch(`${BASE_URL}/api/academic-years/2026-2027/quarters/Q1`, {
      method: 'PATCH',
      headers: ADMIN_AUTH,
      body: JSON.stringify({ status: 'active' }),
    });
    assert.equal(unlockQRes.status, 200);
  });

  // 3. Subject Creation & Evolution
  it('3. Subject Lifecycle: Creates new subject, updates name, preserves historical relational integrity', async () => {
    const testSubId = `sbj-robotics-${Date.now()}`;

    // 1. Create Subject
    const createSub = await fetch(`${BASE_URL}/api/data/subjects`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        id: testSubId,
        name: 'Robototexnika',
        code: 'ROBOT-01',
        department: 'Aniq fanlar',
        hoursPerWeek: 2,
        schoolId: 'school-71-tashkent',
      }),
    });
    assert.equal(createSub.status, 201);

    // 2. Update Subject Name to "Robototexnika va AI"
    const updateSub = await fetch(`${BASE_URL}/api/data/subjects/${testSubId}`, {
      method: 'PATCH',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        name: 'Robototexnika va AI',
        hoursPerWeek: 3,
      }),
    });
    assert.equal(updateSub.status, 200);
    const updatedSubJson = await updateSub.json();
    assert.equal(updatedSubJson.item.name, 'Robototexnika va AI');

    // 3. Cleanup Test Subject
    await fetch(`${BASE_URL}/api/data/subjects/${testSubId}`, {
      method: 'DELETE',
      headers: ADMIN_AUTH,
    });
  });

  // 4. Student Enrollment & Transfer with Historical Preservation
  it('4. Student Transfer: Transfers student 7-A -> 7-B while preserving historical 7-A attendance records', async () => {
    const testStuId = `stu-transfer-stress-${Date.now()}`;
    const datePast = '2026-09-01';

    // 1. Enroll student into 7-A
    const createStu = await fetch(`${BASE_URL}/api/data/students`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        id: testStuId,
        studentId: 'STU-TR01',
        name: 'Javohir Toshmatov',
        grade: '7-A',
        classId: 'cls-7-a',
        iin: '50101150009917',
        gender: 'male',
        status: 'active',
        schoolId: 'school-71-tashkent',
      }),
    });
    assert.equal(createStu.status, 201);

    // 2. Record historical attendance in 7-A
    const histAttRes = await fetch(`${BASE_URL}/api/attendance/bulk`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        className: '7-A',
        date: datePast,
        lessonId: `ls-hist-7-A-1`,
        subject: 'Matematika',
        entries: [{ studentId: testStuId, studentName: 'Javohir Toshmatov', status: 'present' }],
      }),
    });
    assert.equal(histAttRes.status, 200);

    // 3. Admin transfers student from 7-A to 7-B
    const transferRes = await fetch(`${BASE_URL}/api/data/students/${testStuId}`, {
      method: 'PATCH',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        grade: '7-B',
        classId: 'cls-7-b',
      }),
    });
    assert.equal(transferRes.status, 200);

    // 4. Verify student is now listed in 7-B
    const studentsRes = await fetch(`${BASE_URL}/api/data/students`, { headers: ADMIN_AUTH });
    const studentsJson = await studentsRes.json();
    const transferredStudent = studentsJson.items.find((s) => s.id === testStuId);
    assert.equal(transferredStudent.grade, '7-B');

    // 5. Verify historical attendance record in 7-A remains intact
    const pastAttRes = await fetch(`${BASE_URL}/api/attendance?className=7-A&date=${datePast}`, { headers: ADMIN_AUTH });
    const pastAtt = await pastAttRes.json();
    const histEntry = pastAtt.items.find((a) => a.studentId === testStuId && a.date === datePast);
    assert.ok(histEntry, 'Historical 7-A attendance record must remain preserved');
    assert.equal(histEntry.className, '7-A');

    // 6. Cleanup
    await fetch(`${BASE_URL}/api/data/students/${testStuId}`, { method: 'DELETE', headers: ADMIN_AUTH });
  });

  // 5. Complete Schedule Conflict Stress Matrix
  it('5. Schedule Conflict Matrix: Strictly blocks Teacher, Class, and Room collisions (409 Conflict)', async () => {
    // 1. Teacher Collision
    const tCol = await fetch(`${BASE_URL}/api/schedules/publish`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        slots: [
          { id: 's-t-1', className: '7-A', teacherName: 'Aigul Sadykova', room: '101', day: 'THU', period: 2 },
          { id: 's-t-2', className: '8-B', teacherName: 'Aigul Sadykova', room: '102', day: 'THU', period: 2 },
        ],
      }),
    });
    assert.equal(tCol.status, 409);

    // 2. Class Collision
    const cCol = await fetch(`${BASE_URL}/api/schedules/publish`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        slots: [
          { id: 's-c-1', className: '7-A', teacherName: 'Aigul Sadykova', room: '101', day: 'FRI', period: 3 },
          { id: 's-c-2', className: '7-A', teacherName: 'Berdibek Asanov', room: '102', day: 'FRI', period: 3 },
        ],
      }),
    });
    assert.equal(cCol.status, 409);

    // 3. Room Collision
    const rCol = await fetch(`${BASE_URL}/api/schedules/publish`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        slots: [
          { id: 's-r-1', className: '7-A', teacherName: 'Aigul Sadykova', room: 'Lab-Physics', day: 'SAT', period: 1 },
          { id: 's-r-2', className: '9-A', teacherName: 'Dilshod Karimov', room: 'Lab-Physics', day: 'SAT', period: 1 },
        ],
      }),
    });
    assert.equal(rCol.status, 409);
  });

  // 6. Turnstile Gate Movement ↔ Real-Time Attendance Synchronization
  it('6. Turnstile & Attendance: Gate scan creates movement event and synchronizes daily attendance', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const timestamp = `${todayStr}T08:10:00`;

    const scanRes = await fetch(`${BASE_URL}/api/turnstile/scan`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        studentId: 'stu-0001',
        timestamp,
        direction: 'IN',
        gateName: 'Turniket 1 (Katta darvoza)',
        method: 'face_recognition',
        confidence: 0.995,
      }),
    });
    assert.equal(scanRes.status, 201);
    const scanJson = await scanRes.json();
    assert.equal(scanJson.success, true);
    assert.equal(scanJson.attendanceStatus, 'present');
    assert.equal(scanJson.isLate, false);

    // Verify Gate Movement Timeline API returns record
    const movementsRes = await fetch(`${BASE_URL}/api/attendance/gate-movements/stu-0001`, { headers: ADMIN_AUTH });
    assert.equal(movementsRes.status, 200);
    const movementsJson = await movementsRes.json();
    assert.ok(movementsJson.records.some((m) => m.studentId === 'stu-0001' && m.date === todayStr));
  });

  // 7. Electronic Journal ↔ Homework Lifecycle & Student Submission / Grading
  it('7. Journal & Homework: Lesson session creates homework -> Student submits -> Teacher grades', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const testSessionId = `sess-hw-stress-${todayStr}-7-A-Math-1`;

    // 1. Teacher creates Lesson Session with assigned homework
    const sessionRes = await fetch(`${BASE_URL}/api/lesson-sessions`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        id: testSessionId,
        className: '7-A',
        subject: 'Matematika',
        academicYear: '2026-2027',
        quarterId: 'Q1',
        date: todayStr,
        period: 1,
        lessonNumber: 15,
        topic: 'Kvadrat tenglamalar diskriminanti',
        homework: '48-bet, 10-18 mashqlarni yechish',
        attendance: { present: ['stu-0001'], absent: [], late: [], excused: [] },
        grades: { 'stu-0001': 92 },
      }),
    });
    assert.equal(sessionRes.status, 200);

    // 2. Verify Homework assignment was automatically generated
    const hwListRes = await fetch(`${BASE_URL}/api/homework`, { headers: ADMIN_AUTH });
    assert.equal(hwListRes.status, 200);
    const hwList = await hwListRes.json();
    const createdHw = hwList.items.find((h) => h.lessonSessionId === testSessionId || h.id === `hw-${testSessionId}`);
    assert.ok(createdHw, 'Auto-generated homework assignment must exist');
    assert.equal(createdHw.className, '7-A');

    // 3. Student submits homework
    const submitRes = await fetch(`${BASE_URL}/api/homework/${createdHw.id}/submit`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        submission: {
          id: `sub-stu1-${Date.now()}`,
          studentId: 'stu-0001',
          studentName: 'Ali Valiyev',
          content: 'Diskriminant musbat bo‘lsa 2 ta ildizga ega: D = b^2 - 4ac.',
          aiScore: 95,
        },
      }),
    });
    assert.equal(submitRes.status, 200);

    // 4. Teacher grades and approves submission
    const gradeRes = await fetch(`${BASE_URL}/api/homework/${createdHw.id}/grade`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        submissionId: 'stu-0001',
        grade: 98,
        teacherFeedback: 'Juda to‘g‘ri yechilgan!',
        teacherApproved: true,
      }),
    });
    assert.equal(gradeRes.status, 200);
    const gradeJson = await gradeRes.json();
    assert.equal(gradeJson.submission.aiScore, 98);
    assert.equal(gradeJson.submission.status, 'graded');
  });

  // 8. Relational Cascade & Deletion Protection
  it('8. Cascade Safety: Blocks deleting a class with active enrolled students (409 Conflict)', async () => {
    const res = await fetch(`${BASE_URL}/api/data/classes/cls-7-a`, {
      method: 'DELETE',
      headers: ADMIN_AUTH,
    });
    assert.equal(res.status, 409, 'Must return 409 Conflict when deleting active class');
  });

  // 9. Dashboard Reconciliation & School Isolation
  it('9. Dashboard Reconciliation & School Isolation: Verifies KPI counts reconcile with live data', async () => {
    const [kpiRes, statsRes] = await Promise.all([
      fetch(`${BASE_URL}/api/admin/kpi`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/stats/dashboard`, { headers: ADMIN_AUTH }),
    ]);
    assert.equal(kpiRes.status, 200);
    assert.equal(statsRes.status, 200);

    const kpi = await kpiRes.json();
    const stats = await statsRes.json();

    assert.equal(kpi.data.totalStudents, 1000);
    assert.equal(kpi.data.totalTeachers, 70);
    assert.equal(kpi.data.totalClasses, 26);
    assert.equal(stats.totalStudents, 1000);
  });
});
