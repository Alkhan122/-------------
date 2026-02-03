const DB_NAME = "finance_app";
const DB_VERSION = 1;
let dbPromise = null;

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Transaction error"));
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (event.oldVersion < 1) {
        if (!db.objectStoreNames.contains("accounts")) {
          db.createObjectStore("accounts", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("transactions")) {
          const store = db.createObjectStore("transactions", { keyPath: "id" });
          store.createIndex("by_date", "date", { unique: false });
          store.createIndex("by_account", "account_id", { unique: false });
          store.createIndex("by_category", "category_id", { unique: false });
          store.createIndex("by_type", "type", { unique: false });
          store.createIndex("by_transfer_id", "transfer_id", { unique: false });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
  return dbPromise;
}

async function withStore(storeNames, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const tx = db.transaction(names, mode);
    const stores = names.map((name) => tx.objectStore(name));
    let result;
    Promise.resolve(fn(...stores))
      .then((res) => {
        result = res;
      })
      .catch((err) => {
        tx.abort();
        reject(err);
      });
    txDone(tx)
      .then(() => resolve(result))
      .catch(reject);
  });
}

export async function getAll(storeName) {
  return withStore(storeName, "readonly", (store) => requestToPromise(store.getAll()));
}

export async function getById(storeName, id) {
  return withStore(storeName, "readonly", (store) => requestToPromise(store.get(id)));
}

export async function upsert(storeName, value) {
  return withStore(storeName, "readwrite", (store) => requestToPromise(store.put(value)));
}

export async function bulkUpsert(storeName, values) {
  return withStore(storeName, "readwrite", (store) => {
    values.forEach((value) => store.put(value));
  });
}

export async function remove(storeName, id) {
  return withStore(storeName, "readwrite", (store) => requestToPromise(store.delete(id)));
}

export async function clearStore(storeName) {
  return withStore(storeName, "readwrite", (store) => requestToPromise(store.clear()));
}

export async function queryTransactions(filters = {}) {
  const all = await getAll("transactions");
  return all.filter((tx) => {
    if (filters.from && tx.date < filters.from) return false;
    if (filters.to && tx.date > filters.to) return false;
    if (filters.accountId && tx.account_id !== filters.accountId) return false;
    if (filters.categoryId && tx.category_id !== filters.categoryId) return false;
    if (filters.type) {
      if (filters.type === "transfer") {
        if (!tx.transfer_id) return false;
      } else {
        if (tx.transfer_id) return false;
        if (tx.type !== filters.type) return false;
      }
    }
    if (filters.search) {
      const query = filters.search.toLowerCase();
      const hay = `${tx.payee || ""} ${tx.note || ""}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

export async function deleteByIndex(storeName, indexName, value) {
  return withStore(storeName, "readwrite", (store) => {
    const index = store.index(indexName);
    const request = index.openCursor(IDBKeyRange.only(value));
    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  });
}

export async function resetDatabase() {
  const db = await openDB();
  db.close();
  dbPromise = null;
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Database deletion blocked"));
  });
}
