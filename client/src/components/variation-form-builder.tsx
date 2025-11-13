import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import type { Job } from "@shared/schema";

export function VariationFormBuilder() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [formData, setFormData] = useState({
    variationNumber: "",
    variationTitle: "",
    description: "",
    category: "",
    impactType: "",
    costImpact: "",
    timeImpact: "",
    requestedBy: "",
    reason: "",
  });

  const { data: jobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const jobsList = Array.isArray(jobs) ? jobs : [];
  const selectedJob = jobsList.find(j => j.id.toString() === selectedJobId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!selectedJob) {
        toast({
          title: "Job Required",
          description: "Please select a job before submitting",
          variant: "destructive",
        });
        return;
      }

      const response = await apiRequest("/api/variations", {
        method: "POST",
        body: {
          jobCode: selectedJob.code,
          type: "variation",
          formData: {
            ...formData,
            jobCode: selectedJob.code,
            site: selectedJob.siteLocation,
          },
          sendToTeams: true, // Enable Teams notification
        },
      });

      toast({
        title: "Variation Submitted",
        description: "Your variation has been saved and notification sent to Microsoft Teams",
      });

      // Reset form
      setSelectedJobId("");
      setFormData({
        variationNumber: "",
        variationTitle: "",
        description: "",
        category: "",
        impactType: "",
        costImpact: "",
        timeImpact: "",
        requestedBy: "",
        reason: "",
      });
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit variation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <CardTitle>Variation Request Form</CardTitle>
            <CardDescription>Document project variations and scope changes</CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Upload className="h-3 w-3" />
            Auto-sync to Teams
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="job-select">Select Job *</Label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId} required>
              <SelectTrigger id="job-select" data-testid="select-job">
                <SelectValue placeholder="Choose a job..." />
              </SelectTrigger>
              <SelectContent>
                {jobsList.map((job) => (
                  <SelectItem key={job.id} value={job.id.toString()}>
                    {job.code} - {job.name} ({job.siteLocation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedJob && (
              <p className="text-xs text-muted-foreground">
                Site: {selectedJob.siteLocation}
              </p>
            )}
          </div>

          <Separator />

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="variation-number">Variation Number</Label>
              <Input
                id="variation-number"
                placeholder="VAR-001"
                value={formData.variationNumber}
                onChange={(e) => updateField("variationNumber", e.target.value)}
                required
                data-testid="input-variation-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(val) => updateField("category", val)} required>
                <SelectTrigger id="category" data-testid="select-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scope-change">Scope Change</SelectItem>
                  <SelectItem value="design-change">Design Change</SelectItem>
                  <SelectItem value="site-conditions">Site Conditions</SelectItem>
                  <SelectItem value="material-substitution">Material Substitution</SelectItem>
                  <SelectItem value="client-request">Client Request</SelectItem>
                  <SelectItem value="regulatory">Regulatory Requirement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="variation-title">Variation Title</Label>
            <Input
              id="variation-title"
              placeholder="Brief title of the variation"
              value={formData.variationTitle}
              onChange={(e) => updateField("variationTitle", e.target.value)}
              required
              data-testid="input-variation-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description</Label>
            <Textarea
              id="description"
              placeholder="Provide a comprehensive description of the variation, including what changed and why..."
              rows={5}
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              required
              data-testid="input-description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Variation</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this variation is necessary..."
              rows={3}
              value={formData.reason}
              onChange={(e) => updateField("reason", e.target.value)}
              required
              data-testid="input-reason"
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Impact Assessment</h3>
            
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="impact-type">Impact Type</Label>
                <Select value={formData.impactType} onValueChange={(val) => updateField("impactType", val)} required>
                  <SelectTrigger id="impact-type" data-testid="select-impact-type">
                    <SelectValue placeholder="Select impact type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cost-only">Cost Only</SelectItem>
                    <SelectItem value="time-only">Time Only</SelectItem>
                    <SelectItem value="cost-and-time">Cost and Time</SelectItem>
                    <SelectItem value="no-impact">No Impact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="requested-by">Requested By</Label>
                <Input
                  id="requested-by"
                  placeholder="Name or role"
                  value={formData.requestedBy}
                  onChange={(e) => updateField("requestedBy", e.target.value)}
                  required
                  data-testid="input-requested-by"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cost-impact">Estimated Cost Impact (NZD)</Label>
                <Input
                  id="cost-impact"
                  type="text"
                  placeholder="e.g., $5,000 or +15%"
                  value={formData.costImpact}
                  onChange={(e) => updateField("costImpact", e.target.value)}
                  data-testid="input-cost-impact"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time-impact">Estimated Time Impact</Label>
                <Input
                  id="time-impact"
                  type="text"
                  placeholder="e.g., +2 weeks"
                  value={formData.timeImpact}
                  onChange={(e) => updateField("timeImpact", e.target.value)}
                  data-testid="input-time-impact"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button type="button" variant="outline" disabled={isSubmitting} data-testid="button-save-draft">
              Save as Draft
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="button-submit-variation">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Submit Variation
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
