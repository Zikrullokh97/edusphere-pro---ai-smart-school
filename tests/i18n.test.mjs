import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRANSLATIONS,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  useI18n,
  formatRole,
  formatGrade,
  formatQuarter,
  formatMonth,
  formatWeekday,
  formatDateLocalized,
} from '../src/lib/i18n.ts';

// 1. Supported Languages & Default Language
test('1. i18n Architecture: Default language is uz and supported languages include uz, ru, ky', () => {
  assert.equal(DEFAULT_LANGUAGE, 'uz');
  const codes = SUPPORTED_LANGUAGES.map(l => l.code);
  assert.equal(codes.includes('uz'), true);
  assert.equal(codes.includes('ru'), true);
  assert.equal(codes.includes('ky'), true);
});

// 2. Language Switcher UZ -> RU -> KG
test('2. i18n Switching: Translates core navigation correctly across UZ, RU, and KG', () => {
  const tUz = useI18n('uz');
  const tRu = useI18n('ru');
  const tKy = useI18n('ky');

  assert.equal(tUz('navDashboard'), 'Boshqaruv Paneli');
  assert.equal(tRu('navDashboard'), 'Панель Управления');
  assert.equal(tKy('navDashboard'), 'Башкаруу Панели');

  assert.equal(tUz('navAttendance'), 'Davomat');
  assert.equal(tRu('navAttendance'), 'Посещаемость');
  assert.equal(tKy('navAttendance'), 'Катышуу');
});

// 3. Fallback Mechanism
test('3. i18n Fallback: Returns fallback key cleanly when key is missing or undefined', () => {
  const t = useI18n('uz');
  assert.equal(t('non_existent_key_xyz'), 'non_existent_key_xyz');
});

// 4. Role Display Names Translation (Admin, Teacher, Parent/Student)
test('4. Role Labels: Formats user roles into natural UZ, RU, and KG titles', () => {
  assert.equal(formatRole('admin', 'uz'), 'Administrator');
  assert.equal(formatRole('admin', 'ru'), 'Администратор');
  assert.equal(formatRole('admin', 'ky'), 'Администратор');

  assert.equal(formatRole('teacher', 'uz'), 'O‘qituvchi');
  assert.equal(formatRole('teacher', 'ru'), 'Учитель');
  assert.equal(formatRole('teacher', 'ky'), 'Мугалим');

  assert.equal(formatRole('parent_student', 'uz'), 'Ota-ona / O‘quvchi');
  assert.equal(formatRole('parent_student', 'ru'), 'Родитель / Ученик');
  assert.equal(formatRole('parent_student', 'ky'), 'Ата-эне / Окуучу');
});

// 5. National 2–5 Grade Scale Localization
test('5. Grade Descriptions: Correctly translates 2–5 marks across UZ, RU, and KG', () => {
  assert.equal(formatGrade(5, 'uz'), 'A’lo (5)');
  assert.equal(formatGrade(5, 'ru'), 'Отлично (5)');
  assert.equal(formatGrade(5, 'ky'), 'Эң жакшы (5)');

  assert.equal(formatGrade(4, 'uz'), 'Yaxshi (4)');
  assert.equal(formatGrade(4, 'ru'), 'Хорошо (4)');
  assert.equal(formatGrade(4, 'ky'), 'Жакшы (4)');

  assert.equal(formatGrade(3, 'uz'), 'Qoniqarli (3)');
  assert.equal(formatGrade(3, 'ru'), 'Удовлетворительно (3)');
  assert.equal(formatGrade(3, 'ky'), 'Канааттандырарлык (3)');

  assert.equal(formatGrade(2, 'uz'), 'Qoniqarsiz (2)');
  assert.equal(formatGrade(2, 'ru'), 'Неудовлетворительно (2)');
  assert.equal(formatGrade(2, 'ky'), 'Канааттандырарлык эмес (2)');
});

// 6. Academic Quarters (Q1..Q4) Translation
test('6. Quarter Labels: Translates Q1, Q2, Q3, Q4 periods in 3 languages', () => {
  assert.equal(formatQuarter('Q1', 'uz'), '1-chorak (Q1)');
  assert.equal(formatQuarter('Q1', 'ru'), '1-четверть (Q1)');
  assert.equal(formatQuarter('Q1', 'ky'), '1-чейрек (Q1)');

  assert.equal(formatQuarter('Q4', 'uz'), '4-chorak (Q4)');
  assert.equal(formatQuarter('Q4', 'ru'), '4-четверть (Q4)');
  assert.equal(formatQuarter('Q4', 'ky'), '4-чейрек (Q4)');
});

// 7. Kyrgyzstan National Core Terminology
test('7. National Core Terms: Verifies IIN, Tabel, and Academic Year terms in UZ, RU, KG', () => {
  const tUz = useI18n('uz');
  const tRu = useI18n('ru');
  const tKy = useI18n('ky');

  assert.equal(tUz('academicYearTerm'), 'O‘quv yili');
  assert.equal(tRu('academicYearTerm'), 'Учебный год');
  assert.equal(tKy('academicYearTerm'), 'Окуу жылы');

  assert.equal(tUz('homeworkTerm'), 'Uy vazifasi');
  assert.equal(tRu('homeworkTerm'), 'Домашнее задание');
  assert.equal(tKy('homeworkTerm'), 'Үй тапшырмасы');

  assert.equal(tUz('tabelTerm'), 'Tabel');
  assert.equal(tRu('tabelTerm'), 'Табель');
  assert.equal(tKy('tabelTerm'), 'Табель');
});

// 8. Form Validation & Alert Messages Localization
test('8. Validation Messages: Field required and security alerts localized in 3 languages', () => {
  const tUz = useI18n('uz');
  const tRu = useI18n('ru');
  const tKy = useI18n('ky');

  assert.equal(tUz('fieldRequired'), 'Bu maydon to‘ldirilishi majburiy.');
  assert.equal(tRu('fieldRequired'), 'Это поле обязательно для заполнения.');
  assert.equal(tKy('fieldRequired'), 'Бул талаа милдеттүү түрдө толтурулуусу зарыл.');

  assert.equal(tUz('accessDenied'), 'Kirish taqiqlangan (Ruxsat yo‘q).');
  assert.equal(tRu('accessDenied'), 'Доступ запрещен (Недостаточно прав).');
  assert.equal(tKy('accessDenied'), 'Кирүүгө тыюу салынган (Уруксат жок).');
});

// 9. Date & Month/Weekday Localization
test('9. Calendar Localization: Formats months and weekdays across UZ, RU, and KG', () => {
  assert.equal(formatMonth(0, 'uz'), 'Yanvar');
  assert.equal(formatMonth(0, 'ru'), 'Январь');
  assert.equal(formatMonth(0, 'ky'), 'Январь');

  assert.equal(formatMonth(4, 'uz'), 'May');
  assert.equal(formatMonth(4, 'ru'), 'Май');
  assert.equal(formatMonth(4, 'ky'), 'Май');

  assert.equal(formatWeekday(0, 'uz'), 'Dushanba');
  assert.equal(formatWeekday(0, 'ru'), 'Понедельник');
  assert.equal(formatWeekday(0, 'ky'), 'Дүйшөмбү');

  const testDate = new Date(2026, 4, 15);
  assert.equal(formatDateLocalized(testDate, 'uz'), '15-May, 2026');
  assert.equal(formatDateLocalized(testDate, 'ru'), '15-Май, 2026');
  assert.equal(formatDateLocalized(testDate, 'ky'), '15-Май, 2026');
});

// 10. Dictionary Completeness: Zero empty translation values
test('10. Translation Dictionary Integrity: Ensures no empty strings in uz, ru, and ky sets', () => {
  for (const lang of ['uz', 'ru', 'ky']) {
    const dict = TRANSLATIONS[lang];
    assert.equal(typeof dict, 'object');
    for (const [key, val] of Object.entries(dict)) {
      assert.equal(typeof val, 'string', `Key ${key} in ${lang} must be string`);
      assert.equal(val.trim().length > 0, true, `Key ${key} in ${lang} cannot be empty`);
    }
  }
});

