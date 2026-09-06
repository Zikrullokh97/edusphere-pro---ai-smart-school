import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

const SCHOOL_ID = 'school-71-tashkent';
let environment;

async function seed(path, data) {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), ...path.split('/')), data);
  });
}

test.before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'edusphere-mvp-test',
    firestore: { rules: await readFile('firestore.rules', 'utf8') },
  });
  await seed('users/admin-1', { userId: 'admin-1', role: 'admin', schoolId: SCHOOL_ID, childrenIds: [] });
  await seed('users/student-1', { userId: 'student-1', role: 'parent_student', schoolId: SCHOOL_ID, childrenIds: [] });
  await seed('users/student-2', { userId: 'student-2', role: 'parent_student', schoolId: SCHOOL_ID, childrenIds: [] });
  await seed('users/teacher-1', { userId: 'teacher-1', role: 'teacher', schoolId: SCHOOL_ID, assignedClasses: ['7-A'], childrenIds: [] });
  await seed('attendance/att-1', { id: 'att-1', schoolId: SCHOOL_ID, studentId: 'student-1', className: '7-A', date: '2026-08-29', status: 'present' });
  await seed('grades/grade-1', { id: 'grade-1', schoolId: SCHOOL_ID, studentId: 'student-1', className: '7-A', subject: 'Math', average: 90 });
  await seed('grades/grade-2', { id: 'grade-2', schoolId: SCHOOL_ID, studentId: 'student-2', className: '7-A', subject: 'Math', average: 80 });
  await seed('users/parent-1', { userId: 'parent-1', role: 'parent_student', schoolId: SCHOOL_ID, childrenIds: ['student-1'] });
});

test.after(async () => environment?.cleanup());

test('unauthenticated users cannot read attendance or grades', async () => {
  const context = environment.unauthenticatedContext();
  await assert.rejects(() => getDoc(doc(context.firestore(), 'attendance/att-1')));
  await assert.rejects(() => getDoc(doc(context.firestore(), 'grades/grade-1')));
});

test('student can read own data but not another student', async () => {
  const context = environment.authenticatedContext('student-1');
  assert.equal((await getDoc(doc(context.firestore(), 'attendance/att-1'))).exists(), true);
  await assert.rejects(() => getDoc(doc(context.firestore(), 'grades/grade-2')));
  await seed('attendance/att-2', { id: 'att-2', schoolId: SCHOOL_ID, studentId: 'student-2', className: '7-A', date: '2026-08-29', status: 'present' });
  await assert.rejects(() => getDoc(doc(context.firestore(), 'attendance/att-2')));
});

test('parent can read a linked child but not an unrelated child', async () => {
  const context = environment.authenticatedContext('parent-1');
  assert.equal((await getDoc(doc(context.firestore(), 'grades/grade-1'))).exists(), true);
  await assert.rejects(() => getDoc(doc(context.firestore(), 'grades/grade-2')));
});

test('teacher is limited to assigned class and cannot alter roles', async () => {
  const context = environment.authenticatedContext('teacher-1');
  assert.equal((await getDoc(doc(context.firestore(), 'attendance/att-1'))).exists(), true);
  await assert.rejects(() => updateDoc(doc(context.firestore(), 'users/teacher-1'), { role: 'admin' }));
});

test('admin can read school data but audit history is immutable', async () => {
  const context = environment.authenticatedContext('admin-1');
  assert.equal((await getDoc(doc(context.firestore(), 'grades/grade-1'))).exists(), true);
  await assert.rejects(() => setDoc(doc(context.firestore(), 'auditLogs/log-1'), { schoolId: SCHOOL_ID }));
});
