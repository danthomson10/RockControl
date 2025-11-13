import { FormBuilder } from "@/components/form-builder";
import { SignaturePad } from "@/components/signature-pad";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export default function Take5Form() {
  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/forms">
          <Button variant="ghost" size="icon" data-testid="button-back-to-forms">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Take-5 Safety Form</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Complete before starting work</p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6">
        <FormBuilder />
        <SignaturePad />
      </div>
    </div>
  );
}
