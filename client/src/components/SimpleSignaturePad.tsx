import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw, Check, X } from "lucide-react";

interface SimpleSignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

export function SimpleSignaturePad({ onSave, onCancel }: SimpleSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Get device pixel ratio for high-DPI displays
      const dpr = window.devicePixelRatio || 1;
      
      // Get actual display size
      const rect = canvas.getBoundingClientRect();
      
      // Set canvas internal size (accounting for DPI)
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Scale context to account for DPI
      ctx.scale(dpr, dpr);
      
      // Set canvas CSS size to match display size
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Set drawing styles
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };

    // Initial resize
    resizeCanvas();

    // Watch for resize events
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    // Calculate coordinates relative to canvas (accounting for CSS size)
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Digital Signature</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <canvas
          ref={canvasRef}
          className="w-full h-48 border-2 border-dashed rounded-lg cursor-crosshair bg-background"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          data-testid="signature-canvas"
        />
        <div className="flex gap-2">
          <Button
            onClick={clear}
            variant="outline"
            size="sm"
            data-testid="button-clear-signature"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear
          </Button>
          <Button
            onClick={save}
            disabled={!hasSignature}
            size="sm"
            className="flex-1"
            data-testid="button-save-signature"
          >
            <Check className="mr-2 h-4 w-4" />
            Save Signature
          </Button>
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            data-testid="button-cancel-signature"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
