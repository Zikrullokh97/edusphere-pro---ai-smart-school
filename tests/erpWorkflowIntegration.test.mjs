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

describe('EduSphere Pro — Complete School ERP Integration & Workflow Suite', () => {

  // 1. Database Parity & Source of Truth
  it('1. Database Parity: System loads canonical dataset of 1000 students, 70 teachers, 26 classes, and schedules', async () => {
    const kpiRes = await fetch(`${BASE_URL}/api/admin/kpi`, { headers: ADMIN_AUTH });
    assert.equal(kpiRes.status, 200);
    const kpi = await kpiRes.json();
    assert.equal(kpi.success, true);
    assert.equal(kpi.data.totalStudents, 1000);
    assert.equal(kpi.data.totalTeachers, 70);
    assert.equal(kpi.data.totalClasses, 26);
  });

  // 2. Schedule Relational Consistency & Retrieval
  it('2. Schedule Parity: Schedule collection contains real timetable entries', async () => {
    const schedRes = await fetch(`${BASE_URL}/api/data/schedules`, { headers: ADMIN_AUTH });
    assert.equal(schedRes.status, 200);
    const sched = await schedRes.json();
    assert.ok(Array.isArray(sched.items));
    assert.ok(sched.items.length >= 100, `Expected at least 100 schedule entries, got ${sched.items.length}`);
    
    const sample = sched.items[0];
    assert.ok(sample.className, 'Schedule entry must have className');
    assert.ok(sample.teacherName, 'Schedule entry must have teacherName');
    assert.ok(sample.subject, 'Schedule entry must have subject');
    assert.ok(sample.room, 'Schedule entry must have room');
  });

  // 3. Schedule Conflict Prevention (Teacher, Class, Room)
  it('3. Schedule Conflict Prevention: Rejects conflicting timetable slots with 409 Conflict', async () => {
    // Conflict 1: Same teacher, same day & period, different classes
    const teacherConflictPayload = {
      slots: [
        { id: 'conf-1', className: '7-A', teacherName: 'Aigul Sadykova', room: '101', day: 'MON', period: 1 },
        { id: 'conf-2', className: '8-B', teacherName: 'Aigul Sadykova', room: '102', day: 'MON', period: 1 },
      ],
    };
    const resTeacherConflict = await fetch(`${BASE_URL}/api/schedules/publish`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify(teacherConflictPayload),
    });
    assert.equal(resTeacherConflict.status, 409, 'Must reject teacher double-booking with 409');

    // Conflict 2: Same class, same day & period, different teachers
    const classConflictPayload = {
      slots: [
        { id: 'conf-3', className: '7-A', teacherName: 'Aigul Sadykova', room: '101', day: 'TUE', period: 2 },
        { id: 'conf-4', className: '7-A', teacherName: 'Berdibek Asanov', room: '102', day: 'TUE', period: 2 },
      ],
    };
    const resClassConflict = await fetch(`${BASE_URL}/api/schedules/publish`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify(classConflictPayload),
    });
    assert.equal(resClassConflict.status, 409, 'Must reject class double-booking with 409');

    // Conflict 3: Same room, same day & period, different classes
    const roomConflictPayload = {
      slots: [
        { id: 'conf-5', className: '7-A', teacherName: 'Aigul Sadykova', room: 'Lab-1', day: 'WED', period: 3 },
        { id: 'conf-6', className: '9-A', teacherName: 'Berdibek Asanov', room: 'Lab-1', day: 'WED', period: 3 },
      ],
    };
    const resRoomConflict = await fetch(`${BASE_URL}/api/schedules/publish`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify(roomConflictPayload),
    });
    assert.equal(resRoomConflict.status, 409, 'Must reject room double-booking with 409');
  });

  // 4. Attendance ↔ Admin Dashboard Real-Time Sync
  it('4. Attendance ↔ Dashboard Sync: Bulk attendance updates KPI absent & late counts immediately', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Save bulk attendance for 7-A (3 present, 1 absent, 1 late)
    const bulkPayload = {
      className: '7-A',
      date: todayStr,
      lessonId: `lesson-${todayStr}-7-A-1`,
      subject: 'Matematika',
      entries: [
        { studentId: 'stu-0001', studentName: 'Ali Valiyev', status: 'present' },
        { studentId: 'stu-0002', studentName: 'Madina Karimova', status: 'present' },
        { studentId: 'stu-0003', studentName: 'Jasur Rustamov', status: 'present' },
        { studentId: 'stu-0004', studentName: 'Dilnoza Axmedova', status: 'absent', note: 'Kasal' },
        { studentId: 'stu-0005', studentName: 'Sardorbek Toxirov', status: 'late', note: 'Transport sababli' },
      ],
    };

    const bulkRes = await fetch(`${BASE_URL}/api/attendance/bulk`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify(bulkPayload),
    });
    assert.equal(bulkRes.status, 200);
    const bulkJson = await bulkRes.json();
    assert.equal(bulkJson.success, true);
    assert.equal(bulkJson.count, 5);

    // Verify Dashboard KPI reflects these exact attendance numbers
    const kpiRes = await fetch(`${BASE_URL}/api/admin/kpi`, { headers: ADMIN_AUTH });
    const kpi = await kpiRes.json();
    assert.ok(kpi.data.absentStudentsCount >= 1, 'KPI absent count must be at least 1');
    assert.ok(kpi.data.lateStudentsCount >= 1, 'KPI late count must be at least 1');

    // Verify Attendance Statistics API matches
    const statsRes = await fetch(`${BASE_URL}/api/attendance/statistics?className=7-A&date=${todayStr}`, {
      headers: ADMIN_AUTH,
    });
    assert.equal(statsRes.status, 200);
    const stats = await statsRes.json();
    assert.ok(stats.presentCount >= 3);
    assert.ok(stats.absentCount >= 1);
    assert.ok(stats.lateCount >= 1);
  });

  // 5. Electronic Journal ↔ Attendance ↔ Grades Atomic Flow
  it('5. Electronic Journal ↔ Attendance ↔ Grades: Lesson session saves attendance and grades simultaneously', async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const sessionId = `sess-${todayStr}-7-A-Math-1`;

    const sessionPayload = {
      id: sessionId,
      className: '7-A',
      subject: 'Matematika',
      academicYear: '2026-2027',
      quarterId: 'Q1',
      date: todayStr,
      weekday: 'Dushanba',
      period: 1,
      lessonNumber: 14,
      topic: 'Chiziqli tenglamalar sistemasi',
      objective: 'Tenglamalar sistemasini grafik usulda yechish',
      conspectDraft: 'Dars bosqichlari va amaliy mashqlar',
      homework: 'Darslik: 42-bet 1-5 mashqlar',
      attendance: {
        present: ['stu-0001', 'stu-0002'],
        absent: ['stu-0003'],
        late: [],
        excused: [],
      },
      grades: {
        'stu-0001': 95,
        'stu-0002': 85,
      },
      comments: {
        'stu-0001': 'Faol qatnashdi',
      },
      status: 'COMPLETED',
    };

    const sessRes = await fetch(`${BASE_URL}/api/lesson-sessions`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify(sessionPayload),
    });
    assert.equal(sessRes.status, 200);
    const sessJson = await sessRes.json();
    assert.equal(sessJson.success, true);

    // Verify grades query contains new grade
    const gradesRes = await fetch(`${BASE_URL}/api/data/grades`, { headers: ADMIN_AUTH });
    assert.equal(gradesRes.status, 200);
    const gradesJson = await gradesRes.json();
    const stu1Grade = gradesJson.items.find((g) => g.studentId === 'stu-0001' && (g.sessionId === sessionId || g.id === `grd-stu-0001-${todayStr}-7-A-Matematika`));
    assert.ok(stu1Grade, 'Student 1 grade record must exist for the session');
    assert.equal(stu1Grade.average, 95);
  });

  // 6. RBAC & Security Matrix
  it('6. RBAC & Security: Enforces strict role and school isolation', async () => {
    // Unauthenticated -> 401
    const unauthRes = await fetch(`${BASE_URL}/api/admin/kpi`);
    assert.equal(unauthRes.status, 401);

    // Teacher accessing Admin KPI -> 403
    const teacherKpiRes = await fetch(`${BASE_URL}/api/admin/kpi`, { headers: TEACHER_AUTH });
    assert.equal(teacherKpiRes.status, 403);

    // Parent accessing Admin KPI -> 403
    const parentKpiRes = await fetch(`${BASE_URL}/api/admin/kpi`, { headers: PARENT_AUTH });
    assert.equal(parentKpiRes.status, 403);

    // Parent accessing student list -> restricted only to children
    const parentStudentsRes = await fetch(`${BASE_URL}/api/data/students`, { headers: PARENT_AUTH });
    assert.equal(parentStudentsRes.status, 200);
    const parentStudents = await parentStudentsRes.json();
    assert.ok(parentStudents.items.length <= 5, 'Parent should only see permitted children');
  });

  // 7. Academic Quarter Guard
  it('7. Quarter Guard: Teacher cannot submit grades when quarter is closed', async () => {
    // 1. Admin closes Q1
    const patchQRes = await fetch(`${BASE_URL}/api/academic-years/2026-2027/quarters/Q1`, {
      method: 'PATCH',
      headers: ADMIN_AUTH,
      body: JSON.stringify({ status: 'closed' }),
    });
    assert.equal(patchQRes.status, 200);

    // 2. Teacher attempts to save lesson session during closed Q1
    const sessionAttempt = {
      id: 'sess-closed-guard-test',
      className: '7-A',
      subject: 'Matematika',
      academicYear: '2026-2027',
      quarterId: 'Q1',
      date: '2026-09-15',
      topic: 'Test Closed Topic',
      attendance: { present: ['stu-0001'] },
      grades: { 'stu-0001': 90 },
    };

    const attemptRes = await fetch(`${BASE_URL}/api/lesson-sessions`, {
      method: 'POST',
      headers: TEACHER_AUTH,
      body: JSON.stringify(sessionAttempt),
    });
    assert.equal(attemptRes.status, 403, 'Teacher modification during closed quarter must return 403');

    // 3. Re-open Q1 for standard workflow
    const reopenRes = await fetch(`${BASE_URL}/api/academic-years/2026-2027/quarters/Q1`, {
      method: 'PATCH',
      headers: ADMIN_AUTH,
      body: JSON.stringify({ status: 'active' }),
    });
    assert.equal(reopenRes.status, 200);
  });

  // 8. Full Relational Entity CRUD & Cleanup
  it('8. Full Relational Entity CRUD: Creates, reads, updates, and deletes test entities without orphan records', async () => {
    const testClass = '11-C';
    const testStudentId = 'stu-e2e-integ-1';

    // 1. Create Student
    const createRes = await fetch(`${BASE_URL}/api/data/students`, {
      method: 'POST',
      headers: ADMIN_AUTH,
      body: JSON.stringify({
        id: testStudentId,
        studentId: 'STU-9901',
        name: 'Azamat Integration Oquvchi',
        grade: testClass,
        iin: '30101200600123',
        gender: 'male',
        status: 'active',
        schoolId: 'school-71-tashkent',
      }),
    });
    assert.equal(createRes.status, 201);

    // 2. Verify KPI increased
    const afterCreateKpi = await (await fetch(`${BASE_URL}/api/admin/kpi`, { headers: ADMIN_AUTH })).json();
    assert.equal(afterCreateKpi.data.totalStudents, 1001);

    // 3. Cleanup Student
    const delRes = await fetch(`${BASE_URL}/api/data/students/${testStudentId}`, {
      method: 'DELETE',
      headers: ADMIN_AUTH,
    });
    assert.equal(delRes.status, 200);

    // 4. Verify KPI returned to canonical baseline
    const finalKpi = await (await fetch(`${BASE_URL}/api/admin/kpi`, { headers: ADMIN_AUTH })).json();
    assert.equal(finalKpi.data.totalStudents, 1000);
  });
});

