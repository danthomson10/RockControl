import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RotateCcw, Check } from "lucide-react";
import { useState } from "react";

export function SignaturePad() {
  const [isSigned, setIsSigned] = useState(false);

  const handleClear = () => {
    setIsSigned(false);
    console.log("Signature cleared");
  };

  const handleSign = () => {
    setIsSigned(true);
    console.log("Signature captured");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Digital Signature</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signer-name">Name</Label>
          <Input 
            id="signer-name" 
            placeholder="Enter your full name"
            data-testid="input-signer-name"
          />
        </div>

        <div className="space-y-2">
          <Label>Signature</Label>
          <div 
            className={`border-2 border-dashed rounded-lg h-48 flex items-center justify-center ${
              isSigned ? "bg-muted border-success" : "bg-background hover-elevate"
            }`}
            onClick={handleSign}
            data-testid="signature-canvas"
          >
            {isSigned ? (
              <div className="text-center">
                <Check className="h-8 w-8 text-success mx-auto mb-2" />
                <p className="text-sm font-medium">Signature Captured</p>
                <p className="text-xs text-muted-foreground mt-1">Click to sign again</p>
              </div>
            ) : (
              <div className="text-center px-4">
                <p className="text-sm text-muted-foreground">Click to sign</p>
                <p className="text-xs text-muted-foreground mt-1">Or use stylus/finger on touch device</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 gap-2"
            onClick={handleClear}
            disabled={!isSigned}
            data-testid="button-clear-signature"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </Button>
          <Button 
            className="flex-1"
            disabled={!isSigned}
            data-testid="button-save-signature"
          >
            Save Signature
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}