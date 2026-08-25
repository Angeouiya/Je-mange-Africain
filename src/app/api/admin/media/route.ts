import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeAdminRequest, getSupabaseAdminConfig } from "@/lib/admin-auth";
import { hasAdminPermission, type AdminModule } from "@/lib/admin-permissions";

export const dynamic = "force-dynamic";

const BUCKET = "market-media";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const KIND_MODULE: Record<string, AdminModule> = {
  product: "catalog",
  recipe: "recipes",
  advertisement: "marketing",
  brand: "catalog",
};

const extensionFor = (mimeType: string) => ({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
}[mimeType] || "bin");

async function ensureBucket(url: string, serviceRoleKey: string) {
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
  const current = await fetch(`${url}/storage/v1/bucket/${BUCKET}`, { headers, cache: "no-store" });
  if (current.ok) return;
  const created = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: MAX_FILE_SIZE,
      allowed_mime_types: [...ALLOWED_MIME_TYPES],
    }),
  });
  if (!created.ok && created.status !== 409) throw new Error("Le stockage d'images ne peut pas être initialisé.");
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return authorization.response;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const kind = String(form?.get("kind") || "");
  const ownerType = String(form?.get("ownerType") || kind || "") || null;
  const ownerId = String(form?.get("ownerId") || "") || null;
  const permissionModule = KIND_MODULE[kind];

  if (!permissionModule || !hasAdminPermission(authorization.user.role, permissionModule, "create")) {
    return NextResponse.json({ error: "Votre rôle ne permet pas de charger ce type de visuel." }, { status: 403 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: "Sélectionnez un fichier image." }, { status: 400 });
  if (!ALLOWED_MIME_TYPES.has(file.type)) return NextResponse.json({ error: "Formats acceptés : JPG, PNG, WebP et AVIF." }, { status: 415 });
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "L'image doit peser moins de 8 Mo." }, { status: 413 });

  const { url, key, serviceRoleKey } = getSupabaseAdminConfig();
  if (!url || !key) return NextResponse.json({ error: "Le stockage Supabase n'est pas configuré." }, { status: 503 });

  try {
    if (serviceRoleKey) await ensureBucket(url, serviceRoleKey);
    const now = new Date();
    const objectPath = `${kind}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${extensionFor(file.type)}`;
    const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
    const storageKey = serviceRoleKey || key;
    const bearer = serviceRoleKey || authorization.accessToken;
    const uploaded = await fetch(`${url}/storage/v1/object/${BUCKET}/${encodedPath}`, {
      method: "POST",
      headers: {
        apikey: storageKey,
        Authorization: `Bearer ${bearer}`,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: await file.arrayBuffer(),
      signal: AbortSignal.timeout(30_000),
    });
    if (!uploaded.ok) {
      const payload = await uploaded.json().catch(() => null);
      const detail = payload?.message || payload?.error || "Envoi refusé par le stockage.";
      return NextResponse.json({ error: detail }, { status: uploaded.status >= 400 && uploaded.status < 600 ? uploaded.status : 502 });
    }

    const publicUrl = `${url}/storage/v1/object/public/${BUCKET}/${encodedPath}`;
    await db.mediaAsset.create({
      data: {
        kind,
        ownerType,
        ownerId,
        fileName: file.name.slice(0, 240),
        objectPath,
        publicUrl,
        mimeType: file.type,
        sizeBytes: file.size,
        createdBy: authorization.user.email,
      },
    });
    await db.auditLog.create({
      data: {
        action: "media_upload",
        entityType: "MediaAsset",
        entityId: objectPath,
        after: JSON.stringify({ kind, ownerType, ownerId, publicUrl, sizeBytes: file.size }),
        reason: `Visuel chargé par ${authorization.user.email}`,
      },
    });

    return NextResponse.json({ asset: { objectPath, publicUrl, mimeType: file.type, sizeBytes: file.size } }, { status: 201 });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Chargement impossible." }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return authorization.response;
  const body = await request.json().catch(() => null);
  const objectPath = typeof body?.objectPath === "string" ? body.objectPath : "";
  const kind = objectPath.split("/")[0];
  const permissionModule = KIND_MODULE[kind];
  if (!objectPath || !permissionModule || !hasAdminPermission(authorization.user.role, permissionModule, "delete")) {
    return NextResponse.json({ error: "Suppression non autorisée." }, { status: 403 });
  }

  const { url, key, serviceRoleKey } = getSupabaseAdminConfig();
  if (!url || !key) return NextResponse.json({ error: "Le stockage Supabase n'est pas configuré." }, { status: 503 });
  const storageKey = serviceRoleKey || key;
  const bearer = serviceRoleKey || authorization.accessToken;
  const response = await fetch(`${url}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { apikey: storageKey, Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [objectPath] }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return NextResponse.json({ error: "Le visuel n'a pas pu être supprimé." }, { status: 502 });
  await db.mediaAsset.updateMany({ where: { objectPath }, data: { status: "archived" } });
  return NextResponse.json({ ok: true });
}
