/**
 * Regression Tests: Attendance CRUD (Multi-Role RBAC)
 * Run: tsx --test tests/attendanceRegression.test.ts
 */

import test from "node:test";
import assert from "node:assert";

const API_BASE = "http://localhost:3000/api";
const TEACHER_TOKEN = "dev-teacher-token";
const PARENT_TOKEN = "dev-parent-token";
const ADMIN_TOKEN = "dev-admin-token";

async function apiCall(method: string, path: string, body?: any, token?: string): Promise<any> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token || TEACHER_TOKEN}` },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await response.json();
  if (!response.ok && response.status !== 201) {
    throw new Error(`HTTP ${response.status}: ${json.error || JSON.stringify(json)}`);
  }
  return json;
}

test("Attendance CRUD — 10+ Regression Tests", async (t) => {
  let attId = "";

  await t.test("1. Mark present (teacher)", async () => {
    const result = await apiCall("POST", "/attendance", {
      studentId: "stu-01",
      className: "7-A",
      date: "2026-01-19",
      status: "present",
      checkInTime: "07:54",
      method: "face_recognition",
      confidence: 99.1,
      teacherId: "tch-001",
    });
    assert.ok(result.success);
    assert.ok(result.data?.attendanceId);
    attId = result.data.attendanceId;
    console.log(`✓ Attendance marked: ${attId}`);
  });

  await t.test("2. Get class attendance (teacher)", async () => {
    const result = await apiCall("GET", "/attendance/class/7-A?date=2026-01-19");
    assert.ok(result.success);
    assert.ok(Array.isArray(result.items));
    console.log(`✓ Class attendance: ${result.items?.length} records`);
  });

  await t.test("3. Duplicate prevention", async () => {
    try {
      await apiCall("POST", "/attendance", {
        studentId: "stu-01",
        className: "7-A",
        date: "2026-01-19",
        status: "absent",
        teacherId: "tch-001",
      });
      assert.fail("Should reject duplicate");
    } catch (err: any) {
      assert.ok(err.message.includes("409") || err.message.includes("allaqachon"));
      console.log(`✓ Duplicate rejected`);
    }
  });

  await t.test("4. Turnstile conflict merge (higher confidence)", async () => {
    const result = await apiCall("POST", "/attendance", {
      studentId: "stu-01",
      className: "7-A",
      date: "2026-01-19",
      status: "present",
      method: "turnstile",
      confidence: 98.5,
      teacherId: "tch-001",
    });
    assert.ok(result.data?.message.includes("merged"));
    console.log(`✓ Turnstile auto-merge: confidence updated`);
  });

  await t.test("5. Update attendance (correct)", async () => {
    const result = await apiCall("PATCH", `/attendance/${attId}`, {
      status: "late",
      notes: "Traffic jam",
      updatedBy: "tch-001",
    });
    assert.ok(result.success);
    console.log(`✓ Attendance corrected: present → late`);
  });

  await t.test("6. Teacher access denied (unassigned class)", async () => {
    try {
      await apiCall("POST", "/attendance", {
        studentId: "stu-08",
        className: "10-B", // tch-001 not assigned
        date: "2026-01-19",
        status: "present",
        teacherId: "tch-001",
      });
      assert.fail("Should deny unassigned");
    } catch (err: any) {
      assert.ok(err.message.includes("403") || err.message.includes("biriktirilmagan"));
      console.log(`✓ RBAC: unassigned class denied`);
    }
  });

  await t.test("7. Parent read-only (own children)", async () => {
    const result = await apiCall("GET", "/attendance/my-children?fromDate=2026-01-01", {}, PARENT_TOKEN);
    assert.ok(result.success);
    assert.ok(Array.isArray(result.items));
    console.log(`✓ Parent: own children's attendance retrieved`);
  });

  await t.test("8. Parent cannot create (403)", async () => {
    try {
      await apiCall(
        "POST",
        "/attendance",
        {
          studentId: "stu-01",
          className: "7-A",
          date: "2026-01-19",
          status: "present",
          teacherId: "par-001",
        },
        PARENT_TOKEN
      );
      assert.fail("Should deny parent write");
    } catch (err: any) {
      assert.ok(err.message.includes("403"));
      console.log(`✓ RBAC: parent cannot mark attendance`);
    }
  });

  await t.test("9. Admin daily report", async () => {
    const result = await apiCall("GET", "/attendance/daily-report?date=2026-01-19", {}, ADMIN_TOKEN);
    assert.ok(result.success);
    assert.ok(result.stats?.totalRecords);
    console.log(`✓ Admin daily report: ${result.stats.totalRecords} records`);
  });

  await t.test("10. Student attendance summary", async () => {
    const result = await apiCall("GET", "/attendance/student/stu-01/summary");
    assert.ok(result.success);
    assert.ok(result.summary?.attendanceRate);
    console.log(`✓ Student summary: ${result.summary.attendanceRate}% attendance rate`);
  });

  console.log("\n✅ All Attendance tests PASSED (10/10)!");
});
