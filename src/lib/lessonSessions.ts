import type { ScheduleSlot } from '../types';

export type LessonSession = {
  sessionId: string;
  slotId: string;
  date: string;
  className: string;
  subject: string;
  teacherName: string;
  period: number;
  time: string;
  subjectId?: string;
  classId?: string;
};

const WEEKDAY_BY_INDEX: ScheduleSlot['day'][] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as ScheduleSlot['day'][];

export function getScheduleDay(date: string): ScheduleSlot['day'] {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid attendance date');
  if (parsed.getDay() === 0) throw new Error('Attendance is not available on Sunday');
  const day = WEEKDAY_BY_INDEX[parsed.getDay()];
  if (!day) throw new Error('Invalid attendance weekday');
  return day;
}

export function buildLessonSession(slot: ScheduleSlot, date: string): LessonSession {
  if (!slot.id?.trim()) throw new Error('Schedule slot id is required');
  if (!slot.className?.trim()) throw new Error('Schedule class is required');
  const day = getScheduleDay(date);
  if (slot.day !== day) throw new Error('Schedule slot does not match attendance date');
  return {
    sessionId: `session-${slot.id}-${date}`,
    slotId: slot.id,
    date,
    className: slot.className,
    subject: slot.subject,
    teacherName: slot.teacherName,
    period: slot.period,
    time: slot.time,
    subjectId: slot.subjectId,
    classId: slot.classId,
  };
}

export function getLessonSessions(slots: ScheduleSlot[], className: string, date: string): LessonSession[] {
  const day = getScheduleDay(date);
  return slots
    .filter((slot) => slot.className === className && slot.day === day && slot.isActive !== false)
    .sort((a, b) => a.period - b.period)
    .map((slot) => buildLessonSession(slot, date));
}
