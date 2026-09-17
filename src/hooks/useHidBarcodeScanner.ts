'use client';

import { useEffect, useRef } from 'react';

// External USB/Bluetooth barcode scanners present themselves to the OS/browser
// as a keyboard (HID keyboard-wedge), not a camera - they will never show up
// in navigator.mediaDevices.enumerateDevices() as a videoinput. There is no
// device-level "is this a barcode scanner" API, so the only reliable signal
// is *behavioral*: a scanner fires a full barcode's worth of keydown events
// far faster and more uniformly than a human can type, then sends Enter (or,
// for some scanner configurations, Tab) as a terminator. This buffers keydown
// events globally, drops the buffer the moment a gap is slow enough to be
// human typing, and only resolves a barcode for a burst that both arrived
// fast and ended in a terminator.
export const MAX_INTER_KEY_MS = 50;
export const MIN_BARCODE_LENGTH = 3;
const NON_RESETTING_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph']);
const TERMINATOR_KEYS = new Set(['Enter', 'Tab']);

export interface ScanBufferState {
  buffer: string;
  lastKeyTime: number;
}

export function createInitialScanBufferState(): ScanBufferState {
  return { buffer: '', lastKeyTime: 0 };
}

export interface ScanKeystrokeResult {
  next: ScanBufferState;
  /** A resolved barcode, if this keystroke completed one; otherwise null. */
  scanned: string | null;
  /** Whether the caller should preventDefault() this keystroke's native effect. */
  preventDefault: boolean;
}

// Pure state machine, deliberately kept free of DOM/React so it can be
// unit-tested without a browser: given the current buffer and one incoming
// key + timestamp, returns the next buffer state and, if this keystroke
// completed a valid scan, the resolved barcode.
export function processScanKeystroke(state: ScanBufferState, key: string, now: number): ScanKeystrokeResult {
  if (NON_RESETTING_KEYS.has(key)) {
    return { next: state, scanned: null, preventDefault: false };
  }

  const gap = now - state.lastKeyTime;
  const startingFresh = state.buffer.length === 0;
  let buffer = state.buffer;
  if (!startingFresh && gap > MAX_INTER_KEY_MS) {
    // Too slow to be a hardware scan - whatever was buffered wasn't a scan
    // (stray keystrokes with nothing focused). Start over from this
    // keystroke rather than merging unrelated input together.
    buffer = '';
  }

  if (TERMINATOR_KEYS.has(key)) {
    const code = buffer.trim();
    const isScan = code.length >= MIN_BARCODE_LENGTH;
    return {
      next: { buffer: '', lastKeyTime: now },
      scanned: isScan ? code : null,
      // Enter/Tab on a focused button or checkbox would otherwise
      // activate/toggle it - if this completed a scan, that keystroke
      // belongs to the scan, not to whatever the page happened to focus.
      preventDefault: isScan,
    };
  }

  if (key.length === 1) {
    return {
      next: { buffer: buffer + key, lastKeyTime: now },
      scanned: null,
      // Space would otherwise activate a focused button/checkbox.
      preventDefault: key === ' ',
    };
  }

  // A non-printable, non-terminator key (Escape, an arrow key, ...) breaks
  // the "fast uniform burst" pattern - safer to drop the buffer than risk
  // merging two unrelated sequences into one code.
  return { next: { buffer: '', lastKeyTime: now }, scanned: null, preventDefault: false };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function useHidBarcodeScanner(onScan: (barcode: string) => void, enabled: boolean = true) {
  const stateRef = useRef<ScanBufferState>(createInitialScanBufferState());
  // Keep the latest callback without re-subscribing the listener on every
  // render (callers commonly pass an inline function).
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // A hardware scanner types into whatever currently has focus, same as
      // a keyboard would. If that's a real text field, let the browser
      // handle it natively (the manual-entry input, product search, etc.)
      // instead of also routing it through the scan buffer.
      if (isEditableTarget(e.target)) {
        stateRef.current = createInitialScanBufferState();
        return;
      }

      const result = processScanKeystroke(stateRef.current, e.key, Date.now());
      stateRef.current = result.next;
      if (result.preventDefault) e.preventDefault();
      if (result.scanned) onScanRef.current(result.scanned);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      stateRef.current = createInitialScanBufferState();
    };
  }, [enabled]);
}
