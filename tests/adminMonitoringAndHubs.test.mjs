import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer dev-admin-token",
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

test("Admin Enterprise Overhaul — Monitoring, Rankings, Rooms & AI Integration", async (t) => {
  await t.test("1. GET /api/admin/kpi returns urgentAlerts and classRanking", async () => {
    const { status, ok, data } = await apiRequest("/api/admin/kpi");
    assert.strictEqual(status, 200);
    assert.strictEqual(ok, true);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.urgentAlerts, "urgentAlerts must be present");
    assert.ok(Array.isArray(data.data.urgentAlerts.atRiskStudents), "atRiskStudents must be an array");
    assert.ok(Array.isArray(data.data.urgentAlerts.lowAttendanceClasses), "lowAttendanceClasses must be an array");
    assert.ok(Array.isArray(data.data.urgentAlerts.delayedTeachers), "delayedTeachers must be an array");
    assert.ok(Array.isArray(data.data.classRanking), "classRanking must be an array");
  });

  await t.test("2. GET /api/admin/monitoring/rankings returns computed rankings and transparent weights", async () => {
    const { status, ok, data } = await apiRequest("/api/admin/monitoring/rankings");
    assert.strictEqual(status, 200);
    assert.strictEqual(ok, true);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data.studentRankings), "studentRankings array");
    assert.ok(Array.isArray(data.data.teacherRankings), "teacherRankings array");
    assert.ok(Array.isArray(data.data.classRankings), "classRankings array");
    assert.ok(data.data.methodology, "ranking methodology must be present");
    assert.ok(data.data.methodology.studentWeights, "student ranking formula weights must be present");
    assert.ok(data.data.methodology.teacherWeights, "teacher ranking formula weights must be present");
    assert.ok(data.data.methodology.classWeights, "class ranking formula weights must be present");
  });

  await t.test("3. Room Management CRUD: GET, POST, PUT, DELETE /api/admin/rooms", async () => {
    // List rooms
    const listRes = await apiRequest("/api/admin/rooms");
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listRes.ok, true);
    assert.ok(Array.isArray(listRes.data.rooms), "rooms must be an array");
    const initialCount = listRes.data.rooms.length;

    // Create a new room
    const newRoomId = `test-room-${Date.now()}`;
    const createRes = await apiRequest("/api/admin/rooms", {
      method: "POST",
      body: JSON.stringify({
        id: newRoomId,
        name: "305-STEM Innovatsiya Xonasi",
        code: "STEM-305",
        floor: 3,
        building: "Asosiy bino",
        capacity: 35,
        type: "laboratory",
        equipment: ["3d_printer", "vr_headsets"],
        status: "active",
      }),
    });
    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createRes.data.success, true);
    assert.strictEqual(createRes.data.room.name, "305-STEM Innovatsiya Xonasi");

    const createdId = createRes.data.room?.id || createRes.data.item?.id || newRoomId;

    // Update the room
    const updateRes = await apiRequest(`/api/admin/rooms/${createdId}`, {
      method: "PUT",
      body: JSON.stringify({
        capacity: 40,
        assignedTeacherName: "Jasur Karimov",
      }),
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.data.success, true);
    assert.strictEqual(updateRes.data.room.capacity, 40);

    // Delete the room
    const deleteRes = await apiRequest(`/api/admin/rooms/${createdId}`, {
      method: "DELETE",
    });
    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deleteRes.data.success, true);
  });

  await t.test("4. POST /api/ai/admin-summary returns 5 key points in UZ, RU, and KY", async () => {
    // Test UZ
    const uzRes = await apiRequest("/api/ai/admin-summary", {
      method: "POST",
      body: JSON.stringify({ language: "uz" }),
    });
    assert.strictEqual(uzRes.status, 200);
    assert.strictEqual(uzRes.data.success, true);
    assert.ok(uzRes.data.summary.includes("Bugun maktab ma'muriyati e'tibor berishi zarur bo‘lgan asosiy 5 ta holat"));

    // Test RU
    const ruRes = await apiRequest("/api/ai/admin-summary", {
      method: "POST",
      body: JSON.stringify({ language: "ru" }),
    });
    assert.strictEqual(ruRes.status, 200);
    assert.strictEqual(ruRes.data.success, true);
    assert.ok(ruRes.data.summary.includes("Топ-5 ключевых вопросов для директора на сегодня"));

    // Test KY
    const kyRes = await apiRequest("/api/ai/admin-summary", {
      method: "POST",
      body: JSON.stringify({ language: "ky" }),
    });
    assert.strictEqual(kyRes.status, 200);
    assert.strictEqual(kyRes.data.success, true);
    assert.ok(kyRes.data.summary.includes("Мектеп боюнча бүгүнкү негизги 5 жагдай"));
  });
});
