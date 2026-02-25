/**
 * Offline Action Queue (Vanilla IndexedDB)
 */

export type QueuedAction = {
    id: string;
    type: 'message' | 'lead_update' | 'note_create';
    payload: any;
    timestamp: number;
    retryCount: number;
    tenantId: number;
};

const DB_NAME = 'crmpro_offline_db';
const STORE_NAME = 'offline_actions';

function getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e: any) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = (e: any) => resolve(e.target.result);
        request.onerror = (e: any) => reject(e.target.error);
    });
}

export async function queueAction(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>) {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const fullAction: QueuedAction = {
        ...action,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        retryCount: 0,
    };
    return new Promise((resolve, reject) => {
        const request = store.add(fullAction);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

export async function getPendingActions(): Promise<QueuedAction[]> {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function removeAction(id: string) {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}
