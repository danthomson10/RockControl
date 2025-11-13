import { FormBuilder } from "@/components/form-builder";
import { SignaturePad } from "@/components/signature-pad";

export default function Forms() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Forms</h1>
        <p className="text-muted-foreground mt-1">Create and manage safety forms</p>
      </div>

      <div className="grid gap-6">
        <FormBuilder />
        <SignaturePad />
      </div>
    </div>
  );
}