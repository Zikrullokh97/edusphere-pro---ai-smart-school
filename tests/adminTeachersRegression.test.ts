/**
 * Regression Tests: Admin Teachers CRUD (Real Firestore)
 * Run: tsx --test tests/adminTeachersRegression.test.ts
 */

import test from "node:test";
import assert from "node:assert";

const API_BASE = "http://localhost:3000/api";
const ADMIN_TOKEN = "dev-admin-token";

interface APIResponse {
  success: boolean;
  data?: any;
  items?: any[];
  item?: any;
  message?: string;
  totalCount?: number;
  error?: string;
}

async function apiCall(method: string, path: string, body?: any): Promise<APIResponse> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ADMIN_TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const isOk = response.ok || response.status === 201;
  const json = await response.json();
  
  if (!isOk) {
    throw new Error(`HTTP ${response.status}: ${json.error || JSON.stringify(json)}`);
  }

  return json;
}

test("Admin Teachers CRUD Module — Regression Suite", async (t) => {
  let createdTeacherId = "";
  let createdUserId = "";

  await t.test("1. POST /api/admin/teachers — Create teacher with auto-user", async () => {
    const result = await apiCall("POST", "/admin/teachers", {
      name: "Jasur Karimov",
      firstName: "Jasur",
      lastName: "Karimov",
      email: "jasur.karimov@school.local",
      phone: "+998901234567",
      position: "Matematika o'qituvchisi",
      subjects: ["MATH-01", "ALG-01"],
      workloadHours: 24,
      department: "Matematika va IT",
      homeroomClass: null,
    });

    assert.ok(result.success, "Success response expected");
    assert.ok(result.data?.teacherId, "teacherId should be generated");
    assert.ok(result.data?.userId, "userId should be auto-provisioned");
    assert.strictEqual(result.data?.email, "jasur.karimov@school.local");

    createdTeacherId = result.data.teacherId;
    createdUserId = result.data.userId;
    console.log(`✓ Teacher created: ${createdTeacherId}, User: ${createdUserId}`);
  });

  await t.test("2. GET /api/admin/teachers — List teachers", async () => {
    const result = await apiCall("GET", "/admin/teachers");

    assert.ok(result.success, "Success response expected");
    assert.ok(Array.isArray(result.items), "items array expected");
    assert.ok(result.totalCount ?? 0 >= 1, "At least 1 teacher should exist");

    const found = result.items?.find((t: any) => t.id === createdTeacherId);
    assert.ok(found, "Created teacher should be in list");
    console.log(`✓ Teacher list retrieved: ${result.totalCount} teachers`);
  });

  await t.test("3. GET /api/admin/teachers/:id — Get single teacher", async () => {
    const result = await apiCall("GET", `/admin/teachers/${createdTeacherId}`);

    assert.ok(result.success, "Success response expected");
    assert.ok(result.item, "item should be returned");
    assert.strictEqual(result.item.name, "Jasur Karimov");
    assert.strictEqual(result.item.position, "Matematika o'qituvchisi");
    assert.deepStrictEqual(result.item.subjects, ["MATH-01", "ALG-01"]);
    console.log(`✓ Teacher retrieved: ${result.item.name}`);
  });

  await t.test("4. PATCH /api/admin/teachers/:id — Update teacher", async () => {
    const result = await apiCall("PATCH", `/admin/teachers/${createdTeacherId}`, {
      position: "Senior Matematika o'qituvchisi",
      workloadHours: 28,
      department: "STEM Markazi",
      homeroomClass: "7-A",
    });

    assert.ok(result.success, "Success response expected");
    assert.strictEqual(result.item.position, "Senior Matematika o'qituvchisi");
    assert.strictEqual(result.item.workloadHours, 28);
    assert.strictEqual(result.item.homeroomClass, "7-A");
    console.log(`✓ Teacher updated: position, workload, homeroom assigned`);
  });

  await t.test("5. Verify Classes Sync — Homeroom relationship", async () => {
    const classResult = await apiCall("GET", "/data/classes");
    const cls7A = classResult.items?.find((c: any) => c.name === "7-A");

    assert.ok(cls7A, "Class 7-A should exist");
    assert.strictEqual(cls7A.homeroomTeacherId, createdTeacherId, "Homeroom teacher should be linked");
    assert.strictEqual(cls7A.homeroomTeacher, "Jasur Karimov");
    console.log(`✓ Class 7-A homeroom synced: ${cls7A.homeroomTeacher}`);
  });

  await t.test("6. Verify Users Sync — Teacher in users collection", async () => {
    const usersResult = await apiCall("GET", "/users");
    const userRecord = usersResult.items?.find((u: any) => 
      u.uid === createdUserId || u.email === "jasur.karimov@school.local"
    );

    assert.ok(userRecord, "User should exist in users collection");
    assert.strictEqual(userRecord.role, "TEACHER");
    assert.strictEqual(userRecord.teacherId, createdTeacherId);
    assert.ok(Array.isArray(userRecord.subjectSpecialties), "subjectSpecialties should be synced");
    assert.ok(userRecord.subjectSpecialties.includes("MATH-01"));
    console.log(`✓ User synced: role=TEACHER, teacherId=${userRecord.teacherId}`);
  });

  await t.test("7. PATCH — Unassign homeroom", async () => {
    const result = await apiCall("PATCH", `/admin/teachers/${createdTeacherId}`, {
      homeroomClass: null,
    });

    assert.ok(result.success);
    assert.strictEqual(result.item.homeroomClass, null);

    const classResult = await apiCall("GET", "/data/classes");
    const cls7A = classResult.items?.find((c: any) => c.name === "7-A");
    assert.strictEqual(cls7A?.homeroomTeacherId, null, "Homeroom should be cleared");
    console.log(`✓ Homeroom unassigned: Class 7-A is now unlinked`);
  });

  await t.test("8. DELETE /api/admin/teachers/:id — Soft delete", async () => {
    const result = await apiCall("DELETE", `/admin/teachers/${createdTeacherId}`);

    assert.ok(result.success, "Success response expected");
    assert.ok(result.message?.includes("arxivga"), "Archive message expected");

    const getResult = await apiCall("GET", `/admin/teachers/${createdTeacherId}`);
    assert.strictEqual(getResult.item.status, "archived");
    console.log(`✓ Teacher archived`);
  });

  console.log("\n✅ All Admin Teachers regression tests PASSED!");
});
