import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { X, Camera } from "lucide-react";
import { Button } from "./ui/button";

interface CameraScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

export function CameraScanner({ onScan, onClose }: CameraScannerProps) {
    const [error, setError] = useState<string>("");
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Basic configuration
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            supportedScanTypes: [] // Use defaults
        };

        const onScanSuccess = (decodedText: string, decodedResult: any) => {
            // Handle the scanned code
            console.log(`Scan result: ${decodedText}`);
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
            }
            onScan(decodedText);
            onClose();
        };

        const onScanFailure = (errorMessage: string) => {
            // Too noisy to log or set state on every frame, 
            // html5-qrcode throws errors constantly while trying to find a barcode.
        };

        try {
            const scanner = new Html5QrcodeScanner(
                "reader",
                config,
          /* verbose= */ false
            );
            scannerRef.current = scanner;
            scanner.render(onScanSuccess, onScanFailure);
        } catch (err: any) {
            setError("Failed to initialize camera. Please ensure you have granted camera permissions.");
            console.error(err);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current
                    .clear()
                    .catch((error) => console.error("Failed to clear html5QrcodeScanner. ", error));
            }
        };
    }, [onScan, onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Camera className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Scan Barcode</h3>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            if (scannerRef.current) {
                                scannerRef.current.clear().catch(console.error);
                                scannerRef.current = null;
                            }
                            onClose();
                        }}
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full h-8 w-8"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="p-4 bg-gray-50">
                    {error ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg bg-black/5 shadow-inner" id="reader" />
                    )}
                    <p className="text-center text-sm text-gray-500 mt-4">
                        Position the barcode within the frame to scan.
                    </p>
                </div>
            </div>
        </div>
    );
}
