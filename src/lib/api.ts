import { auth } from './firebase';
import {
  CurriculumStandard,
  CurriculumVersion,
  LearningOutcome,
  PedagogicalResource,
  AssessmentItem,
  StudentLOMastery,
  ClassLOMasteryOverview,
  AppLanguage,
} from '../types';

export interface LessonSessionApiRecord {
  id: string;
  slotId?: string;
  classId?: string;
  className: string;
  subject: string;
  subjectId?: string;
  teacherId?: string;
  date: string;
  weekday?: string;
  period: number;
  lessonNumber: number;
  topic: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface AttendanceApiRecord {
  id?: string;
  studentId: string;
  studentName?: string;
  classId?: string;
  className: string;
  date: string;
  lessonId: string;
  subjectId?: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  method?: 'face_recognition' | 'qr_code' | 'manual' | 'turnstile';
  confidence?: number;
  livenessScore?: number;
  qualityScore?: number;
  biometricEventId?: string;
  notes?: string;
  time?: string;
  syncStatus?: 'pending' | 'synced' | 'failed';
}

export async function listLessonSessions(params?: {
  className?: string;
  classId?: string;
  date?: string;
  teacherId?: string;
}): Promise<LessonSessionApiRecord[]> {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const res = await authenticatedFetch(`/api/lesson-sessions?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load lesson sessions');
  const data = await res.json();
  return data.items || [];
}

export async function saveLessonSession(session: Record<string, unknown>): Promise<LessonSessionApiRecord> {
  const res = await authenticatedFetch('/api/lesson-sessions', {
    method: 'POST',
    body: JSON.stringify(session),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to save lesson session');
  }
  const data = await res.json();
  return data.item;
}

export async function listAttendance(params: {
  className?: string;
  classId?: string;
  studentId?: string;
  date?: string;
  lessonId?: string;
}): Promise<AttendanceApiRecord[]> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const res = await authenticatedFetch(`/api/data/attendance?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load attendance');
  const data = await res.json();
  return data.items || [];
}

export async function saveAttendance(records: Partial<AttendanceApiRecord>[]): Promise<AttendanceApiRecord[]> {
  const results = await Promise.all(records.map(async (record) => {
    const res = await authenticatedFetch('/api/data/attendance', {
      method: 'POST',
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save attendance');
    }
    const data = await res.json();
    return data.data || data.item;
  }));
  return results;
}

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  let token: string | null = null;

  if (user) {
    token = await user.getIdToken();
  } else {
    token = localStorage.getItem('edusphere_auth_token');
  }

  if (!token || token.startsWith('dev-') || token.includes('admin-token')) {
    throw new Error('Authentication required. Please sign in again.');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(input, { ...init, headers });
}

// Standards & Curriculum APIs
export async function fetchStandards(): Promise<CurriculumStandard[]> {
  const res = await authenticatedFetch('/api/standards');
  if (!res.ok) throw new Error('Failed to load standards');
  const data = await res.json();
  return data.items || [];
}

export async function fetchCurriculumVersions(): Promise<CurriculumVersion[]> {
  const res = await authenticatedFetch('/api/curriculum-versions');
  if (!res.ok) throw new Error('Failed to load curriculum versions');
  const data = await res.json();
  return data.items || [];
}

export async function fetchLearningOutcomes(params?: {
  subjectCode?: string;
  grade?: number | string;
  cognitiveLevel?: string;
  search?: string;
}): Promise<LearningOutcome[]> {
  const query = new URLSearchParams();
  if (params?.subjectCode) query.set('subjectCode', params.subjectCode);
  if (params?.grade) query.set('grade', String(params.grade));
  if (params?.cognitiveLevel) query.set('cognitiveLevel', params.cognitiveLevel);
  if (params?.search) query.set('search', params.search);

  const res = await authenticatedFetch(`/api/learning-outcomes?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load learning outcomes');
  const data = await res.json();
  return data.items || [];
}

export async function saveLearningOutcome(lo: Partial<LearningOutcome>): Promise<LearningOutcome> {
  const res = await authenticatedFetch('/api/learning-outcomes', {
    method: 'POST',
    body: JSON.stringify(lo),
  });
  if (!res.ok) throw new Error('Failed to save learning outcome');
  const data = await res.json();
  return data.item;
}

// Pedagogical Resources APIs
export async function fetchPedagogicalResources(params?: {
  subjectCode?: string;
  grade?: number | string;
  type?: string;
  learningOutcomeId?: string;
}): Promise<PedagogicalResource[]> {
  const query = new URLSearchParams();
  if (params?.subjectCode) query.set('subjectCode', params.subjectCode);
  if (params?.grade) query.set('grade', String(params.grade));
  if (params?.type) query.set('type', params.type);
  if (params?.learningOutcomeId) query.set('learningOutcomeId', params.learningOutcomeId);

  const res = await authenticatedFetch(`/api/resources?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to load resources');
  const data = await res.json();
  return data.items || [];
}

export async function savePedagogicalResource(resource: Partial<PedagogicalResource>): Promise<PedagogicalResource> {
  const res = await authenticatedFetch('/api/resources', {
    method: 'POST',
    body: JSON.stringify(resource),
  });
  if (!res.ok) throw new Error('Failed to save pedagogical resource');
  const data = await res.json();
  return data.item;
}

// Assessment APIs
export async function fetchAssessments(loId?: string): Promise<AssessmentItem[]> {
  const query = loId ? `?loId=${encodeURIComponent(loId)}` : '';
  const res = await authenticatedFetch(`/api/assessments${query}`);
  if (!res.ok) throw new Error('Failed to load assessments');
  const data = await res.json();
  return data.items || [];
}

export async function saveAssessment(assessment: Partial<AssessmentItem>): Promise<AssessmentItem> {
  const res = await authenticatedFetch('/api/assessments', {
    method: 'POST',
    body: JSON.stringify(assessment),
  });
  if (!res.ok) throw new Error('Failed to save assessment');
  const data = await res.json();
  return data.item;
}

// Mastery Engine APIs
export async function fetchStudentMastery(studentId: string, subjectCode = 'MATH-01'): Promise<StudentLOMastery[]> {
  const res = await authenticatedFetch(`/api/mastery/student/${encodeURIComponent(studentId)}?subjectCode=${encodeURIComponent(subjectCode)}`);
  if (!res.ok) throw new Error('Failed to load student mastery');
  const data = await res.json();
  return data.mastery || [];
}

export async function fetchClassMastery(className: string, subjectCode = 'ALG-01'): Promise<ClassLOMasteryOverview[]> {
  const res = await authenticatedFetch(`/api/mastery/class/${encodeURIComponent(className)}?subjectCode=${encodeURIComponent(subjectCode)}`);
  if (!res.ok) throw new Error('Failed to load class mastery');
  const data = await res.json();
  return data.overview || [];
}

export async function fetchSchoolMastery(): Promise<any> {
  const res = await authenticatedFetch('/api/mastery/school');
  if (!res.ok) throw new Error('Failed to load school mastery');
  return res.json();
}

// AI Copilot API
export async function generateAILessonCopilot(params: {
  className: string;
  subject: string;
  topic?: string;
  learningOutcomeId?: string;
  grade?: number;
  language?: AppLanguage;
}): Promise<any> {
  const res = await authenticatedFetch('/api/ai/lesson-copilot', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to generate AI lesson plan');
  const data = await res.json();
  return data.plan;
}
