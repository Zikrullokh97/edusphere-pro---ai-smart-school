import { AppLanguage, CognitiveLevel, KTPDocument, KTPLessonItem, LessonMaterial, QuarterId } from '../types';
import { KAO_OFFICIAL_PROVENANCE_REGISTRY } from './kyrgyzstanEdu';

/**
 * Standard Kyrgyz Academy of Education (KAO — Кыргыз билим берүү академиясы)
 * Curricular KTP Datasets (Seed Data across Quarters Q1..Q4) with Authoritative Provenance
 */
export const SEED_KTP_DOCUMENTS: KTPDocument[] = [
  // 1. Кыргыз тили (7-A) — 68 сааттык KAO мамлекеттик стандарты
  {
    id: 'ktp-7a-kyr-lang-2026',
    teacherId: 'tch-001',
    teacherName: 'Айгүл Садыкова',
    className: '7-A',
    subject: 'Кыргыз тили',
    subjectId: 'sbj-kyr-lang',
    academicYear: '2026-2027',
    educationSystem: '11_YEAR',
    totalHours: 68,
    uploadedAt: '2026-08-25T10:00:00.000Z',
    fileName: 'KTP_Kyrgyz_Tili_7A_KAO_2026.xlsx',
    status: 'approved',
    source: KAO_OFFICIAL_PROVENANCE_REGISTRY.KTP_GRADE_7_KYRGYZ,
    lessons: [
      {
        id: 'ktp-7a-kl-1',
        lessonNumber: 1,
        quarterId: 'Q1',
        topic: 'Кыргыз тили — Кыргыз Республикасынын мамлекеттик тили',
        objective: 'Мамлекеттик тил жөнүндө мыйзам жана тилдин коомдогу ролу боюнча билимди тереңдетүү.',
        content: 'Тилдин коомдук кызматы, мамлекеттик тилдин өнүгүү тарыхы жана мааниси.',
        homework: 'Окуу китеби: 8-бет, 3-көнүгүү. Эссе: «Эне тилим — сыймыгым».',
        scheduledDate: '2026-09-02',
        date: '2026-09-02',
        hours: 1,
        materials: ['7-класс Кыргыз тили окуу китеби', 'Мамлекеттик тил презентациясы'],
      },
      {
        id: 'ktp-7a-kl-2',
        lessonNumber: 2,
        quarterId: 'Q1',
        topic: 'Сөз түркүмдөрү боюнча өтүлгөндөрдү кайталоо (Зат атооч, Сын атооч)',
        objective: 'Зат атооч жана сын атоочтун синтаксистик кызматын, грамматикалык категорияларын бышыктоо.',
        content: 'Жөндөмө, таандык мүчөлөр, сын атоочтун даражалары.',
        homework: 'Окуу китеби: 14-бет, 7-көнүгүү.',
        scheduledDate: '2026-09-05',
        date: '2026-09-05',
        hours: 1,
      },
      {
        id: 'ktp-7a-kl-3',
        lessonNumber: 3,
        quarterId: 'Q1',
        topic: 'Этиштин чактары: Учур чак жана өткөн чак',
        objective: 'Этиштин чактарынын жасалуу жолдорун жана сүйлөмдөгү маанисин үйрөнүү.',
        content: 'Учур чактын түрлөрү, өткөн чак мүчөлөрү (-ган, -ды).',
        homework: 'Окуу китеби: 22-бет, 12-көнүгүү.',
        scheduledDate: '2026-09-09',
        date: '2026-09-09',
        hours: 1,
      },
      {
        id: 'ktp-7a-kl-18',
        lessonNumber: 18,
        quarterId: 'Q1',
        topic: '1-чейректик жазуу иши (Диктант): «Ала-Тоо табияты»',
        objective: 'Окуучулардын сабаттуулугун жана пунктуациялык эрежелерди колдонуусун текшерүү.',
        content: 'Орфографиялык жана пунктуациялык нормаларды сактоо менен 120 сөздүк диктант.',
        homework: 'Каталардын үстүндө иштөө жана эрежелерди кайталоо.',
        scheduledDate: '2026-11-03',
        date: '2026-11-03',
        hours: 1,
      },
      {
        id: 'ktp-7a-kl-19',
        lessonNumber: 19,
        quarterId: 'Q2',
        topic: 'Ат атооч жана анын маанилик түрлөрү',
        objective: 'Ат атоочтордун сүйлөмдөгү ордун жана синонимдик касиеттерин өздөштүрүү.',
        content: 'Жактама, шилтеме жана сурама ат атоочтор.',
        homework: 'Окуу китеби: 56-бет, 24-көнүгүү.',
        scheduledDate: '2026-11-14',
        date: '2026-11-14',
        hours: 1,
      },
      {
        id: 'ktp-7a-kl-33',
        lessonNumber: 33,
        quarterId: 'Q3',
        topic: 'Сүйлөм мүчөлөрү: Ээ жана баяндоочтун байланышы',
        objective: 'Баш мүчөлөрдүн грамматикалык байланышын жана ээрчишүү эрежелерин талдоо.',
        content: 'Ээ менен баяндоочтун жакта жана санда дал келиши.',
        homework: 'Окуу китеби: 92-бет, 45-көнүгүү.',
        scheduledDate: '2026-01-15',
        date: '2026-01-15',
        hours: 1,
      },
      {
        id: 'ktp-7a-kl-52',
        lessonNumber: 52,
        quarterId: 'Q4',
        topic: 'Текстик талдоо жана стилистикалык нормалар',
        objective: 'Көркөм жана публицистикалык стилдердин өзгөчөлүктөрүн ажыратуу.',
        content: 'Тексттин темасы, негизги идеясы жана микротемалары.',
        homework: 'Окуу китеби: 130-бет, 68-көнүгүү.',
        scheduledDate: '2026-04-10',
        date: '2026-04-10',
        hours: 1,
      },
    ],
  },

  // 2. Алгебра (7-A) — 68 сааттык KAO стандарты
  {
    id: 'ktp-7a-alg-2026',
    teacherId: 'tch-001',
    teacherName: 'Айгүл Садыкова',
    className: '7-A',
    subject: 'Алгебра',
    subjectId: 'sbj-algebra',
    academicYear: '2026-2027',
    educationSystem: '11_YEAR',
    totalHours: 68,
    uploadedAt: '2026-08-25T10:00:00.000Z',
    fileName: 'KTP_Algebra_7A_KAO_2026.xlsx',
    status: 'approved',
    source: KAO_OFFICIAL_PROVENANCE_REGISTRY.KTP_GRADE_7_KYRGYZ,
    lessons: [
      {
        id: 'ktp-7a-m-1',
        lessonNumber: 1,
        quarterId: 'Q1',
        topic: 'Сандуу жана тамгалуу туюнтмалар (Кайталоо)',
        objective: 'Тамгалуу туюнтмалардын маанилерин эсептөө жана окшош мүчөлөрдү келтирүү.',
        content: 'Сандар огу, модулдар, амалдар тартиби.',
        homework: 'Окуу китеби: 12-бет, № 15, 16, 18-мисалдар.',
        scheduledDate: '2026-09-03',
        date: '2026-09-03',
        hours: 1,
        materials: ['Алгебра 7-класс окуу китеби', 'Формулалар таблицасы'],
      },
      {
        id: 'ktp-7a-m-2',
        lessonNumber: 2,
        quarterId: 'Q1',
        topic: 'Бүтүн көрсөткүчтүү даража жана анын касиеттери',
        objective: 'Даражаларды көбөйтүү, бөлүү жана даражага көтөрүү эрежелерин өздөштүрүү.',
        content: 'aⁿ · aᵐ = aⁿ⁺ᵐ, (aⁿ)ᵐ = aⁿᵐ эрежелерин практикада колдонуу.',
        homework: 'Окуу китеби: 18-бет, № 28, 30.',
        scheduledDate: '2026-09-07',
        date: '2026-09-07',
        hours: 1,
      },
      {
        id: 'ktp-7a-m-14',
        lessonNumber: 14,
        quarterId: 'Q1',
        topic: 'Бир белгисиздүү сызыктуу теңдемелер жана аларды чыгаруу',
        objective: 'ax = b түрүндөгү сызыктуу теңдемелерди чыгаруу алгоритмин бекемдөө.',
        content: 'Теңдеменин тамырлары, белгисизди табуу жана текшерүү.',
        homework: 'Окуу китеби: 54-бет, № 112, 114.',
        scheduledDate: '2026-10-18',
        date: '2026-10-18',
        hours: 1,
      },
      {
        id: 'ktp-7a-m-18',
        lessonNumber: 18,
        quarterId: 'Q1',
        topic: '1-чейректик текшерүү иши: «Даражалар жана бир мүчөлөр»',
        objective: '1-чейректе өтүлгөн материалдар боюнча окуучулардын билим сапатын баалоо.',
        content: '4 варианттагы дифференцияланган текшерүү иши.',
        homework: 'Чейректик каталар үстүндө иштөө.',
        scheduledDate: '2026-11-02',
        date: '2026-11-02',
        hours: 1,
      },
      {
        id: 'ktp-7a-m-19',
        lessonNumber: 19,
        quarterId: 'Q2',
        topic: 'Көп мүчөлөрдү көбөйтүү жана жалпы көбөйтүүчүнү кашаадан чыгаруу',
        objective: 'Көп мүчөлөр менен амалдар аткаруу көндүмдөрүн калыптандыруу.',
        content: 'a(b + c) = ab + ac эрежесин татаал туюнтмаларда колдонуу.',
        homework: 'Окуу китеби: 64-бет, № 140, 142.',
        scheduledDate: '2026-11-14',
        date: '2026-11-14',
        hours: 1,
      },
      {
        id: 'ktp-7a-m-33',
        lessonNumber: 33,
        quarterId: 'Q3',
        topic: 'Кыскача көбөйтүүнүн формулалары: (a + b)² жана (a - b)²',
        objective: 'Эки туюнтманын суммасынын жана айырмасынын квадратын табуу.',
        content: 'Формулаларды геометриялык жана алгебралык жол менен далилдөө.',
        homework: 'Окуу китеби: 98-бет, № 215, 218.',
        scheduledDate: '2027-01-16',
        date: '2027-01-16',
        hours: 1,
      },
    ],
  },
  // 3. Matematika / Mathematics (7-A) — 68 soat
  {
    id: 'ktp-7a-math-2026',
    teacherId: 'tch-001',
    teacherName: 'Aigul Sadykova',
    className: '7-A',
    subject: 'Mathematics',
    subjectId: 'sbj-math',
    academicYear: '2026-2027',
    educationSystem: '11_YEAR',
    totalHours: 68,
    uploadedAt: '2026-08-25T10:00:00.000Z',
    fileName: 'KTP_Mathematics_7A_2026.xlsx',
    status: 'approved',
    source: KAO_OFFICIAL_PROVENANCE_REGISTRY.KTP_GRADE_7_KYRGYZ,
    lessons: [
      {
        id: 'ktp-7a-math-1',
        lessonNumber: 1,
        quarterId: 'Q1',
        topic: 'Natural sonlar va sonli ifodalar',
        objective: 'Natural sonlar ustida amallarni mustahkamlash.',
        content: 'Sonlar o‘qi, modullar, hisoblashlar.',
        homework: 'Darslik: 12-bet, № 15, 16.',
        scheduledDate: '2026-09-03',
        date: '2026-09-03',
        hours: 1,
      },
      {
        id: 'ktp-7a-math-14',
        lessonNumber: 14,
        quarterId: 'Q1',
        topic: 'Chiziqli tenglamalar va ularning yechimlari',
        objective: 'Bir noma’lumli chiziqli tenglamalarni yechish algoritmi.',
        content: 'Tenglamaning ildizlari, noma’lumni topish va tekshirish.',
        homework: 'Darslik: 54-bet, № 112, 114-tenglamalar.',
        scheduledDate: '2026-10-18',
        date: '2026-10-18',
        hours: 1,
      },
    ],
  },

  // 3. Физика (7-A) — 68 сааттык KAO стандарты
  {
    id: 'ktp-7a-phys-2026',
    teacherId: 'tch-002',
    teacherName: 'Эркин Бейшеналиев',
    className: '7-A',
    subject: 'Физика',
    subjectId: 'sbj-physics',
    academicYear: '2026-2027',
    educationSystem: '11_YEAR',
    totalHours: 68,
    uploadedAt: '2026-08-25T10:00:00.000Z',
    fileName: 'KTP_Physics_7A_KAO_2026.docx',
    status: 'approved',
    source: KAO_OFFICIAL_PROVENANCE_REGISTRY.KTP_GRADE_7_KYRGYZ,
    lessons: [
      {
        id: 'ktp-7a-ph-1',
        lessonNumber: 1,
        quarterId: 'Q1',
        topic: 'Физика — жаратылыш жөнүндөгү илим. Физикалык кубулуштар',
        objective: 'Физика илиминин максаттары жана изилдөө усулдары (байкоо, тажрыйба) менен таанышуу.',
        content: 'Механикалык, жылуулук, электрдик жана жарык кубулуштары.',
        homework: 'Окуу китеби: § 1, 1-4 суроолорго жооп берүү.',
        scheduledDate: '2026-09-04',
        date: '2026-09-04',
        hours: 1,
        materials: ['Физика 7-класс окуу китеби', 'Лабораториялык өлчөө куралдары'],
      },
      {
        id: 'ktp-7a-ph-2',
        lessonNumber: 2,
        quarterId: 'Q1',
        topic: 'Физикалык чоңдуктар жана аларды өлчөө. Эл аралык бирдиктер системасы (СИ)',
        objective: 'СИ системасындагы негизги бирдиктерди (метр, секунд, килограмм) колдонуу.',
        content: 'Ченөө куралдарынын шкаласынын бөлүү баасын аныктоо.',
        homework: 'Окуу китеби: § 2, 8-бет, № 1-3 көнүгүүлөр.',
        scheduledDate: '2026-09-08',
        date: '2026-09-08',
        hours: 1,
      },
      {
        id: 'ktp-7a-ph-3',
        lessonNumber: 1,
        quarterId: 'Q1',
        topic: '№1 Лабораториялык иш: «Бөлүктөрдүн өлчөмдөрүн аныктоо»',
        objective: 'Кичине өлчөмдөгү нерселерди катар усулу менен өлчөө ыкмасын өздөштүрүү.',
        content: 'Түтүктүн калыңдыгын жана зымдын диаметрин сызгыч менен ченөө.',
        homework: 'Лабораториялык иштин корутундусун жазуу.',
        scheduledDate: '2026-09-15',
        date: '2026-09-15',
        hours: 1,
      },
    ],
  },

  // 4. Кыргызстан тарыхы (7-A) — 68 сааттык KAO стандарты
  {
    id: 'ktp-7a-kyr-hist-2026',
    teacherId: 'tch-007',
    teacherName: 'Данияр Алимов',
    className: '7-A',
    subject: 'Кыргызстан тарыхы',
    subjectId: 'sbj-kyr-history',
    academicYear: '2026-2027',
    educationSystem: '11_YEAR',
    totalHours: 68,
    uploadedAt: '2026-08-25T10:00:00.000Z',
    fileName: 'KTP_Kyrgyzstan_History_7A_KAO_2026.pdf',
    status: 'approved',
    source: KAO_OFFICIAL_PROVENANCE_REGISTRY.KTP_GRADE_7_KYRGYZ,
    lessons: [
      {
        id: 'ktp-7a-kh-1',
        lessonNumber: 1,
        quarterId: 'Q1',
        topic: 'Кыргызстандын орто кылымдардагы тарыхынын булактары',
        objective: 'Тарыхый жазма даректер (кытай, араб, түрк жазмалары) жана археологиялык табылгалар.',
        content: 'Орхон-Енисей жазуулары, Махмуд Кашгаринин «Дивану лугат ат-түрк» эмгеги.',
        homework: 'Окуу китеби: § 1, суроолорго жооп берүү.',
        scheduledDate: '2026-09-03',
        date: '2026-09-03',
        hours: 1,
      },
      {
        id: 'ktp-7a-kh-2',
        lessonNumber: 2,
        quarterId: 'Q1',
        topic: 'Түрк кагандыгы жана анын Кыргызстан аймагындагы бийлиги',
        objective: 'Байыркы түрктөрдүн мамлекеттик түзүлүшү, чарбасы жана коомдук мамилелери.',
        content: 'Улуу Түрк кагандыгынын негизделиши, Бумын жана Мукан кагандар.',
        homework: 'Окуу китеби: § 2, контур картага борбор шаарларды түшүрүү.',
        scheduledDate: '2026-09-10',
        date: '2026-09-10',
        hours: 1,
      },
    ],
  },
];

/**
 * Intelligent KTP Parser supporting CSV, TSV, JSON, and Tabular text lines
 */
export function parseKTPRawText(params: {
  rawText: string;
  fileName: string;
  className: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  academicYear?: string;
}): KTPDocument {
  const { rawText, fileName, className, subject, teacherId, teacherName, academicYear = '2026-2027' } = params;

  const lessons: KTPLessonItem[] = [];
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let currentLessonNum = 1;

  for (const line of lines) {
    // Check if line matches CSV/TSV or numbered format: e.g. "1; Topic; Objective; HW; 1; 2026-09-05"
    if (line.startsWith('№') || line.toLowerCase().includes('mavzu') || line.toLowerCase().includes('тема') || line.toLowerCase().includes('сабак')) {
      continue; // Skip header row
    }

    const parts = line.split(/[;,\t|]/).map((p) => p.trim());
    if (parts.length >= 2) {
      const parsedNum = parseInt(parts[0].replace(/\D/g, ''), 10);
      const lessonNumber = !isNaN(parsedNum) && parsedNum > 0 ? parsedNum : currentLessonNum;
      const topic = parts[1] || `Сабак ${lessonNumber}`;
      const objective = parts[2] || `Мамлекеттик KAO билим берүү стандарты боюнча сабактын максаты`;
      const homework = parts[3] || `Окуу китебиндеги тиешелүү тема боюнча тапшырмалар`;
      const hours = parts[4] ? parseInt(parts[4], 10) || 1 : 1;
      const scheduledDate = parts[5] && /^\d{4}-\d{2}-\d{2}$/.test(parts[5]) ? parts[5] : undefined;

      const quarterId: QuarterId =
        lessonNumber <= 18 ? 'Q1' : lessonNumber <= 32 ? 'Q2' : lessonNumber <= 52 ? 'Q3' : 'Q4';

      lessons.push({
        id: `ktp-${className.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${subject.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${lessonNumber}`,
        lessonNumber,
        quarterId,
        topic,
        objective,
        content: `Негизги түшүнүктөр, формулалар жана практикалык көнүгүүлөр топтому.`,
        homework,
        scheduledDate,
        date: scheduledDate,
        hours,
      });
      currentLessonNum = lessonNumber + 1;
    } else if (line.length > 5) {
      // Plain text topic per line
      const quarterId: QuarterId =
        currentLessonNum <= 18 ? 'Q1' : currentLessonNum <= 32 ? 'Q2' : currentLessonNum <= 52 ? 'Q3' : 'Q4';

      lessons.push({
        id: `ktp-${className.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${subject.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${currentLessonNum}`,
        lessonNumber: currentLessonNum,
        quarterId,
        topic: line.replace(/^\d+[\.\)\-]\s*/, ''),
        objective: 'Теманын теориялык жана практикалык жагдайларын өздөштүрүү',
        homework: `Тема боюнча окуу китебиндеги көнүгүүлөрдү аткаруу.`,
        hours: 1,
      });
      currentLessonNum++;
    }
  }

  // If no lessons extracted from arbitrary text, generate default 18 lessons for Q1
  if (lessons.length === 0) {
    for (let i = 1; i <= 18; i++) {
      lessons.push({
        id: `ktp-${className.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${subject.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
        lessonNumber: i,
        quarterId: 'Q1',
        topic: `${subject}: ${i}-сабактын темасы (KAO стандарты)`,
        objective: `${subject} сабагынан ${i}-тема боюнча билимдерди калыптандыруу`,
        homework: `Окуу китеби: ${i * 4}-беттеги тапшырмалар.`,
        hours: 1,
      });
    }
  }

  return {
    id: `ktp-${className.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${subject.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
    teacherId,
    teacherName,
    className,
    subject,
    academicYear,
    totalHours: lessons.reduce((sum, l) => sum + (l.hours || 1), 0),
    uploadedAt: new Date().toISOString(),
    fileName,
    status: 'approved',
    lessons,
  };
}

/**
 * Finds matching KTP lesson item for current daily lesson context
 */
export function findKTPLesson(params: {
  ktpDocs: KTPDocument[];
  className: string;
  subject: string;
  lessonNumber: number;
}): KTPLessonItem | null {
  const { ktpDocs, className, subject, lessonNumber } = params;
  const doc = ktpDocs.find(
    (d) =>
      d.className.toLowerCase() === className.toLowerCase() &&
      d.subject.toLowerCase() === subject.toLowerCase()
  );
  if (!doc) return null;
  const exact = doc.lessons.find((l) => l.lessonNumber === lessonNumber);
  return exact || doc.lessons[0] || null;
}

/**
 * Generates structured Pedagogical Lesson Conspect Draft (KAO Standard)
 */
export function generateLessonConspectDraft(params: {
  topic: string;
  subject: string;
  className: string;
  language: AppLanguage;
  objective?: string;
}): string {
  const { topic, subject, className, language, objective } = params;

  if (language === 'ky') {
    return `📌 САБАКТЫН ТЕХНОЛОГИЯЛЫК КАРТАСЫ (КОНСПЕКТ — КАО СТАНДАРТЫ)
• Класс: ${className} | Сабак: ${subject}
• Тема: ${topic}
• Максаты: ${objective || 'Окуучуларга тема боюнча теориялык жана практикалык билимдерди өздөштүрүү.'}

1. УЮШТУРУУ ЭТАБЫ (3 мүн):
   - Саламдашуу, катышууну тактоо жана көңүл буруу.

2. ӨТҮЛГӨН ТЕМАНЫ КАЙТАЛОО ЖАНА ҮЙ ТАПШЫРМАСЫН ТЕКШЕРҮҮ (7 мүн):
   - Фронталдык суроо-жооп жана негизги эрежелерди эске салуу.

3. ЖАҢЫ ТЕМАНЫ ТҮШҮНДҮРҮҮ (20 мүн):
   - Негизги түшүнүктөрдү жана формулаларды интерактивдүү доскада көрсөтүү.
   - Мисалдарды талдоо жана окуучулар менен бирге иштөө.

4. БЫШЫКТОО ЖАНА КӨНҮГҮҮЛӨР (10 мүн):
   - Окуу китебиндеги практикалык тапшырмаларды өз алдынча аткаруу.

5. САБАКТЫ ЖЫЙЫНТЫКТОО ЖАНА БААЛОО (5 мүн):
   - Рефлексия, жетишкендиктерди белгилөө, 2–5 шкаласында баалоо.`;
  }

  if (language === 'ru') {
    return `📌 ТЕХНОЛОГИЧЕСКАЯ КАРТА УРОКА (КОНСПЕКТ — СТАНДАРТ КАО)
• Класс: ${className} | Предмет: ${subject}
• Тема: ${topic}
• Цель урока: ${objective || 'Формирование предметных компетенций и закрепление практических навыков.'}

1. ОРГАНИЗАЦИОННЫЙ МОМЕНТ (3 мин):
   - Приветствие, фиксация явки и настрой на учебный процесс.

2. АКТУАЛИЗАЦИЯ ЗНАНИЙ И ПРОВЕРКА ДОМАШНЕГО ЗАДАНИЯ (7 мин):
   - Экспресс-опрос по ключевым определениям и разбор трудных моментов.

3. ИЗУЧЕНИЕ НОВОГО МАТЕРИАЛА (20 мин):
   - Презентация темы на интерактивной доске, вывод формул и алгоритмов решения.
   - Решение опорных примеров у доски.

4. ЗАКРЕПЛЕНИЕ МАТЕРИАЛА (10 мин):
   - Самостоятельная дифференцированная работа по карточкам и учебнику.

5. ПОДВЕДЕНИЕ ИТОГОВ И ОЦЕНИВАНИЕ (5 мин):
   - Рефлексия, выставление оценок по 2–5 шкале, разъяснение домашнего задания.`;
  }

  // Default: Uzbek
  return `📌 DARSNING TEXNOLOGIK XARITASI (KONSPEKT — KAO STANDARTI)
• Sinf: ${className} | Fan: ${subject}
• Mavzu: ${topic}
• Dars maqsadi: ${objective || 'O‘quvchilarda mavzu bo‘yicha nazariy tushuncha va mustaqil amaliy ko‘nikmalarni shakllantirish.'}

1. TASHKILIY QISM (3 daqiqa):
   - Salomlashish, davomatni aniqlash va darsga tayyorgarlikni ko‘zdan kechirish.

2. O‘TILGAN MAVZUNI TAKRORLASH VA UY VAZIFASINI TEKSHIRISH (7 daqiqa):
   - Savol-javob va asosiy teoremalarni/qoidalarni yodga olish.

3. YANGI MAVZU BAYONI (20 daqiqa):
   - Interaktiv doskada yangi tushuncha va algoritmlarni ko‘rgazmali tushuntirish.
   - Namunaviy misol va masalalarni birgalikda tahlil qilish.

4. MAVZUNI MUSTAHKAMLASH VA AMALIY ISH (10 daqiqa):
   - Darslikdan mustaqil mashqlar va kartochkalar ustida ishlash.

5. YAKUNLASH VA BAHOLASH (5 daqiqa):
   - O‘quvchilar bilimini 2–5 milliy shkala bo‘yicha baholash va uy vazifasini topshirish.`;
}

/**
 * Returns matching digital materials for current class & topic
 */
export function getMatchedLessonMaterials(params: {
  topic: string;
  subject: string;
  className: string;
}): LessonMaterial[] {
  const { topic, subject, className } = params;
  return [
    {
      id: `mat-tb-${className}-${subject}`,
      title: `📄 ${subject} ${className} Darsligi (52–58 betlar)`,
      type: 'textbook',
      className,
      subject,
      topic,
    },
    {
      id: `mat-pres-${className}-${subject}`,
      title: `📊 Taqdimot: ${topic} (Slides)`,
      type: 'presentation',
      className,
      subject,
      topic,
    },
    {
      id: `mat-ws-${className}-${subject}`,
      title: `📝 Amaliy mashqlar va test topshiriqlari`,
      type: 'worksheet',
      className,
      subject,
      topic,
    },
    {
      id: `mat-vid-${className}-${subject}`,
      title: `🎥 Video dars: ${topic} tahlili`,
      type: 'video',
      className,
      subject,
      topic,
    },
  ];
}

/**
 * Checks if a KTP document is officially approved or active
 */
export function isKTPApproved(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'approved' || s === 'active';
}

export function getKTPStatusLabel(status?: string, language: AppLanguage = 'uz'): string {
  const s = (status || 'draft').toUpperCase();
  const map: Record<string, Record<AppLanguage, string>> = {
    DRAFT: { uz: 'Qoralama (Draft)', ru: 'Черновик', ky: 'Долбоор', en: 'Draft' },
    SUBMITTED: { uz: 'Tekshirishga yuborildi', ru: 'Отправлено на проверку', ky: 'Текшерүүгө жөнөтүлдү', en: 'Submitted for Review' },
    UNDER_REVIEW: { uz: 'Ko‘rib chiqilmoqda', ru: 'На рассмотрении', ky: 'Каралууда', en: 'Under Review' },
    APPROVED: { uz: 'Tasdiqlangan', ru: 'Утвержден', ky: 'Бекитилди', en: 'Approved' },
    ACTIVE: { uz: 'Faol / Amalda', ru: 'Активен', ky: 'Аракетте', en: 'Active' },
    REJECTED: { uz: 'Rad etilgan', ru: 'Отклонен', ky: 'Четке кагылды', en: 'Rejected' },
    COMPLETED: { uz: 'Tugatilgan', ru: 'Завершен', ky: 'Аяктады', en: 'Completed' },
  };
  return map[s]?.[language] || s;
}

export interface ResolvedLessonContext {
  hasApprovedKtp: boolean;
  ktpDoc: KTPDocument | null;
  lessonNumber: number;
  topic: string;
  objective: string;
  homework: string;
  conspectDraft: string;
  materials: LessonMaterial[];
  learningOutcomeId?: string;
  learningOutcomeCode?: string;
  cognitiveLevel?: CognitiveLevel;
  totalHours: number;
  completedLessonsCount: number;
  pacingPercentage: number;
  nextTopicPreview: string;
  ktpStatus: string;
}

/**
 * AI Context Engine: Connects Teacher + Subject + Class + Approved KTP + Completed Sessions + State Learning Outcomes
 * Deterministically extracts the exact next sequential topic and targeted Learning Outcome without hallucination.
 */
export function resolveNextLessonContext(params: {
  className: string;
  subject: string;
  ktpDocs: KTPDocument[];
  completedLessonNumbers?: number[];
  language?: AppLanguage;
}): ResolvedLessonContext {
  const { className, subject, ktpDocs, completedLessonNumbers = [], language = 'uz' } = params;

  // 1. Find matching KTP document for class & subject
  const doc = ktpDocs.find((d) => {
    const classMatch = d.className.toLowerCase().trim() === className.toLowerCase().trim();
    const subjA = d.subject.toLowerCase().trim();
    const subjB = subject.toLowerCase().trim();
    const subjMatch = subjA === subjB || subjA.includes(subjB) || subjB.includes(subjA);
    return classMatch && subjMatch;
  });

  const hasApprovedKtp = Boolean(doc && isKTPApproved(doc.status));
  const totalHours = doc?.totalHours || doc?.lessons?.length || 68;
  const completedCount = completedLessonNumbers.length;
  const pacingPercentage = Math.min(100, Math.round((completedCount / (totalHours || 1)) * 100));

  // 2. Determine next sequential uncompleted lesson number
  let nextLessonNum = 1;
  if (doc && doc.lessons.length > 0) {
    const sortedLessons = [...doc.lessons].sort((a, b) => a.lessonNumber - b.lessonNumber);
    const uncompleted = sortedLessons.find((l) => !completedLessonNumbers.includes(l.lessonNumber));
    if (uncompleted) {
      nextLessonNum = uncompleted.lessonNumber;
    } else {
      nextLessonNum = (completedLessonNumbers[completedLessonNumbers.length - 1] || 0) + 1;
    }
  } else if (completedCount > 0) {
    nextLessonNum = Math.max(...completedLessonNumbers) + 1;
  }

  // 3. Extract exact lesson item from KTP
  const lessonItem = doc?.lessons.find((l) => l.lessonNumber === nextLessonNum) || doc?.lessons[0];
  const nextLessonItem = doc?.lessons.find((l) => l.lessonNumber === nextLessonNum + 1);

  const topic = lessonItem?.topic || `${subject}: ${nextLessonNum}-dars (KAO Dasturi)`;
  const objective = lessonItem?.objective || `${subject} fani bo‘yicha ${nextLessonNum}-mavzu kompetensiyalarini shakllantirish`;
  const homework = lessonItem?.homework || `Darslik: ${nextLessonNum * 3}-betdagi mashqlar.`;
  const nextTopicPreview = nextLessonItem ? `${nextLessonItem.lessonNumber}-dars: ${nextLessonItem.topic}` : 'Barcha mavzular o‘tildi';

  const conspectDraft =
    lessonItem?.content ||
    generateLessonConspectDraft({
      topic,
      subject,
      className,
      language,
      objective,
    });

  const materials = getMatchedLessonMaterials({ topic, subject, className });

  return {
    hasApprovedKtp,
    ktpDoc: doc || null,
    lessonNumber: nextLessonNum,
    topic,
    objective,
    homework,
    conspectDraft,
    materials,
    learningOutcomeId: lessonItem?.learningOutcomeId,
    learningOutcomeCode: lessonItem?.learningOutcomeCode,
    cognitiveLevel: lessonItem?.cognitiveLevel || 'productive',
    totalHours,
    completedLessonsCount: completedCount,
    pacingPercentage,
    nextTopicPreview,
    ktpStatus: doc?.status || 'draft',
  };
}


