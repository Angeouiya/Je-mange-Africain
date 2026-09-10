import "server-only";

import { z } from "zod";
import {
  CONNECTED_PASSWORD_MAX_LENGTH,
  CONNECTED_PASSWORD_MIN_LENGTH,
  CURRENT_PASSWORD_MAX_LENGTH,
  isConnectedPasswordStrong,
} from "@/lib/password-policy";

export const ConnectedPasswordChangeInput = z.object({
  currentPassword: z.string().min(8).max(CURRENT_PASSWORD_MAX_LENGTH),
  newPassword: z.string().min(CONNECTED_PASSWORD_MIN_LENGTH).max(CONNECTED_PASSWORD_MAX_LENGTH),
  confirmation: z.string().min(CONNECTED_PASSWORD_MIN_LENGTH).max(CONNECTED_PASSWORD_MAX_LENGTH),
}).superRefine((input, context) => {
  if (!isConnectedPasswordStrong(input.newPassword)) {
    context.addIssue({
      code: "custom",
      path: ["newPassword"],
      message: "Le nouveau mot de passe ne respecte pas les exigences de sécurité.",
    });
  }
  if (input.newPassword !== input.confirmation) {
    context.addIssue({ code: "custom", path: ["confirmation"], message: "La confirmation ne correspond pas." });
  }
  if (input.currentPassword === input.newPassword) {
    context.addIssue({ code: "custom", path: ["newPassword"], message: "Choisissez un mot de passe différent." });
  }
});

type PasswordSession = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user?: {
    id: string;
    email?: string;
    phone?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  };
};

type PasswordChangeFailure = "current_password" | "identity" | "rejected" | "unavailable";

export type ConnectedPasswordChangeResult =
  | { ok: true; session: PasswordSession }
  | { ok: false; reason: PasswordChangeFailure };

export async function changePasswordWithFreshSession(input: {
  url: string;
  key: string;
  email: string;
  userId: string;
  currentPassword: string;
  newPassword: string;
  acceptsIdentity?: (session: PasswordSession) => boolean;
}): Promise<ConnectedPasswordChangeResult> {
  let signInResponse: Response;
  try {
    signInResponse = await fetch(`${input.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: input.key, "Content-Type": "application/json" },
      body: JSON.stringify({ email: input.email, password: input.currentPassword }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  const session = await signInResponse.json().catch(() => ({})) as PasswordSession;
  if (!signInResponse.ok) return { ok: false, reason: "current_password" };
  if (!session.access_token || session.user?.id !== input.userId || (input.acceptsIdentity && !input.acceptsIdentity(session))) {
    return { ok: false, reason: "identity" };
  }

  try {
    const updateResponse = await fetch(`${input.url}/auth/v1/user`, {
      method: "PUT",
      headers: { apikey: input.key, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ password: input.newPassword }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!updateResponse.ok) return { ok: false, reason: updateResponse.status >= 500 ? "unavailable" : "rejected" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  return { ok: true, session };
}
