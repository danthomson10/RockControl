import { useQuery, useMutation } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export function useAuth() {
  const [, setLocation] = useLocation();
  
  const { data: user, isLoading, error, isError } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    // Treat 401 as unauthenticated, not an error
    throwOnError: (error: any) => {
      // Don't throw on 401 - that's just unauthenticated state
      if (error?.message?.includes('401')) {
        return false;
      }
      return true;
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });
    },
    onSuccess: () => {
      // Clear user cache
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Redirect to login
      setLocation("/login");
    },
  });

  return {
    user,
    isLoading,
    // User is authenticated if we have user data and no 401 error
    isAuthenticated: !!user && !(isError && error?.message?.includes('401')),
    error,
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  };
}
