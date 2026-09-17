'use client';

import { useCallback, useEffect, useState } from 'react';

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  total: number;
}

interface CartProduct {
  _id: string;
  name: string;
  sku: string;
  sellingPrice: number;
}

const CART_KEY = 'smartmart-cart';

// Shared by the POS page and the standalone barcode-scanner page, which both
// add to the same localStorage-backed cart - previously each had its own
// copy of this read-modify-write/dedupe logic.
export function useLocalCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // localStorage is only available client-side; reading it in a lazy
    // useState initializer instead would make the client's first render
    // disagree with the server-rendered ([]) output and trigger a
    // hydration mismatch. Deferring to an effect is the correct fix here,
    // not the general case react-hooks/set-state-in-effect warns about.
    try {
      const saved = localStorage.getItem(CART_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setCart(JSON.parse(saved));
    } catch (e) {
      console.error('Error reading cart from localStorage:', e);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    // Skip the write until the initial load above has run, otherwise this
    // effect's first pass (cart still at its [] initial state) overwrites
    // whatever was already saved a moment before it gets loaded back in.
    if (!hydrated) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Error saving cart to localStorage:', e);
    }
  }, [cart, hydrated]);

  const addToCart = useCallback((product: CartProduct): 'added' | 'incremented' => {
    let outcome: 'added' | 'incremented' = 'added';
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product._id);
      if (existing) {
        outcome = 'incremented';
        return prev.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          sku: product.sku,
          price: product.sellingPrice,
          quantity: 1,
          total: product.sellingPrice,
        },
      ];
    });
    return outcome;
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty, total: newQty * item.price };
        }
        return item;
      })
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    try {
      localStorage.removeItem(CART_KEY);
    } catch (e) {
      console.error('Error clearing cart from localStorage:', e);
    }
  }, []);

  return { cart, addToCart, updateQuantity, removeFromCart, clearCart };
}
