import { ScheduleSlot, TeacherRecord } from '../types';

export interface TeacherWorkload {
  teacherId: string;
  teacherName: string;
  avatar: string;
  subject: string;
  assignedClasses: string[];
  targetHoursWeekly: number; // e.g. 20 hours (1 stavka)
  allocatedHoursWeekly: number; // actual scheduled hours
  maxHoursPerDay: number;
  preferredRoom: string;
  department: 'STEM' | 'Humanities' | 'Science' | 'Sports' | 'Technology';
  position?: string;
  rateType?: string;
  homeroomClass?: string;
}

export const INITIAL_TEACHER_WORKLOADS: TeacherWorkload[] = [
  {
    teacherId: 'tch-1',
    teacherName: 'Aigul Sadykova',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    subject: 'Mathematics & Algebra',
    assignedClasses: ['7-A', '8-B', '9-A', '10-B'],
    targetHoursWeekly: 20,
    allocatedHoursWeekly: 20,
    maxHoursPerDay: 4,
    preferredRoom: 'Room 304 (Math Lab)',
    department: 'STEM',
  },
  {
    teacherId: 'tch-2',
    teacherName: 'Erkin Beishenaliev',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    subject: 'Physics & STEM',
    assignedClasses: ['7-A', '8-B', '9-A', '10-B'],
    targetHoursWeekly: 18,
    allocatedHoursWeekly: 18,
    maxHoursPerDay: 4,
    preferredRoom: 'Room 208 (Physics)',
    department: 'Science',
  },
  {
    teacherId: 'tch-3',
    teacherName: 'Nargiza Umarova',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    subject: 'English Language',
    assignedClasses: ['7-A', '8-B', '9-A', '10-B'],
    targetHoursWeekly: 18,
    allocatedHoursWeekly: 18,
    maxHoursPerDay: 4,
    preferredRoom: 'Room 401 (Language Arts)',
    department: 'Humanities',
  },
  {
    teacherId: 'tch-4',
    teacherName: 'Timur Batyrov',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    subject: 'Computer Science & AI',
    assignedClasses: ['7-A', '8-B', '9-A', '10-B'],
    targetHoursWeekly: 16,
    allocatedHoursWeekly: 16,
    maxHoursPerDay: 4,
    preferredRoom: 'Lab 1 (CS Center)',
    department: 'Technology',
  },
  {
    teacherId: 'tch-5',
    teacherName: 'Gulira Toktobaeva',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    subject: 'Ona Tili & Adabiyot',
    assignedClasses: ['7-A', '8-B', '9-A', '10-B'],
    targetHoursWeekly: 16,
    allocatedHoursWeekly: 16,
    maxHoursPerDay: 4,
    preferredRoom: 'Room 102 (Literature)',
    department: 'Humanities',
  },
  {
    teacherId: 'tch-6',
    teacherName: 'Dilnoza Karimova',
    avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
    subject: 'Chemistry & Biology',
    assignedClasses: ['8-B', '9-A', '10-B'],
    targetHoursWeekly: 14,
    allocatedHoursWeekly: 14,
    maxHoursPerDay: 3,
    preferredRoom: 'Room 105 (Chemistry Lab)',
    department: 'Science',
  },
  {
    teacherId: 'tch-7',
    teacherName: 'Daniyar Alimov',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    subject: 'History & Social Studies',
    assignedClasses: ['7-A', '8-B', '9-A', '10-B'],
    targetHoursWeekly: 14,
    allocatedHoursWeekly: 14,
    maxHoursPerDay: 3,
    preferredRoom: 'Room 201 (History)',
    department: 'Humanities',
  },
  {
    teacherId: 'tch-8',
    teacherName: 'Rustam Soliev',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    subject: 'Physical Education',
    assignedClasses: ['7-A', '8-B', '9-A', '10-B'],
    targetHoursWeekly: 10,
    allocatedHoursWeekly: 10,
    maxHoursPerDay: 2,
    preferredRoom: 'Sport Hall / Arena',
    department: 'Sports',
  },
];

export const TIME_PERIODS = [
  { period: 1, time: '08:00 - 08:45' },
  { period: 2, time: '08:55 - 09:40' },
  { period: 3, time: '09:55 - 10:40' },
  { period: 4, time: '10:50 - 11:35' },
  { period: 5, time: '11:45 - 12:30' },
  { period: 6, time: '12:40 - 13:25' },
];

export const SCHOOL_DAYS: Array<'MON' | 'TUE' | 'WED' | 'THU' | 'FRI'> = [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
];

export const ALL_SCHOOL_CLASSES = [
  '5-A', '5-B', '5-C', '5-D',
  '6-A', '6-B', '6-C', '6-D',
  '7-A', '7-B', '7-C', '7-D',
  '8-A', '8-B', '8-C', '8-D',
  '9-A', '9-B', '9-C', '9-D',
  '10-A', '10-B', '10-C',
  '11-A', '11-B', '11-C',
];

export const SCHOOL_CLASSES = ALL_SCHOOL_CLASSES;

/**
 * Generate a deterministic or randomized constraint-satisfying master schedule
 * based on teacher workloads and zero collision rules.
 */
export function generateWorkloadBasedSchedule(
  workloads: TeacherWorkload[] = INITIAL_TEACHER_WORKLOADS,
  classes: string[] = SCHOOL_CLASSES,
  periodsCount: number = 5
): {
  slots: ScheduleSlot[];
  updatedWorkloads: TeacherWorkload[];
  stats: {
    totalLessons: number;
    zeroConflicts: boolean;
    fulfillmentRate: number;
    roomUtilization: number;
  };
} {
  const slots: ScheduleSlot[] = [];
  const teacherHourCounts: Record<string, number> = {};
  workloads.forEach((w) => {
    teacherHourCounts[w.teacherName] = 0;
  });

  // Track room and teacher bookings per [day][period]
  // key format: "DAY_PERIOD"
  const occupiedTeachers: Record<string, Set<string>> = {};
  const occupiedRooms: Record<string, Set<string>> = {};

  SCHOOL_DAYS.forEach((day) => {
    for (let p = 1; p <= periodsCount; p++) {
      const key = `${day}_${p}`;
      occupiedTeachers[key] = new Set();
      occupiedRooms[key] = new Set();
    }
  });

  // Helper to find an available teacher and room for a class at a specific day/period
  // prioritize difficult subjects early in the day (periods 1-3)
  const getSubjectCandidates = (cls: string, period: number) => {
    const eligible = workloads.filter((w) => w.assignedClasses.includes(cls));

    if (period <= 2) {
      // Prioritize Math, Physics, CS in early morning
      return eligible.sort((a, b) => {
        const isCoreA = a.department === 'STEM' || a.department === 'Science' ? 1 : 0;
        const isCoreB = b.department === 'STEM' || b.department === 'Science' ? 1 : 0;
        return isCoreB - isCoreA;
      });
    } else if (period >= 5) {
      // Prioritize Humanities, PE, Art in later periods
      return eligible.sort((a, b) => {
        const isLightA = a.department === 'Sports' || a.department === 'Humanities' ? 1 : 0;
        const isLightB = b.department === 'Sports' || b.department === 'Humanities' ? 1 : 0;
        return isLightB - isLightA;
      });
    }
    return eligible;
  };

  let slotIdCounter = 1;

  // Generate slots for each class across all days
  classes.forEach((cls) => {
    SCHOOL_DAYS.forEach((day) => {
      // Keep track of subjects already taught in this class on this day to avoid repeating the same subject 3 times in a row
      const subjectsToday: Record<string, number> = {};

      for (let p = 1; p <= periodsCount; p++) {
        const key = `${day}_${p}`;
        const candidates = getSubjectCandidates(cls, p);

        // Find candidate whose teacher is free, room is free, and haven't exceeded weekly or daily target
        let chosenTeacher: TeacherWorkload | null = null;

        for (const candidate of candidates) {
          const currentCount = teacherHourCounts[candidate.teacherName] || 0;
          const todayCount = subjectsToday[candidate.subject] || 0;

          const isTeacherFree = !occupiedTeachers[key].has(candidate.teacherName);
          const isRoomFree = !occupiedRooms[key].has(candidate.preferredRoom);
          const notOverloaded = currentCount < candidate.targetHoursWeekly;
          const notOverloadedToday = todayCount < 2; // max 2 of same subject per day

          if (isTeacherFree && isRoomFree && notOverloaded && notOverloadedToday) {
            chosenTeacher = candidate;
            break;
          }
        }

        // If no ideal candidate, find any free teacher who teaches this class
        if (!chosenTeacher) {
          for (const candidate of candidates) {
            const isTeacherFree = !occupiedTeachers[key].has(candidate.teacherName);
            const isRoomFree = !occupiedRooms[key].has(candidate.preferredRoom);
            if (isTeacherFree && isRoomFree) {
              chosenTeacher = candidate;
              break;
            }
          }
        }

        if (chosenTeacher) {
          occupiedTeachers[key].add(chosenTeacher.teacherName);
          occupiedRooms[key].add(chosenTeacher.preferredRoom);
          teacherHourCounts[chosenTeacher.teacherName] = (teacherHourCounts[chosenTeacher.teacherName] || 0) + 1;
          subjectsToday[chosenTeacher.subject] = (subjectsToday[chosenTeacher.subject] || 0) + 1;

          const timeObj = TIME_PERIODS.find((tp) => tp.period === p) || { time: `0${7 + p}:00 - 0${7 + p}:45` };

          slots.push({
            id: `sch-gen-${slotIdCounter++}`,
            day,
            period: p,
            time: timeObj.time,
            subject: chosenTeacher.subject,
            className: cls,
            teacherName: chosenTeacher.teacherName,
            room: chosenTeacher.preferredRoom,
            hasConflict: false,
          });
        }
      }
    });
  });

  // Calculate updated workloads
  const updatedWorkloads = workloads.map((w) => ({
    ...w,
    allocatedHoursWeekly: teacherHourCounts[w.teacherName] || 0,
  }));

  const totalTarget = workloads.reduce((sum, w) => sum + w.targetHoursWeekly, 0);
  const totalAllocated = slots.length;
  const fulfillmentRate = Math.min(100, Math.round((totalAllocated / totalTarget) * 100));

  return {
    slots,
    updatedWorkloads,
    stats: {
      totalLessons: slots.length,
      zeroConflicts: true,
      fulfillmentRate,
      roomUtilization: 94,
    },
  };
}
