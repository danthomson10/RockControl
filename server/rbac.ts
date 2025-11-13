import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { User } from "@shared/schema";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      currentUser?: User;
    }
  }
}

/**
 * Role capability matrix defining what each role can do
 */
const ROLE_CAPABILITIES = {
  OrgAdmin: {
    canManageJobs: true,
    canManageForms: true,
    canManageIncidents: true,
    canManageUsers: true,
    canViewAll: true,
  },
  ProjectManager: {
    canManageJobs: true,
    canManageForms: true,
    canManageIncidents: true,
    canManageUsers: false,
    canViewAll: true,
  },
  HSEManager: {
    canManageJobs: true,
    canManageForms: true,
    canManageIncidents: true,
    canManageUsers: false,
    canViewAll: true,
  },
  SiteSupervisor: {
    canManageJobs: false,
    canManageForms: true,  // Can create forms for their sites
    canManageIncidents: true,  // Can report incidents
    canManageUsers: false,
    canViewAll: true,  // Can view all jobs/forms in organization
  },
  FieldTech: {
    canManageJobs: false,
    canManageForms: true,  // Can submit safety forms
    canManageIncidents: true,  // Can report incidents
    canManageUsers: false,
    canViewAll: false,  // Limited to assigned jobs
  },
  ClientViewer: {
    canManageJobs: false,
    canManageForms: false,
    canManageIncidents: false,
    canManageUsers: false,
    canViewAll: true,  // Read-only access
  },
  Subcontractor: {
    canManageJobs: false,
    canManageForms: true,  // Can submit forms for their work
    canManageIncidents: true,  // Can report incidents
    canManageUsers: false,
    canViewAll: false,  // Limited to assigned jobs
  },
} as const;

/**
 * Middleware to load current user and attach to request
 * MUST run AFTER isAuthenticated middleware to ensure req.user is populated
 * This runs once per request to avoid duplicate lookups
 */
export async function loadCurrentUser(req: Request, res: Response, next: NextFunction) {
  try {
    let user: User | undefined;

    // Support email/password session auth
    if (req.session && (req.session as any).userId) {
      user = await storage.users.getById((req.session as any).userId);
    }
    // Support OAuth (Replit/Microsoft) - req.user is set by isAuthenticated middleware
    else if ((req as any).user?.claims?.sub) {
      const replitId = (req as any).user.claims.sub;
      user = await storage.users.getByReplitId(replitId);
    }

    if (user) {
      // Verify user is active
      if (!user.active) {
        return res.status(403).json({ error: "Account is disabled" });
      }
      
      // Attach to request for downstream use
      req.currentUser = user;
    }

    next();
  } catch (error: any) {
    console.error("Error loading current user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Combined middleware: isAuthenticated + loadCurrentUser
 * Use this on protected routes to ensure user is authenticated AND loaded
 */
export function withAuth(isAuthenticated: any) {
  return [isAuthenticated, loadCurrentUser];
}

/**
 * Check if user has a specific capability
 */
export function hasCapability(user: User | undefined, capability: keyof typeof ROLE_CAPABILITIES[keyof typeof ROLE_CAPABILITIES]): boolean {
  if (!user) return false;
  const roleCapabilities = ROLE_CAPABILITIES[user.role as keyof typeof ROLE_CAPABILITIES];
  return roleCapabilities ? roleCapabilities[capability] : false;
}

/**
 * Middleware factory to require specific capabilities
 */
export function requireCapability(capability: keyof typeof ROLE_CAPABILITIES[keyof typeof ROLE_CAPABILITIES]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!hasCapability(req.currentUser, capability)) {
      return res.status(403).json({ 
        error: `Insufficient permissions. Required capability: ${capability}`,
        userRole: req.currentUser.role,
      });
    }

    next();
  };
}

/**
 * Middleware factory to require one of several roles
 */
export function requireRoles(allowedRoles: Array<keyof typeof ROLE_CAPABILITIES>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.currentUser.role as any)) {
      return res.status(403).json({ 
        error: `Insufficient permissions. Required roles: ${allowedRoles.join(", ")}`,
        userRole: req.currentUser.role,
      });
    }

    next();
  };
}
