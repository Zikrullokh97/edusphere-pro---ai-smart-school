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

describe('EduSphere Pro — Safe-Mode Production Parity & Zero-Trust Audit Suite', () => {

  let baseline = {};

  // 1. Baseline Snapshot Acquisition BEFORE Test
  it('1. Baseline Snapshot: Captures exact pre-test state of canonical school entities', async () => {
    const [studentsRes, teachersRes, classesRes, subjectsRes, schedulesRes, ayRes] = await Promise.all([
      fetch(`${BASE_URL}/api/data/students`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/teachers`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/classes`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/subjects`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/schedules`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/academic-years`, { headers: ADMIN_AUTH }),
    ]);

    assert.equal(studentsRes.status, 200);
    assert.equal(teachersRes.status, 200);
    assert.equal(classesRes.status, 200);
    assert.equal(subjectsRes.status, 200);
    assert.equal(schedulesRes.status, 200);
    assert.equal(ayRes.status, 200);

    const [students, teachers, classes, subjects, schedules, ay] = await Promise.all([
      studentsRes.json(),
      teachersRes.json(),
      classesRes.json(),
      subjectsRes.json(),
      schedulesRes.json(),
      ayRes.json(),
    ]);

    baseline = {
      studentsCount: students.items.length,
      teachersCount: teachers.items.length,
      classesCount: classes.items.length,
      subjectsCount: subjects.items.length,
      schedulesCount: schedules.items.length,
      academicYearsCount: ay.items.length,
      studentIds: new Set(students.items.map((s) => s.id)),
      teacherIds: new Set(teachers.items.map((t) => t.id)),
      classIds: new Set(classes.items.map((c) => c.id)),
      subjectIds: new Set(subjects.items.map((s) => s.id)),
    };

    assert.equal(baseline.studentsCount, 1000, 'Baseline students must be 1000');
    assert.equal(baseline.teachersCount, 70, 'Baseline teachers must be 70');
    assert.equal(baseline.classesCount, 26, 'Baseline classes must be 26');
    assert.ok(baseline.subjectsCount >= 8, 'Baseline subjects must be at least 8');
    assert.ok(baseline.schedulesCount >= 900, 'Baseline schedules must be at least 900');
  });

  // 2. Isolated Safe-Mode Workflow Execution
  it('2. Isolated QA Workflow: Executes full ERP lifecycle in dedicated QA scope without altering production', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const qaClassId = `cls-qa-test-${Date.now()}`;
    const qaClassName = 'QA-7-A';
    const qaSubId = `sbj-qa-robotics-${Date.now()}`;
    const qaTeacherId = `tch-qa-${Date.now()}`;
    const qaStudentId = `stu-qa-${Date.now()}`;
    const qaSessionId = `sess-qa-${Date.now()}`;
    const qaHwId = `hw-${qaSessionId}`;

    // A. Create QA Class
    const createClassRes = await fetch(`${BASE_URL}/api/data/classes`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        id: qaClassId,
        name: qaClassName,
        gradeLevel: 7,
        capacity: 40,
        room: 'Lab-QA',
        schoolId: 'school-71-tashkent',
      }),
    });
    assert.equal(createClassRes.status, 201);

    // B. Create QA Subject
    const createSubRes = await fetch(`${BASE_URL}/api/data/subjects`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        id: qaSubId,
        name: 'QA Robotics',
        code: `QAROB-${Date.now()}`,
        department: 'Aniq fanlar',
        hoursPerWeek: 2,
        schoolId: 'school-71-tashkent',
      }),
    });
    assert.equal(createSubRes.status, 201);

    // C. Create QA Teacher
    const createTeacherRes = await fetch(`${BASE_URL}/api/data/teachers`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        id: qaTeacherId,
        name: 'QA O‘qituvchi Testov',
        firstName: 'Testov',
        lastName: 'QA O‘qituvchi',
        email: `qa_teacher_${Date.now()}@edusphere.school`,
        phone: `+998 90 ${String(Date.now()).slice(-7)}`,
        assignedClasses: [qaClassName],
        subjects: ['QA Robotics'],
        workloadHours: 20,
        schoolId: 'school-71-tashkent',
      }),
    });
    assert.equal(createTeacherRes.status, 201);

    // D. Create QA Student (Valid 14-digit IIN with correct checksum)
    const createStudentRes = await fetch(`${BASE_URL}/api/data/students`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        id: qaStudentId,
        studentId: 'STU-QA01',
        name: 'QA O‘quvchi Sinovboyev',
        grade: qaClassName,
        classId: qaClassId,
        iin: '50101150009917',
        gender: 'male',
        status: 'active',
        schoolId: 'school-71-tashkent',
      }),
    });
    assert.equal(createStudentRes.status, 201);

    // E. Execute QA Lesson Session with Attendance, Grade, and Homework Auto-Creation
    const sessRes = await fetch(`${BASE_URL}/api/lesson-sessions`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        id: qaSessionId,
        className: qaClassName,
        subject: 'QA Robotics',
        academicYear: '2026-2027',
        quarterId: 'Q1',
        date: todayStr,
        period: 1,
        lessonNumber: 1,
        topic: 'QA Robototexnika Kirish',
        homework: 'QA laboratoriya topshirig‘i #1',
        attendance: { present: [qaStudentId], absent: [], late: [], excused: [] },
        grades: { [qaStudentId]: 95 },
      }),
    });
    assert.equal(sessRes.status, 200);

    // F. QA Student Submits Homework
    const submitHwRes = await fetch(`${BASE_URL}/api/homework/${qaHwId}/submit`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        submission: {
          id: `sub-${Date.now()}`,
          studentId: qaStudentId,
          studentName: 'QA O‘quvchi Sinovboyev',
          content: 'QA Robotics dasturi muvaffaqiyatli ishga tushirildi.',
          aiScore: 97,
        },
      }),
    });
    assert.equal(submitHwRes.status, 200);

    // G. QA Teacher Grades Homework
    const gradeHwRes = await fetch(`${BASE_URL}/api/homework/${qaHwId}/grade`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        submissionId: qaStudentId,
        grade: 100,
        teacherFeedback: 'Mukammal QA natijasi!',
        teacherApproved: true,
      }),
    });
    assert.equal(gradeHwRes.status, 200);

    // H. CLEANUP & PURGE all QA Records
    await Promise.all([
      fetch(`${BASE_URL}/api/data/students/${qaStudentId}`, { method: 'DELETE', headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/teachers/${qaTeacherId}`, { method: 'DELETE', headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/subjects/${qaSubId}`, { method: 'DELETE', headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/classes/${qaClassId}`, { method: 'DELETE', headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/homework/${qaHwId}`, { method: 'DELETE', headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/lesson_sessions/${qaSessionId}`, { method: 'DELETE', headers: ADMIN_AUTH }),
    ]);
  });

  // 3. Post-Test Baseline Parity & Zero-Leak Verification
  it('3. Baseline Reconciliation: Post-test state exactly matches pre-test baseline snapshot (100% Exact Match)', async () => {
    const [studentsRes, teachersRes, classesRes, subjectsRes, schedulesRes] = await Promise.all([
      fetch(`${BASE_URL}/api/data/students`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/teachers`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/classes`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/subjects`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/schedules`, { headers: ADMIN_AUTH }),
    ]);

    const [students, teachers, classes, subjects, schedules] = await Promise.all([
      studentsRes.json(),
      teachersRes.json(),
      classesRes.json(),
      subjectsRes.json(),
      schedulesRes.json(),
    ]);

    assert.equal(students.items.length, baseline.studentsCount, 'Students count must exactly match baseline');
    assert.equal(teachers.items.length, baseline.teachersCount, 'Teachers count must exactly match baseline');
    assert.equal(classes.items.length, baseline.classesCount, 'Classes count must exactly match baseline');
    assert.equal(subjects.items.length, baseline.subjectsCount, 'Subjects count must exactly match baseline');
    assert.equal(schedules.items.length, baseline.schedulesCount, 'Schedules count must exactly match baseline');

    // Verify all baseline IDs are intact without corruption
    for (const student of students.items) {
      assert.ok(baseline.studentIds.has(student.id), `Real student ${student.id} must exist in baseline`);
    }
    for (const teacher of teachers.items) {
      assert.ok(baseline.teacherIds.has(teacher.id), `Real teacher ${teacher.id} must exist in baseline`);
    }
  });

  // 4. Orphan & Duplicate Data Detection
  it('4. Zero Orphans & Zero Duplicates: Audits canonical database for relational integrity', async () => {
    const [studentsRes, classesRes, teachersRes] = await Promise.all([
      fetch(`${BASE_URL}/api/data/students`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/classes`, { headers: ADMIN_AUTH }),
      fetch(`${BASE_URL}/api/data/teachers`, { headers: ADMIN_AUTH }),
    ]);

    const students = await studentsRes.json();
    const classes = await classesRes.json();
    const teachers = await teachersRes.json();

    const validClassNames = new Set(classes.items.map((c) => c.name));
    const seenIINs = new Set();
    const seenTeacherEmails = new Set();

    // 1. Check Student -> Class Orphanage & IIN Uniqueness
    for (const student of students.items) {
      assert.ok(validClassNames.has(student.grade), `Student ${student.id} has valid class ${student.grade}`);
      assert.ok(!seenIINs.has(student.iin), `Duplicate IIN detected: ${student.iin}`);
      seenIINs.add(student.iin);
    }

    // 2. Check Teacher Email Uniqueness
    for (const teacher of teachers.items) {
      assert.ok(!seenTeacherEmails.has(teacher.email), `Duplicate teacher email detected: ${teacher.email}`);
      seenTeacherEmails.add(teacher.email);
    }
  });

  // 5. Zero-Trust Security & Scope Attack Verification
  it('5. Zero-Trust Security: Cross-school manipulation and privilege escalation strictly rejected', async () => {
    // Cross-school injection -> 403
    const crossSchoolAttempt = await fetch(`${BASE_URL}/api/data/students`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        name: 'Malicious Injected Student',
        grade: '7-A',
        schoolId: 'school-foreign-attacker',
      }),
    });
    assert.equal(crossSchoolAttempt.status, 403, 'Cross-school payload must be rejected with 403');

    // Teacher attempting admin mutation -> 403
    const unauthClassCreate = await fetch(`${BASE_URL}/api/data/classes`, {
      method: 'POST',
      headers: TEACHER_AUTH,
      body: JSON.stringify({ name: 'Hacked Class', gradeLevel: 12 }),
    });
    assert.equal(unauthClassCreate.status, 403, 'Teacher cannot create classes');
  });
});

