import {
  createInitialScanBufferState,
  processScanKeystroke,
  MAX_INTER_KEY_MS,
  MIN_BARCODE_LENGTH,
  type ScanBufferState,
} from '@/hooks/useHidBarcodeScanner';

// Feeds a sequence of keys through the state machine at a given inter-key
// gap (ms), starting from a fresh buffer, and returns every resolved scan.
function typeKeys(keys: string[], gapMs: number, startTime = 1_000_000): string[] {
  let state: ScanBufferState = createInitialScanBufferState();
  let time = startTime;
  const scans: string[] = [];
  for (const key of keys) {
    const result = processScanKeystroke(state, key, time);
    state = result.next;
    if (result.scanned) scans.push(result.scanned);
    time += gapMs;
  }
  return scans;
}

function barcodeKeys(code: string, terminator: 'Enter' | 'Tab' = 'Enter'): string[] {
  return [...code.split(''), terminator];
}

describe('useHidBarcodeScanner keystroke state machine', () => {
  it('resolves a fast burst ending in Enter as a scan', () => {
    const scans = typeKeys(barcodeKeys('5012345678900'), 5);
    expect(scans).toEqual(['5012345678900']);
  });

  it('resolves a fast burst ending in Tab as a scan (scanner-configurable terminator)', () => {
    const scans = typeKeys(barcodeKeys('123456789012', 'Tab'), 5);
    expect(scans).toEqual(['123456789012']);
  });

  it('does NOT resolve keys typed at human speed, even ending in Enter', () => {
    // Well above MAX_INTER_KEY_MS between every keystroke.
    const scans = typeKeys(barcodeKeys('123456'), MAX_INTER_KEY_MS + 100);
    expect(scans).toEqual([]);
  });

  it('does not resolve a lone Enter with nothing buffered', () => {
    const scans = typeKeys(['Enter'], 5);
    expect(scans).toEqual([]);
  });

  it('does not resolve a burst shorter than the minimum barcode length', () => {
    const shortCode = 'a'.repeat(MIN_BARCODE_LENGTH - 1);
    const scans = typeKeys(barcodeKeys(shortCode), 5);
    expect(scans).toEqual([]);
  });

  it('handles repeated scans correctly: A, A, B, A each resolve independently', () => {
    const scans = [
      ...typeKeys(barcodeKeys('AAA111'), 5),
      ...typeKeys(barcodeKeys('AAA111'), 5),
      ...typeKeys(barcodeKeys('BBB222'), 5),
      ...typeKeys(barcodeKeys('AAA111'), 5),
    ];
    expect(scans).toEqual(['AAA111', 'AAA111', 'BBB222', 'AAA111']);
  });

  it('drops a slow-typed prefix and still catches a fast burst that follows', () => {
    let state: ScanBufferState = createInitialScanBufferState();
    let time = 1_000_000;

    // Slow human keystrokes first (each gap far exceeds the threshold).
    for (const key of ['x', 'y', 'z']) {
      const result = processScanKeystroke(state, key, time);
      state = result.next;
      time += MAX_INTER_KEY_MS + 200;
    }

    // Then a fast, uninterrupted scanner burst.
    const fastKeys = barcodeKeys('999888777');
    const scans: string[] = [];
    for (const key of fastKeys) {
      const result = processScanKeystroke(state, key, time);
      state = result.next;
      if (result.scanned) scans.push(result.scanned);
      time += 5;
    }

    // The slow "xyz" prefix must not have survived into the resolved code.
    expect(scans).toEqual(['999888777']);
  });

  it('ignores modifier keys without breaking an in-progress fast burst', () => {
    let state: ScanBufferState = createInitialScanBufferState();
    let time = 1_000_000;
    const scans: string[] = [];
    const keys = ['5', '0', 'Shift', '1', '2', 'Enter'];
    for (const key of keys) {
      const result = processScanKeystroke(state, key, time);
      state = result.next;
      if (result.scanned) scans.push(result.scanned);
      time += 5;
    }
    expect(scans).toEqual(['5012']);
  });

  it('resets the buffer on a non-printable, non-terminator key (e.g. Escape)', () => {
    let state: ScanBufferState = createInitialScanBufferState();
    let time = 1_000_000;
    for (const key of ['1', '2', '3']) {
      state = processScanKeystroke(state, key, time).next;
      time += 5;
    }
    state = processScanKeystroke(state, 'Escape', time).next;
    time += 5;
    const result = processScanKeystroke(state, 'Enter', time);
    expect(result.scanned).toBeNull();
  });

  it('flags preventDefault for Enter/Tab only when a real scan resolved, and for Space mid-buffer', () => {
    let state: ScanBufferState = createInitialScanBufferState();
    const spaceResult = processScanKeystroke(state, ' ', 1000);
    expect(spaceResult.preventDefault).toBe(true);

    const bareEnter = processScanKeystroke(createInitialScanBufferState(), 'Enter', 1000);
    expect(bareEnter.preventDefault).toBe(false);

    state = createInitialScanBufferState();
    let time = 1000;
    for (const key of ['1', '2', '3']) {
      state = processScanKeystroke(state, key, time).next;
      time += 5;
    }
    const realScan = processScanKeystroke(state, 'Enter', time);
    expect(realScan.preventDefault).toBe(true);
  });
});
