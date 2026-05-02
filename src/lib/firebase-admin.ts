import {
  initializeApp,
  getApps,
  applicationDefault,
  type App,
} from 'firebase-admin/app';
import {
  getFirestore as getAdminFirestore,
  type Firestore,
} from 'firebase-admin/firestore';

let firestoreInstance: Firestore | null = null;
let initOk = false;
let initialized = false;

function init(): void {
  if (initialized) return;
  initialized = true;
  try {
    let app: App;
    const existing = getApps();
    if (existing.length > 0 && existing[0]) {
      app = existing[0];
    } else {
      app = initializeApp({ credential: applicationDefault() });
    }
    firestoreInstance = getAdminFirestore(app);
    initOk = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      '[firebase-admin] Failed to initialize Firestore via ADC. ' +
        'Run `gcloud auth application-default login` for local dev. ' +
        `Error: ${err instanceof Error ? err.message : String(err)}`,
    );
    firestoreInstance = null;
    initOk = false;
  }
}

export function getFirestore(): Firestore | null {
  init();
  return firestoreInstance;
}

export function firestoreAvailable(): boolean {
  init();
  return initOk;
}
