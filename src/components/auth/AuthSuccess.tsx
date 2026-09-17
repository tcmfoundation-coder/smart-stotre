'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface AuthSuccessProps {
  /** Already-resolved display name - never pass a session/user object here. */
  name: string;
  message: string;
  /** Called once the transition is ready to hand off to the real destination. */
  onDone: () => void;
}

// Purely decorative - a handful of small dots, not a particle engine. Fixed
// positions keep this a plain CSS/SVG-level animation (no canvas, no new
// dependency) matching what framer-motion (already used elsewhere in this
// app - see page-transition.tsx) already provides.
const SPARKLES = [
  { x: -46, y: -38, delay: 0.05, size: 6 },
  { x: 42, y: -30, delay: 0.15, size: 5 },
  { x: -52, y: 20, delay: 0.25, size: 4 },
  { x: 50, y: 28, delay: 0.1, size: 6 },
  { x: 0, y: -54, delay: 0.2, size: 4 },
];

// This component does not itself decide whether authentication succeeded -
// it only renders the result. The caller (the login page) is responsible
// for only mounting it after the session mechanism has genuinely confirmed
// a session exists (see resolveAuthenticatedUser in app/login/page.tsx).
export function AuthSuccess({ name, message, onDone }: AuthSuccessProps) {
  const shouldReduceMotion = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    // Reduced motion: same information, much shorter hold - no elaborate
    // keyframes, but redirect still happens normally, not instantly.
    const holdMs = shouldReduceMotion ? 900 : 1900;
    const exitMs = shouldReduceMotion ? 150 : 280;

    const holdTimer = setTimeout(() => setExiting(true), holdMs);
    const doneTimer = setTimeout(() => onDoneRef.current(), holdMs + exitMs);
    // If the caller's onDone (a router.push) didn't actually navigate away
    // for some reason, don't leave the user staring at this screen forever.
    const fallbackTimer = setTimeout(() => setShowFallback(true), holdMs + exitMs + 2500);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(doneTimer);
      clearTimeout(fallbackTimer);
    };
  }, [shouldReduceMotion]);

  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <motion.div
        initial={false}
        animate={exiting ? { opacity: 0, scale: 0.97 } : { opacity: 1, scale: 1 }}
        transition={{ duration: shouldReduceMotion ? 0.15 : 0.28, ease: 'easeInOut' }}
        className="flex flex-col items-center px-6 text-center"
      >
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
          {!shouldReduceMotion &&
            SPARKLES.map((s, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full bg-primary/60"
                style={{ width: s.size, height: s.size }}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.6], x: s.x, y: s.y }}
                transition={{ duration: 1.1, delay: 0.35 + s.delay, ease: 'easeOut' }}
              />
            ))}

          <motion.div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10"
            initial={{ scale: shouldReduceMotion ? 1 : 0.6, opacity: shouldReduceMotion ? 1 : 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: shouldReduceMotion ? 0.15 : 0.4, ease: 'easeOut' }}
          >
            <svg viewBox="0 0 24 24" className="h-9 w-9 text-success" fill="none" aria-hidden="true">
              <motion.path
                d="M5 12.5l4.5 4.5L19 7"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: shouldReduceMotion ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.45, delay: shouldReduceMotion ? 0 : 0.15, ease: 'easeOut' }}
              />
            </svg>
          </motion.div>
        </div>

        <motion.h1
          className="text-xl font-semibold text-foreground sm:text-2xl"
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.15 : 0.35, delay: shouldReduceMotion ? 0 : 0.55 }}
        >
          Welcome back, {name}
        </motion.h1>

        <motion.p
          className="mt-2 text-sm text-muted-foreground"
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.15 : 0.35, delay: shouldReduceMotion ? 0 : 0.9 }}
        >
          Authentication successful.
        </motion.p>

        <motion.p
          className="mt-1 max-w-xs text-sm text-muted-foreground"
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.15 : 0.35, delay: shouldReduceMotion ? 0 : 1.1 }}
        >
          {message}
        </motion.p>

        {showFallback && (
          <button
            type="button"
            onClick={() => onDoneRef.current()}
            className="mt-6 rounded text-sm font-medium text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            Authentication successful, but we couldn&apos;t open your dashboard. Continue &rarr;
          </button>
        )}
      </motion.div>
    </div>
  );
}
