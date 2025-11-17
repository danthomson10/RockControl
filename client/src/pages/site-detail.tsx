import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, Building2, User, Calendar, FileText, Image as ImageIcon, ExternalLink } from "lucide-react";
import type { Site, SiteFile } from "@shared/schema";
import { format } from "date-fns";

export default function SiteDetailPage() {
  const { id } = useParams();
  
  const { data: site, isLoading: siteLoading } = useQuery<Site>({
    queryKey: [`/api/sites/${id}`],
  });
  
  const { data: files, isLoading: filesLoading } = useQuery<SiteFile[]>({
    queryKey: [`/api/sites/${id}/files`],
    enabled: !!site,
  });
  
  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      completed: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      archived: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
    };
    return variants[status as keyof typeof variants] || variants.active;
  };
  
  if (siteLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        <Skeleton className="h-10 w-32 mb-6" />
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }
  
  if (!site) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Site Not Found</h2>
          <p className="text-muted-foreground mb-4">The site you're looking for doesn't exist.</p>
          <Link href="/sites">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sites
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  const imageFiles = files?.filter(f => f.fileType === 'image') || [];
  const documentFiles = files?.filter(f => f.fileType === 'document') || [];
  
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
      <div className="mb-6">
        <Link href="/sites">
          <Button variant="ghost" size="sm" data-testid="button-back-to-sites">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sites
          </Button>
        </Link>
      </div>
      
      <div className="space-y-6">
        {/* Site Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CardTitle className="text-3xl" data-testid="text-site-name">
                    {site.name}
                  </CardTitle>
                  <Badge className={getStatusBadge(site.status)} data-testid="badge-site-status">
                    {site.status}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2 text-base">
                  <MapPin className="w-4 h-4" />
                  {site.address}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description */}
            {site.description && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Project Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {site.description}
                </p>
              </div>
            )}
            
            {/* Site Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
              {site.latitude && site.longitude && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Coordinates</div>
                  <div className="text-sm font-mono">
                    {Number(site.latitude).toFixed(4)}, {Number(site.longitude).toFixed(4)}
                  </div>
                </div>
              )}
              
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Created</div>
                <div className="text-sm flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(site.createdAt), 'MMM d, yyyy')}
                </div>
              </div>
              
              {site.sharepointFolderUrl && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">SharePoint</div>
                  <a 
                    href={site.sharepointFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    View Folder
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Images Gallery */}
        {imageFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Images ({imageFiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {imageFiles.map((file) => {
                  const metadata = file.metadata as { description?: string; taken_date?: string } | null;
                  return (
                    <div key={file.id} className="space-y-2" data-testid={`image-${file.id}`}>
                      <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                        <img 
                          src={`/${file.fileUrl}`}
                          alt={file.fileName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold line-clamp-1">{file.fileName}</h4>
                        {metadata?.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {metadata.description}
                          </p>
                        )}
                        {metadata?.taken_date && (
                          <p className="text-xs text-muted-foreground">
                            Taken: {format(new Date(metadata.taken_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Documents */}
        {documentFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents ({documentFiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documentFiles.map((file) => {
                  const metadata = file.metadata as { description?: string; report_type?: string } | null;
                  return (
                    <div 
                      key={file.id} 
                      className="flex items-start gap-3 p-3 rounded-lg border hover-elevate"
                      data-testid={`document-${file.id}`}
                    >
                      <div className="p-2 rounded bg-muted">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold">{file.fileName}</h4>
                        {metadata?.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {metadata.description}
                          </p>
                        )}
                        {metadata?.report_type && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {metadata.report_type.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                      <a 
                        href={`/${file.fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        
        {filesLoading && (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
