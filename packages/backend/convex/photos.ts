import { action, mutation, query } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { findCurrentUser, requireCurrentUser } from "./session";

const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

type SketchStyle =
  | "soft_graphite"
  | "editorial_pencil"
  | "watercolor_portrait"
  | "minimal_line";

const STYLE_PROMPTS: Record<SketchStyle, string> = {
  soft_graphite:
    "Use soft graphite shading, warm intimate shadows, visible pencil texture, and gentle tonal depth.",
  editorial_pencil:
    "Use clean editorial pencil linework, confident facial detail, restrained shading, and a polished magazine portrait feel.",
  watercolor_portrait:
    "Use pencil linework with soft watercolor edges, fog-blue and warm-amber washes, subtle colour, and quiet paper texture.",
  minimal_line:
    "Use elegant minimal line art, sparse confident strokes, very light shading, and a refined hand-drawn silhouette.",
};

function buildPencilPrompt(style: SketchStyle) {
  return [
    "Turn this profile photo into a flattering, refined sketch portrait.",
    "Make the subject look naturally prettier and more polished while preserving identity, age, expression, and real facial features.",
    STYLE_PROMPTS[style],
    "Keep the original composition and aspect ratio. Do not add text, logos, frames, hearts, or dating-app styling.",
  ].join(" ");
}

type GeminiInlineData = {
  data?: string;
  mimeType?: string;
  mime_type?: string;
};

type GeminiPart = {
  text?: string;
  inlineData?: GeminiInlineData;
  inline_data?: GeminiInlineData;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
  };
};

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getMyAssets = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, { email }) => {
    const user = await findCurrentUser(ctx, email);
    if (!user) return { photo: null, sketch: null };

    const photos = await ctx.db
      .query("photoAssets")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const sketches = await ctx.db
      .query("sketchAssets")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const photo = newest(photos);
    const sketch = newest(
      sketches.filter((asset) => asset.status === "complete" && asset.storageId),
    );

    return {
      photo: photo
        ? {
            ...photo,
            url:
              (await ctx.storage.getUrl(photo.storageId as any)) ??
              photo.url ??
              null,
          }
        : null,
      sketch:
        sketch && sketch.storageId
          ? {
              ...sketch,
              url:
                (await ctx.storage.getUrl(sketch.storageId as any)) ??
                sketch.url ??
                null,
            }
          : null,
    };
  },
});

export const savePhoto = mutation({
  args: {
    storageId: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { storageId, email }) => {
    const user = await requireCurrentUser(ctx, email);
    const now = Date.now();
    const url = await ctx.storage.getUrl(storageId as any);

    const photoId = await ctx.db.insert("photoAssets", {
      userId: user._id,
      storageId,
      url: url ?? undefined,
      createdAt: now,
    });

    const profile = await ctx.db
      .query("memberProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (profile) {
      await ctx.db.patch(profile._id, {
        photoAssetId: photoId,
        photoVisibility: profile.photoVisibility ?? "sketch_only",
        updatedAt: now,
      });
    }

    return { _id: photoId, storageId, url };
  },
});

export const saveSketch = mutation({
  args: {
    storageId: v.string(),
    sourcePhotoId: v.optional(v.id("photoAssets")),
    style: v.optional(
      v.union(
        v.literal("soft_graphite"),
        v.literal("editorial_pencil"),
        v.literal("watercolor_portrait"),
        v.literal("minimal_line"),
      ),
    ),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { storageId, sourcePhotoId, style, email }) => {
    const user = await requireCurrentUser(ctx, email);
    const now = Date.now();
    const url = await ctx.storage.getUrl(storageId as any);

    const sketchId = await ctx.db.insert("sketchAssets", {
      userId: user._id,
      sourcePhotoId,
      style: style ?? "editorial_pencil",
      storageId,
      url: url ?? undefined,
      status: "complete",
      createdAt: now,
    });

    const profile = await ctx.db
      .query("memberProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (profile) {
      await ctx.db.patch(profile._id, {
        sketchAssetId: sketchId,
        photoVisibility: "sketch_only",
        updatedAt: now,
      });
    }

    return { _id: sketchId, storageId, url };
  },
});

export const generateSketchWithNanoBanana = action({
  args: {
    photoStorageId: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { photoStorageId, email }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity && !email) throw new Error("Sign in required");

    return await generateNanoBananaSketch(ctx, photoStorageId, "editorial_pencil");
  },
});

export const generateSketch = action({
  args: {
    photoStorageId: v.string(),
    style: v.union(
      v.literal("soft_graphite"),
      v.literal("editorial_pencil"),
      v.literal("watercolor_portrait"),
      v.literal("minimal_line"),
    ),
    email: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { photoStorageId, style, email },
  ): Promise<{
    sketchId: string;
    storageId: string;
    url: string | null;
    mimeType: string;
    model: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity && !email) throw new Error("Sign in required");

    const generated = await generateNanoBananaSketch(ctx, photoStorageId, style);
    const saved = (await ctx.runMutation(api.photos.saveSketch as any, {
      storageId: generated.storageId,
      style,
      email,
    })) as { _id: string; url: string | null };

    return {
      sketchId: saved._id,
      storageId: generated.storageId,
      url: saved.url ?? generated.url,
      mimeType: generated.mimeType,
      model: generated.model,
    };
  },
});

export const setPhotoVisibility = mutation({
  args: {
    photoVisibility: v.union(
      v.literal("sketch_only"),
      v.literal("photo_only"),
      v.literal("both"),
      v.literal("photo_after_approval"),
    ),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { photoVisibility, email }) => {
    const user = await requireCurrentUser(ctx, email);
    const profile = await ctx.db
      .query("memberProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, {
      photoVisibility,
      updatedAt: Date.now(),
    });
  },
});

function newest<T extends { createdAt: number }>(rows: T[]) {
  return rows.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

async function generateNanoBananaSketch(
  ctx: ActionCtx,
  photoStorageId: string,
  style: SketchStyle,
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in Convex env");
  }

  const original = await ctx.storage.get(photoStorageId as any);
  if (!original) throw new Error("Photo not found");

  const model = process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_GEMINI_IMAGE_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: buildPencilPrompt(style) },
              {
                inline_data: {
                  mime_type: original.type || "image/jpeg",
                  data: await blobToBase64(original),
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
        },
      }),
    },
  );

  const body = (await response.json().catch(() => null)) as GeminiResponse | null;
  if (!response.ok) {
    throw new Error(
      body?.error?.message ?? `Gemini image generation failed: ${response.status}`,
    );
  }

  const imagePart = body?.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .find((part) => part.inlineData?.data || part.inline_data?.data);
  const inline = imagePart?.inlineData ?? imagePart?.inline_data;
  const imageBase64 = inline?.data;
  if (!imageBase64) {
    const message = body?.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text)
      .filter(Boolean)
      .join(" ");
    throw new Error(message || "Gemini did not return an image");
  }

  const mimeType = inline?.mimeType ?? inline?.mime_type ?? "image/png";
  const sketchStorageId = await ctx.storage.store(
    new Blob([base64ToBytes(imageBase64)], { type: mimeType }),
  );
  const sketchUrl = await ctx.storage.getUrl(sketchStorageId);

  return {
    storageId: sketchStorageId,
    url: sketchUrl,
    mimeType,
    model,
  };
}

async function blobToBase64(blob: Blob) {
  return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── home photos ─────────────────────────────────────────────────────────────

export const saveHomePhoto = mutation({
  args: {
    email: v.optional(v.string()),
    storageId: v.string(),
    url: v.optional(v.string()),
    caption: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { email, storageId, url, caption, order }) => {
    const user = await requireCurrentUser(ctx, email);
    return await ctx.db.insert("homePhotos", {
      userId: user._id,
      storageId,
      url,
      caption,
      order,
      createdAt: Date.now(),
    });
  },
});

export const getMyHomePhotos = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, { email }) => {
    const user = await requireCurrentUser(ctx, email);
    const photos = await ctx.db
      .query("homePhotos")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .collect();
    return photos.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },
});

export const deleteHomePhoto = mutation({
  args: { email: v.optional(v.string()), photoId: v.id("homePhotos") },
  handler: async (ctx, { email, photoId }) => {
    const user = await requireCurrentUser(ctx, email);
    const photo = await ctx.db.get(photoId);
    if (!photo || photo.userId !== user._id) throw new Error("Not found");
    await ctx.db.delete(photoId);
  },
});

export const resolveHomePhotoUrl = action({
  args: {
    email: v.optional(v.string()),
    storageId: v.string(),
    photoId: v.id("homePhotos"),
  },
  handler: async (ctx, { email, storageId, photoId }) => {
    const url = await ctx.storage.getUrl(storageId);
    if (url) {
      await ctx.runMutation(api.photos.patchHomePhotoUrl, { photoId, url });
    }
    return url;
  },
});

export const patchHomePhotoUrl = mutation({
  args: { photoId: v.id("homePhotos"), url: v.string() },
  handler: async (ctx, { photoId, url }) => {
    await ctx.db.patch(photoId, { url });
  },
});
