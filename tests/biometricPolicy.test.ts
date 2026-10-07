import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BIOMETRIC_EMBEDDING_DIMENSION,
  FACE_MATCH_THRESHOLD,
  LIVENESS_THRESHOLD,
  FACE_QUALITY_THRESHOLD,
  isValidEmbedding,
  decideBiometricVerification,
} from '../src/lib/biometricPolicy.ts';

test('biometric policy rejects non-512 or non-finite embeddings', () => {
  assert.equal(BIOMETRIC_EMBEDDING_DIMENSION, 512);
  assert.equal(isValidEmbedding(new Array(511).fill(0)), false);
  assert.equal(isValidEmbedding([Number.NaN, ...new Array(511).fill(0)]), false);
});

test('biometric policy accepts a normalized embedding', () => {
  const embedding = new Array(512).fill(1 / Math.sqrt(512));
  assert.equal(isValidEmbedding(embedding), true);
});

test('biometric verification requires liveness and match thresholds', () => {
  assert.equal(decideBiometricVerification({
    matchScore: FACE_MATCH_THRESHOLD,
    livenessScore: LIVENESS_THRESHOLD,
    qualityScore: FACE_QUALITY_THRESHOLD,
  }), 'ACCEPTED');

  assert.equal(decideBiometricVerification({
    matchScore: FACE_MATCH_THRESHOLD - 0.01,
    livenessScore: 0.99,
    qualityScore: 0.99,
  }), 'REJECTED');

  assert.equal(decideBiometricVerification({
    matchScore: 0.99,
    livenessScore: 0.99,
    qualityScore: FACE_QUALITY_THRESHOLD - 0.01,
  }), 'REVIEW_REQUIRED');
});
