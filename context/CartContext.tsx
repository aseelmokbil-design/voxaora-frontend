"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { Product } from "@/lib/api";

export interface CartItem { product: Product; quantity: number; notes?: string; merchantId: string; }

interface CartCtx {
  items: CartItem[];
  merchantId: string | null;
  merchantName: string;
  addItem: (product: Product, merchantId: string, merchantName: string) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
}

const Ctx = createContext<CartCtx>({
  items: [], merchantId: null, merchantName: "",
  addItem: () => {}, removeItem: () => {}, updateQty: () => {}, clear: () => {},
  total: 0, count: 0,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState("");

  const addItem = (product: Product, mId: string, mName: string) => {
    if (merchantId && merchantId !== mId) {
      if (!confirm("سيتم مسح سلة التسوق الحالية. هل تريد المتابعة؟")) return;
      setItems([]);
    }
    setMerchantId(mId);
    setMerchantName(mName);
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1, merchantId: mId }];
    });
  };

  const removeItem = (productId: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.product.id !== productId);
      if (next.length === 0) { setMerchantId(null); setMerchantName(""); }
      return next;
    });
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) { removeItem(productId); return; }
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const clear = () => { setItems([]); setMerchantId(null); setMerchantName(""); };
  const total = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return <Ctx.Provider value={{ items, merchantId, merchantName, addItem, removeItem, updateQty, clear, total, count }}>{children}</Ctx.Provider>;
}

export const useCart = () => useContext(Ctx);
