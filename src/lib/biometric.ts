import { authenticatedFetch } from './api';
import type { BiometricVerificationResult, FaceExtractionResult } from '../types/faceEnrollment';

export async function extractFaceEmbedding(imageBase64: string): Promise<FaceExtractionResult> {
  const res = await authenticatedFetch('/api/students/extract-face-embedding', {
    method: 'POST',
    body: JSON.stringify({ imageBase64 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Face embedding extraction failed');
  return data;
}

export async function checkLiveness(imageBase64: string) {
  const res = await authenticatedFetch('/api/biometric/liveness', {
    method: 'POST',
    body: JSON.stringify({ imageBase64 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Liveness check failed');
  return data as {
    success: true;
    passed: boolean;
    livenessScore: number;
    qualityScore: number;
    modelVersion: string;
    policyVersion: string;
  };
}

export async function createBiometricConsent(input: {
  subjectId: string;
  subjectType: 'student' | 'teacher';
  granted: boolean;
  evidenceRef?: string;
  expiresAt?: string;
}) {
  const res = await authenticatedFetch('/api/biometric/consents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Biometric consent failed');
  return data.consent;
}

export async function enrollStudentFace(
  studentId: string,
  embedding: number[],
  consentId: string,
  photoUrl?: string,
) {
  const res = await authenticatedFetch(`/api/students/${encodeURIComponent(studentId)}/face-embedding`, {
    method: 'POST',
    body: JSON.stringify({ embedding, consentId, photoUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Student face enrollment failed');
  return data;
}

export async function enrollTeacherFace(
  teacherId: string,
  embedding: number[],
  consentId: string,
  photoUrl?: string,
) {
  const res = await authenticatedFetch(`/api/teachers/${encodeURIComponent(teacherId)}/face-embedding`, {
    method: 'POST',
    body: JSON.stringify({ embedding, consentId, photoUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Teacher face enrollment failed');
  return data;
}

export async function verifyFace(input: {
  imageBase64: string;
  subjectType: 'student' | 'teacher';
  candidateIds?: string[];
  classId?: string;
  className?: string;
  lessonId?: string;
  date?: string;
  direction?: 'IN' | 'OUT';
  scheduleSlotId?: string;
}): Promise<BiometricVerificationResult> {
  const res = await authenticatedFetch('/api/biometric/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Face verification failed');
  return data;
}
