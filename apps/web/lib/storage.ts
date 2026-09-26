export const storage = {
  get(key: string): unknown | null {
    if (typeof window === "undefined") return null;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  },

  set(key: string, value: unknown): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  },

  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.clear();
  },
};
