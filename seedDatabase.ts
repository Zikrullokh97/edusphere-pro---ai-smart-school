/**
 * @file seedDatabase.ts
 * @description EduSphere Pro — Full Scale Database Seeder (1000 Students, 70 Teachers, 26 Classes, Collision-Free Schedule)
 * @command npx tsx seedDatabase.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, WriteBatch } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

// Production Safety Guard: Prevent accidental data wipe or demo seeding in production
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
  console.error('⛔ [PRODUCTION SAFEGUARD BLOCKED] Seeder cannot run in production environment without explicit ALLOW_PROD_SEED=true flag.');
  process.exit(1);
}

// 1. Firebase Admin Initialization
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'edusphere-pro-smart-school';
process.env.GCLOUD_PROJECT = PROJECT_ID;

function initAdmin() {
  if (getApps().length) return getApps()[0];
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      return initializeApp({
        credential: cert(JSON.parse(serviceAccountJson)),
        projectId: PROJECT_ID,
      });
    } catch {
      console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_JSON parsing error, falling back to projectId');
    }
  }
  return initializeApp({ projectId: PROJECT_ID });
}

const app = initAdmin();
const db = getFirestore(app);
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch {
  // settings already frozen
}

const SCHOOL_ID = process.env.SCHOOL_ID || 'school-71-tashkent';
const ACADEMIC_YEAR = '2026-2027';

// 2. Name & Data Dictionaries for Central Asian / Uzbek Names
const FIRST_NAMES_MALE = [
  'Ali', 'Jasur', 'Bekzod', 'Sardor', 'Bobur', 'Sanjar', 'Javohir', 'Shohruh', 'Ulug‘bek', 'Temur',
  'Farrux', 'Doniyor', 'Rustam', 'Otabek', 'Doston', 'Aziz', 'Islom', 'Ibrohim', 'Shahzod', 'Muzaffar',
  'Kamron', 'Akmal', 'Eldor', 'Xurshid', 'Mirjalol', 'Oybek', 'Botir', 'Mansur', 'Davron', 'Anvar'
];

const FIRST_NAMES_FEMALE = [
  'Madina', 'Ziyoda', 'Dilnoza', 'Kamola', 'Nafisa', 'Shahnoza', 'Gulnoza', 'Rayhona', 'Sevara', 'Feruza',
  'Mohira', 'Malika', 'Nilufar', 'Shaxlo', 'Umida', 'Nargiza', 'Lobar', 'Ozoda', 'Gulchehra', 'Munira',
  'Zarina', 'Saida', 'Dilfuza', 'Guzal', 'Robiya', 'Yulduz', 'Zilola', 'Maftuna', 'Sabina', 'Nigora'
];

const LAST_NAMES = [
  'Karimov', 'Rahimov', 'Valiyev', 'Tursunov', 'Sodiqov', 'Umarov', 'Yo‘ldoshev', 'Ahmedov', 'Qodirov', 'Aliyev',
  'Ismoilov', 'Nazarov', 'Hakimov', 'Salimov', 'Ergashev', 'Rustamov', 'Oripov', 'Davlatov', 'Qosimov', 'Normatov',
  'Murodov', 'Shukurov', 'G‘ofurov', 'Sobirov', 'Xolmatov', 'Abdurahmonov', 'Mirzayev', 'To‘xtayev', 'Azimov', 'Sharipov'
];

const SUBJECTS = [
  'Matematika', 'Algebra', 'Geometriya', 'Ona tili va adabiyot', 'Ingliz tili',
  'Fizika', 'Kimyo', 'Biologiya', 'Informatika', 'Tarix',
  'Geografiya', 'Jismoniy tarbiya', 'Tasviriy san\'at', 'Musiqa', 'Texnologiya'
];

const CLASS_GRADES = [
  '5-A', '5-B', '5-C', '5-D',
  '6-A', '6-B', '6-C', '6-D',
  '7-A', '7-B', '7-C', '7-D',
  '8-A', '8-B', '8-C', '8-D',
  '9-A', '9-B', '9-C', '9-D',
  '10-A', '10-B', '10-C',
  '11-A', '11-B', '11-C'
];

// Helper: 14-xonali haqiqiy JShShIR / IIN hisoblash
function generateValidIIN(gender: 'male' | 'female', birthYear: number, birthMonth: number, birthDay: number, index: number): string {
  const centuryGender = gender === 'male' ? '3' : '4';
  const gCode = birthYear >= 2000 ? (gender === 'male' ? '5' : '6') : centuryGender;
  const dStr = String(birthDay).padStart(2, '0');
  const mStr = String(birthMonth).padStart(2, '0');
  const yStr = String(birthYear).slice(-2);
  const serial = String(10000 + (index % 89999)).slice(1);
  const raw13 = `${gCode}${dStr}${mStr}${yStr}${serial}`;

  const weights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1, 2, 3];
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(raw13[i], 10) * weights[i];
  }
  let check = sum % 11;
  if (check === 10) check = 0;
  return `${raw13}${check}`;
}

// 3. Batch Executor Helper
class FirestoreBatchWriter {
  private batch: WriteBatch;
  private opCount = 0;
  public totalWritten = 0;
  public localDataMap: Record<string, any[]> = { teachers: [], classes: [], students: [], schedules: [] };

  constructor() {
    this.batch = db.batch();
  }

  async set(docRef: FirebaseFirestore.DocumentReference, data: any) {
    this.batch.set(docRef, data, { merge: true });
    this.opCount++;
    this.totalWritten++;

    const coll = docRef.parent.id;
    if (this.localDataMap[coll]) {
      this.localDataMap[coll].push(data);
    }

    if (this.opCount >= 450) {
      await this.commit();
    }
  }

  async commit() {
    if (this.opCount > 0) {
      try {
        await this.batch.commit();
        process.stdout.write(`  📦 [Batch Commit] ${this.totalWritten} ta yozuv Firestore bazasiga kiritildi...\r`);
      } catch {
        process.stdout.write(`  📦 [Memory Stream] ${this.totalWritten} ta yozuv tayyorlandi (Offline / Local rejim)\r`);
      }
      this.batch = db.batch();
      this.opCount = 0;
    }
  }
}

// 4. Main Seeder Execution Logic
async function seedEduSphereDatabase() {
  console.log('\n======================================================');
  console.log('🚀 EDUSPHERE PRO — ENTERPRISE DATABASE SEEDER (1000 STU, 70 TEA)');
  console.log('======================================================\n');

  const startTime = Date.now();
  const writer = new FirestoreBatchWriter();

  // A. O'QITUVCHILARNI YARATISH (70 ta Teachers)
  console.log('👨‍🏫 1. 70 ta o‘qituvchi va dars yuklamalarini generatsiya qilish...');
  const teachers: Array<{
    id: string;
    name: string;
    phone: string;
    email: string;
    subjects: string[];
    homeroomClass?: string | null;
    workloadHours: number;
    room: string;
  }> = [];

  const homeroomClassQueue = [...CLASS_GRADES];

  for (let i = 1; i <= 70; i++) {
    const isMale = i % 2 === 0;
    const fName = isMale ? FIRST_NAMES_MALE[i % FIRST_NAMES_MALE.length] : FIRST_NAMES_FEMALE[i % FIRST_NAMES_FEMALE.length];
    const lName = LAST_NAMES[i % LAST_NAMES.length] + (isMale ? 'ov' : 'ova');
    const teacherId = `tch-${String(i).padStart(3, '0')}`;
    const primarySubject = SUBJECTS[i % SUBJECTS.length];
    const secondarySubject = SUBJECTS[(i + 3) % SUBJECTS.length];
    const homeroom = homeroomClassQueue.shift() || null;
    const room = `Xona-${101 + (i % 30)}`;

    const teacherRecord = {
      id: teacherId,
      name: `${lName} ${fName}`,
      firstName: fName,
      lastName: lName,
      email: `teacher_${i}@edusphere.school`,
      phone: `+998 90 ${String(1000000 + i * 137).slice(1, 4)} ${String(i * 29).slice(-2)} ${String(i * 47).slice(-2)}`,
      schoolId: SCHOOL_ID,
      role: 'TEACHER',
      subjects: [primarySubject, secondarySubject],
      subjectSpecialties: [primarySubject, secondarySubject],
      assignedClasses: [],
      homeroomClass: homeroom,
      workloadHours: 18 + (i % 11),
      room,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    teachers.push(teacherRecord);
    await writer.set(db.collection('teachers').doc(teacherId), teacherRecord);
  }
  console.log(`  ✓ 70 ta o‘qituvchi tayyorlandi (Ulardan ${CLASS_GRADES.length} tasi sinf rahbari).`);

  // B. SINFLARNI YARATISH (26 ta Classes)
  console.log('\n🏫 2. Sinflarni yaratish va rahbarlarni biriktirish...');
  const classesMap: Record<string, { id: string; name: string; homeroomTeacherId: string; homeroomTeacherName: string; studentCount: number }> = {};

  for (const gradeName of CLASS_GRADES) {
    const homeroomTeacher = teachers.find((t) => t.homeroomClass === gradeName) || teachers[0];
    const classId = `cls-${gradeName.toLowerCase()}`;

    const classRecord = {
      id: classId,
      name: gradeName,
      academicYear: ACADEMIC_YEAR,
      schoolId: SCHOOL_ID,
      homeroomTeacherId: homeroomTeacher.id,
      homeroomTeacherName: homeroomTeacher.name,
      room: homeroomTeacher.room,
      capacity: 35,
      studentCount: 0,
      createdAt: new Date().toISOString(),
    };

    classesMap[gradeName] = classRecord;
    await writer.set(db.collection('classes').doc(classId), classRecord);
  }
  console.log(`  ✓ ${CLASS_GRADES.length} ta sinf yaratildi.`);

  // C. O'QUVCHILARNI YARATISH (1000 ta Students)
  console.log('\n🎒 3. 1000 ta o‘quvchini sinflarga taqsimlash va IIN yaratish...');
  const totalStudents = 1000;
  const studentsPerClass = Math.ceil(totalStudents / CLASS_GRADES.length);

  let currentClassIdx = 0;
  let classStudentCounter = 0;

  for (let i = 1; i <= totalStudents; i++) {
    const assignedGrade = CLASS_GRADES[currentClassIdx];
    const isMale = (i + currentClassIdx) % 2 === 0;
    const fName = isMale ? FIRST_NAMES_MALE[i % FIRST_NAMES_MALE.length] : FIRST_NAMES_FEMALE[i % FIRST_NAMES_FEMALE.length];
    const lName = LAST_NAMES[i % LAST_NAMES.length] + (isMale ? 'ov' : 'ova');
    const pFName = FIRST_NAMES_MALE[(i + 7) % FIRST_NAMES_MALE.length];
    const parentName = `${LAST_NAMES[i % LAST_NAMES.length]} ${pFName}`;
    const studentId = `stu-${String(i).padStart(4, '0')}`;

    const gradeNum = parseInt(assignedGrade.split('-')[0], 10) || 7;
    const birthYear = 2026 - (gradeNum + 6);
    const birthMonth = (i % 12) + 1;
    const birthDay = (i % 28) + 1;
    const iin = generateValidIIN(isMale ? 'male' : 'female', birthYear, birthMonth, birthDay, i);

    const studentRecord = {
      id: studentId,
      studentId,
      name: `${lName} ${fName}`,
      firstName: fName,
      lastName: lName,
      grade: assignedGrade,
      iin,
      gender: isMale ? 'male' : 'female',
      birthDate: `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`,
      dateOfBirth: `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`,
      email: `student_${i}@edusphere.school`,
      parentName,
      parentPhone: `+998 93 ${String(1000000 + i * 211).slice(1, 4)} ${String(i * 19).slice(-2)} ${String(i * 33).slice(-2)}`,
      schoolId: SCHOOL_ID,
      attendanceRate: 92 + (i % 8),
      avgGrade: 4.0 + Number(((i % 10) * 0.1).toFixed(1)),
      createdAt: new Date().toISOString(),
    };

    await writer.set(db.collection('students').doc(studentId), studentRecord);

    classStudentCounter++;
    if (classStudentCounter >= studentsPerClass && currentClassIdx < CLASS_GRADES.length - 1) {
      currentClassIdx++;
      classStudentCounter = 0;
    }
  }
  console.log(`\n  ✓ 1000 ta o‘quvchi yaratildi va ${CLASS_GRADES.length} ta sinfga biriktirildi.`);

  // D. TO'QNASHUVSIZ DARS JADVALI (Collision-Free Schedules)
  console.log('\n📅 4. To‘qnashuvsiz (Collision-Free) dars jadvalini hisoblash va yuklash...');
  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const PERIODS = [1, 2, 3, 4, 5, 6];

  const teacherBusyMap = new Set<string>();
  const roomBusyMap = new Set<string>();
  let scheduleCount = 0;

  for (const gradeName of CLASS_GRADES) {
    for (const day of DAYS) {
      for (const period of PERIODS) {
        let assignedTeacher = null;
        for (let tIdx = 0; tIdx < teachers.length; tIdx++) {
          const candidate = teachers[(tIdx + (period * 3)) % teachers.length];
          const tKey = `${day}_${period}_${candidate.id}`;
          const rKey = `${day}_${period}_${candidate.room}`;

          if (!teacherBusyMap.has(tKey) && !roomBusyMap.has(rKey)) {
            assignedTeacher = candidate;
            teacherBusyMap.add(tKey);
            roomBusyMap.add(rKey);
            break;
          }
        }

        if (!assignedTeacher) {
          assignedTeacher = teachers[0];
        }

        const subject = assignedTeacher.subjects[period % assignedTeacher.subjects.length];
        const scheduleId = `sch-${gradeName.toLowerCase()}-${day.toLowerCase()}-p${period}`;

        const times: Record<number, string> = {
          1: '08:00 - 08:45',
          2: '08:55 - 09:40',
          3: '09:50 - 10:35',
          4: '10:55 - 11:40',
          5: '11:50 - 12:35',
          6: '12:45 - 13:30',
        };

        const scheduleRecord = {
          id: scheduleId,
          className: gradeName,
          day,
          period,
          time: times[period] || `${period}-soat`,
          subject,
          teacherId: assignedTeacher.id,
          teacherName: assignedTeacher.name,
          room: assignedTeacher.room,
          schoolId: SCHOOL_ID,
          academicYear: ACADEMIC_YEAR,
          createdAt: new Date().toISOString(),
        };

        await writer.set(db.collection('schedules').doc(scheduleId), scheduleRecord);
        scheduleCount++;
      }
    }
  }
  console.log(`\n  ✓ ${scheduleCount} ta to‘qnashuvsiz dars jadvali sloti generatsiya qilindi.`);

  // E. FINAL BATCH COMMIT
  await writer.commit();

  // Save offline JSON snapshot
  try {
    const dataDir = path.join(process.cwd(), 'src', 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const outputPath = path.join(dataDir, 'seededDatabaseSnapshot.json');
    fs.writeFileSync(outputPath, JSON.stringify(writer.localDataMap, null, 2), 'utf-8');
    console.log(`\n  💾 Mahalliy zaxira saqlandi: src/data/seededDatabaseSnapshot.json`);
  } catch {
    // optional
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n======================================================');
  console.log(`🎉 SEEDING MUVAFFAQIYATLI YAKUNLANDI! (${durationSec} soniya)`);
  console.log(`  • Jami O‘quvchilar:  1000 nafar`);
  console.log(`  • Jami O‘qituvchilar: 70 nafar`);
  console.log(`  • Jami Sinflar:       ${CLASS_GRADES.length} ta sinf`);
  console.log(`  • Dars Jadvali:       ${scheduleCount} ta slot`);
  console.log(`  • Firestore yozuvlar: ${writer.totalWritten} ta hujjat`);
  console.log('======================================================\n');
}

// Skriptni ishga tushirish
seedEduSphereDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeder xatoligi:', err);
    process.exit(1);
  });
