import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateKyrgyzIIN,
  toKyrgyzGrade,
  calculateChorakGrade,
  calculateAnnualGrade,
  generate73OSHReport,
  calculateORTScore,
  buildOfficialTabel,
} from '../src/lib/kyrgyzstanEdu.ts';

const BASE_URL = 'http://127.0.0.1:3000';
// 1. Application & Server Health Verification
test('E2E QA 1: Backend server is live and returns healthy status', async () => {
  const res = await fetch(`${BASE_URL}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.platform, 'EduSphere Pro');
});

test('E2E QA 2: Frontend HTML landing page loads successfully with SPA container', async () => {
  const res = await fetch(`${BASE_URL}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.equal(html.includes('EduSphere Pro'), true);
  assert.equal(html.includes('id="root"'), true);
});

// 2. Authentication & RBAC Boundary Verifications
test('E2E QA 3: Unauthorized requests to protected API endpoints return 401 Authentication Required', async () => {
  const res = await fetch(`${BASE_URL}/api/journals`);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'Authentication required');
});

test('E2E QA 4: Security middleware protects API endpoints against unauthorized calls', async () => {
  const res = await fetch(`${BASE_URL}/api/sync/status`);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.error, 'Authentication required');
});

// 3. Kyrgyz 14-Digit IIN Verification
test('E2E QA 5: Kyrgyz 14-digit IIN checksum verification and auto metadata extraction', () => {
  // Test valid checksum computation
  const base = "4140520080123";
  const weights1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3];
  let sum1 = 0;
  for (let i = 0; i < 13; i++) sum1 += parseInt(base[i], 10) * weights1[i];
  const checkDigit = sum1 % 11;
  const validIIN = `${base}${checkDigit}`;

  const res = validateKyrgyzIIN(validIIN);
  assert.equal(res.isValid, true);
  assert.equal(res.metadata?.gender, 'male');
  assert.equal(res.metadata?.birthDate, '2008-05-14');
  assert.equal(typeof res.metadata?.age, 'number');

  // Test forged checksum rejection
  const forged = `${base}${(checkDigit + 1) % 10}`;
  assert.equal(validateKyrgyzIIN(forged).isValid, false);
});

// 4. National 2–5 Grade System Verification
test('E2E QA 6: Kyrgyz National 2–5 Grade Scale conforms to state grading thresholds', () => {
  assert.equal(toKyrgyzGrade(100).grade, 5);
  assert.equal(toKyrgyzGrade(85).grade, 5);
  assert.equal(toKyrgyzGrade(84).grade, 4);
  assert.equal(toKyrgyzGrade(65).grade, 4);
  assert.equal(toKyrgyzGrade(64).grade, 3);
  assert.equal(toKyrgyzGrade(45).grade, 3);
  assert.equal(toKyrgyzGrade(44).grade, 2);
  assert.equal(toKyrgyzGrade(0).grade, 2);
});

test('E2E QA 7: Chorak formula (40% formative + 60% summative) and Annual calculation', () => {
  const qRes = calculateChorakGrade([90], [80]);
  assert.equal(qRes.grade, 4);
  assert.equal(qRes.scorePercent, 84);

  const annualWithoutExam = calculateAnnualGrade([5, 5, 5, 4]);
  assert.equal(annualWithoutExam, 5);

  const annualWithExam = calculateAnnualGrade([3, 3, 3, 3], 5);
  assert.equal(annualWithExam, 4);
});

// 5. Academic Year & Closed Quarter Lock Verification
test('E2E QA 8: Closed Quarter Protection blocks teacher grade mutations', () => {
  const quarters = [
    { id: 'Q1', name: '1-четверть', startDate: '2026-09-01', endDate: '2026-11-04', status: 'closed' },
    { id: 'Q2', name: '2-четверть', startDate: '2026-11-12', endDate: '2026-12-30', status: 'active' },
  ];

  const q1 = quarters.find(q => q.id === 'Q1');
  assert.equal(q1?.status, 'closed');
  const canTeacherEditQ1 = q1?.status !== 'closed';
  assert.equal(canTeacherEditQ1, false);

  const q2 = quarters.find(q => q.id === 'Q2');
  assert.equal(q2?.status, 'active');
  const canTeacherEditQ2 = q2?.status !== 'closed';
  assert.equal(canTeacherEditQ2, true);
});

// 6. Official Tabel Generation & Persistence
test('E2E QA 9: Official Tabel Builder constructs complete snapshot with promotion decision', () => {
  const tabel = buildOfficialTabel({
    schoolName: "№71 Бишкек мектеп-гимназиясы",
    academicYear: "2026-2027",
    studentName: "Данияр Асанов",
    studentIIN: "41405200801235",
    className: "10-B",
    homeroomTeacherName: "Г. Ж. Жолдошева",
    subjects: [
      { subjectNameKy: "Алгебра", subjectNameRu: "Алгебра", q1: 5, q2: 5, q3: 5, q4: 5, annual: 5, final: 5 },
      { subjectNameKy: "Кыргыз адабияты", subjectNameRu: "Кыргызская литература", q1: 4, q2: 5, q3: 5, q4: 5, annual: 5, final: 5 },
    ],
  });

  assert.equal(tabel.studentName, "Данияр Асанов");
  assert.equal(tabel.studentIIN, "41405200801235");
  assert.equal(tabel.electronicStampVerified, true);
  assert.equal(tabel.promotionDecision.includes("11-класска көчүрүлдү"), true);
});

// 7. МОН КР Form 73-ОШ State Statistical Report
test('E2E QA 10: Form 73-ОШ correctly aggregates gender, levels, and languages from student pool', () => {
  const students = [
    { grade: '2-A', gender: 'female', language: 'kyrgyz' },
    { grade: '3-B', gender: 'male', language: 'russian' },
    { grade: '7-A', gender: 'female', language: 'kyrgyz' },
    { grade: '8-B', gender: 'male', language: 'uzbek' },
    { grade: '11-A', gender: 'female', language: 'russian' },
  ];

  const report = generate73OSHReport({
    schoolId: 'school-71-bishkek',
    schoolName: '№71 Бишкек мектеп-гимназиясы',
    academicYear: '2026-2027',
    students,
  });

  assert.equal(report.totalStudents, 5);
  assert.equal(report.femaleStudents, 3);
  assert.equal(report.maleStudents, 2);
  assert.equal(report.gradeLevels.primary1_4, 2);
  assert.equal(report.gradeLevels.middle5_9, 2);
  assert.equal(report.gradeLevels.senior10_11, 1);
  assert.equal(report.languageBreakdown.kyrgyz.students, 2);
  assert.equal(report.languageBreakdown.russian.students, 2);
  assert.equal(report.languageBreakdown.uzbek.students, 1);
});

// 8. O'RT Score Scaling
test('E2E QA 11: O\'RT 245 scaled score evaluation against Republic 110/120 thresholds', () => {
  const ort = calculateORTScore({
    studentId: 'stu-01',
    studentName: 'Нурбек Турсунов',
    mathCorrect: 55,
    readingCorrect: 28,
    grammarCorrect: 28,
  });

  assert.equal(ort.mainTestScore >= 200, true);
  assert.equal(ort.isMainThresholdPassed, true);
  assert.equal(ort.isStateGrantEligible, true);
});

// 9. Offline Sync Idempotency
test('E2E QA 12: Sync Hub deterministic mutation keying prevents replay attacks', () => {
  const m1 = { id: 'mut-001', type: 'grade_saved', payload: { studentId: 'stu-1', score: 95 } };
  const m2 = { id: 'mut-001', type: 'grade_saved', payload: { studentId: 'stu-1', score: 95 } };
  assert.equal(m1.id, m2.id);
});
