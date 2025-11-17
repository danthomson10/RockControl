import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Filter, Phone, Laptop, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Form } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";

const statusColors: Record<string, "warning" | "success" | "secondary" | "destructive"> = {
  pending: "warning",
  approved: "success",
  submitted: "success",
  completed: "secondary",
  draft: "secondary",
  rejected: "destructive",
};

// Known form types from schema enum
const KNOWN_FORM_TYPES = ['take-5', 'variation', 'crew-briefing', 'risk-control-plan', 'incident-report'] as const;

const formTypeLabels: Record<string, string> = {
  "take-5": "Take-5",
  "variation": "Variation",
  "crew-briefing": "Crew Briefing",
  "risk-control-plan": "Risk Control",
  "incident-report": "Incident Report",
  "permit-to-work": "Permit to Work",
};

// Known statuses from schema enum
const KNOWN_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'completed'] as const;

export default function Submissions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const { data: forms, isLoading } = useQuery<Form[]>({
    queryKey: ["/api/forms"],
  });

  const formsList = Array.isArray(forms) ? forms : [];

  // Filter forms
  const filteredForms = formsList.filter((form) => {
    const matchesSearch = 
      form.formCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formTypeLabels[form.type]?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || form.status === statusFilter;
    const matchesType = typeFilter === "all" || form.type === typeFilter;
    
    // Check source field from database (defaults to 'web', set to 'voice' for voice submissions)
    const isVoiceSubmission = form.source === 'voice';
    const matchesSource = 
      sourceFilter === "all" || 
      (sourceFilter === "voice" && isVoiceSubmission) ||
      (sourceFilter === "web" && !isVoiceSubmission);
    
    return matchesSearch && matchesStatus && matchesType && matchesSource;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="heading-submissions">
          Form Submissions
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          View and manage all submitted forms including voice reports
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Form code or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-forms"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {KNOWN_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Form Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="select-type-filter">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {KNOWN_FORM_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {formTypeLabels[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Source</label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger data-testid="select-source-filter">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="voice">Voice Calls</SelectItem>
                  <SelectItem value="web">Web Forms</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(searchTerm || statusFilter !== "all" || typeFilter !== "all" || sourceFilter !== "all") && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredForms.length} of {formsList.length} forms
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setTypeFilter("all");
                    setSourceFilter("all");
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Forms List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredForms.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No forms found</h3>
              <p className="text-muted-foreground text-sm">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all" || sourceFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No forms have been submitted yet"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredForms.map((form) => {
            const isVoiceSubmission = form.source === 'voice';
            
            return (
              <Card key={form.id} className="hover-elevate cursor-pointer" data-testid={`form-card-${form.formCode}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-lg ${isVoiceSubmission ? 'bg-primary/10' : 'bg-muted'}`}>
                      {isVoiceSubmission ? (
                        <Phone className="h-5 w-5 text-primary" />
                      ) : (
                        <Laptop className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold" data-testid={`form-code-${form.formCode}`}>
                              {form.formCode}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {formTypeLabels[form.type] || form.type}
                            </Badge>
                            {isVoiceSubmission && (
                              <Badge variant="default" className="text-xs gap-1">
                                <Phone className="h-3 w-3" />
                                Voice
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                            <span>
                              Submitted {formatDistanceToNow(new Date(form.createdAt), { addSuffix: true })}
                            </span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">
                              {format(new Date(form.createdAt), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          
                          {/* Preview of form data */}
                          {form.formData && typeof form.formData === 'object' && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              {Object.entries(form.formData as Record<string, unknown>).slice(0, 2).map(([key, value]) => (
                                <div key={key} className="truncate">
                                  <span className="font-medium">{key}:</span> {value != null ? String(value) : 'N/A'}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* AI Analysis for incident reports */}
                          {form.type === 'incident-report' && form.aiSummary && (
                            <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                              <div className="flex items-start gap-2">
                                <div className="p-1 rounded bg-primary/10">
                                  <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-foreground mb-1">AI Analysis</h4>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {form.aiSummary}
                                  </p>
                                  {form.aiRecommendations && typeof form.aiRecommendations === 'object' && 'riskLevel' in form.aiRecommendations && (
                                    <div className="mt-2">
                                      <Badge 
                                        variant={
                                          form.aiRecommendations.riskLevel === 'critical' ? 'destructive' :
                                          form.aiRecommendations.riskLevel === 'high' ? 'destructive' :
                                          form.aiRecommendations.riskLevel === 'medium' ? 'default' :
                                          'secondary'
                                        }
                                        className="text-xs"
                                      >
                                        {form.aiRecommendations.riskLevel} risk
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={statusColors[form.status] as any}
                            data-testid={`form-status-${form.formCode}`}
                          >
                            {form.status}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
