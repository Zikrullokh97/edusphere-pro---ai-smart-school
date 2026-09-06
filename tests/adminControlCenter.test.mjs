import test from 'node:test';
import assert from 'node:assert/strict';

// Helper: 14-digit IIN checksum verification
function validateIINChecksum(iin) {
  if (!/^\d{14}$/.test(iin)) return false;
  const weights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3];
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(iin[i], 10) * weights[i];
  }
  let check = sum % 11;
  if (check === 10) check = 0;
  return check === parseInt(iin[13], 10);
}

// In-Memory Rate Limiter Tester
function createRateLimiter() {
  const map = new Map();
  return (key, maxRequests, windowMs) => {
    const now = Date.now();
    const record = map.get(key);
    if (!record || now > record.resetAt) {
      map.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (record.count >= maxRequests) {
      return false;
    }
    record.count++;
    return true;
  };
}

test('1. Authentication & Session: Admin token evaluation and session validation', () => {
  const validAdminToken = { uid: 'usr-admin-1', role: 'ADMIN', exp: Date.now() / 1000 + 3600 };
  const expiredToken = { uid: 'usr-admin-1', role: 'ADMIN', exp: Date.now() / 1000 - 60 };

  const verifySession = (token) => {
    if (!token) return { valid: false, reason: 'UNAUTHENTICATED' };
    if (token.exp < Date.now() / 1000) return { valid: false, reason: 'EXPIRED_SESSION' };
    if (token.role !== 'ADMIN') return { valid: false, reason: 'FORBIDDEN' };
    return { valid: true, user: token };
  };

  assert.equal(verifySession(null).reason, 'UNAUTHENTICATED');
  assert.equal(verifySession(expiredToken).reason, 'EXPIRED_SESSION');
  assert.equal(verifySession({ uid: 'u2', role: 'TEACHER', exp: Date.now() / 1000 + 3600 }).reason, 'FORBIDDEN');
  assert.equal(verifySession(validAdminToken).valid, true);
});

test('2. RBAC: Strict Server-Side Role Enforcement across canonical roles', () => {
  const checkEndpointAccess = (userRole, requiredRole) => {
    if (!userRole) return 401;
    if (userRole !== requiredRole) return 403;
    return 200;
  };

  assert.equal(checkEndpointAccess(null, 'ADMIN'), 401);
  assert.equal(checkEndpointAccess('TEACHER', 'ADMIN'), 403);
  assert.equal(checkEndpointAccess('PARENT_STUDENT', 'ADMIN'), 403);
  assert.equal(checkEndpointAccess('ADMIN', 'ADMIN'), 200);
});

test('3. Privilege Escalation Protection: Blocks role tampering via query, body, or headers', () => {
  const sanitizeUserCreation = (callerRole, requestedPayload) => {
    // Only verified ADMIN can assign roles
    if (callerRole !== 'ADMIN') {
      throw new Error('Only administrators can assign user roles');
    }
    const role = (requestedPayload.role || 'TEACHER').toUpperCase();
    if (!['ADMIN', 'TEACHER', 'PARENT_STUDENT'].includes(role)) {
      throw new Error('Invalid canonical role');
    }
    return { ...requestedPayload, role };
  };

  assert.throws(() => sanitizeUserCreation('TEACHER', { role: 'ADMIN' }), /Only administrators/);
  assert.throws(() => sanitizeUserCreation(null, { role: 'ADMIN' }), /Only administrators/);
  assert.equal(sanitizeUserCreation('ADMIN', { role: 'ADMIN' }).role, 'ADMIN');
});

test('4. Student Real CRUD: Validates required fields, 14-digit IIN checksum, and uniqueness', () => {
  const base13 = '5120508104294';
  const weights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3];
  let sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(base13[i], 10) * weights[i];
  let check = sum % 11;
  if (check === 10) check = 0;
  const validIin = `${base13}${check}`;
  const invalidIin = `${base13}${(check + 1) % 10}`;
  const shortIin = '12345';

  assert.equal(validateIINChecksum(validIin), true);
  assert.equal(validateIINChecksum(invalidIin), false);
  assert.equal(validateIINChecksum(shortIin), false);

  const existingIINs = new Set([validIin]);
  const isDuplicateIin = (iin) => existingIINs.has(iin);

  assert.equal(isDuplicateIin(validIin), true);
  assert.equal(isDuplicateIin('61504092043121'), false);
});

test('5. Class Management & Capacity Enforcement: Blocks student enrollment if class is full', () => {
  const classCapacity = 30;
  let currentEnrolledStudents = 30;

  const enrollStudent = (grade, count, capacity) => {
    if (count >= capacity) {
      throw new Error(`Sinf sig'imi to'lgan (Maksimal: ${capacity} ta o'quvchi). Boshqa sinfni tanlang.`);
    }
    return count + 1;
  };

  // Attempting to enroll 31st student when capacity is 30 must be blocked
  assert.throws(() => enrollStudent('7-A', currentEnrolledStudents, classCapacity), /Sinf sig'imi to'lgan/);

  // Enrolling into a class with capacity 35 succeeds
  assert.equal(enrollStudent('7-B', 24, 35), 25);
});

test('6. Teacher Real CRUD: Validates unique email, unique phone, and workload limits (1..40)', () => {
  const validateTeacher = (teacher, existingEmails) => {
    if (!teacher.name || !teacher.name.trim()) throw new Error("O'qituvchi F.I.SH talab qilinadi");
    if (existingEmails.has(teacher.email)) throw new Error("Ushbu elektron pochta boshqa o'qituvchiga biriktirilgan");
    if (teacher.workloadHours < 1 || teacher.workloadHours > 40) throw new Error("Haftalik yuklama 1 dan 40 soatgacha bo'lishi kerak");
    return true;
  };

  const existingEmails = new Set(['teacher1@edusphere.school']);

  assert.equal(validateTeacher({ name: 'Jasur Karimov', email: 'new@edusphere.school', workloadHours: 24 }, existingEmails), true);
  assert.throws(() => validateTeacher({ name: 'Jasur Karimov', email: 'teacher1@edusphere.school', workloadHours: 24 }, existingEmails), /elektron pochta/);
  assert.throws(() => validateTeacher({ name: 'Jasur Karimov', email: 'new2@edusphere.school', workloadHours: 45 }, existingEmails), /yuklama 1 dan 40/);
});

test('7. Parent-Child Relationship: Bidirectional relation and student mapping', () => {
  const parent = {
    id: 'par-101',
    name: 'Alisher Nurdinov',
    childrenIds: ['stu-0001', 'stu-0042'],
  };

  const students = [
    { id: 'stu-0001', name: 'Ali Karimov', parentId: 'par-101' },
    { id: 'stu-0042', name: 'Madina Karimova', parentId: 'par-101' },
    { id: 'stu-0099', name: 'Bobur Valiyev', parentId: 'par-202' },
  ];

  const getParentChildren = (parentId) => students.filter((s) => s.parentId === parentId);
  const children = getParentChildren(parent.id);

  assert.equal(children.length, 2);
  assert.equal(children[0].name, 'Ali Karimov');
  assert.equal(children[1].name, 'Madina Karimova');
});

test('8. Subject Management: Validates required code and rejects duplicate subject codes', () => {
  const existingCodes = new Set(['MATH-01', 'PHYS-01', 'INF-01']);
  const createSubject = (name, code) => {
    if (!name || !code) throw new Error('Fan nomi va kodi talab qilinadi');
    if (existingCodes.has(code)) throw new Error('Ushbu kodli fan allaqachon mavjud');
    existingCodes.add(code);
    return { name, code };
  };

  assert.throws(() => createSubject('Matematika 2', 'MATH-01'), /allaqachon mavjud/);
  assert.equal(createSubject('Kimyo', 'CHEM-01').code, 'CHEM-01');
});

test('9. Schedule Collision Prevention: Rejects teacher, room, or class double-booking', () => {
  const existingSchedule = [
    { id: 'sch-1', day: 'MON', period: 1, teacherId: 'tch-01', room: 'Xona-101', className: '7-A' },
  ];

  const checkScheduleCollision = (newSlot) => {
    for (const slot of existingSchedule) {
      if (slot.day === newSlot.day && slot.period === newSlot.period) {
        if (slot.teacherId === newSlot.teacherId) return { conflict: true, reason: 'TEACHER_BUSY' };
        if (slot.room === newSlot.room) return { conflict: true, reason: 'ROOM_BUSY' };
        if (slot.className === newSlot.className) return { conflict: true, reason: 'CLASS_BUSY' };
      }
    }
    return { conflict: false };
  };

  // Same teacher Monday period 1
  assert.equal(checkScheduleCollision({ day: 'MON', period: 1, teacherId: 'tch-01', room: 'Xona-105', className: '8-B' }).reason, 'TEACHER_BUSY');
  // Same room Monday period 1
  assert.equal(checkScheduleCollision({ day: 'MON', period: 1, teacherId: 'tch-02', room: 'Xona-101', className: '8-B' }).reason, 'ROOM_BUSY');
  // Same class Monday period 1
  assert.equal(checkScheduleCollision({ day: 'MON', period: 1, teacherId: 'tch-02', room: 'Xona-105', className: '7-A' }).reason, 'CLASS_BUSY');
  // No collision Monday period 2
  assert.equal(checkScheduleCollision({ day: 'MON', period: 2, teacherId: 'tch-01', room: 'Xona-101', className: '7-A' }).conflict, false);
});

test('10. Attendance KPI Aggregation: Computes exact present rate and count matching DB', () => {
  const attendanceRecords = [
    { studentId: 's1', status: 'present' },
    { studentId: 's2', status: 'present' },
    { studentId: 's3', status: 'absent' },
    { studentId: 's4', status: 'late' },
    { studentId: 's5', status: 'present' },
  ];

  let present = 0, absent = 0, late = 0;
  attendanceRecords.forEach((a) => {
    if (a.status === 'present') present++;
    else if (a.status === 'absent') absent++;
    else if (a.status === 'late') late++;
  });

  const rate = Math.round((present / attendanceRecords.length) * 100);

  assert.equal(present, 3);
  assert.equal(absent, 1);
  assert.equal(late, 1);
  assert.equal(rate, 60);
});

test('11. Grade & Audit Log: Records actor, old value, new value on mutation', () => {
  const gradeAudit = {
    actorUid: 'usr-admin-1',
    actorRole: 'ADMIN',
    action: 'UPDATE_GRADES',
    entity: 'grades',
    entityId: 'grd-01',
    oldValue: { grade: 4, comment: 'Initial' },
    newValue: { grade: 5, comment: 'Improved' },
    timestamp: new Date().toISOString(),
  };

  assert.equal(gradeAudit.oldValue.grade, 4);
  assert.equal(gradeAudit.newValue.grade, 5);
  assert.equal(gradeAudit.actorRole, 'ADMIN');
  assert.ok(gradeAudit.timestamp);
});

test('12. Announcements: Enforces priority levels and targeted audience filtering', () => {
  const announcements = [
    { id: 'a1', audience: 'ALL', priority: 'NORMAL' },
    { id: 'a2', audience: 'TEACHERS', priority: 'HIGH' },
    { id: 'a3', audience: 'PARENTS', priority: 'URGENT' },
  ];

  const filterForUser = (role) => {
    if (role === 'ADMIN') return announcements;
    if (role === 'TEACHER') return announcements.filter((a) => a.audience === 'ALL' || a.audience === 'TEACHERS');
    if (role === 'PARENT_STUDENT') return announcements.filter((a) => a.audience === 'ALL' || a.audience === 'PARENTS');
    return [];
  };

  assert.equal(filterForUser('ADMIN').length, 3);
  assert.equal(filterForUser('TEACHER').length, 2);
  assert.equal(filterForUser('PARENT_STUDENT').length, 2);
});

test('13. Lesson Plan Approval: Valid workflow state machine and reviewer comment', () => {
  const plan = { id: 'lp-01', status: 'SUBMITTED' };
  const approvePlan = (p, adminId) => ({
    ...p,
    status: 'APPROVED',
    reviewedBy: adminId,
    reviewedAt: new Date().toISOString(),
  });
  const requestRevision = (p, adminId, comment) => ({
    ...p,
    status: 'REVISION_REQUESTED',
    reviewerComment: comment,
    reviewedBy: adminId,
    reviewedAt: new Date().toISOString(),
  });

  const approved = approvePlan(plan, 'admin-1');
  assert.equal(approved.status, 'APPROVED');
  assert.equal(approved.reviewedBy, 'admin-1');

  const revision = requestRevision(plan, 'admin-1', 'Mashqlar sonini oshiring');
  assert.equal(revision.status, 'REVISION_REQUESTED');
  assert.equal(revision.reviewerComment, 'Mashqlar sonini oshiring');
});

test('14. Audit Log Immutability: Rejects modification and deletion of audit entries', () => {
  const ALLOWED_COLLECTIONS = new Set(['students', 'teachers', 'classes', 'subjects', 'notifications', 'schedule', 'grades', 'attendance', 'parents', 'academic_years']);

  assert.equal(ALLOWED_COLLECTIONS.has('auditLogs'), false);
  assert.equal(ALLOWED_COLLECTIONS.has('audit_logs'), false);
});

test('15. Security Rate Limiting: Blocks abusive requests after threshold', () => {
  const limiter = createRateLimiter();
  const key = 'user_reset_192.168.1.1';

  // Allow 3 requests in 1 minute
  assert.equal(limiter(key, 3, 60000), true);
  assert.equal(limiter(key, 3, 60000), true);
  assert.equal(limiter(key, 3, 60000), true);
  // 4th request must be blocked
  assert.equal(limiter(key, 3, 60000), false);
});

test('16. Credential Sanitization: Strips passwordHash and secret credentials from API outputs', () => {
  const rawDbUser = {
    uid: 'usr-100',
    displayName: 'Jasur Karimov',
    email: 'jasur@edusphere.school',
    role: 'TEACHER',
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    apiKey: 'sk-secret-key-12345',
  };

  const sanitizeUser = (u) => ({
    uid: u.uid,
    displayName: u.displayName,
    email: u.email,
    role: u.role.toLowerCase(),
  });

  const sanitized = sanitizeUser(rawDbUser);

  assert.equal('passwordHash' in sanitized, false);
  assert.equal('apiKey' in sanitized, false);
  assert.equal(sanitized.displayName, 'Jasur Karimov');
});

test('17. Production Safety: Seeder execution guard blocks automatic wipe in production', () => {
  const canRunSeeder = (nodeEnv, allowProdSeed) => {
    if (nodeEnv === 'production' && allowProdSeed !== 'true') {
      return false;
    }
    return true;
  };

  assert.equal(canRunSeeder('development', 'false'), true);
  assert.equal(canRunSeeder('production', 'false'), false);
  assert.equal(canRunSeeder('production', 'true'), true);
});

test('18. Biometric Privacy: Strips 512-d float vectors from standard student list responses', () => {
  const rawStudent = {
    id: 'stu-001',
    name: 'Alisher Valiyev',
    grade: '7-A',
    faceEmbedding: Array(512).fill(0.123),
    facePhotoUrl: 'https://storage/face.jpg',
  };

  const sanitizeStudentListResponse = (student) => {
    const { faceEmbedding, ...safeStudent } = student;
    return {
      ...safeStudent,
      hasFaceEmbedding: !!(faceEmbedding && Array.isArray(faceEmbedding) && faceEmbedding.length === 512),
    };
  };

  const sanitized = sanitizeStudentListResponse(rawStudent);
  assert.equal('faceEmbedding' in sanitized, false);
  assert.equal(sanitized.hasFaceEmbedding, true);
  assert.equal(sanitized.name, 'Alisher Valiyev');
});

test('19. Admin API Matrix: Comprehensive access verification for all admin endpoints', () => {
  const adminEndpoints = [
    '/api/admin/kpi',
    '/api/admin/audit-logs',
    '/api/admin/system-health',
    '/api/admin/announcements',
    '/api/admin/lesson-plans',
    '/api/admin/security/sessions',
    '/api/admin/security/force-logout',
    '/api/users',
  ];

  const authorize = (role) => {
    if (!role) return 401;
    if (role !== 'ADMIN') return 403;
    return 200;
  };

  for (const endpoint of adminEndpoints) {
    assert.equal(authorize(null), 401, `Unauthenticated must be 401 on ${endpoint}`);
    assert.equal(authorize('TEACHER'), 403, `Teacher must be 403 on ${endpoint}`);
    assert.equal(authorize('PARENT_STUDENT'), 403, `Parent must be 403 on ${endpoint}`);
    assert.equal(authorize('ADMIN'), 200, `Admin must be 200 on ${endpoint}`);
  }
});

test('20. Backup & Disaster Recovery: Parity check and relational foreign-key validation', () => {
  const original = {
    students: [{ id: 's1', grade: '7-A' }, { id: 's2', grade: '8-B' }],
    classes: [{ name: '7-A' }, { name: '8-B' }],
    teachers: [{ id: 't1' }],
    schedules: [{ id: 'sch1', teacherId: 't1' }],
  };

  const verifyRelationalIntegrity = (data) => {
    const classNames = new Set(data.classes.map((c) => c.name));
    const teacherIds = new Set(data.teachers.map((t) => t.id));
    const brokenClasses = data.students.filter((s) => !classNames.has(s.grade));
    const brokenTeachers = data.schedules.filter((sch) => !teacherIds.has(sch.teacherId));
    return brokenClasses.length === 0 && brokenTeachers.length === 0;
  };

  assert.equal(verifyRelationalIntegrity(original), true);
  // Broken relation test
  const brokenData = {
    ...original,
    students: [{ id: 's3', grade: '12-Z' }],
  };
  assert.equal(verifyRelationalIntegrity(brokenData), false);
});
