import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KAO_OFFICIAL_PROVENANCE_REGISTRY,
  KAO_CURRICULUM_SUBJECTS,
  KAO_BASIC_CURRICULUM_PLANS_11_YEAR,
  KAO_BASIC_CURRICULUM_PLANS_12_YEAR,
  validateClassWeeklyWorkload,
  reconcileKTPAgainstSchedule,
  KAO_GRADE_WORKLOAD_LIMITS,
} from '../src/lib/kyrgyzstanEdu.ts';
import { SEED_KTP_DOCUMENTS, findKTPLesson } from '../src/lib/ktpEngine.ts';

// 1. KAO Official Provenance Registry Integrity
test('1. KAO Provenance: All registry entries have authentic URLs and VERIFIED status', () => {
  const keys = Object.keys(KAO_OFFICIAL_PROVENANCE_REGISTRY);
  assert.ok(keys.length >= 6, 'Must contain at least 6 verified provenance documents');

  for (const key of keys) {
    const doc = KAO_OFFICIAL_PROVENANCE_REGISTRY[key];
    assert.equal(doc.status, 'VERIFIED');
    assert.ok(doc.url.startsWith('https://kao.kg/') || doc.url.startsWith('http://kao.kg/'), 'Invalid URL: ' + doc.url);
    assert.ok(doc.documentTitle.length > 5, 'Document title missing for ' + key);
    assert.ok(doc.organization.includes('Кыргыз билим берүү академиясы'), 'Org mismatch for ' + key);
    assert.ok(doc.documentYear.length >= 4, 'Document year missing for ' + key);
  }
});

// 2. KAO Subject Catalog Completeness (24 State Standard Subjects)
test('2. KAO Subject Catalog: Contains 24 state-standard subjects with full multilingual names and codes', () => {
  assert.equal(KAO_CURRICULUM_SUBJECTS.length, 24, 'Catalog must contain exactly 24 standardized KAO subjects');

  const requiredCodes = [
    'KYR-LANG', 'KYR-LIT', 'RUS-LANG', 'RUS-LIT', 'ENG-01',
    'MATH-01', 'ALG-01', 'GEOM-01', 'CS-01',
    'HOMELAND-01', 'NAT-01', 'PHYS-01', 'CHEM-01', 'BIO-01', 'GEO-01',
    'KYR-HIST', 'WORLD-HIST', 'REL-HIST', 'MAN-SOC',
    'ART-01', 'MUSIC-01', 'TECH-01', 'PE-01', 'ACHI-01',
  ];

  for (const code of requiredCodes) {
    const sbj = KAO_CURRICULUM_SUBJECTS.find((s) => s.code === code);
    assert.ok(sbj, 'Subject with code ' + code + ' must exist in KAO catalog');
    assert.ok(sbj.nameKy.length > 0, 'Missing Kyrgyz name for ' + code);
    assert.ok(sbj.nameRu.length > 0, 'Missing Russian name for ' + code);
    assert.ok(sbj.nameUz.length > 0, 'Missing Uzbek name for ' + code);
    assert.ok(sbj.localizedNames.ky && sbj.localizedNames.ru && sbj.localizedNames.uz, 'Missing localizedNames for ' + code);
    assert.ok(sbj.hoursPerWeek > 0, 'Weekly hours must be > 0 for ' + code);
    assert.ok(sbj.annualHours > 0, 'Annual hours must be > 0 for ' + code);
    assert.ok(sbj.gradeFrom >= 1 && sbj.gradeTo <= 11, 'Invalid grade span for ' + code);
    assert.ok(sbj.source && sbj.source.url.includes('kao.kg'), 'Source provenance missing for ' + code);
  }
});

// 3. Special Subjects Verification (Religion History & Pre-Military Training)
test('3. KAO Specific Subjects: Religion History (7-9) and Pre-Military (10-11) standards verified', () => {
  const relHist = KAO_CURRICULUM_SUBJECTS.find((s) => s.code === 'REL-HIST');
  assert.ok(relHist);
  assert.equal(relHist.gradeFrom, 7);
  assert.equal(relHist.gradeTo, 9);
  assert.equal(relHist.hoursPerWeek, 1);
  assert.equal(relHist.annualHours, 34);
  assert.equal(relHist.source.documentTitle, '«Диндердин өнүгүү тарыхы» предмети боюнча предметтик стандарт 7-8-9-класстар');

  const achd = KAO_CURRICULUM_SUBJECTS.find((s) => s.code === 'ACHI-01');
  assert.ok(achd);
  assert.equal(achd.gradeFrom, 10);
  assert.equal(achd.gradeTo, 11);
  assert.equal(achd.hoursPerWeek, 1);
  assert.equal(achd.annualHours, 34);
  assert.equal(achd.source.documentTitle, 'Аскерге чакырууга чейинки даярдоо (АЧД / ДПМ) боюнча предметтик стандарт 10-11-класстар');
});

// 4. STEM Progression Verification (Math 1-6 -> Algebra & Geometry 7-11)
test('4. STEM Progression: Grade 1-6 Math transitions to Algebra and Geometry in Grade 7-11', () => {
  const math = KAO_CURRICULUM_SUBJECTS.find((s) => s.code === 'MATH-01');
  assert.ok(math);
  assert.equal(math.gradeFrom, 1);
  assert.equal(math.gradeTo, 6);
  assert.equal(math.hoursPerWeek, 5);

  const alg = KAO_CURRICULUM_SUBJECTS.find((s) => s.code === 'ALG-01');
  assert.ok(alg);
  assert.equal(alg.gradeFrom, 7);
  assert.equal(alg.gradeTo, 11);
  assert.equal(alg.hoursPerWeek, 3);

  const geom = KAO_CURRICULUM_SUBJECTS.find((s) => s.code === 'GEOM-01');
  assert.ok(geom);
  assert.equal(geom.gradeFrom, 7);
  assert.equal(geom.gradeTo, 11);
  assert.equal(geom.hoursPerWeek, 2);
});

// 5. 11-Year vs 12-Year Basic Curriculum Plan (БУП) Segregation
test('5. Curriculum BUP Segregation: 11-Year (Order №973) vs 12-Year (Order №969/1) isolation', () => {
  assert.ok(KAO_BASIC_CURRICULUM_PLANS_11_YEAR.length > 0);
  assert.ok(KAO_BASIC_CURRICULUM_PLANS_12_YEAR.length > 0);

  const bup11Grade7 = KAO_BASIC_CURRICULUM_PLANS_11_YEAR.find((p) => p.grade === 7);
  assert.ok(bup11Grade7);
  assert.equal(bup11Grade7.educationSystem, '11_YEAR');
  assert.ok(bup11Grade7.subjects.length >= 14);
  assert.ok(bup11Grade7.source.url.includes('973-11-жылдык-билм-беруу'));

  const bup12Grade7 = KAO_BASIC_CURRICULUM_PLANS_12_YEAR.find((p) => p.grade === 7);
  assert.ok(bup12Grade7);
  assert.equal(bup12Grade7.educationSystem, '12_YEAR');
  assert.ok(bup12Grade7.subjects.length >= 13);
  assert.ok(bup12Grade7.source.url.includes('приказ-969-1-от-09.07.2026-БУП-для-12-летней-школы'));
});

// 6. Class Weekly Workload Audit Functionality
test('6. Workload Audit: Accurately validates compliance against KAO limits', () => {
  // Primary (1-4): Limits 22-25
  const primaryValid = validateClassWeeklyWorkload({ gradeNumber: 3, weeklyHours: 24 });
  assert.equal(primaryValid.status, 'VALID');
  assert.equal(primaryValid.minHours, 22);
  assert.equal(primaryValid.maxHours, 25);

  const primaryUnderload = validateClassWeeklyWorkload({ gradeNumber: 3, weeklyHours: 18 });
  assert.equal(primaryUnderload.status, 'UNDERLOAD');

  const primaryOverload = validateClassWeeklyWorkload({ gradeNumber: 3, weeklyHours: 28 });
  assert.equal(primaryOverload.status, 'OVERLOAD');

  // Middle (5-9): Limits 28-33
  const middleValid = validateClassWeeklyWorkload({ gradeNumber: 7, weeklyHours: 32 });
  assert.equal(middleValid.status, 'VALID');
  assert.equal(middleValid.minHours, 28);
  assert.equal(middleValid.maxHours, 33);

  // Senior (10-11): Limits 32-34
  const seniorValid = validateClassWeeklyWorkload({ gradeNumber: 11, weeklyHours: 33 });
  assert.equal(seniorValid.status, 'VALID');
  assert.equal(seniorValid.minHours, 32);
  assert.equal(seniorValid.maxHours, 34);

  // No hours
  const zeroHours = validateClassWeeklyWorkload({ gradeNumber: 7, weeklyHours: 0 });
  assert.equal(zeroHours.status, 'NOT_VERIFIED');
});

// 7. KTP ↔ Timetable Schedule Reconciliation
test('7. KTP Reconciliation: Reconciles timetable slots against planned KTP annual hours', () => {
  const mockKtp = {
    id: 'ktp-test-1',
    className: '7-A',
    subject: 'Кыргыз тили',
    educationSystem: '11_YEAR',
    academicYear: '2026-2027',
    totalHours: 68,
    hoursPerWeek: 2,
    lessons: [],
    source: KAO_OFFICIAL_PROVENANCE_REGISTRY.KTP_GRADE_7_KYRGYZ,
  };

  // Exactly 2 slots/week (68 hours/year) -> MATCH
  const slotsMatching = [
    { id: 's1', day: 'MON', period: 1, time: '08:30', className: '7-A', subject: 'Кыргыз тили', room: '101', teacherName: 'Мугалим' },
    { id: 's2', day: 'WED', period: 2, time: '09:25', className: '7-A', subject: 'Кыргыз тили', room: '101', teacherName: 'Мугалим' },
  ];
  const matchResult = reconcileKTPAgainstSchedule({ ktpDoc: mockKtp, scheduleSlots: slotsMatching });
  assert.equal(matchResult.status, 'MATCH');
  assert.equal(matchResult.scheduledAnnualHours, 68);
  assert.equal(matchResult.difference, 0);

  // 1 slot/week (34 hours/year) -> UNDERLOAD
  const slotsUnderload = [slotsMatching[0]];
  const underloadResult = reconcileKTPAgainstSchedule({ ktpDoc: mockKtp, scheduleSlots: slotsUnderload });
  assert.equal(underloadResult.status, 'UNDERLOAD');
  assert.equal(underloadResult.difference, -34);
  assert.ok(underloadResult.warning && underloadResult.warning.includes('34 soat yetishmayapti'));

  // 3 slots/week (102 hours/year) -> OVERLOAD
  const slotsOverload = [
    ...slotsMatching,
    { id: 's3', day: 'FRI', period: 3, time: '10:20', className: '7-A', subject: 'Кыргыз тили', room: '101', teacherName: 'Мугалим' },
  ];
  const overloadResult = reconcileKTPAgainstSchedule({ ktpDoc: mockKtp, scheduleSlots: slotsOverload });
  assert.equal(overloadResult.status, 'OVERLOAD');
  assert.equal(overloadResult.difference, 34);

  // 0 slots -> NO_SCHEDULE
  const noSlotsResult = reconcileKTPAgainstSchedule({ ktpDoc: mockKtp, scheduleSlots: [] });
  assert.equal(noSlotsResult.status, 'NO_SCHEDULE');
});

// 8. Seed KTP Documents Provenance and Planned Lesson Finding
test('8. KTP Seed Documents: Provenance metadata attached and lesson lookup works accurately', () => {
  assert.ok(SEED_KTP_DOCUMENTS.length >= 5);

  for (const doc of SEED_KTP_DOCUMENTS) {
    assert.ok(doc.source && doc.source.url.includes('kao.kg'), 'Source missing for KTP ' + doc.subject);
    assert.equal(doc.educationSystem, '11_YEAR');
    assert.ok(doc.lessons.length > 0, 'Lessons missing for KTP ' + doc.subject);
  }

  const kyrgyzLesson1 = findKTPLesson({
    ktpDocs: SEED_KTP_DOCUMENTS,
    className: '7-A',
    subject: 'Кыргыз тили',
    lessonNumber: 1,
  });
  assert.ok(kyrgyzLesson1);
  assert.ok(kyrgyzLesson1.topic.includes('Кыргыз тили'));
  assert.ok(kyrgyzLesson1.objective);
});
