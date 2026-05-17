"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  form,
  MemberScaffold,
  PaperCard,
  palette,
  SectionHeading,
} from "@/components/member/MemberScaffold";

function makeHeadline(about: string) {
  const firstSentence = about
    .split(/[.!?]/)
    .map((item) => item.trim())
    .find(Boolean);

  if (!firstSentence) return "Open to thoughtful introductions.";
  if (firstSentence.length <= 82) return firstSentence;
  return `${firstSentence.slice(0, 79).trim()}...`;
}

function makeTags(text: string) {
  const source = text.toLowerCase();
  const tags = [
    ["founder", "Founder"],
    ["creative", "Creative"],
    ["operator", "Operator"],
    ["family", "Family-oriented"],
    ["travel", "Well-traveled"],
    ["dinner", "Dinner conversation"],
    ["values", "Values-led"],
    ["active", "Active"],
  ]
    .filter(([needle]) => source.includes(needle))
    .map(([, label]) => label);

  return tags.length ? tags.slice(0, 5) : ["Thoughtful", "Real-life chemistry"];
}

export default function VoiceBriefPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const sessionEmail = session?.user?.email ?? "";

  const profile = useQuery(
    api.profile.getMyProfile,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const interview = useQuery(
    api.profile.getMyVoiceInterview,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const saveVoiceAnswers = useMutation(api.profile.saveVoiceAnswers);
  const updateProfile = useMutation(api.profile.updateProfile);

  const [about, setAbout] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave =
    about.trim().length >= 24 && lookingFor.trim().length >= 24 && !saving;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || !sessionEmail) return;

    setSaving(true);
    setError("");

    try {
      const rawTranscript = [
        `Tell me about yourself.\n${about.trim()}`,
        `Tell me about who you are looking for.\n${lookingFor.trim()}`,
      ].join("\n\n");
      const tags = makeTags(`${about} ${lookingFor}`);

      await saveVoiceAnswers({
        email: sessionEmail,
        rawTranscript,
        tags,
        answers: [
          { question: "Who are you?", answer: about.trim() },
          { question: "What are you looking for?", answer: lookingFor.trim() },
        ],
      });

      await updateProfile({
        email: sessionEmail,
        headline: makeHeadline(about),
        bio: about.trim(),
        openTo: lookingFor.trim(),
        friendsShouldReferSomeoneWho: lookingFor.trim(),
        tags,
      });

      router.push("/dashboard/brief");
    } catch {
      setError("Couldn't save your intro brief. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (profile === undefined || interview === undefined) {
    return (
      <MemberScaffold
        eyebrow="Voice profile"
        title="Let's get to know you."
        subtitle="Loading your intro brief."
        narrow
      >
        <PaperCard>
          <p style={{ margin: 0, color: palette.stone }}>Loading...</p>
        </PaperCard>
      </MemberScaffold>
    );
  }

  if (!profile) {
    return (
      <MemberScaffold
        eyebrow="Voice profile"
        title="Your profile is not open yet."
        subtitle="An approved membership creates the private profile shell for your intro brief."
        narrow
      >
        <PaperCard>
          <button
            type="button"
            onClick={() => router.push("/application-status")}
            style={form.primary}
          >
            View application status
          </button>
        </PaperCard>
      </MemberScaffold>
    );
  }

  return (
    <MemberScaffold
      eyebrow="Voice profile"
      title="Create your intro brief."
      subtitle="For now, type the two voice prompts. The product shape stays the same, and real recording can replace this input later."
      narrow
    >
      <PaperCard>
        <SectionHeading
          label="Two prompts"
          detail={interview ? "Existing brief found" : "Step 1 of setup"}
        />

        <form onSubmit={handleSubmit} style={form.grid}>
          <label>
            <span style={form.label}>Tell me about yourself.</span>
            <p style={form.hint}>
              Write the way you would speak to a friend making a thoughtful
              introduction.
            </p>
            <textarea
              value={about}
              onChange={(event) => setAbout(event.target.value)}
              placeholder="I am the sort of person who..."
              style={form.textarea}
            />
          </label>

          <label>
            <span style={form.label}>
              Tell me about who you are looking for.
            </span>
            <p style={form.hint}>
              Focus on rhythm, values, and real-life chemistry. Not a checklist.
            </p>
            <textarea
              value={lookingFor}
              onChange={(event) => setLookingFor(event.target.value)}
              placeholder="I tend to click with people who..."
              style={form.textarea}
            />
          </label>

          {error ? <p style={form.error}>{error}</p> : null}

          <button
            type="submit"
            disabled={!canSave}
            style={{
              ...form.primary,
              opacity: canSave ? 1 : 0.45,
              cursor: canSave ? "pointer" : "default",
            }}
          >
            {saving ? "Creating brief..." : "This sounds like me"}
          </button>
        </form>
      </PaperCard>
    </MemberScaffold>
  );
}
