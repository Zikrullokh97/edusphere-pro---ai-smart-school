import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = 'http://localhost:3000';

test('Phase 1: unknown bearer tokens are rejected', async () => {
  const response = await fetch(`${baseUrl}/api/teacher/schedule`, {
    headers: { Authorization: 'Bearer dev-token-unknown-teacher' },
  });

  assert.equal(response.status, 401);
});

test('Phase 1: teacher cannot expand schedule scope with all=true', async () => {
  const response = await fetch(`${baseUrl}/api/teacher/schedule?all=true`, {
    headers: { Authorization: 'Bearer dev-token-usr-tch-001' },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.isReadOnly, true);
  assert.ok(body.slots.every((slot) => slot.teacherId !== 'tch-002'));
});

test('Phase 1: teacher cannot query attendance for an unassigned class', async () => {
  const response = await fetch(`${baseUrl}/api/attendance?className=11-B`, {
    headers: { Authorization: 'Bearer dev-token-usr-tch-001' },
  });

  assert.equal(response.status, 403);
});

test('Phase 1: generic student list is scoped to assigned classes', async () => {
  const response = await fetch(`${baseUrl}/api/data/students`, {
    headers: { Authorization: 'Bearer dev-token-usr-tch-001' },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(body.items.every((student) => student.grade === '5-A'));
});
