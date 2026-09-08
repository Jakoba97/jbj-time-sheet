"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { generateTempPassword } from "@/lib/utils/password";

const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(1).max(128),
  title: z.string().trim().max(128).optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._@-]+$/, "Username can only contain lowercase letters, numbers, . _ @ -")
    .min(2)
    .max(64),
  role: z.enum(["admin", "employee"]),
});

export async function createEmployeeAction(
  _prevState: { error: string | null; tempPassword: string | null },
  formData: FormData,
): Promise<{ error: string | null; tempPassword: string | null }> {
  await requireAdmin();

  const parsed = createEmployeeSchema.safeParse({
    fullName: formData.get("fullName"),
    title: formData.get("title"),
    username: formData.get("username"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input.", tempPassword: null };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.username, parsed.data.username),
  });
  if (existing) return { error: "That username is already taken.", tempPassword: null };

  const tempPassword = generateTempPassword();
  await db.insert(users).values({
    fullName: parsed.data.fullName,
    title: parsed.data.title || null,
    username: parsed.data.username,
    role: parsed.data.role,
    passwordHash: await bcrypt.hash(tempPassword, 12),
    mustChangePassword: true,
  });

  revalidatePath("/admin/employees");
  return { error: null, tempPassword };
}

const updateEmployeeSchema = createEmployeeSchema;

export async function updateEmployeeAction(
  userId: string,
  formData: FormData,
): Promise<{ error: string | null }> {
  await requireAdmin();

  const parsed = updateEmployeeSchema.safeParse({
    fullName: formData.get("fullName"),
    title: formData.get("title"),
    username: formData.get("username"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.username, parsed.data.username),
  });
  if (existing && existing.id !== userId) return { error: "That username is already taken." };

  await db
    .update(users)
    .set({
      fullName: parsed.data.fullName,
      title: parsed.data.title || null,
      username: parsed.data.username,
      role: parsed.data.role,
    })
    .where(eq(users.id, userId));

  revalidatePath("/admin/employees");
  return { error: null };
}

export async function setEmployeeActiveAction(userId: string, active: boolean) {
  await requireAdmin();
  await db.update(users).set({ active }).where(eq(users.id, userId));
  revalidatePath("/admin/employees");
}

export async function resetPasswordAction(
  userId: string,
): Promise<{ error: string | null; tempPassword: string | null }> {
  await requireAdmin();
  const tempPassword = generateTempPassword();
  await db
    .update(users)
    .set({
      passwordHash: await bcrypt.hash(tempPassword, 12),
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    })
    .where(eq(users.id, userId));
  revalidatePath("/admin/employees");
  return { error: null, tempPassword };
}
