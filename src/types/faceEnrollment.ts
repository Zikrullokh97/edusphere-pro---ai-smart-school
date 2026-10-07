export interface FaceExtractionResult {
  embedding: number[]; // 512 ta float son
  confidence: number; // 0.0 - 1.0
  faceDetected: boolean;
  qualityScore?: number;
  livenessScore?: number;
  livenessPassed?: boolean;
  modelVersion?: string;
  previewUrl?: string;
  errorMessage?: string;
}

export interface BiometricConsent {
  id: string;
  subjectId: string;
  subjectType: 'student' | 'teacher';
  schoolId: string;
  granted: boolean;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  policyVersion: string;
}

export interface BiometricVerificationResult {
  decision: 'ACCEPTED' | 'REVIEW_REQUIRED' | 'REJECTED';
  subjectId?: string;
  subjectType?: 'student' | 'teacher';
  matchScore?: number;
  livenessScore?: number;
  qualityScore?: number;
  modelVersion?: string;
  eventId?: string;
}

export interface StudentFaceEnrollModalProps {
  isOpen: boolean;
  studentId: string;
  studentName: string;
  className: string;
  currentPhotoUrl?: string;
  onClose: () => void;
  onSuccess: (embedding: number[], photoUrl: string) => void;
}

