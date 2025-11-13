import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Mic } from "lucide-react";
import { useState } from "react";

export function FormBuilder() {
  const [riskLevel, setRiskLevel] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const handleVoiceCapture = () => {
    setIsRecording(!isRecording);
    console.log(isRecording ? "Stopping voice capture" : "Starting voice capture");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>Take-5 Safety Form</CardTitle>
            <CardDescription>Complete before starting work</CardDescription>
          </div>
          <Button 
            variant={isRecording ? "destructive" : "secondary"} 
            size="sm" 
            className="gap-2"
            onClick={handleVoiceCapture}
            data-testid="button-voice-capture"
          >
            <Mic className="h-4 w-4" />
            {isRecording ? "Stop Recording" : "Voice Capture"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="job-code">Job Code</Label>
            <Input 
              id="job-code" 
              value="WEL-TUN-001" 
              readOnly 
              className="bg-muted"
              data-testid="input-job-code"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site">Site</Label>
            <Input 
              id="site" 
              value="Mt Victoria, Wellington" 
              readOnly 
              className="bg-muted"
              data-testid="input-site"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="task-description">Task Description</Label>
          <Textarea
            id="task-description"
            placeholder="Describe the task you're about to perform..."
            rows={3}
            data-testid="input-task-description"
          />
        </div>

        <div className="space-y-3">
          <Label>Risk Level</Label>
          <RadioGroup value={riskLevel} onValueChange={setRiskLevel}>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover-elevate">
              <RadioGroupItem value="low" id="risk-low" data-testid="radio-risk-low" />
              <Label htmlFor="risk-low" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Badge variant="success" className="text-xs">Low</Badge>
                  <span className="text-sm">Minimal hazards identified</span>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover-elevate">
              <RadioGroupItem value="medium" id="risk-medium" data-testid="radio-risk-medium" />
              <Label htmlFor="risk-medium" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Badge variant="warning" className="text-xs">Medium</Badge>
                  <span className="text-sm">Some hazards, controls in place</span>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover-elevate">
              <RadioGroupItem value="high" id="risk-high" data-testid="radio-risk-high" />
              <Label htmlFor="risk-high" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">High</Badge>
                  <span className="text-sm">Significant hazards, additional controls required</span>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="control-measures">Control Measures</Label>
          <Textarea
            id="control-measures"
            placeholder="List the safety controls you'll implement..."
            rows={3}
            data-testid="input-control-measures"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ppe-required">PPE Required</Label>
          <Select>
            <SelectTrigger id="ppe-required" data-testid="select-ppe">
              <SelectValue placeholder="Select required PPE" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard" data-testid="ppe-standard">Standard (Hard hat, vest, boots)</SelectItem>
              <SelectItem value="respiratory" data-testid="ppe-respiratory">+ Respiratory protection</SelectItem>
              <SelectItem value="fall-arrest" data-testid="ppe-fall-arrest">+ Fall arrest equipment</SelectItem>
              <SelectItem value="full" data-testid="ppe-full">Full protective gear</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {riskLevel === "high" && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium">High Risk Task - Additional Approval Required</p>
                <p className="text-sm text-muted-foreground">
                  This form will be sent to your supervisor and HSE manager for approval before work can commence.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button variant="outline" className="flex-1" data-testid="button-save-draft">
            Save Draft
          </Button>
          <Button className="flex-1 gap-2" data-testid="button-submit-form">
            <CheckCircle2 className="h-4 w-4" />
            Submit Form
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}