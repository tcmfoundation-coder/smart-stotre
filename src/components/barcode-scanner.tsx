'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, AlertCircle, VideoOff, ShieldAlert, CameraOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  onScanFailure?: (error: string) => void;
  onClose?: () => void;
  className?: string;
}

// Distinct states so the UI can tell a denied permission apart from "no
// camera exists" apart from "this browser can't do this at all" - each
// needs its own message and, for denied/unavailable/unsupported, a nudge
// toward the external-scanner/manual-entry fallback instead of a dead end.
type CameraStatus = 'unsupported' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'in-use' | 'error';

interface CameraFailure {
  status: 'denied' | 'unavailable' | 'in-use' | 'unsupported' | 'error';
  message: string;
}

const INSECURE_CONTEXT_MESSAGE =
  'Camera scanning requires a secure connection (HTTPS). Use an external barcode scanner or manual barcode entry instead.';

function isCameraApiSupported(): { supported: boolean; reason?: string } {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { supported: false, reason: 'This browser does not support camera-based scanning.' };
  }
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return { supported: false, reason: INSECURE_CONTEXT_MESSAGE };
  }
  return { supported: true };
}

// html5-qrcode's getCameras()/start() reject with the raw DOMException from
// getUserMedia() when navigator.mediaDevices exists (see
// node_modules/html5-qrcode/esm/camera/retriever.js), or with a plain
// string for the "no mediaDevices at all" / insecure-context cases - handle
// both shapes rather than collapsing every rejection into "permission denied".
function mapCameraError(err: unknown): CameraFailure {
  const name = err instanceof DOMException ? err.name : undefined;
  const rawMessage = typeof err === 'string' ? err : err instanceof Error ? err.message : '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return {
      status: 'denied',
      message:
        'Camera access is blocked. Allow camera permission in your browser/device settings, or use an external barcode scanner/manual barcode entry.',
    };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return { status: 'unavailable', message: 'No compatible camera was found on this device.' };
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      status: 'in-use',
      message: 'The camera appears to be in use by another application. Close it and try again.',
    };
  }
  if (/insecure/i.test(rawMessage)) {
    return { status: 'unsupported', message: INSECURE_CONTEXT_MESSAGE };
  }
  if (/permission/i.test(rawMessage)) {
    return {
      status: 'denied',
      message:
        'Camera access is blocked. Allow camera permission in your browser/device settings, or use an external barcode scanner/manual barcode entry.',
    };
  }
  return {
    status: 'error',
    message: rawMessage || 'Could not start the camera. Use an external barcode scanner or manual entry instead.',
  };
}

export default function BarcodeScanner({
  onScanSuccess,
  onScanFailure,
  onClose,
  className,
}: BarcodeScannerProps) {
  const [cameras, setCameras] = useState<any[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<CameraStatus>('requesting');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const qrCodeRef = useRef<any>(null);
  const scannerElementRef = useRef<HTMLDivElement>(null);
  const elementId = useRef(`scanner-video-feed-${Math.random().toString(36).slice(2, 10)}`).current;

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!isMounted || !scannerElementRef.current) return;

    // Ensure the DOM element is fully rendered before marking as ready
    const checkElementReady = () => {
      if (scannerElementRef.current && scannerElementRef.current.clientWidth > 0) {
        setIsReady(true);
      } else {
        // Retry after a short delay if element isn't ready
        setTimeout(checkElementReady, 100);
      }
    };

    checkElementReady();
  }, [isMounted]);

  useEffect(() => {
    if (!isReady) return;

    let html5Qrcode: any;
    let cancelled = false;

    function loadAndStartScanner() {
      // Load html5-qrcode dynamically to support SSR environments
      import('html5-qrcode')
        .then((module) => {
          if (cancelled) return;
          const element = scannerElementRef.current ?? document.getElementById(elementId);
          if (!element || !(element instanceof HTMLElement) || element.clientWidth === 0 || element.clientHeight === 0) {
            console.error('Scanner element is missing or not ready in the DOM');
            setStatus('error');
            setPermissionError('Scanner element not ready. Please refresh the page.');
            return;
          }

          html5Qrcode = new module.Html5Qrcode(elementId);
          qrCodeRef.current = html5Qrcode;

          module.Html5Qrcode.getCameras()
            .then((devices) => {
              if (cancelled) return;
              if (devices && devices.length > 0) {
                setCameras(devices);
                setStatus('granted');
                // Default to back camera if available (useful for scanning)
                const backCamera = devices.find(
                  (device) =>
                    device.label.toLowerCase().includes('back') ||
                    device.label.toLowerCase().includes('rear') ||
                    device.label.toLowerCase().includes('environment')
                );
                const defaultCameraId = backCamera ? backCamera.id : devices[0].id;
                setActiveCameraId(defaultCameraId);

                // Use setTimeout to ensure the DOM is fully ready
                setTimeout(() => {
                  if (!cancelled) startScanner(html5Qrcode, defaultCameraId);
                }, 100);
              } else {
                setStatus('unavailable');
                setPermissionError('No compatible camera was found on this device.');
              }
            })
            .catch((err) => {
              if (cancelled) return;
              console.error('Error listing cameras:', err);
              const failure = mapCameraError(err);
              setStatus(failure.status);
              setPermissionError(failure.message);
              if (onScanFailure) onScanFailure(failure.message);
            });
        })
        .catch((err) => {
          if (cancelled) return;
          console.error('Error importing html5-qrcode:', err);
          setStatus('error');
          setPermissionError('Failed to load the scanning library.');
        });
    }

    // Check support *before* ever touching getUserMedia - an unsupported
    // browser or insecure context should show its own message rather than
    // attempting a request that can only fail, and possibly loop. Deferred
    // a tick (matching the async import path) rather than calling setState
    // synchronously at the top of the effect body.
    Promise.resolve().then(() => {
      if (cancelled) return;
      const support = isCameraApiSupported();
      if (!support.supported) {
        setStatus('unsupported');
        setPermissionError(support.reason ?? 'Camera scanning is not supported in this browser.');
        if (onScanFailure) onScanFailure(support.reason ?? 'Camera API unsupported');
        return;
      }
      setStatus('requesting');
      setPermissionError(null);
      loadAndStartScanner();
    });

    return () => {
      cancelled = true;
      // Clean up scanning session on component unmount
      if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode
          .stop()
          .catch((err: any) => console.error('Error stopping scanner on unmount:', err));
      }
    };
  }, [isReady]);

  const startScanner = (scanner: any, cameraId: string) => {
    const element = scannerElementRef.current ?? document.getElementById(elementId);
    if (!scanner || !element || !(element instanceof HTMLElement)) {
      setPermissionError('Scanner element is not available yet. Please try again.');
      return;
    }

    if (element.clientWidth === 0 || element.clientHeight === 0) {
      window.setTimeout(() => startScanner(scanner, cameraId), 150);
      return;
    }

    setIsScanning(true);
    setPermissionError(null);

    scanner
      .start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 280, height: 160 }, // Ideal dimensions for standard 1D barcodes
          aspectRatio: 1.777778, // Widescreen 16:9
        },
        (decodedText: string) => {
          // Provide subtle vibration feedback on mobile devices
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(100);
          }
          onScanSuccess(decodedText);
        },
        (errorMessage: string) => {
          // Silent failure callback: logs on every frame where no barcode is resolved
        }
      )
      .catch((err: any) => {
        console.error('Error starting camera stream:', err);
        setIsScanning(false);
        const failure = mapCameraError(err);
        setStatus(failure.status);
        setPermissionError(failure.message);
        if (onScanFailure) onScanFailure(failure.message);
      });
  };

  const handleCameraSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetCameraId = e.target.value;
    const scanner = qrCodeRef.current;
    if (!scanner) return;

    if (scanner.isScanning) {
      scanner
        .stop()
        .then(() => {
          setActiveCameraId(targetCameraId);
          startScanner(scanner, targetCameraId);
        })
        .catch((err: any) => {
          console.error('Error stopping scanner during switch:', err);
        });
    } else {
      setActiveCameraId(targetCameraId);
      startScanner(scanner, targetCameraId);
    }
  };

  return (
    <div
      className={cn(
        'relative bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col',
        className
      )}
    >
      {/* Top Header Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center bg-black/40 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/5">
        <div className="flex items-center space-x-2 text-white">
          <Camera className={cn('h-4 w-4', isScanning && 'animate-pulse text-blue-500')} />
          <span className="text-xs font-black uppercase tracking-wider">
            {isScanning ? 'Sensor Live' : 'Sensor Off'}
          </span>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Video Scanning Element Container */}
      <div className="relative flex-1 w-full bg-slate-950 flex items-center justify-center min-h-[280px]">
        <div 
          ref={scannerElementRef}
          id={elementId} 
          className="w-full h-full object-cover"
        ></div>

        {/* Overlay Scanner Aim Box (custom UI layer) */}
        {isScanning && !permissionError && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
            <div className="w-[280px] h-[160px] border-2 border-dashed border-blue-500 rounded-2xl flex items-center justify-center bg-black/10">
              {/* Animated laser line */}
              <div className="w-full h-0.5 bg-blue-500/80 animate-bounce shadow-[0_0_8px_#3b82f6]"></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 bg-black/50 px-4 py-1.5 rounded-full mt-4 backdrop-blur-sm border border-white/5">
              Align Barcode inside Box
            </span>
          </div>
        )}

        {/* Requesting permission - shown from mount until the browser prompt resolves */}
        {status === 'requesting' && !permissionError && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-8 text-center space-y-4 z-10">
            <div className="p-4 bg-blue-500/10 rounded-full border border-blue-500/20 text-blue-400 animate-pulse">
              <Camera className="h-10 w-10" />
            </div>
            <h4 className="font-black text-white uppercase tracking-tight">Allow Camera Access</h4>
            <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
              Allow camera access to scan barcodes. Your browser will ask for permission.
            </p>
          </div>
        )}

        {/* Permission / Error Screen */}
        {permissionError && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-8 text-center space-y-4 z-10">
            <div className="p-4 bg-rose-500/10 rounded-full border border-rose-500/20 text-rose-500">
              {status === 'denied' ? (
                <ShieldAlert className="h-10 w-10" />
              ) : status === 'unavailable' ? (
                <CameraOff className="h-10 w-10" />
              ) : (
                <VideoOff className="h-10 w-10" />
              )}
            </div>
            <h4 className="font-black text-white uppercase tracking-tight">
              {status === 'denied'
                ? 'Camera Access Blocked'
                : status === 'unavailable'
                  ? 'No Camera Found'
                  : status === 'in-use'
                    ? 'Camera In Use'
                    : status === 'unsupported'
                      ? 'Camera Not Supported'
                      : 'Camera Error'}
            </h4>
            <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
              {permissionError}
            </p>
          </div>
        )}
      </div>

      {/* Footer Settings Controls */}
      {cameras.length > 1 && !permissionError && (
        <div className="p-4 bg-slate-900 border-t border-slate-800/80 z-20">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-4 w-4 text-slate-400" />
            <select
              value={activeCameraId || ''}
              onChange={handleCameraSwitch}
              className="flex-1 bg-slate-800 border-none rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none cursor-pointer focus:ring-2 focus:ring-blue-600/20"
            >
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.label || `Camera ${camera.id.substring(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
