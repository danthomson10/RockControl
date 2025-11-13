import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, MapPin, MessageSquare, Folder, Calendar, Users } from "lucide-react";

export function JobDetailTabs() {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="overview" className="gap-2" data-testid="tab-overview">
          <Calendar className="h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="forms" className="gap-2" data-testid="tab-forms">
          <FileText className="h-4 w-4" />
          Forms
        </TabsTrigger>
        <TabsTrigger value="incidents" className="gap-2" data-testid="tab-incidents">
          <Badge variant="destructive" className="h-4 w-4 p-0 text-xs">3</Badge>
          Incidents
        </TabsTrigger>
        <TabsTrigger value="files" className="gap-2" data-testid="tab-files">
          <Folder className="h-4 w-4" />
          Files
        </TabsTrigger>
        <TabsTrigger value="map" className="gap-2" data-testid="tab-map">
          <MapPin className="h-4 w-4" />
          Map
        </TabsTrigger>
        <TabsTrigger value="conversations" className="gap-2" data-testid="tab-conversations">
          <MessageSquare className="h-4 w-4" />
          Chat
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Job Details</h3>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground mb-1">Job Code</dt>
                    <dd className="font-mono">WEL-TUN-001</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-1">Status</dt>
                    <dd><Badge variant="success">Active</Badge></dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-1">Start Date</dt>
                    <dd>Jan 15, 2024</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground mb-1">Due Date</dt>
                    <dd>Mar 15, 2024</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted-foreground mb-1">Description</dt>
                    <dd>Tunnel excavation and reinforcement works for the Wellington Northern Corridor improvement project.</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Members
                </h3>
                <div className="space-y-2">
                  {["Sarah Wilson (Project Manager)", "Mike Chen (Site Supervisor)", "John Doe (Site Supervisor)"].map((member) => (
                    <div key={member} className="flex items-center gap-2 text-sm p-2 rounded-md hover-elevate">
                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                        {member.split(" ").map(n => n[0]).join("")}
                      </div>
                      <span>{member}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="forms" className="mt-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">Form management interface would be displayed here</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="incidents" className="mt-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">Incident tracking interface would be displayed here</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="files" className="mt-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">SharePoint file integration would be displayed here</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="map" className="mt-4">
        <Card>
          <CardContent className="pt-6">
            <div className="bg-muted rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Interactive map view would be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="conversations" className="mt-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">Team conversations interface would be displayed here</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}