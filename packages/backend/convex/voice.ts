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

    // extract structured profile fields
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are helping create a private intro brief for Sohoist, a private dating network.
Extract profile information from this voice recording transcript and return valid JSON only.
Keep the tone warm, authentic, and first-person. Use their actual words where possible.

Return exactly this shape:
{
  "whoYouAre": "1-2 sentence description",
  "realLife": "what they're like outside of work",
  "lookingFor": "what they want in a partner/relationship",
  "friendsShouldKnow": "what a referring friend should know before making an intro",
  "dealbreakers": "things that won't work for them",
  "tags": ["3 to 5 short lifestyle or values tags"]
}

If a topic isn't covered, use an empty string.`,
        },
        { role: "user", content: transcript },
      ],
      response_format: { type: "json_object" },
    });

    const extracted = JSON.parse(
      chat.choices[0]?.message?.content ?? "{}",
    ) as Record<string, any>;

    // map to question/answer pairs and save
    const answers = [
      { question: "Who are you?", answer: extracted.whoYouAre ?? "" },
      { question: "What are you like in real life?", answer: extracted.realLife ?? "" },
      { question: "What are you looking for?", answer: extracted.lookingFor ?? "" },
      {
        question: "What should friends know before referring someone to you?",
        answer: extracted.friendsShouldKnow ?? "",
      },
      { question: "What are your dealbreakers?", answer: extracted.dealbreakers ?? "" },
    ].filter((a) => a.answer.trim().length > 0);

    await ctx.runMutation(api.profile.saveVoiceAnswers, {
      answers,
      rawTranscript: transcript,
      tags: Array.isArray(extracted.tags) ? extracted.tags : [],
      email,
    });

    return { transcript, extracted };
  },
});
