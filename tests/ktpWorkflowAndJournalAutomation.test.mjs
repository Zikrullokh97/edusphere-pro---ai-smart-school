import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEED_KTP_DOCUMENTS,
  findKTPLesson,
  generateLessonConspectDraft,
  getMatchedLessonMaterials,
  parseKTPRawText,
  resolveNextLessonContext,
  isKTPApproved,
  getKTPStatusLabel,
} from '../src/lib/ktpEngine.ts';

// 1. KTP Status & Approval State Machine Validation
test('1. KTP State Machine: isKTPApproved correctly distinguishes approved/active states from pending/draft', () => {
  assert.equal(isKTPApproved('approved'), true);
  assert.equal(isKTPApproved('APPROVED'), true);
  assert.equal(isKTPApproved('active'), true);
  assert.equal(isKTPApproved('ACTIVE'), true);

  assert.equal(isKTPApproved('DRAFT'), false);
  assert.equal(isKTPApproved('SUBMITTED'), false);
  assert.equal(isKTPApproved('UNDER_REVIEW'), false);
  assert.equal(isKTPApproved('REJECTED'), false);
  assert.equal(isKTPApproved('REVISION_REQUESTED'), false);
  assert.equal(isKTPApproved(undefined), false);
});

// 2. KTP Status Labels in 3 Languages (UZ, RU, KY)
test('2. i18n Status Labels: Returns accurate localized labels for UZ, RU, and KY', () => {
  assert.equal(getKTPStatusLabel('APPROVED', 'uz'), 'Tasdiqlangan');
  assert.equal(getKTPStatusLabel('APPROVED', 'ru'), 'Утвержден');
  assert.equal(getKTPStatusLabel('APPROVED', 'ky'), 'Бекитилди');

  assert.equal(getKTPStatusLabel('SUBMITTED', 'uz'), 'Tekshirishga yuborildi');
  assert.equal(getKTPStatusLabel('SUBMITTED', 'ru'), 'Отправлено на проверку');
  assert.equal(getKTPStatusLabel('SUBMITTED', 'ky'), 'Текшерүүгө жөнөтүлдү');

  assert.equal(getKTPStatusLabel('DRAFT', 'uz'), 'Qoralama (Draft)');
  assert.equal(getKTPStatusLabel('REJECTED', 'ky'), 'Четке кагылды');
});

// 3. AI Lesson Engine: Resolves First Lesson for New Approved KTP
test('3. AI Engine Context: Resolves lesson 1 from approved KTP with zero completed lessons', () => {
  const sampleKtp = {
    id: 'ktp-test-7a-math',
    teacherId: 'tch-001',
    teacherName: 'Aigul Sadykova',
    className: '7-A',
    subject: 'Matematika',
    academicYear: '2026-2027',
    totalHours: 68,
    status: 'approved',
    lessons: [
      { lessonNumber: 1, topic: 'Natural sonlar va amallar', objective: 'Amallarni takrorlash', homework: '12-bet № 15' },
      { lessonNumber: 2, topic: 'Oddiy kasrlar', objective: 'Kasrlarni qisqartirish', homework: '18-bet № 28' },
      { lessonNumber: 3, topic: 'O‘nli kasrlar', objective: 'O‘nli kasrlarni qo‘shish', homework: '25-bet № 34' },
    ],
  };

  const context = resolveNextLessonContext({
    className: '7-A',
    subject: 'Matematika',
    ktpDocs: [sampleKtp],
    completedLessonNumbers: [],
    language: 'uz',
  });

  assert.equal(context.hasApprovedKtp, true);
  assert.equal(context.lessonNumber, 1);
  assert.equal(context.topic, 'Natural sonlar va amallar');
  assert.equal(context.objective, 'Amallarni takrorlash');
  assert.equal(context.homework, '12-bet № 15');
  assert.equal(context.completedLessonsCount, 0);
  assert.equal(context.pacingPercentage, 0);
  assert.equal(context.nextTopicPreview, '2-dars: Oddiy kasrlar');
});

// 4. AI Lesson Engine: Sequential Auto-Advancement to Next Lesson
test('4. AI Engine Advancement: Advances to lesson 2 when lesson 1 is already completed', () => {
  const sampleKtp = {
    id: 'ktp-test-7a-math',
    teacherId: 'tch-001',
    teacherName: 'Aigul Sadykova',
    className: '7-A',
    subject: 'Matematika',
    academicYear: '2026-2027',
    totalHours: 68,
    status: 'APPROVED',
    lessons: [
      { lessonNumber: 1, topic: 'Natural sonlar va amallar', objective: 'Amallarni takrorlash', homework: '12-bet № 15' },
      { lessonNumber: 2, topic: 'Oddiy kasrlar', objective: 'Kasrlarni qisqartirish', homework: '18-bet № 28' },
      { lessonNumber: 3, topic: 'O‘nli kasrlar', objective: 'O‘nli kasrlarni qo‘shish', homework: '25-bet № 34' },
    ],
  };

  const context = resolveNextLessonContext({
    className: '7-A',
    subject: 'Matematika',
    ktpDocs: [sampleKtp],
    completedLessonNumbers: [1],
    language: 'uz',
  });

  assert.equal(context.hasApprovedKtp, true);
  assert.equal(context.lessonNumber, 2);
  assert.equal(context.topic, 'Oddiy kasrlar');
  assert.equal(context.objective, 'Kasrlarni qisqartirish');
  assert.equal(context.completedLessonsCount, 1);
  assert.equal(context.nextTopicPreview, '3-dars: O‘nli kasrlar');
});

// 5. Unapproved KTP Guard (No Hallucination)
test('5. Unapproved KTP Guard: Flags hasApprovedKtp as false and preserves draft context', () => {
  const unapprovedKtp = {
    id: 'ktp-test-unapproved',
    teacherId: 'tch-001',
    teacherName: 'Aigul Sadykova',
    className: '8-A',
    subject: 'Fizika',
    totalHours: 68,
    status: 'SUBMITTED',
    lessons: [
      { lessonNumber: 1, topic: 'Fizika fani va tabiat hodisalari', objective: 'Kirish', homework: '5-bet' },
    ],
  };

  const context = resolveNextLessonContext({
    className: '8-A',
    subject: 'Fizika',
    ktpDocs: [unapprovedKtp],
    completedLessonNumbers: [],
    language: 'uz',
  });

  assert.equal(context.hasApprovedKtp, false);
  assert.equal(context.ktpStatus, 'SUBMITTED');
  assert.equal(context.lessonNumber, 1);
  assert.equal(context.topic, 'Fizika fani va tabiat hodisalari');
});

// 6. Seed KAO Official Curricular Datasets Integrity
test('6. KAO Seed Datasets: Seed documents are officially approved with KAO official provenance', () => {
  assert.equal(SEED_KTP_DOCUMENTS.length >= 3, true);

  const kyrgyzDoc = SEED_KTP_DOCUMENTS.find((d) => d.subject === 'Кыргыз тили' && d.className === '7-A');
  assert.ok(kyrgyzDoc);
  assert.equal(kyrgyzDoc.status, 'approved');
  assert.ok(kyrgyzDoc.source?.url);
  assert.ok(kyrgyzDoc.lessons.length > 0);

  const context = resolveNextLessonContext({
    className: '7-A',
    subject: 'Кыргыз тили',
    ktpDocs: SEED_KTP_DOCUMENTS,
    completedLessonNumbers: [1, 2],
    language: 'ky',
  });

  assert.equal(context.hasApprovedKtp, true);
  assert.equal(context.lessonNumber, 3);
  assert.equal(context.topic, 'Этиштин чактары: Учур чак жана өткөн чак');
});

