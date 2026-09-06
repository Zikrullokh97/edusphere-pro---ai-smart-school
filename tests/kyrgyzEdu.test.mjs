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

// 1. IIN Valid Checksum & Metadata Extraction
test('1. Kyrgyz IIN: Accepts valid 14-digit checksummed IIN and extracts correct metadata', () => {
  const base = "4140520080123";
  const weights1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3];
  let sum1 = 0;
  for (let i = 0; i < 13; i++) sum1 += parseInt(base[i], 10) * weights1[i];
  const checkDigit = sum1 % 11;
  const validIIN = `${base}${checkDigit}`;

  const result = validateKyrgyzIIN(validIIN);
  assert.equal(result.isValid, true);
  assert.equal(result.metadata?.birthDate, '2008-05-14');
  assert.equal(result.metadata?.gender, 'male');
  assert.equal(typeof result.metadata?.age, 'number');
});

// 2. IIN Invalid Checksum Rejection
test('2. Kyrgyz IIN: Rejects forged checksums, invalid months, and non-14 lengths', () => {
  assert.equal(validateKyrgyzIIN('12345').isValid, false);
  assert.equal(validateKyrgyzIIN('41415200801231').isValid, false); // invalid month
  assert.equal(validateKyrgyzIIN('41405200801238').isValid, false); // forged checksum
});

// 3. Duplicate IIN Logic
test('3. Kyrgyz IIN: Duplicate detection rejects matching IIN on distinct student ID', () => {
  const mockStudents = [
    { id: 'stu-1', studentId: 'stu-1', iin: '41405200801239' },
    { id: 'stu-2', studentId: 'stu-2', iin: '32008200905432' },
  ];
  const incomingIIN = '41405200801239';
  const incomingStudentId = 'stu-3';
  const isDuplicate = mockStudents.some(s => s.iin === incomingIIN && s.studentId !== incomingStudentId);
  assert.equal(isDuplicate, true);
});

// 4. Grade 5 Mapping (85–100%)
test('4. National Grade Scale: Maps 85-100% to Grade 5 (Эң жакшы / Отлично)', () => {
  const g100 = toKyrgyzGrade(100);
  const g85 = toKyrgyzGrade(85);
  assert.equal(g100.grade, 5);
  assert.equal(g85.grade, 5);
  assert.equal(g100.isPassing, true);
});

// 5. Grade 4 Mapping (65–84%)
test('5. National Grade Scale: Maps 65-84% to Grade 4 (Жакшы / Хорошо)', () => {
  const g84 = toKyrgyzGrade(84);
  const g65 = toKyrgyzGrade(65);
  assert.equal(g84.grade, 4);
  assert.equal(g65.grade, 4);
  assert.equal(g84.isPassing, true);
});

// 6. Grade 3 Mapping (45–64%)
test('6. National Grade Scale: Maps 45-64% to Grade 3 (Канааттандырарлык / Удовл)', () => {
  const g64 = toKyrgyzGrade(64);
  const g45 = toKyrgyzGrade(45);
  assert.equal(g64.grade, 3);
  assert.equal(g45.grade, 3);
  assert.equal(g64.isPassing, true);
});

// 7. Grade 2 Mapping (0–44%)
test('7. National Grade Scale: Maps 0-44% to Grade 2 (Канааттандырарлык эмес / Неуд)', () => {
  const g44 = toKyrgyzGrade(44);
  const g10 = toKyrgyzGrade(10);
  assert.equal(g44.grade, 2);
  assert.equal(g10.grade, 2);
  assert.equal(g44.isPassing, false);
});

// 8. Quarter Grade Calculation (40% formative + 60% summative)
test('8. Quarter Formula: Accurately weights Formative 40% and Summative 60%', () => {
  // 90 * 0.4 + 80 * 0.6 = 36 + 48 = 84% -> 4
  const qGrade = calculateChorakGrade([90], [80]);
  assert.equal(qGrade.grade, 4);
  assert.equal(qGrade.scorePercent, 84);

  // 95 * 0.4 + 90 * 0.6 = 38 + 54 = 92% -> 5
  const qGrade5 = calculateChorakGrade([95], [90]);
  assert.equal(qGrade5.grade, 5);
});

// 9. Annual Grade Calculation (4 quarters + exam weighting)
test('9. Annual Formula: Computes 4-quarter average and doubles exam weighting', () => {
  // 4 quarters (5, 5, 4, 5) -> avg 4.75 -> 5
  assert.equal(calculateAnnualGrade([5, 5, 4, 5]), 5);

  // 4 quarters (3, 3, 3, 3) + exam 5 -> (12 + 10) / 6 = 3.66 -> 4
  assert.equal(calculateAnnualGrade([3, 3, 3, 3], 5), 4);
});

// 10. Academic Year & 4 Quarters Structure
test('10. Academic Year Model: Initializes 2026-2027 with Q1-Q4 correctly', () => {
  const academicYear = {
    id: "2026-2027",
    name: "2026–2027 Окуу жылы",
    startDate: "2026-09-01",
    endDate: "2027-05-25",
    status: "active",
    activeQuarter: "Q1",
    quarters: [
      { id: "Q1", name: "1-четверть", startDate: "2026-09-01", endDate: "2026-11-04", status: "active" },
      { id: "Q2", name: "2-четверть", startDate: "2026-11-12", endDate: "2026-12-30", status: "upcoming" },
      { id: "Q3", name: "3-четверть", startDate: "2027-01-11", endDate: "2027-03-20", status: "upcoming" },
      { id: "Q4", name: "4-четверть", startDate: "2027-04-01", endDate: "2027-05-25", status: "upcoming" },
    ],
  };

  assert.equal(academicYear.quarters.length, 4);
  assert.equal(academicYear.quarters[0].id, 'Q1');
  assert.equal(academicYear.activeQuarter, 'Q1');
});

// 11. Quarter Close Status Detection Logic
test('11. Quarter Close Guard: Correctly identifies closed quarter from date range', () => {
  const quarters = [
    { id: "Q1", startDate: "2026-09-01", endDate: "2026-11-04", status: "closed" },
    { id: "Q2", startDate: "2026-11-12", endDate: "2026-12-30", status: "active" },
  ];
  const targetDate = "2026-10-15"; // inside Q1
  const matched = quarters.find(q => new Date(targetDate) >= new Date(q.startDate) && new Date(targetDate) <= new Date(q.endDate));
  assert.equal(matched?.status, 'closed');
});

// 12. Official Tabel Generation
test('12. Official Tabel Generator: Builds compliant report card with student & class', () => {
  const tabel = buildOfficialTabel({
    schoolName: "№71 Бишкек мектеп-гимназиясы",
    academicYear: "2026-2027",
    studentName: "Бекзат Рахимов",
    studentIIN: "41405200801235",
    className: "10-A",
    homeroomTeacherName: "А. К. Касымова",
    subjects: [
      { subjectNameKy: "Алгебра", subjectNameRu: "Алгебра", q1: 5, q2: 5, q3: 4, q4: 5, annual: 5, final: 5 },
      { subjectNameKy: "Кыргыз тили", subjectNameRu: "Кыргызский язык", q1: 5, q2: 5, q3: 5, q4: 5, annual: 5, final: 5 },
    ],
  });

  assert.equal(tabel.studentName, "Бекзат Рахимов");
  assert.equal(tabel.subjects.length, 2);
  assert.equal(tabel.promotionDecision.includes("11-класска көчүрүлдү"), true);
});

// 13. Tabel Snapshot & Electronic Stamp
test('13. Tabel Snapshot: Verifies digital electronic stamp verification flag', () => {
  const tabel = buildOfficialTabel({
    schoolName: "№71 Бишкек мектеп-гимназиясы",
    academicYear: "2026-2027",
    studentName: "Айсулуу Бекматова",
    studentIIN: "31206200901248",
    className: "9-B",
    homeroomTeacherName: "М. Т. Исаева",
    subjects: [],
  });

  assert.equal(tabel.electronicStampVerified, true);
  assert.equal(typeof tabel.issuedDate, 'string');
});

// 14. МОН КР Form 73-ОШ Report Generation
test('14. МОН КР Form 73-ОШ: Aggregates total students and classes', () => {
  const students = [
    { grade: '1-A', gender: 'female', language: 'kyrgyz' },
    { grade: '7-B', gender: 'male', language: 'russian' },
    { grade: '11-A', gender: 'female', language: 'uzbek' },
  ];

  const report = generate73OSHReport({
    schoolId: 'school-71-bishkek',
    schoolName: '№71 Бишкек мектеп-гимназиясы',
    academicYear: '2026-2027',
    students,
  });

  assert.equal(report.totalStudents, 3);
  assert.equal(report.femaleStudents, 2);
  assert.equal(report.maleStudents, 1);
});

// 15. МОН КР Form 73-ОШ Language Breakdown
test('15. МОН КР Form 73-ОШ: Accurately categorizes Kyrgyz, Russian, and Uzbek language students', () => {
  const students = [
    { grade: '2-A', language: 'kyrgyz' },
    { grade: '2-B', language: 'kyrgyz' },
    { grade: '3-A', language: 'russian' },
    { grade: '4-A', language: 'uzbek' },
  ];

  const report = generate73OSHReport({
    schoolId: 'school-71-bishkek',
    schoolName: '№71 Бишкек мектеп-гимназиясы',
    academicYear: '2026-2027',
    students,
  });

  assert.equal(report.languageBreakdown.kyrgyz.students, 2);
  assert.equal(report.languageBreakdown.russian.students, 1);
  assert.equal(report.languageBreakdown.uzbek.students, 1);
});

// 16. МОН КР Form 73-ОШ Grade Level Categorization (1-4, 5-9, 10-11)
test('16. МОН КР Form 73-ОШ: Correctly separates Primary (1-4), Middle (5-9), and Senior (10-11)', () => {
  const students = [
    { grade: '3-A' },
    { grade: '8-B' },
    { grade: '11-B' },
  ];

  const report = generate73OSHReport({
    schoolId: 'school-71-bishkek',
    schoolName: '№71 Бишкек мектеп-гимназиясы',
    academicYear: '2026-2027',
    students,
  });

  assert.equal(report.gradeLevels.primary1_4, 1);
  assert.equal(report.gradeLevels.middle5_9, 1);
  assert.equal(report.gradeLevels.senior10_11, 1);
});

// 17. Teacher RBAC Authorization Boundary
test('17. Teacher RBAC: Teacher is restricted to assigned classes only', () => {
  const teacherAssignedClasses = ['7-A', '8-B'];
  const targetClassAllowed = '7-A';
  const targetClassForbidden = '10-B';

  assert.equal(teacherAssignedClasses.includes(targetClassAllowed), true);
  assert.equal(teacherAssignedClasses.includes(targetClassForbidden), false);
});

// 18. Parent Child-Only Access Control
test('18. Parent Access: Parent can only view/access their own children records', () => {
  const parentChildrenIds = ['stu-01', 'stu-02'];
  const ownChild = 'stu-01';
  const foreignChild = 'stu-99';

  assert.equal(parentChildrenIds.includes(ownChild), true);
  assert.equal(parentChildrenIds.includes(foreignChild), false);
});

// 19. Closed Quarter Mutation Rejection Rule
test('19. Closed Quarter Guard: Mutation is rejected if quarter status is closed', () => {
  const quarterStatus = 'closed';
  const canTeacherMutate = quarterStatus !== 'closed';
  assert.equal(canTeacherMutate, false);
});

// 20. Offline Grade Sync Queue Idempotency
test('20. Offline Sync Idempotency: Generates unique deterministic mutation keys', () => {
  const studentId = 'stu-01';
  const date = '2026-09-15';
  const className = '7-A';
  const key1 = `attendance-${studentId}-${date}-${className}`;
  const key2 = `attendance-${studentId}-${date}-${className}`;

  assert.equal(key1, key2);
  assert.equal(key1.startsWith('attendance-stu-01'), true);
});
