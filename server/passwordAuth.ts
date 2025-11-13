import bcrypt from 'bcryptjs';
import cryptoRandomString from 'crypto-random-string';
import { db } from './db';
import { users, passwordResets, emailVerifications } from '@shared/schema';
import { eq, and, gt } from 'drizzle-orm';
import { sendPasswordResetEmail, sendEmailVerification } from './email';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createPasswordResetToken(email: string): Promise<string> {
  // Find user by email
  const [user] = await db.select().from(users).where(eq(users.email, email));
  
  if (!user) {
    // Don't reveal if user exists
    throw new Error('If an account with this email exists, a password reset link has been sent.');
  }

  // Generate secure token
  const token = cryptoRandomString({ length: 64, type: 'url-safe' });
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Store token
  await db.insert(passwordResets).values({
    userId: user.id,
    token,
    expiresAt,
    used: false,
  });

  // Send email
  await sendPasswordResetEmail(user.email, token, user.name);

  return token;
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  // Find valid token
  const [resetRecord] = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.token, token),
        eq(passwordResets.used, false),
        gt(passwordResets.expiresAt, new Date())
      )
    );

  if (!resetRecord) {
    throw new Error('Invalid or expired reset token');
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update user password
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, resetRecord.userId));

  // Mark token as used
  await db
    .update(passwordResets)
    .set({ used: true })
    .where(eq(passwordResets.id, resetRecord.id));
}

export async function createEmailVerificationToken(userId: number, email: string, name: string): Promise<string> {
  // Generate secure token
  const token = cryptoRandomString({ length: 64, type: 'url-safe' });
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Store token
  await db.insert(emailVerifications).values({
    userId,
    token,
    expiresAt,
    verified: false,
  });

  // Send email
  await sendEmailVerification(email, token, name);

  return token;
}

export async function verifyEmail(token: string): Promise<number> {
  // Find valid token
  const [verificationRecord] = await db
    .select()
    .from(emailVerifications)
    .where(
      and(
        eq(emailVerifications.token, token),
        eq(emailVerifications.verified, false),
        gt(emailVerifications.expiresAt, new Date())
      )
    );

  if (!verificationRecord) {
    throw new Error('Invalid or expired verification token');
  }

  // Mark email as verified
  await db
    .update(users)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(users.id, verificationRecord.userId));

  // Mark token as verified
  await db
    .update(emailVerifications)
    .set({ verified: true })
    .where(eq(emailVerifications.id, verificationRecord.id));

  return verificationRecord.userId;
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  
  if (!user) {
    throw new Error('User not found');
  }

  if (user.emailVerified) {
    throw new Error('Email already verified');
  }

  await createEmailVerificationToken(user.id, user.email, user.name);
}
