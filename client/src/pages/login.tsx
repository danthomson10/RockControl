import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Shield, Mail, Lock, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });

      if (response.user) {
        toast({
          title: "Success",
          description: "Logged in successfully",
        });
        window.location.href = "/";
      }
    } catch (error: any) {
      const errorMessage = error.message || "Login failed";
      
      if (error.emailNotVerified) {
        toast({
          title: "Email Not Verified",
          description: "Please check your email and verify your account before logging in.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogin = () => {
    window.location.href = "/api/auth/microsoft";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to Rock Control</CardTitle>
          <CardDescription>
            Sign in to access your construction management platform
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Microsoft SSO */}
          <Button
            onClick={handleMicrosoftLogin}
            variant="outline"
            className="w-full"
            data-testid="button-microsoft-login"
          >
            <Building2 className="mr-2 h-4 w-4" />
            Sign in with Microsoft
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="text-center text-sm">
            <a
              href="/forgot-password"
              className="text-primary hover:underline"
              data-testid="link-forgot-password"
            >
              Forgot your password?
            </a>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 border-t pt-4">
          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setLocation("/register")}
            data-testid="button-register"
          >
            Create an account
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setLocation("/request-access")}
            data-testid="button-request-access"
          >
            Request organization access
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
