import { JobDetailTabs } from "@/components/job-detail-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MoreVertical } from "lucide-react";

export default function JobDetail() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-muted-foreground">WEL-TUN-001</span>
            <Badge variant="success">Active</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Wellington Tunnel Project</h1>
          <p className="text-muted-foreground mt-1">Mt Victoria, Wellington</p>
        </div>
        <Button variant="ghost" size="icon" data-testid="button-more-options">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      <JobDetailTabs />
    </div>
  );
}