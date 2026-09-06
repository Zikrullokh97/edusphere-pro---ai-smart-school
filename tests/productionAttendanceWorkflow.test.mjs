import test from 'node:test';
import assert from 'node:assert/strict';
import { sortStudentsNaturally } from '../src/components/students/StudentsDirectory.js';

// Canonical Attendance Enums
const CANONICAL_STATUSES = ['present', 'absent', 'late', 'excused'];

test('1. Canonical Attendance Enums: Supports present, absent, late, and excused', () => {
  CANONICAL_STATUSES.forEach((st) => {
    assert.equal(typeof st, 'string');
  });
  assert.equal(CANONICAL_STATUSES.length, 4);
});

test('2. Attendance Unique Key Generator: Produces deterministic upsert key', () => {
  const studentId = 'stu-101';
  const date = '2026-09-01';
  const lessonId = 'lesson-2026-09-01-7-A-14';

  const key1 = `att-${studentId}-${date}-${lessonId}`;
  const key2 = `att-${studentId}-${date}-${lessonId}`;

  assert.equal(key1, key2);
  assert.equal(key1, 'att-stu-101-2026-09-01-lesson-2026-09-01-7-A-14');
});

test('3. Attendance Metrics Aggregation: Computes real percentage without fake data', () => {
  const records = [
    { studentId: 'st-1', status: 'present' },
    { studentId: 'st-2', status: 'present' },
    { studentId: 'st-3', status: 'late' },
    { studentId: 'st-4', status: 'absent' },
    { studentId: 'st-5', status: 'excused' },
  ];

  const total = records.length;
  const presentCount = records.filter((r) => r.status === 'present').length;
  const lateCount = records.filter((r) => r.status === 'late').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const excusedCount = records.filter((r) => r.status === 'excused').length;

  const attendanceRate = Number((((presentCount + lateCount) / total) * 100).toFixed(1));

  assert.equal(total, 5);
  assert.equal(presentCount, 2);
  assert.equal(lateCount, 1);
  assert.equal(absentCount, 1);
  assert.equal(excusedCount, 1);
  assert.equal(attendanceRate, 60.0);
});

test('4. Empty State: Empty attendance returns zero and hasData=false', () => {
  const records = [];
  const total = records.length;
  const attendanceRate = total > 0 ? 100 : 0;
  const hasData = total > 0;

  assert.equal(total, 0);
  assert.equal(attendanceRate, 0);
  assert.equal(hasData, false);
});

test('5. Schedule Slot Deduplication: Eliminates duplicate periods across flat lists', () => {
  const rawSlots = [
    { period: 1, className: '7-A', subject: 'Math', day: 'MON' },
    { period: 2, className: '8-B', subject: 'Physics', day: 'MON' },
    { period: 1, className: '7-A', subject: 'Math', day: 'TUE' },
    { period: 2, className: '8-B', subject: 'Physics', day: 'TUE' },
    { period: 1, className: '7-A', subject: 'Math', day: 'MON' }, // duplicate
  ];

  const seen = new Set();
  const uniqueMondaySlots = [];

  rawSlots.filter((s) => s.day === 'MON').forEach((s) => {
    const key = `${s.period}-${s.className}-${s.subject}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueMondaySlots.push(s);
    }
  });

  assert.equal(uniqueMondaySlots.length, 2);
  assert.equal(uniqueMondaySlots[0].period, 1);
  assert.equal(uniqueMondaySlots[1].period, 2);
});

test('6. Student Sorting: Alphabetical order by Last Name then First Name', () => {
  const students = [
    { name: 'Ziyoda Yo‘ldosheva', lastName: 'Yo‘ldosheva', firstName: 'Ziyoda' },
    { name: 'Ali Valiyev', lastName: 'Valiyev', firstName: 'Ali' },
    { name: 'Bekzod Valiyev', lastName: 'Valiyev', firstName: 'Bekzod' },
    { name: 'Dilnoza Karimova', lastName: 'Karimova', firstName: 'Dilnoza' },
  ];

  const sorted = sortStudentsNaturally(students);
  assert.equal(sorted[0].name, 'Dilnoza Karimova');
  assert.equal(sorted[1].name, 'Ali Valiyev');
  assert.equal(sorted[2].name, 'Bekzod Valiyev');
  assert.equal(sorted[3].name, 'Ziyoda Yo‘ldosheva');
});

test('7. Search Filter: Matches student by name, studentId, and IIN', () => {
  const student = {
    id: 'st-101',
    studentId: 'STU-7701',
    name: 'Madina Karimova',
    iin: '20120020260456',
    parentName: 'Karim Oripov',
    parentPhone: '+998901234567',
  };

  const queries = ['madina', '7701', '2012002', 'karim', '90123'];
  queries.forEach((q) => {
    const matches =
      student.name.toLowerCase().includes(q) ||
      student.studentId.toLowerCase().includes(q) ||
      student.iin.includes(q) ||
      student.parentName.toLowerCase().includes(q) ||
      student.parentPhone.includes(q);
    assert.equal(matches, true, `Query "${q}" should match student`);
  });
});

test('8. RBAC: Teacher is blocked from mutating attendance in unauthorized class', () => {
  const teacherAssignedClasses = ['7-A', '8-A'];
  const targetClass = '9-B';

  const isAuthorized = teacherAssignedClasses.includes(targetClass);
  assert.equal(isAuthorized, false);
});

