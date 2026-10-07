import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KAO_CURRICULUM_STANDARDS,
  KAO_CURRICULUM_VERSIONS,
  CANONICAL_LEARNING_OUTCOMES,
  CANONICAL_PEDAGOGICAL_RESOURCES,
  CANONICAL_ASSESSMENT_ITEMS,
  getLearningOutcomesForSubject,
  getLearningOutcomeById,
  getPedagogicalResourcesForLO,
  getAssessmentsForLO,
  calculateStudentSubjectMastery,
  calculateClassLOMastery,
} from '../src/lib/standardsRegistry.ts';
import { resolveNextLessonContext, SEED_KTP_DOCUMENTS } from '../src/lib/ktpEngine.ts';

test('1. Standards Hierarchy: KAO State Standards & Curricula Registry', () => {
  assert.ok(KAO_CURRICULUM_STANDARDS.length >= 3, 'Must contain at least 3 state standards');
  
  const stem = KAO_CURRICULUM_STANDARDS.find((s) => s.id === 'std-stem-2026');
  assert.ok(stem, 'STEM state standard must exist');
  assert.equal(stem.authority, 'KAO');
  assert.equal(stem.effectiveYear, '2026-2027');
  assert.equal(stem.status, 'active');
  assert.ok(stem.domains.length >= 5, 'STEM standard must have at least 5 subject domains');

  // Curricula Versions (11-Year vs 12-Year)
  assert.equal(KAO_CURRICULUM_VERSIONS.length, 2);
  const v11 = KAO_CURRICULUM_VERSIONS.find((v) => v.framework === '11_YEAR');
  const v12 = KAO_CURRICULUM_VERSIONS.find((v) => v.framework === '12_YEAR');
  assert.ok(v11 && v11.status === 'active', '11-year curriculum must be active');
  assert.ok(v12 && v12.status === 'draft', '12-year curriculum must be in draft/pilot status');
});

test('2. Learning Outcomes: Canonical Registry & PISA Cognitive Levels', () => {
  assert.ok(CANONICAL_LEARNING_OUTCOMES.length >= 8, 'Must contain canonical learning outcomes');

  for (const lo of CANONICAL_LEARNING_OUTCOMES) {
    assert.ok(lo.id.startsWith('LO-'), `LO ID ${lo.id} must start with LO-`);
    assert.ok(lo.code, 'Must have standard code');
    assert.ok(lo.grade >= 1 && lo.grade <= 12, 'Grade must be within 1..12');
    assert.ok(lo.title.length > 5, 'Title must be non-empty');
    assert.ok(lo.criteria.length > 0, 'Must have at least one measurable criterion');
    assert.ok(
      ['reproductive', 'productive', 'creative'].includes(lo.cognitiveLevel),
      'Cognitive level must be reproductive, productive, or creative'
    );
    assert.ok(lo.description.uz && lo.description.ru && lo.description.ky, 'Must have multilingual descriptions');
  }
});

test('3. Query & Filtering: Subject and Grade Scoping', () => {
  const math5LOs = getLearningOutcomesForSubject('MATH-01', 5);
  assert.ok(math5LOs.length >= 2, 'Must return Grade 5 Math LOs');
  assert.ok(math5LOs.every((lo) => lo.subjectCode === 'MATH-01' && lo.grade === 5));

  const specificLO = getLearningOutcomeById('LO-MATH-5-001');
  assert.ok(specificLO, 'Must find LO by ID');
  assert.equal(specificLO.code, '5.MATH.NUM.01');
  assert.equal(specificLO.cognitiveLevel, 'reproductive');
});

test('4. Pedagogical Resource Center: Contextual Materials Mapping', () => {
  const resources = getPedagogicalResourcesForLO('LO-MATH-5-001');
  assert.ok(resources.length >= 2, 'LO-MATH-5-001 must have lesson plan and worksheet');

  const lessonPlan = resources.find((r) => r.type === 'lesson_plan');
  assert.ok(lessonPlan, 'Lesson plan must exist');
  assert.ok(lessonPlan.contentSnippet && lessonPlan.contentSnippet.includes('САБАКТЫН ТЕХНОЛОГИЯЛЫК КАРТАСЫ'));

  const worksheet = resources.find((r) => r.type === 'worksheet');
  assert.ok(worksheet, 'Worksheet resource must exist');
  assert.ok(worksheet.tags.includes('пisa'));
});

test('5. Assessment Items & PISA Rubrics', () => {
  const assessments = getAssessmentsForLO('LO-MATH-5-001');
  assert.ok(assessments.length >= 1, 'Must have assessment item for LO-MATH-5-001');

  const item = assessments[0];
  assert.equal(item.type, 'formative');
  assert.equal(item.maxScore, 10);
  assert.ok(item.rubric.length >= 2, 'Must have rubric criteria');
  assert.ok(item.rubric[0].levelDescriptions.exceeded.length > 0);
});

test('6. Student Subject Mastery Calculation', () => {
  const mockGrades = [
    { studentId: 'stu-0001', subjectCode: 'MATH-01', grade: 92 },
    { studentId: 'stu-0001', subjectCode: 'MATH-01', grade: 88 },
  ];

  const mastery = calculateStudentSubjectMastery('stu-0001', 'MATH-01', mockGrades);
  assert.ok(mastery.length >= 2, 'Must return mastery for subject outcomes');

  const firstOutcome = mastery[0];
  assert.equal(firstOutcome.studentId, 'stu-0001');
  assert.ok(firstOutcome.masteryScore >= 70, 'Score should reflect high grades');
  assert.ok(['mastered', 'exceeded'].includes(firstOutcome.status));
  assert.ok(firstOutcome.teacherFeedback && firstOutcome.teacherFeedback.length > 0);
});

test('7. Class-Level LO Mastery & Heatmap Overview', () => {
  const mockStudents = [
    { id: 'stu-0001', grade: '7-A' },
    { id: 'stu-0002', grade: '7-A' },
    { id: 'stu-0003', grade: '7-A' },
  ];

  const overview = calculateClassLOMastery('7-A', 'ALG-01', mockStudents);
  assert.ok(overview.length >= 1, 'Must return class mastery overview for 7-A Algebra');

  const algItem = overview[0];
  assert.equal(algItem.className, '7-A');
  assert.equal(algItem.subjectCode, 'ALG-01');
  assert.equal(algItem.totalStudents, 3);
  assert.ok(algItem.masteredCount >= 0);
  assert.ok(algItem.averageMasteryScore > 0);
  assert.ok(['proficient', 'satisfactory', 'needs_attention', 'critical'].includes(algItem.status));
});

test('8. KTP ↔ Lesson Session ↔ Learning Outcome Context Propagation', () => {
  const resolved = resolveNextLessonContext({
    className: '7-A',
    subject: 'Кыргыз тили',
    ktpDocs: SEED_KTP_DOCUMENTS,
    completedLessonNumbers: [],
    language: 'uz',
  });

  assert.equal(resolved.hasApprovedKtp, true);
  assert.equal(resolved.lessonNumber, 1);
  assert.ok(resolved.topic.includes('Кыргыз тили'));
  assert.ok(resolved.conspectDraft.length > 20);
  assert.ok(resolved.materials.length > 0);
  assert.ok(resolved.cognitiveLevel, 'Must have cognitive level');
});

