import { hasCapability as sharedHasCapability, type UserRole, type Capability } from "@shared/rbac";
import type { User } from "@shared/schema";

export function hasCapability(user: User | null | undefined, capability: Capability): boolean {
  if (!user || !user.role) return false;
  return sharedHasCapability(user.role as UserRole, capability);
}

export function canManageJobs(user: User | null | undefined): boolean {
  return hasCapability(user, "canManageJobs");
}

export function canManageForms(user: User | null | undefined): boolean {
  return hasCapability(user, "canManageForms");
}

export function canManageIncidents(user: User | null | undefined): boolean {
  return hasCapability(user, "canManageIncidents");
}

export function canManageUsers(user: User | null | undefined): boolean {
  return hasCapability(user, "canManageUsers");
}

export function canViewAll(user: User | null | undefined): boolean {
  return hasCapability(user, "canViewAll");
}
