export interface FaceExtractionResult {
  embedding: number[]; // 512 ta float son
  confidence: number; // 0.0 - 1.0
  faceDetected: boolean;
  qualityScore?: number;
  previewUrl?: string;
  errorMessage?: string;
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

