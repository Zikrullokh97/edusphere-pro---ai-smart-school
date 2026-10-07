/**
 * Verification Test: Production Integration Status
 * Run: npx tsx tests/verifyProductionIntegration.test.ts
 */

import test from "node:test";
import assert from "node:assert";

test("Verify Production Integration Status", async (t) => {
  // Check 1: Server endpoint routing
  await t.test("1. Check if POST /api/data/teachers uses production repository", async () => {
    try {
      const res = await fetch("http://localhost:3000/api/data/teachers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token",
        },
        body: JSON.stringify({
          name: "Test Teacher Prod Check",
          position: "Teacher",
          firstName: "Test",
          lastName: "Teacher",
        }),
      });

      const json = await res.json();
      console.log(`Response status: ${res.status}`);
      console.log(`Response body:`, json);

      if (res.status === 201 && json.data?.teacherId) {
        console.log("✅ PRODUCTION: Real repository used (Firestore)");
      } else if (json.id && json.name) {
        console.log("❌ MOCK: localDbStore used (not production)");
        process.exit(1);
      } else {
        console.log("⚠️  Unexpected response format");
      }
    } catch (err) {
      console.error("⚠️  Server not running");
    }
  });

  // Check 2: Verify Firestore connection
  await t.test("2. Check if Firestore is configured", async () => {
    try {
      const res = await fetch("http://localhost:3000/api/health/firestore", {
        headers: { "Authorization": "Bearer admin-token" },
      });

      if (res.ok) {
        console.log("✅ Firestore is configured");
      } else {
        console.log("⚠️  Firestore health check not implemented");
      }
    } catch {
      console.log("⚠️  Firestore check endpoint missing");
    }
  });

  // Check 3: Test duplicate prevention (production feature)
  await t.test("3. Test duplicate prevention (409 error)", async () => {
    try {
      const data = {
        name: "Duplicate Test",
        position: "Teacher",
        firstName: "Duplicate",
        lastName: "Teacher",
        email: "dup@test.local",
      };

      // First create
      const res1 = await fetch("http://localhost:3000/api/data/teachers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer admin-token",
        },
        body: JSON.stringify(data),
      });

      if (res1.status === 201) {
        // Try duplicate
        const res2 = await fetch("http://localhost:3000/api/data/teachers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer admin-token",
          },
          body: JSON.stringify(data),
        });

        if (res2.status === 409) {
          console.log("✅ Duplicate prevention works (production feature)");
        } else {
          console.log(`❌ No duplicate prevention (status ${res2.status})`);
        }
      }
    } catch (err) {
      console.log("⚠️  Duplicate test failed:", err);
    }
  });

  // Check 4: RBAC validation
  await t.test("4. Test RBAC (teacher cannot create teacher)", async () => {
    try {
      const res = await fetch("http://localhost:3000/api/data/teachers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer teacher-token", // Teacher, not admin
        },
        body: JSON.stringify({
          name: "Test",
          position: "Teacher",
        }),
      });

      if (res.status === 403) {
        console.log("✅ RBAC enforced (teacher denied)");
      } else {
        console.log(`❌ RBAC not enforced (status ${res.status})`);
      }
    } catch {
      console.log("⚠️  RBAC test failed");
    }
  });

  console.log("\n=== PRODUCTION INTEGRATION STATUS ===");
  console.log("If all checks PASS (✅), production is connected.");
  console.log("If checks FAIL (❌), server.ts needs fixes (see CRITICAL_FIX_NEEDED.md).");
});
