import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  collection,
  query,
  getDocs,
  where,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, UserRole } from '../types';
import { DEMO_USERS } from '../data/mockData';

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Initialize Firestore and Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

// Google Workspace Scopes
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

export const googleAuthProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => {
  googleAuthProvider.addScope(scope);
});

// Error handling for Firestore operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// In-memory token cache (Do NOT store in localStorage per security requirements)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Fetch user profile from Firestore /users/{uid}
 */
export const getUserProfileFromFirestore = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: data.userId || userId,
        name: data.displayName || 'EduSphere User',
        email: data.email || '',
        role: data.role as UserRole,
        avatar: data.photoURL || '',
        schoolId: data.schoolId || '',
        schoolName: data.schoolName || '',
        teacherId: data.teacherId || undefined,
        homeroomClass: data.homeroomClass || undefined,
        workloadHours: typeof data.workloadHours === 'number' ? data.workloadHours : undefined,
        subjects: Array.isArray(data.subjects) ? data.subjects : [],
        phoneNumber: data.phoneNumber || undefined,
        subjectSpecialties: Array.isArray(data.subjectSpecialties) ? data.subjectSpecialties : [],
        assignedClasses: Array.isArray(data.assignedClasses) ? data.assignedClasses : [],
        gradeLevel: data.gradeLevel || undefined,
        studentId: data.studentId || undefined,
        childrenIds: Array.isArray(data.childrenIds) ? data.childrenIds : [],
        xp: typeof data.xp === 'number' ? data.xp : undefined,
        level: typeof data.level === 'number' ? data.level : undefined,
        streakDays: typeof data.streakDays === 'number' ? data.streakDays : undefined,
      };
    }
    return null;
  } catch (err) {
    console.warn('Could not read user profile from Firestore:', err);
    return null;
  }
};

/**
 * Save / update user profile in Firestore
 */
export const saveUserProfileToFirestore = async (profile: {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  schoolId?: string;
  schoolName?: string;
  gradeLevel?: string;
  studentId?: string;
  subjectSpecialties?: string[];
  assignedClasses?: string[];
}) => {
  try {
    const userDocRef = doc(db, 'users', profile.userId);
    await setDoc(
      userDocRef,
      {
        userId: profile.userId,
        email: profile.email || 'user@edusphere.edu',
        displayName: profile.displayName,
        role: profile.role,
        photoURL: profile.photoURL || '',
        schoolId: profile.schoolId || 'school-71-tashkent',
        schoolName: profile.schoolName || '№71 Ixtisoslashtirilgan Maktab',
        gradeLevel: profile.gradeLevel || '',
        studentId: profile.studentId || '',
        subjectSpecialties: profile.subjectSpecialties || [],
        assignedClasses: profile.assignedClasses || [],
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${profile.userId}`);
  }
};

/**
 * Sign in with Google (with full Workspace scopes)
 */
export const signInWithGoogle = async (intendedRole: UserRole = 'teacher'): Promise<{ user: FirebaseUser; accessToken: string | null }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleAuthProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;

    // Check if existing profile in Firestore
    const existing = await getUserProfileFromFirestore(result.user.uid);
    if (!existing) {
      await saveUserProfileToFirestore({
        userId: result.user.uid,
        email: result.user.email || 'user@edusphere.edu',
        displayName: result.user.displayName || 'EduSphere Educator',
        // New accounts are unprivileged until an administrator provisions a role.
        role: 'parent_student',
        photoURL: result.user.photoURL || '',
        schoolId: 'school-71-tashkent',
        schoolName: '№71 Ixtisoslashtirilgan Maktab',
      });
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign in with Email and Password
 */
export const signInWithEmail = async (emailOrUsername: string, pass: string): Promise<FirebaseUser> => {
  const normalizedEmail = emailOrUsername.includes('@')
    ? emailOrUsername.trim()
    : `${emailOrUsername.trim().toLowerCase()}@edusphere.school`;
  const credential = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
  return credential.user;
};

/**
 * Register a new user with Email, Password, Name, and Role
 */
export const registerWithEmail = async (
  email: string,
  pass: string,
  displayName: string,
  _requestedRole: UserRole,
  schoolId: string = 'school-71-tashkent',
  schoolName: string = '№71 Ixtisoslashtirilgan Maktab'
): Promise<FirebaseUser> => {
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(credential.user, { displayName });

  // Save profile to Firestore
  await saveUserProfileToFirestore({
    userId: credential.user.uid,
    email,
    displayName,
    // Role and school membership are assigned by trusted administration.
    role: 'parent_student',
    photoURL: DEMO_USERS.student?.avatar || '',
    schoolId,
    schoolName,
  });

  return credential.user;
};

/**
 * Sign in as Demo Role (using demo profile credentials)
 */
export const signInAsDemoRole = async (role: UserRole): Promise<{ user: FirebaseUser; profile: UserProfile }> => {
  void role;
  throw new Error('Demo authentication is disabled. Use a provisioned account.');
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logOutFirebase = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const logOutGoogle = logOutFirebase;

// Validate Firestore Connection
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore client is offline.');
      return false;
    }
    return true;
  }
}

