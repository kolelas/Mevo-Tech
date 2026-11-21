import { applicationDefault, cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { VerifiedAdminIdentity } from './adminAuthorization';

let firebaseAdminApp: App | null = null;

function getFirebaseAdminApp(): App {
  if (firebaseAdminApp) return firebaseAdminApp;
  const existing = getApps()[0];
  if (existing) {
    firebaseAdminApp = existing;
    return existing;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    let serviceAccount: Record<string, unknown>;
    try {
      serviceAccount = JSON.parse(serviceAccountJson) as Record<string, unknown>;
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
    }
    firebaseAdminApp = initializeApp({
      credential: cert(serviceAccount as Parameters<typeof cert>[0]),
      ...(projectId ? { projectId } : {}),
    });
    return firebaseAdminApp;
  }

  // Workload identity / GOOGLE_APPLICATION_CREDENTIALS is preferred outside
  // local development. No credentials are bundled in the repository.
  firebaseAdminApp = initializeApp({
    credential: applicationDefault(),
    ...(projectId ? { projectId } : {}),
  });
  return firebaseAdminApp;
}

/**
 * Verify a Firebase ID token (not a client-created JWT or Firebase custom
 * token) including revocation status. Email must be verified by Firebase.
 */
export async function verifyFirebaseAdminIdentity(
  idToken: string,
): Promise<VerifiedAdminIdentity | null> {
  if (!idToken || idToken.length > 16_384) return null;
  try {
    const decoded = await getAuth(getFirebaseAdminApp()).verifyIdToken(idToken, true);
    if (
      typeof decoded.uid !== 'string' ||
      typeof decoded.email !== 'string' ||
      decoded.email_verified !== true
    ) {
      return null;
    }
    return {
      userId: decoded.uid,
      email: decoded.email,
      emailVerified: true,
    };
  } catch {
    // Invalid, expired, revoked, or unverifiable tokens are indistinguishable.
    return null;
  }
}
