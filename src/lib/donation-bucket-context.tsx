"use client";

import * as React from "react";

export type BucketItem = {
  id: string;
  label: string;
  category: string;
  quantity: number;
  ngoName?: string;
  needId?: string;
};

type BucketContextValue = {
  items: BucketItem[];
  addItem: (item: Omit<BucketItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  hasNeed: (needId: string) => boolean;
  clear: () => void;
};

const BucketContext = React.createContext<BucketContextValue | null>(null);
const STORAGE_KEY = "sevadeep-donation-bucket";

export function DonationBucketProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<BucketItem[]>([]);
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from localStorage, only available client-side
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore malformed/unavailable storage
    } finally {
      hydrated.current = true;
    }
  }, []);

  React.useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage unavailable (private mode, quota) -- state still works in-memory
    }
  }, [items]);

  const addItem: BucketContextValue["addItem"] = (item) => {
    setItems((prev) => {
      if (item.needId && prev.some((p) => p.needId === item.needId)) return prev;
      return [...prev, { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }];
    });
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const updateQuantity = (id: string, quantity: number) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i)));

  const hasNeed = (needId: string) => items.some((i) => i.needId === needId);

  const clear = () => setItems([]);

  return (
    <BucketContext.Provider value={{ items, addItem, removeItem, updateQuantity, hasNeed, clear }}>
      {children}
    </BucketContext.Provider>
  );
}

export function useDonationBucket() {
  const ctx = React.useContext(BucketContext);
  if (!ctx) throw new Error("useDonationBucket must be used within DonationBucketProvider");
  return ctx;
}
