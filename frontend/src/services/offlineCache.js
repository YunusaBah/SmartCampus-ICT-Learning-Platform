const DATABASE_NAME = "smartcampus-offline";
const STORE_NAME = "api-responses";
const CACHE_MAX_AGE = 5 * 60 * 1000;
let databasePromise;

const openDatabase = () => {
    if (!("indexedDB" in window)) {
        return Promise.reject(new Error("This browser does not support offline data storage."));
    }
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DATABASE_NAME, 1);
        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: "key" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Could not open offline data storage."));
        request.onblocked = () => reject(new Error("Offline data storage is blocked by another tab."));
    }).catch((error) => {
        databasePromise = undefined;
        throw error;
    });

    return databasePromise;
};

export const readOfflineResponse = async (key) => {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error("Could not read saved offline data."));
    });
};

export const saveOfflineResponse = async (key, data) => {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put({
            key,
            data,
            savedAt: Date.now()
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error || new Error("Could not save offline data."));
    });
};

export const clearOfflineResponsesForAccount = async (accountId) => {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openCursor();
        request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) return;
            if (cursor.key.startsWith(`${accountId}:`)) cursor.delete();
            cursor.continue();
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error("Could not clear saved offline data."));
        transaction.onabort = () => reject(transaction.error || new Error("Could not clear saved offline data."));
    });
};

export const isFreshOfflineResponse = (entry) =>
    Boolean(entry && Date.now() - entry.savedAt < CACHE_MAX_AGE);
