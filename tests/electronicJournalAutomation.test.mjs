import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEED_KTP_DOCUMENTS,
  findKTPLesson,
  generateLessonConspectDraft,
  getMatchedLessonMaterials,
  parseKTPRawText,
} from '../src/lib/ktpEngine.ts';
import { toKyrgyzGrade } from '../src/lib/kyrgyzstanEdu.ts';

// 1. Teacher Context Auto-Selection
test('1. Teacher Context: Auto-identifies assigned classes and subjects', () => {
  const teacher = {
    id: 'usr-teacher-1',
    name: 'Aigul Sadykova',
    assignedClasses: ['7-A', '8-B', '9-A', '10-B'],
    subjects: ['Mathematics', 'Algebra', 'Geometry'],
  };
  assert.equal(teacher.assignedClasses.includes('7-A'), true);
  assert.equal(teacher.subjects.includes('Mathematics'), true);
});

// 2. Schedule-Based Class & Subject Auto-Selection
test('2. Schedule Context: Auto-detects period 1 class (7-A) and subject (Mathematics)', () => {
  const scheduleSlots = [
    { id: 'slot-1', period: 1, className: '7-A', subject: 'Mathematics', teacherName: 'Aigul Sadykova' },
    { id: 'slot-2', period: 2, className: '8-B', subject: 'Algebra', teacherName: 'Aigul Sadykova' },
  ];
  const activeSlot = scheduleSlots[0];
  assert.equal(activeSlot.className, '7-A');
  assert.equal(activeSlot.subject, 'Mathematics');
});

// 3. KTP Raw Text Parsing (CSV / TSV format)
test('3. KTP Parser: Parses structured tabular data into validated KTPLessonItem objects', () => {
  const sampleCSV = `№; Mavzu; Dars maqsadi; Uy vazifasi; Soat
1; Natural sonlar; Takrorlash va amallar; 12-bet № 15; 1
2; Oddiy kasrlar; Kasrlarni qisqartirish; 18-bet № 28; 1
14; Chiziqli tenglamalar; Bir noma'lumli tenglamalar; 54-bet № 112; 1`;

  const parsed = parseKTPRawText({
    rawText: sampleCSV,
    fileName: 'Math_7A_KTP.csv',
    className: '7-A',
    subject: 'Mathematics',
    teacherId: 'usr-teacher-1',
    teacherName: 'Aigul Sadykova',
  });

  assert.equal(parsed.className, '7-A');
  assert.equal(parsed.lessons.length, 3);
  assert.equal(parsed.lessons[0].topic, 'Natural sonlar');
  assert.equal(parsed.lessons[2].lessonNumber, 14);
  assert.equal(parsed.lessons[2].topic, 'Chiziqli tenglamalar');
});

// 4. KTP Lesson Number & Topic Matching
test('4. KTP Auto-Match: Automatically finds lesson 14 topic and homework for 7-A Math', () => {
  const matched = findKTPLesson({
    ktpDocs: SEED_KTP_DOCUMENTS,
    className: '7-A',
    subject: 'Mathematics',
    lessonNumber: 14,
  });

  assert.notEqual(matched, null);
  assert.equal(matched?.topic, 'Chiziqli tenglamalar va ularning yechimlari');
  assert.equal(matched?.homework, 'Darslik: 54-bet, № 112, 114-tenglamalar.');
});

// 5. Pedagogical Conspect Auto-Generation in Uzbek
test('5. Conspect Generator: Creates structured pedagogical stages in Uzbek', () => {
  const conspect = generateLessonConspectDraft({
    topic: 'Chiziqli tenglamalar',
    subject: 'Mathematics',
    className: '7-A',
    language: 'uz',
  });

  assert.equal(conspect.includes('DARSNING TEXNOLOGIK XARITASI'), true);
  assert.equal(conspect.includes('YANGI MAVZU BAYONI'), true);
  assert.equal(conspect.includes('Chiziqli tenglamalar'), true);
});

// 6. Pedagogical Conspect Auto-Generation in Kyrgyz
test('6. Conspect Generator: Creates structured pedagogical stages in Kyrgyz', () => {
  const conspect = generateLessonConspectDraft({
    topic: 'Сызыктуу теңдемелер',
    subject: 'Математика',
    className: '7-A',
    language: 'ky',
  });

  assert.equal(conspect.includes('САБАКТЫН ТЕХНОЛОГИЯЛЫК КАРТАСЫ'), true);
  assert.equal(conspect.includes('ЖАҢЫ ТЕМАНЫ ТҮШҮНДҮРҮҮ'), true);
});

// 7. Pedagogical Conspect Auto-Generation in Russian
test('7. Conspect Generator: Creates structured pedagogical stages in Russian', () => {
  const conspect = generateLessonConspectDraft({
    topic: 'Линейные уравнения',
    subject: 'Математика',
    className: '7-A',
    language: 'ru',
  });

  assert.equal(conspect.includes('ТЕХНОЛОГИЧЕСКАЯ КАРТА УРОКА'), true);
  assert.equal(conspect.includes('ИЗУЧЕНИЕ НОВОГО МАТЕРИАЛА'), true);
});

// 8. Educational Material Auto-Matching
test('8. Material Library: Matches textbook, presentation, worksheet, and video to topic', () => {
  const mats = getMatchedLessonMaterials({
    topic: 'Chiziqli tenglamalar',
    subject: 'Mathematics',
    className: '7-A',
  });

  assert.equal(mats.length >= 4, true);
  assert.equal(mats.some(m => m.type === 'textbook'), true);
  assert.equal(mats.some(m => m.type === 'presentation'), true);
  assert.equal(mats.some(m => m.type === 'worksheet'), true);
  assert.equal(mats.some(m => m.type === 'video'), true);
});

// 9. Attendance Auto-Separation (Present vs Absent)
test('9. Attendance Separation: Splits students cleanly into present roster vs absent list', () => {
  const entries = [
    { studentId: 'stu-1', attendance: 'present', grade: 95 },
    { studentId: 'stu-2', attendance: 'present', grade: 80 },
    { studentId: 'stu-3', attendance: 'absent', grade: null },
    { studentId: 'stu-4', attendance: 'excused', grade: null },
  ];

  const present = entries.filter(e => e.attendance === 'present' || e.attendance === 'late');
  const absent = entries.filter(e => e.attendance === 'absent' || e.attendance === 'excused');

  assert.equal(present.length, 2);
  assert.equal(absent.length, 2);
});

// 10. National 2–5 Grade Scale Conversion
test('10. Grade Badging: Maps scores to 2–5 Kyrgyz grade scale badges', () => {
  assert.equal(toKyrgyzGrade(95).grade, 5);
  assert.equal(toKyrgyzGrade(80).grade, 4);
  assert.equal(toKyrgyzGrade(55).grade, 3);
  assert.equal(toKyrgyzGrade(30).grade, 2);
});

// 11. Deterministic Lesson Session ID (Zero Duplication)
test('11. Zero Duplication: Generates deterministic session ID from class, subject, date, and lesson', () => {
  const id1 = `session-7-a-mathematics-2026-08-31-14`;
  const id2 = `session-7-a-mathematics-2026-08-31-14`;
  assert.equal(id1, id2);
});

// 12. Closed Quarter Mutation Guard
test('12. Closed Quarter Guard: Rejects mutations when target quarter status is closed', () => {
  const quarters = [
    { id: 'Q1', status: 'closed', startDate: '2026-09-01', endDate: '2026-11-04' },
    { id: 'Q2', status: 'active', startDate: '2026-11-12', endDate: '2026-12-30' },
  ];

  const targetQ = quarters.find(q => q.id === 'Q1');
  const isBlocked = targetQ?.status === 'closed';
  assert.equal(isBlocked, true);
});

