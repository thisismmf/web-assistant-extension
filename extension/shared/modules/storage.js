const memoryStore = new Map();

const hasLocalStorage = (() => {
  try {
    const testKey = "__waa_probe__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
})();

const engine = {
  getItem(key) {
    if (hasLocalStorage) {
      return window.localStorage.getItem(key);
    }
    return memoryStore.get(key) ?? null;
  },
  setItem(key, value) {
    if (hasLocalStorage) {
      window.localStorage.setItem(key, value);
    } else {
      memoryStore.set(key, value);
    }
  },
  removeItem(key) {
    if (hasLocalStorage) {
      window.localStorage.removeItem(key);
    } else {
      memoryStore.delete(key);
    }
  },
};

export const StorageKeys = Object.freeze({
  QUICK_LINKS: "waa_quick_links",
  NOTES: "waa_notes",
  DATE_NOTES: "waa_date_notes",
});

export function load(key, fallback) {
  try {
    const raw = engine.getItem(key);
    if (!raw) {
      return clone(fallback);
    }
    return JSON.parse(raw);
  } catch {
    return clone(fallback);
  }
}

export function save(key, value) {
  engine.setItem(key, JSON.stringify(value));
  document.dispatchEvent(
    new CustomEvent("waa:storage", { detail: { key, value } }),
  );
}

export function reset(key) {
  engine.removeItem(key);
  document.dispatchEvent(new CustomEvent("waa:storage", { detail: { key } }));
}

function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}
