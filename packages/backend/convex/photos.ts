import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import OpenAI from "openai";
import type { Id } from "./_generated/dataModel";
import { findCurrentUser, requireCurrentUser } from "./session";

/** save an uploaded photo and link it to the member's profile */
export const savePhoto = mutation({
  args: {
    storageId: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { storageId, email }) => {
    const user = await requireCurrentUser(ctx, email);

    // store the photo asset record
    const photoId = await ctx.db.insert("photoAssets", {
      userId: user._id,
      storageId,
      createdAt: Date.now(),
    });

    // link to profile
    const profile = await ctx.db
      .query("memberProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .unique();

    if (profile) {
      await ctx.db.patch(profile._id, {
        photoAssetId: photoId,
        updatedAt: Date.now(),
      });
    }

    return photoId;
  },
});

/** get the current user's photo and sketch assets */
export const getMyAssets = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, { email }) => {
    const user = await findCurrentUser(ctx, email);
    if (!user) return { photo: null, sketch: null };

    const photo = await ctx.db
      .query("photoAssets")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .first();

    const sketch = await ctx.db
      .query("sketchAssets")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .first();

    // resolve storage URLs
    const photoUrl = photo?.storageId
      ? await ctx.storage.getUrl(photo.storageId as Id<"_storage">)
      : null;

    const sketchUrl = sketch?.storageId
      ? await ctx.storage.getUrl(sketch.storageId as Id<"_storage">)
      : null;

    return {
      photo: photo ? { ...photo, url: photoUrl } : null,
      sketch: sketch ? { ...sketch, url: sketchUrl } : null,
    };
  },
});

/**
 * generate a pencil sketch from the uploaded photo.
 * two-step: GPT-4o vision describes the person → DALL-E 3 generates the sketch.
 */
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
  ): Promise<{ sketchId: Id<"sketchAssets"> }> => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // fetch the uploaded photo
    const blob = await ctx.storage.get(photoStorageId as Id<"_storage">);
    if (!blob) throw new Error("Photo not found in storage");

    // convert to base64 for vision API
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = blob.type || "image/jpeg";

    // step 1: describe the person using GPT-4o vision
    const vision = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "low",
              },
            },
            {
              type: "text",
              text: "Describe the person in this photo in 2-3 sentences for use in an art prompt. Focus on: apparent gender, approximate age, face shape, hair (color, length, style), distinctive features. Be objective and specific. Do not include names or identifying information.",
            },
          ],
        },
      ],
    });

    const personDescription = vision.choices[0]?.message?.content ?? "a person";

    // step 2: generate pencil sketch with DALL-E 3
    const stylePrompts: Record<string, string> = {
      soft_graphite:
        "soft graphite pencil portrait, delicate shading, warm ivory paper background, intimate and private feeling, no color",
      editorial_pencil:
        "editorial pencil sketch portrait, confident linework, clean white background, fashion illustration style, black and white",
      watercolor_portrait:
        "pencil sketch with subtle watercolor wash, fog blue and warm amber tones, soft edges, handcrafted feel",
      minimal_line:
        "minimal line drawing portrait, single continuous line art style, sparse and elegant, white background",
    };

    const prompt = `A ${stylePrompts[style] ?? stylePrompts.soft_graphite} of ${personDescription}. Private and tasteful. Artistic, not photorealistic. Do not include text or labels.`;

    const generated = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    });

    const imageUrl = generated.data?.[0]?.url;
    if (!imageUrl) throw new Error("No image generated");

    // download the generated sketch and store it in Convex
    const imageRes = await fetch(imageUrl);
    const imageBlob = await imageRes.blob();

    const uploadUrl = await ctx.storage.generateUploadUrl();
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: imageBlob,
    });
    const { storageId: sketchStorageId } = (await uploadRes.json()) as {
      storageId: string;
    };

    // save sketch asset record
    const sketchId = (await ctx.runMutation(api.photos.saveSketch as any, {
      sketchStorageId,
      photoStorageId,
      style,
      email,
    })) as Id<"sketchAssets">;

    return { sketchId };
  },
});

/** save a generated sketch and link it to the member's profile */
export const saveSketch = mutation({
  args: {
    sketchStorageId: v.string(),
    photoStorageId: v.optional(v.string()),
    style: v.union(
      v.literal("soft_graphite"),
      v.literal("editorial_pencil"),
      v.literal("watercolor_portrait"),
      v.literal("minimal_line"),
    ),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { sketchStorageId, photoStorageId, style, email }) => {
    const user = await requireCurrentUser(ctx, email);

    // find the source photo record if we have its storageId
    let sourcePhotoId: Id<"photoAssets"> | undefined;
    if (photoStorageId) {
      const photo = await ctx.db
        .query("photoAssets")
        .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
        .order("desc")
        .first();
      if (photo) sourcePhotoId = photo._id;
    }

    const sketchId = await ctx.db.insert("sketchAssets", {
      userId: user._id,
      sourcePhotoId,
      style,
      storageId: sketchStorageId,
      status: "complete",
      createdAt: Date.now(),
    });

    // link sketch to profile
    const profile = await ctx.db
      .query("memberProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .unique();

    if (profile) {
      await ctx.db.patch(profile._id, {
        sketchAssetId: sketchId,
        updatedAt: Date.now(),
      });
    }

    return sketchId;
  },
});

/** update the photo visibility setting on the member's profile */
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
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .unique();

    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, {
      photoVisibility,
      updatedAt: Date.now(),
    });
  },
});

/** signed upload URL for a photo — same pattern as voice recording */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
