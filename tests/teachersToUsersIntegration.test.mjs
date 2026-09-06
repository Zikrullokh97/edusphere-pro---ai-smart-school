import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const snapshotPath = path.join(process.cwd(), 'src', 'data', 'seededDatabaseSnapshot.json');

test('Teacher to User Integration - Canonical Snapshot Teacher Count', () => {
  assert.ok(fs.existsSync(snapshotPath), 'seededDatabaseSnapshot.json must exist');
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  assert.ok(Array.isArray(snapshot.teachers), 'snapshot.teachers must be an array');
  assert.equal(snapshot.teachers.length, 70, 'Snapshot must contain exactly 70 canonical teachers');
});

test('Teacher to User Synchronization Logic - Idempotency & Zero Duplicates', () => {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const store = {
    teachers: JSON.parse(JSON.stringify(snapshot.teachers)),
    users: [],
  };

  // Replicate sync function logic
  function syncTeachersToUsers(s) {
    if (!s.users) s.users = [];
    let adminUser = s.users.find(u => u.uid === 'usr-admin' || u.role === 'ADMIN');
    if (!adminUser) {
      s.users.unshift({
        uid: 'usr-admin',
        displayName: 'Maktab Administratori',
        email: 'admin@edusphere.school',
        role: 'ADMIN',
        schoolId: 'school-71-tashkent',
      });
    }
    let parentUser = s.users.find(u => u.uid === 'usr-parent-1' || u.role === 'PARENT_STUDENT');
    if (!parentUser) {
      s.users.push({
        uid: 'usr-parent-1',
        displayName: 'Alisher Nurdinov',
        email: 'parent@edusphere.school',
        role: 'PARENT_STUDENT',
        schoolId: 'school-71-tashkent',
        childrenIds: ['stu-0001', 'stu-0002'],
      });
    }

    for (const teacher of s.teachers || []) {
      const tId = teacher.id;
      const tEmail = (teacher.email || `teacher_${tId}@edusphere.school`).toLowerCase();
      const existing = s.users.find(u => u.teacherId === tId || u.uid === `usr-${tId}` || (u.email && u.email.toLowerCase() === tEmail));
      if (existing) {
        existing.displayName = teacher.name;
        existing.role = 'TEACHER';
        existing.teacherId = tId;
        existing.subjects = teacher.subjects || [];
        existing.assignedClasses = teacher.assignedClasses || (teacher.homeroomClass ? [teacher.homeroomClass] : []);
      } else {
        s.users.push({
          uid: `usr-${tId}`,
          displayName: teacher.name,
          email: tEmail,
          phoneNumber: teacher.phone || '',
          role: 'TEACHER',
          schoolId: teacher.schoolId || 'school-71-tashkent',
          teacherId: tId,
          subjects: teacher.subjects || [],
          subjectSpecialties: teacher.subjectSpecialties || teacher.subjects || [],
          assignedClasses: teacher.assignedClasses || (teacher.homeroomClass ? [teacher.homeroomClass] : []),
          homeroomClass: teacher.homeroomClass || '',
          workloadHours: teacher.workloadHours || 20,
        });
      }
    }
  }

  // 1. First sync pass
  syncTeachersToUsers(store);
  assert.equal(store.users.length, 72, '1 Admin + 1 Parent + 70 Teachers = 72 users');

  const teacherUsers1 = store.users.filter(u => u.role === 'TEACHER');
  assert.equal(teacherUsers1.length, 70, 'Must have exactly 70 teacher accounts');

  // 2. Second sync pass (Idempotency test)
  syncTeachersToUsers(store);
  assert.equal(store.users.length, 72, 'Zero duplicates on subsequent sync passes');

  // 3. Third sync pass
  syncTeachersToUsers(store);
  assert.equal(store.users.length, 72, 'Still exactly 72 users on third sync pass');
});

test('Live Server - Test Login & RBAC Verification', async () => {
  const baseUrl = 'http://localhost:3000';

  // 1. Test Login with Teacher 1 (Rahimova Ziyoda)
  const teacher1Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'teacher_1@edusphere.school', password: '123456' }),
  });
  assert.equal(teacher1Res.status, 200, 'Teacher 1 login must succeed with 200 OK');
  const teacher1Data = await teacher1Res.json();
  assert.ok(teacher1Data.token, 'Teacher 1 must receive auth token');
  assert.equal(teacher1Data.user.role, 'teacher', 'Teacher 1 role must be teacher');
  assert.equal(teacher1Data.user.teacherId, 'tch-001', 'Teacher 1 teacherId must match tch-001');
  assert.ok(teacher1Data.user.subjects.length > 0, 'Teacher 1 must have assigned subjects');

  // 2. Test Login with Teacher 70
  const teacher70Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'teacher_70@edusphere.school', password: '123456' }),
  });
  assert.equal(teacher70Res.status, 200, 'Teacher 70 login must succeed with 200 OK');
  const teacher70Data = await teacher70Res.json();
  assert.equal(teacher70Data.user.teacherId, 'tch-070');
  assert.equal(teacher70Data.user.role, 'teacher');

  // 3. Test Login with Invalid Password
  const invalidPassRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'teacher_1@edusphere.school', password: 'wrongpassword' }),
  });
  assert.equal(invalidPassRes.status, 401, 'Invalid password must return 401 Unauthorized');

  // 4. Test RBAC: Teacher cannot access Admin-only endpoint (/api/users)
  const teacherUsersRes = await fetch(`${baseUrl}/api/users`, {
    headers: { Authorization: `Bearer ${teacher1Data.token}` },
  });
  assert.equal(teacherUsersRes.status, 403, 'Teacher token must be blocked from /api/users with 403 Forbidden');

  // 5. Test RBAC: Admin can access /api/users and see all 72 users
  const adminUsersRes = await fetch(`${baseUrl}/api/users`, {
    headers: { Authorization: 'Bearer dev-admin-token' },
  });
  assert.equal(adminUsersRes.status, 200, 'Admin token must access /api/users with 200 OK');
  const adminUsersData = await adminUsersRes.json();
  assert.ok(Array.isArray(adminUsersData.items), 'adminUsersData.items must be an array');
  assert.ok(adminUsersData.items.length >= 72, 'Admin must see all user accounts (>= 72 users: Admin + Parents/Students + 70 Teachers)');
  const adminTeacherAccounts = adminUsersData.items.filter(u => u.role === 'teacher' || u.role === 'TEACHER');
  assert.ok(adminTeacherAccounts.length >= 70, 'Admin must see at least 70 teacher user accounts');
});

