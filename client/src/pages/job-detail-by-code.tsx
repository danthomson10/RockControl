import { useParams } from "wouter";
import { JobDetailTabs } from "@/components/job-detail-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Job } from "@shared/schema";
import { Link } from "wouter";

export default function JobDetailByCode() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ["/api/jobs/code", code],
    queryFn: () => fetch(`/api/jobs/code/${code}`).then(r => r.json()),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Job not found</h2>
        <p className="text-muted-foreground mb-4">Job with code {code} does not exist.</p>
        <Link href="/">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-muted-foreground">{job.code}</span>
            <Badge variant={job.status === 'active' ? "success" : "secondary"}>
              {job.status}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{job.name}</h1>
          <p className="text-muted-foreground mt-1">{job.siteLocation}</p>
        </div>
        <Button variant="ghost" size="icon" data-testid="button-more-options">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      <JobDetailTabs jobId={job.id} />
    </div>
  );
}