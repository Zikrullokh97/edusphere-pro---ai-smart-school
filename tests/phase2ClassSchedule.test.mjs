import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = 'http://localhost:3000';
const teacherOneHeaders = {
  Authorization: 'Bearer dev-token-usr-tch-001',
  'Content-Type': 'application/json',
};
const teacherTwoHeaders = {
  Authorization: 'Bearer dev-token-usr-tch-002',
};

function classPayload(name, schedules) {
  return {
    classData: {
      name,
      gradeNumber: 6,
      section: 'P',
      room: 'P-201',
      academicYear: '2026-2027',
      subject: 'Algebra',
      // A teacher must not be able to assign this resource to another owner.
      teacherId: 'tch-002',
    },
    schedules,
  };
}

test('Phase 2: teacher creates one class with separate weekly schedule records', async () => {
  const name = `6-P-Phase2-${Date.now()}`;
  const response = await fetch(`${baseUrl}/api/classes/with-schedule`, {
    method: 'POST',
    headers: teacherOneHeaders,
    body: JSON.stringify(classPayload(name, [
      { day: 'MON', period: 2, startTime: '09:00', endTime: '09:45', room: 'P-201' },
      { day: 'WED', period: 4, startTime: '10:50', endTime: '11:35', room: 'P-202' },
    ])),
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.class.teacherId, 'tch-001');
  assert.equal(body.class.ownerUid, 'usr-tch-001');
  assert.equal(body.schedules.length, 2);
  assert.deepEqual(body.schedules.map((slot) => slot.day).sort(), ['MON', 'WED']);
  assert.ok(body.schedules.every((slot) => slot.classId === body.class.id));
  assert.ok(body.schedules.every((slot) => slot.teacherId === 'tch-001'));

  const ownScheduleResponse = await fetch(`${baseUrl}/api/data/schedules`, {
    headers: teacherOneHeaders,
  });
  const ownScheduleBody = await ownScheduleResponse.json();
  assert.equal(ownScheduleResponse.status, 200);
  assert.equal(ownScheduleBody.items.filter((slot) => slot.classId === body.class.id).length, 2);

  const otherScheduleResponse = await fetch(`${baseUrl}/api/data/schedules`, {
    headers: teacherTwoHeaders,
  });
  const otherScheduleBody = await otherScheduleResponse.json();
  assert.equal(otherScheduleResponse.status, 200);
  assert.equal(otherScheduleBody.items.some((slot) => slot.classId === body.class.id), false);
});

test('Phase 2: invalid weekly schedule rolls back the class creation', async () => {
  const name = `6-R-Rollback-${Date.now()}`;
  const response = await fetch(`${baseUrl}/api/classes/with-schedule`, {
    method: 'POST',
    headers: teacherOneHeaders,
    body: JSON.stringify(classPayload(name, [
      { day: 'FRI', period: 3, startTime: '09:50', endTime: '10:35', room: 'R-101' },
      { day: 'FRI', period: 3, startTime: '10:50', endTime: '11:35', room: 'R-102' },
    ])),
  });
  assert.equal(response.status, 400);

  const classesResponse = await fetch(`${baseUrl}/api/data/classes`, {
    headers: teacherOneHeaders,
  });
  const classesBody = await classesResponse.json();
  assert.equal(classesResponse.status, 200);
  assert.equal(classesBody.items.some((item) => item.name === name), false);
});

test('Phase 2: a teacher cannot double-book their weekly period', async () => {
  const firstName = `6-S-Conflict-A-${Date.now()}`;
  const firstResponse = await fetch(`${baseUrl}/api/classes/with-schedule`, {
    method: 'POST',
    headers: teacherOneHeaders,
    body: JSON.stringify(classPayload(firstName, [
      { day: 'TUE', period: 7, startTime: '14:00', endTime: '14:45', room: 'S-301' },
    ])),
  });
  assert.equal(firstResponse.status, 201);

  const blockedName = `6-S-Conflict-B-${Date.now()}`;
  const blockedResponse = await fetch(`${baseUrl}/api/classes/with-schedule`, {
    method: 'POST',
    headers: teacherOneHeaders,
    body: JSON.stringify(classPayload(blockedName, [
      { day: 'TUE', period: 7, startTime: '14:00', endTime: '14:45', room: 'S-302' },
    ])),
  });
  assert.equal(blockedResponse.status, 409);

  const classesResponse = await fetch(`${baseUrl}/api/data/classes`, {
    headers: teacherOneHeaders,
  });
  const classesBody = await classesResponse.json();
  assert.equal(classesBody.items.some((item) => item.name === blockedName), false);
});
