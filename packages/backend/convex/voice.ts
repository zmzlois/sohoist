import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import OpenAI from "openai";
import type { Id } from "./_generated/dataModel";

/** signed upload URL — client posts raw audio bytes here */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * transcribe audio with Whisper, extract structured profile fields with
 * GPT-4o-mini, then persist via saveVoiceAnswers
 */
export const transcribeAndSave = action({
  args: {
    storageId: v.string(),
    email: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    fileName: v.optional(v.string()),
  },
  handler: async (ctx, { storageId, email, mimeType, fileName }) => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // pull audio blob from Convex storage
    const blob = await ctx.storage.get(storageId as Id<"_storage">);
    if (!blob) throw new Error("Audio not found in storage");

    // transcribe with Whisper
    const arrayBuffer = await blob.arrayBuffer();
    const audioFile = new File([arrayBuffer], fileName ?? "recording.webm", {
      type: mimeType ?? blob.type ?? "audio/webm",
    });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
    });
    const transcript = transcription.text;

    // extract bullets and prose summary for both core questions
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are helping create a private intro brief for Sohoist, a private dating network.
Extract profile information from this voice recording and return valid JSON only.
Keep the tone warm, authentic, and first-person. Use their actual words where possible.
Each bullet should be a complete, human sentence — not a fragment.

Return exactly this shape:
{
  "aboutBullets": ["3 to 5 concise first-person sentences about who this person is"],
  "lookingForBullets": ["3 to 5 concise first-person sentences about who they are looking for"],
  "bio": "1-2 sentence prose summary of who they are",
  "openTo": "1-2 sentence prose summary of who they are looking for",
  "tags": ["3 to 5 short lifestyle or values tags"],
  "headline": "a single natural sentence headline, max 80 chars"
}

If a topic isn't covered, use empty arrays or strings.`,
        },
        { role: "user", content: transcript },
      ],
      response_format: { type: "json_object" },
    });

    const extracted = JSON.parse(
      chat.choices[0]?.message?.content ?? "{}",
    ) as Record<string, any>;

    const aboutBullets: string[] = Array.isArray(extracted.aboutBullets)
      ? extracted.aboutBullets.filter((b: unknown) => typeof b === "string" && (b as string).trim())
      : [];
    const lookingForBullets: string[] = Array.isArray(extracted.lookingForBullets)
      ? extracted.lookingForBullets.filter((b: unknown) => typeof b === "string" && (b as string).trim())
      : [];

    const answers = [
      { question: "Who are you?", answer: String(extracted.bio ?? "").trim() },
      { question: "What are you looking for?", answer: String(extracted.openTo ?? "").trim() },
    ].filter((a) => a.answer.length > 0);

    await ctx.runMutation(api.profile.saveVoiceAnswers, {
      answers,
      rawTranscript: transcript,
      tags: Array.isArray(extracted.tags) ? extracted.tags : [],
      email,
    });

    // save bullets and headline to the profile
    await ctx.runMutation(api.profile.updateProfile, {
      email,
      aboutBullets,
      lookingForBullets,
      headline: typeof extracted.headline === "string" ? extracted.headline : undefined,
    });

    return { transcript, extracted, aboutBullets, lookingForBullets };
  },
});
