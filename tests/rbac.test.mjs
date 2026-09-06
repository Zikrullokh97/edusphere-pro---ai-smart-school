import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

// 1. Role Normalization Tests
function normalizeUserRole(value) {
  if (typeof value !== 'string') return 'parent_student';
  const v = value.toLowerCase().trim();
  if (v === 'admin' || v === 'administrator') return 'admin';
  if (v === 'teacher') return 'teacher';
  if (v === 'parent_student' || v === 'student' || v === 'parent' || v === 'parentstudent') return 'parent_student';
  return 'parent_student';
}

test('Role Normalization: Handles various string representations cleanly', () => {
  assert.equal(normalizeUserRole('ADMIN'), 'admin');
  assert.equal(normalizeUserRole('admin'), 'admin');
  assert.equal(normalizeUserRole('Administrator'), 'admin');
  assert.equal(normalizeUserRole('TEACHER'), 'teacher');
  assert.equal(normalizeUserRole('teacher'), 'teacher');
  assert.equal(normalizeUserRole('student'), 'parent_student');
  assert.equal(normalizeUserRole('parent'), 'parent_student');
  assert.equal(normalizeUserRole('parent_student'), 'parent_student');
  assert.equal(normalizeUserRole('PARENT_STUDENT'), 'parent_student');
  assert.equal(normalizeUserRole('unknown_role'), 'parent_student');
  assert.equal(normalizeUserRole(null), 'parent_student');
  assert.equal(normalizeUserRole(undefined), 'parent_student');
  assert.equal(normalizeUserRole(123), 'parent_student');
});

// 2. Schedule Conflict Detector Logic Test
function detectScheduleConflict(slots) {
  const occupied = new Set();
  for (const slot of slots) {
    for (const key of [
      `class:${slot.day}:${slot.period}:${slot.className}`,
      `teacher:${slot.day}:${slot.period}:${slot.teacherName}`,
      `room:${slot.day}:${slot.period}:${slot.room}`,
    ]) {
      if (occupied.has(key)) return { hasConflict: true, conflictKey: key };
      occupied.add(key);
    }
  }
  return { hasConflict: false };
}

test('Schedule Conflict Detection: Accurately identifies overlapping slots', () => {
  const validSchedule = [
    { id: 's1', day: 'Mon', period: 1, className: '7-A', teacherName: 'Alisa Karimova', room: 'Room 101' },
    { id: 's2', day: 'Mon', period: 2, className: '7-A', teacherName: 'Alisa Karimova', room: 'Room 101' },
    { id: 's3', day: 'Mon', period: 1, className: '8-B', teacherName: 'Bobur Rakhimov', room: 'Room 102' },
  ];
  assert.equal(detectScheduleConflict(validSchedule).hasConflict, false);

  const teacherClash = [
    { id: 's1', day: 'Mon', period: 1, className: '7-A', teacherName: 'Alisa Karimova', room: 'Room 101' },
    { id: 's2', day: 'Mon', period: 1, className: '8-B', teacherName: 'Alisa Karimova', room: 'Room 102' },
  ];
  assert.equal(detectScheduleConflict(teacherClash).hasConflict, true);

  const roomClash = [
    { id: 's1', day: 'Mon', period: 1, className: '7-A', teacherName: 'Alisa Karimova', room: 'Room 101' },
    { id: 's2', day: 'Mon', period: 1, className: '8-B', teacherName: 'Bobur Rakhimov', room: 'Room 101' },
  ];
  assert.equal(detectScheduleConflict(roomClash).hasConflict, true);

  const classClash = [
    { id: 's1', day: 'Mon', period: 1, className: '7-A', teacherName: 'Alisa Karimova', room: 'Room 101' },
    { id: 's2', day: 'Mon', period: 1, className: '7-A', teacherName: 'Bobur Rakhimov', room: 'Room 102' },
  ];
  assert.equal(detectScheduleConflict(classClash).hasConflict, true);
});

// 3. QR Token Verification Security Test
const QR_SECRET = 'edusphere-qr-secret-key-2026';
function createQrToken(studentId, className, schoolId, ttlMs = 120000) {
  const expiresAt = Date.now() + ttlMs;
  const payload = `${studentId}:${className}:${schoolId}:${expiresAt}`;
  const signature = createHmac('sha256', QR_SECRET).update(payload).digest('hex').slice(0, 16);
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

function verifyQrToken(token, expectedSchoolId, expectedClass) {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const [studentId, className, schoolId, expiresAtStr, signature] = raw.split(':');
    if (!studentId || !className || !schoolId || !expiresAtStr || !signature) return null;
    const expiresAt = Number(expiresAtStr);
    if (Date.now() > expiresAt) return null;
    if (schoolId !== expectedSchoolId) return null;
    if (expectedClass && className !== expectedClass) return null;
    const expectedSig = createHmac('sha256', QR_SECRET)
      .update(`${studentId}:${className}:${schoolId}:${expiresAtStr}`)
      .digest('hex')
      .slice(0, 16);
    if (signature !== expectedSig) return null;
    return { studentId, className, schoolId };
  } catch {
    return null;
  }
}

test('QR Token Security: Validates signatures, expiration, and rejects forged payloads', () => {
  const token = createQrToken('stu-01', '7-A', 'school-71-tashkent', 60000);
  const result = verifyQrToken(token, 'school-71-tashkent', '7-A');
  assert.notEqual(result, null);
  assert.equal(result.studentId, 'stu-01');
  assert.equal(result.className, '7-A');

  // Cross school rejection
  assert.equal(verifyQrToken(token, 'other-school', '7-A'), null);

  // Expired token rejection
  const expiredToken = createQrToken('stu-01', '7-A', 'school-71-tashkent', -1000);
  assert.equal(verifyQrToken(expiredToken, 'school-71-tashkent', '7-A'), null);

  // Forged signature rejection
  const forgedToken = Buffer.from('stu-01:7-A:school-71-tashkent:9999999999:fake_sig').toString('base64url');
  assert.equal(verifyQrToken(forgedToken, 'school-71-tashkent', '7-A'), null);
});

// 4. Electronic Journal Transaction Validation
function validateJournalPayload(payload, teacherUser) {
  const { id, className, subject, date, lessonNumber, topic, entries } = payload;
  if (!id || !className || !subject || !date || !topic || !Array.isArray(entries)) {
    return { valid: false, reason: 'Missing required fields' };
  }
  if (lessonNumber < 1 || lessonNumber > 20) {
    return { valid: false, reason: 'Invalid lesson number' };
  }
  if (teacherUser.role === 'teacher') {
    if (!teacherUser.assignedClasses?.includes(className)) {
      return { valid: false, reason: 'Class is not assigned to teacher' };
    }
  }
  return { valid: true };
}

test('Electronic Journal Validation: Enforces class assignment and boundary checks', () => {
  const teacherUser = { uid: 'teacher-1', role: 'teacher', assignedClasses: ['7-A', '8-B'] };
  
  const validPayload = {
    id: 'j-1',
    className: '7-A',
    subject: 'Mathematics',
    date: '2026-08-31',
    lessonNumber: 3,
    topic: 'Linear Equations',
    entries: [{ studentId: 'stu-01', attendance: 'present', grade: 95 }],
  };
  assert.equal(validateJournalPayload(validPayload, teacherUser).valid, true);

  const unassignedClassPayload = {
    ...validPayload,
    className: '11-C',
  };
  const result = validateJournalPayload(unassignedClassPayload, teacherUser);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'Class is not assigned to teacher');
});

// 5. Force Password Change Enforcement Test
function checkPasswordChangeRequirement(token, profile, path) {
  const forcePasswordChange = Boolean(token?.forcePasswordChange || profile?.forcePasswordChange);
  if (forcePasswordChange && path !== '/api/auth/clear-force-password-change') {
    return { blocked: true, code: 'PASSWORD_CHANGE_REQUIRED' };
  }
  return { blocked: false };
}

test('Security: forcePasswordChange blocks general API access but allows clearing endpoint', () => {
  const token = { uid: 'u1', forcePasswordChange: true };
  const profile = { forcePasswordChange: true };

  const generalAccess = checkPasswordChangeRequirement(token, profile, '/api/data/students');
  assert.equal(generalAccess.blocked, true);
  assert.equal(generalAccess.code, 'PASSWORD_CHANGE_REQUIRED');

  const clearAccess = checkPasswordChangeRequirement(token, profile, '/api/auth/clear-force-password-change');
  assert.equal(clearAccess.blocked, false);

  const regularUser = checkPasswordChangeRequirement({ uid: 'u2', forcePasswordChange: false }, { forcePasswordChange: false }, '/api/data/students');
  assert.equal(regularUser.blocked, false);
});

// 6. Dashboard Real Stats Aggregator Test (No Mock Fallbacks)
function calculateDashboardMetrics(studentsSnapSize, teachersSnapSize, attendanceRecords, gradeRecords) {
  const totalStudents = studentsSnapSize;
  const totalTeachers = teachersSnapSize;
  const presentCount = attendanceRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
  const attendanceRate = attendanceRecords.length > 0
    ? Number(((presentCount / attendanceRecords.length) * 100).toFixed(1))
    : 0;

  const validAverages = gradeRecords.map((g) => Number(g.average)).filter((n) => !Number.isNaN(n) && n > 0);
  const avgGrade = validAverages.length > 0
    ? Number((validAverages.reduce((a, b) => a + b, 0) / validAverages.length).toFixed(1))
    : 0;

  return {
    totalStudents,
    totalTeachers,
    attendanceRate,
    avgGrade,
    todayPresent: presentCount,
    activeClasses: 0,
    hasData: totalStudents > 0,
  };
}

test('Dashboard Stats: Calculates genuine rates and returns zero/hasData=false when empty (no fake mock)', () => {
  const emptyStats = calculateDashboardMetrics(0, 0, [], []);
  assert.equal(emptyStats.totalStudents, 0);
  assert.equal(emptyStats.attendanceRate, 0);
  assert.equal(emptyStats.avgGrade, 0);
  assert.equal(emptyStats.hasData, false);

  const liveStats = calculateDashboardMetrics(
    50,
    5,
    [{ status: 'present' }, { status: 'present' }, { status: 'absent' }, { status: 'late' }],
    [{ average: 90 }, { average: 80 }]
  );
  assert.equal(liveStats.totalStudents, 50);
  assert.equal(liveStats.todayPresent, 3);
  assert.equal(liveStats.attendanceRate, 75.0);
  assert.equal(liveStats.avgGrade, 85.0);
  assert.equal(liveStats.hasData, true);
});

// 7. Teacher Workspace RBAC & Permissions Enforcement Tests
function validateTeacherAnnouncementPermission(user, payload) {
  if (!user || user.role !== 'TEACHER') {
    if (user?.role === 'ADMIN') return { allowed: true };
    return { allowed: false, reason: 'Authentication required' };
  }
  if (payload.audienceType === 'school' || !payload.className) {
    return { allowed: false, reason: 'Teachers can only publish announcements to their assigned class' };
  }
  if (!user.assignedClasses?.includes(payload.className)) {
    return { allowed: false, reason: 'Teacher is not assigned to this class' };
  }
  return { allowed: true };
}

test('Teacher RBAC: Strictly forbids teachers from school-wide announcements and unassigned classes', () => {
  const teacher = { uid: 'tch-1', role: 'TEACHER', assignedClasses: ['7-A', '8-B'] };
  
  // Forbidden school-wide
  const schoolWide = validateTeacherAnnouncementPermission(teacher, { title: 'Exam date', audienceType: 'school' });
  assert.equal(schoolWide.allowed, false);
  assert.equal(schoolWide.reason, 'Teachers can only publish announcements to their assigned class');

  // Forbidden unassigned class
  const unassignedClass = validateTeacherAnnouncementPermission(teacher, { title: 'Homework', audienceType: 'class', className: '11-A' });
  assert.equal(unassignedClass.allowed, false);
  assert.equal(unassignedClass.reason, 'Teacher is not assigned to this class');

  // Allowed assigned class
  const allowed = validateTeacherAnnouncementPermission(teacher, { title: 'Homework', audienceType: 'class', className: '7-A' });
  assert.equal(allowed.allowed, true);
});

// 8. Lesson Session Start & Auto-Summary Calculation Logic Test
function calculateLessonSummary(startedAtStr, finishedAtStr, entries, comment, homeworkAssigned) {
  const startMs = new Date(startedAtStr).getTime();
  const finishMs = new Date(finishedAtStr).getTime();
  const durationMinutes = Math.max(1, Math.round((finishMs - startMs) / 60000));

  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let excusedCount = 0;
  let totalGrades = 0;
  let sumGrades = 0;

  for (const entry of entries) {
    if (entry.attendance === 'present') presentCount++;
    else if (entry.attendance === 'absent') absentCount++;
    else if (entry.attendance === 'late') lateCount++;
    else if (entry.attendance === 'excused') excusedCount++;

    if (typeof entry.grade === 'number' && entry.grade > 0) {
      sumGrades += entry.grade;
      totalGrades++;
    }
  }

  const totalStudents = presentCount + absentCount + lateCount + excusedCount;
  const attendancePercent = totalStudents > 0
    ? Number((((presentCount + lateCount) / totalStudents) * 100).toFixed(1))
    : 0;
  const averageGrade = totalGrades > 0
    ? Number((sumGrades / totalGrades).toFixed(1))
    : 0;

  return {
    durationMinutes,
    totalStudents,
    presentCount,
    absentCount,
    lateCount,
    excusedCount,
    attendancePercent,
    averageGrade,
    teacherComment: comment,
    homeworkAssigned: Boolean(homeworkAssigned),
    zavuchStatus: 'verified',
  };
}

test('Lesson Session Summary: Accurately calculates attendance %, average grade, and duration', () => {
  const entries = [
    { studentId: 's1', attendance: 'present', grade: 90 },
    { studentId: 's2', attendance: 'present', grade: 100 },
    { studentId: 's3', attendance: 'late', grade: 80 },
    { studentId: 's4', attendance: 'absent', grade: null },
  ];

  const summary = calculateLessonSummary(
    '2026-08-31T08:30:00.000Z',
    '2026-08-31T09:15:00.000Z',
    entries,
    'Mavzu yaxshi o‘zlashtirildi',
    true
  );

  assert.equal(summary.durationMinutes, 45);
  assert.equal(summary.totalStudents, 4);
  assert.equal(summary.presentCount, 2);
  assert.equal(summary.lateCount, 1);
  assert.equal(summary.absentCount, 1);
  assert.equal(summary.attendancePercent, 75.0); // (2+1)/4 * 100
  assert.equal(summary.averageGrade, 90.0); // (90+100+80)/3
  assert.equal(summary.homeworkAssigned, true);
  assert.equal(summary.zavuchStatus, 'verified');
});


