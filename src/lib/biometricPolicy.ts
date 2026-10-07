export const BIOMETRIC_EMBEDDING_DIMENSION = 512;
export const FACE_MATCH_THRESHOLD = 0.82;
export const LIVENESS_THRESHOLD = 0.90;
export const FACE_QUALITY_THRESHOLD = 0.80;
export const MAX_FACE_IMAGE_BYTES = 2_000_000;

export type BiometricDecision =
  | 'ACCEPTED'
  | 'REVIEW_REQUIRED'
  | 'REJECTED';

export interface BiometricVerificationInput {
  matchScore: number;
  livenessScore: number;
  qualityScore?: number;
}

export function isValidEmbedding(embedding: unknown): embedding is number[] {
  if (!Array.isArray(embedding) || embedding.length !== BIOMETRIC_EMBEDDING_DIMENSION) return false;
  if (!embedding.every((value) => typeof value === 'number' && Number.isFinite(value))) return false;

  const norm = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0));
  return norm >= 0.90 && norm <= 1.10;
}

export function decideBiometricVerification(input: BiometricVerificationInput): BiometricDecision {
  const { matchScore, livenessScore, qualityScore = 1 } = input;
  if (![matchScore, livenessScore, qualityScore].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) {
    return 'REJECTED';
  }

  if (livenessScore < LIVENESS_THRESHOLD || matchScore < FACE_MATCH_THRESHOLD) {
    return 'REJECTED';
  }

  if (qualityScore < FACE_QUALITY_THRESHOLD) {
    return 'REVIEW_REQUIRED';
  }

  return 'ACCEPTED';
}

export function normalizeConfidence(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}
