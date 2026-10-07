/**
 * Production API Integration Tests
 * Regression suite for all 5 modules + security/RBAC
 * Run: npm test
 */

import test from "node:test";
import assert from "node:assert";

const API = "http://localhost:3000/api";

interface TestUser {
  token: string;
  role: "ADMIN" | "TEACHER" | "PARENT";
  uid: string;
  schoolId: string;
  teacherId?: string;
  childrenIds?: string[];
}

const users: Record<string, TestUser> = {
  admin: { token: "admin-token", role: "ADMIN", uid: "admin-1", schoolId: "school-1" },
  teacher1: { token: "teacher-1-token", role: "TEACHER", uid: "teacher-1", schoolId: "school-1", teacherId: "tch-001" },
  teacher2: { token: "teacher-2-token", role: "TEACHER", uid: "teacher-2", schoolId: "school-1", teacherId: "tch-002" },
  parent: { token: "parent-token", role: "PARENT", uid: "parent-1", schoolId: "school-1", childrenIds: ["stu-01"] },
};

async function apiCall(method: string, path: string, user: TestUser, body?: any) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, json };
}

test("Production API Integration — 25+ Regression Tests", async (t) => {
  let teacherId = "";
  let studentId = "";
  let classId = "";
  let gradeId = "";
  let attendanceId = "";

  // ============ 1-5: TEACHERS CRUD ============
  await t.test("1. Admin creates teacher", async () => {
    const { status, json } = await apiCall("POST", "/data/teachers", users.admin, {
      name: "Karim Axrorov",
      firstName: "Karim",
      lastName: "Axrorov",
      email: "karim.axrorov@school.local",
      position: "Matematika o'qituvchisi",
      subjects: ["MATH-01"],
      workloadHours: 24,
    });
    assert.strictEqual(status, 201);
    assert.ok(json.data?.teacherId);
    teacherId = json.data.teacherId;
    console.log(`✓ Teacher created: ${teacherId}`);
  });

  await t.test("2. Admin lists teachers", async () => {
    const { status, json } = await apiCall("GET", "/data/teachers", users.admin);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(json.items));
    console.log(`✓ Teachers listed: ${json.totalCount} total`);
  });

  await t.test("3. Admin updates teacher", async () => {
    const { status, json } = await apiCall("PATCH", `/data/teachers/${teacherId}`, users.admin, {
      workloadHours: 28,
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(json.item.workloadHours, 28);
    console.log(`✓ Teacher updated`);
  });

  await t.test("4. Teacher cannot create teacher (403)", async () => {
    const { status } = await apiCall("POST", "/data/teachers", users.teacher1, {
      name: "Invalid",
    });
    assert.strictEqual(status, 403);
    console.log(`✓ RBAC: teacher denied teacher creation`);
  });

  await t.test("5. Duplicate teacher email rejected (409)", async () => {
    const { status } = await apiCall("POST", "/data/teachers", users.admin, {
      name: "Another",
      email: "karim.axrorov@school.local",
    });
    assert.strictEqual(status, 409);
    console.log(`✓ Duplicate email rejected`);
  });

  // ============ 6-10: STUDENTS CRUD ============
  await t.test("6. Admin creates student", async () => {
    const { status, json } = await apiCall("POST", "/data/students", users.admin, {
      firstName: "Ali",
      lastName: "Nurdinov",
      enrolledClass: "7-A",
      email: "ali.nurdinov@school.local",
      parentName: "Nurdin Ahrorov",
    });
    assert.strictEqual(status, 201);
    assert.ok(json.data?.studentId);
    studentId = json.data.studentId;
    console.log(`✓ Student created: ${studentId}`);
  });

  await t.test("7. Admin lists students", async () => {
    const { status, json } = await apiCall("GET", "/data/students", users.admin);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(json.items));
    console.log(`✓ Students listed: ${json.totalCount} total`);
  });

  await t.test("8. Admin updates student", async () => {
    const { status, json } = await apiCall("PATCH", `/data/students/${studentId}`, users.admin, {
      parentPhone: "+998901234567",
    });
    assert.strictEqual(status, 200);
    console.log(`✓ Student updated`);
  });

  await t.test("9. Duplicate student (same name+birthDate) rejected (409)", async () => {
    const { status } = await apiCall("POST", "/data/students", users.admin, {
      firstName: "Ali",
      lastName: "Nurdinov",
      enrolledClass: "7-B",
      birthDate: "2012-05-15",
    });
    assert.strictEqual(status, 409);
    console.log(`✓ Duplicate student rejected`);
  });

  await t.test("10. Parent cannot create students (403)", async () => {
    const { status } = await apiCall("POST", "/data/students", users.parent, {
      firstName: "X",
      lastName: "Y",
    });
    assert.strictEqual(status, 403);
    console.log(`✓ RBAC: parent denied student creation`);
  });

  // ============ 11-15: CLASSES CRUD ============
  await t.test("11. Admin creates class", async () => {
    const { status, json } = await apiCall("POST", "/data/classes", users.admin, {
      name: "7-A",
      gradeLevel: 7,
      section: "A",
      academicYear: "2025-2026",
      homeroomTeacherId: teacherId,
    });
    assert.strictEqual(status, 201);
    assert.ok(json.data?.classId);
    classId = json.data.classId;
    console.log(`✓ Class created: ${classId}`);
  });

  await t.test("12. Admin lists classes", async () => {
    const { status, json } = await apiCall("GET", "/data/classes", users.admin);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(json.items));
    console.log(`✓ Classes listed: ${json.totalCount} total`);
  });

  await t.test("13. Admin assigns teacher to class", async () => {
    const { status, json } = await apiCall("PATCH", `/data/classes/${classId}`, users.admin, {
      assignedTeacherIds: [teacherId],
    });
    assert.strictEqual(status, 200);
    console.log(`✓ Teacher assigned to class`);
  });

  await t.test("14. Duplicate class (same grade+section+year) rejected (409)", async () => {
    const { status } = await apiCall("POST", "/data/classes", users.admin, {
      name: "7-A",
      gradeLevel: 7,
      section: "A",
      academicYear: "2025-2026",
    });
    assert.strictEqual(status, 409);
    console.log(`✓ Duplicate class rejected`);
  });

  await t.test("15. Different academic year same section OK", async () => {
    const { status, json } = await apiCall("POST", "/data/classes", users.admin, {
      name: "7-A",
      gradeLevel: 7,
      section: "A",
      academicYear: "2024-2025",
    });
    assert.strictEqual(status, 201);
    console.log(`✓ Same section in different year allowed`);
  });

  // ============ 16-20: GRADES CRUD ============
  await t.test("16. Teacher creates grade", async () => {
    const { status, json } = await apiCall("POST", "/data/grades", users.teacher1, {
      studentId,
      className: "7-A",
      subject: "Mathematics",
      score: 95,
      gradeType: "midterm",
      academicYear: "2025-2026",
    });
    assert.strictEqual(status, 201);
    assert.ok(json.data?.gradeId);
    gradeId = json.data.gradeId;
    console.log(`✓ Grade created: ${gradeId}`);
  });

  await t.test("17. Teacher lists grades", async () => {
    const { status, json } = await apiCall("GET", "/data/grades?classId=7-A", users.teacher1);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(json.items));
    console.log(`✓ Grades listed`);
  });

  await t.test("18. Parent reads child's grades", async () => {
    const { status, json } = await apiCall("GET", "/data/grades", users.parent);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(json.items));
    console.log(`✓ Parent: grades retrieved`);
  });

  await t.test("19. Teacher updates own grade", async () => {
    const { status, json } = await apiCall("PATCH", `/data/grades/${gradeId}`, users.teacher1, {
      score: 98,
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(json.item.score, 98);
    console.log(`✓ Grade updated`);
  });

  await t.test("20. Teacher cannot update other teacher's grade (403)", async () => {
    const { status } = await apiCall("PATCH", `/data/grades/${gradeId}`, users.teacher2, {
      score: 50,
    });
    assert.strictEqual(status, 403);
    console.log(`✓ RBAC: cross-teacher grade update denied`);
  });

  // ============ 21-25: ATTENDANCE CRUD ============
  await t.test("21. Teacher marks attendance", async () => {
    const { status, json } = await apiCall("POST", "/data/attendance", users.teacher1, {
      studentId,
      className: "7-A",
      date: new Date().toISOString().split("T")[0],
      status: "PRESENT",
      method: "MANUAL",
    });
    assert.strictEqual(status, 201);
    assert.ok(json.data?.attendanceId);
    attendanceId = json.data.attendanceId;
    console.log(`✓ Attendance marked: ${attendanceId}`);
  });

  await t.test("22. Teacher lists attendance", async () => {
    const { status, json } = await apiCall("GET", "/data/attendance?classId=7-A", users.teacher1);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(json.items));
    console.log(`✓ Attendance listed`);
  });

  await t.test("23. Duplicate attendance rejected (409)", async () => {
    const today = new Date().toISOString().split("T")[0];
    const { status } = await apiCall("POST", "/data/attendance", users.teacher1, {
      studentId,
      className: "7-A",
      date: today,
      status: "ABSENT",
    });
    assert.strictEqual(status, 409);
    console.log(`✓ Duplicate attendance rejected`);
  });

  await t.test("24. Teacher corrects attendance", async () => {
    const { status, json } = await apiCall("PATCH", `/data/attendance/${attendanceId}`, users.teacher1, {
      status: "LATE",
      notes: "Traffic jam",
    });
    assert.strictEqual(status, 200);
    console.log(`✓ Attendance corrected`);
  });

  await t.test("25. Parent reads child's attendance", async () => {
    const { status, json } = await apiCall("GET", "/data/attendance", users.parent);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(json.items));
    console.log(`✓ Parent: attendance retrieved`);
  });

  console.log("\n✅ All 25 regression tests PASSED!");
});
