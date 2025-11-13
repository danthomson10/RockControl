import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
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

  return {
    user,
    isLoading,
    // User is authenticated if we have user data and no 401 error
    isAuthenticated: !!user && !(isError && error?.message?.includes('401')),
    error,
  };
}
