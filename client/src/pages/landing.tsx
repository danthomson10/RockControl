import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, FileText, Users, AlertTriangle, CheckCircle, BarChart3 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,transparent,black)] dark:bg-grid-slate-700/25" />
        <div className="relative">
          <div className="container mx-auto px-6 pt-20 pb-16 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Enterprise Project Management by TacEdge</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Rock Control
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Enterprise-grade GeoTech Project & Health & Safety management for construction teams.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => window.location.href = '/login'}
                data-testid="button-login"
              >
                Sign In
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => window.location.href = '#features'}
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything you need to manage construction projects safely
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover-elevate">
            <CardContent className="pt-6">
              <FileText className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Digital Forms</h3>
              <p className="text-muted-foreground text-sm">
                Take-5 safety checks, crew briefings, risk control plans, and more with digital signatures
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="pt-6">
              <Shield className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Safety First</h3>
              <p className="text-muted-foreground text-sm">
                Incident reporting, near-miss tracking, and comprehensive safety management
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="pt-6">
              <Users className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Role-Based Access</h3>
              <p className="text-muted-foreground text-sm">
                7 role types from OrgAdmin to Field Techs with granular permissions
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="pt-6">
              <AlertTriangle className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Incident Management</h3>
              <p className="text-muted-foreground text-sm">
                Track, investigate, and resolve incidents with severity-based workflows
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="pt-6">
              <CheckCircle className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Compliance Tracking</h3>
              <p className="text-muted-foreground text-sm">
                Maintain compliance with automated workflows and audit trails
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="pt-6">
              <BarChart3 className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Analytics & Reporting</h3>
              <p className="text-muted-foreground text-sm">
                Real-time dashboards and comprehensive reporting for all stakeholders
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary/5 border-y">
        <div className="container mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to transform your construction safety management?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join leading construction companies using Rock Control to keep their teams safe and projects on track.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-get-started"
          >
            Get Started
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-6 py-8">
          <p className="text-center text-muted-foreground text-sm">
            © {new Date().getFullYear()} Rock Control by TacEdge. Enterprise GeoTech Project & Health & Safety Management.
          </p>
        </div>
      </footer>
    </div>
  );
}
