"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  form,
  MemberScaffold,
  PaperCard,
  palette,
  SectionHeading,
  StatusBadge,
} from "@/components/member/MemberScaffold";
import dinnerScene from "../../../../public/images/friend-gather-hero.png";

type AgentStatus = "ready" | "recording" | "thinking" | "draft" | "error";

function makeHeadline(about: string) {
  const firstSentence = about
    .split(/[.!?]/)
    .map((item) => item.trim())
    .find(Boolean);

  if (!firstSentence) return "Open to thoughtful introductions.";
  if (firstSentence.length <= 82) return firstSentence;
  return `${firstSentence.slice(0, 79).trim()}...`;
}

function makeTags(text: string, explicitTags: string) {
  const typed = explicitTags
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (typed.length) return typed.slice(0, 6);

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
  const generateUploadUrl = useMutation(api.voice.generateUploadUrl);
  const transcribeAndSave = useAction(api.voice.transcribeAndSave);
  const saveVoiceAnswers = useMutation(api.profile.saveVoiceAnswers);
  const updateProfile = useMutation(api.profile.updateProfile);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [about, setAbout] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [friendsShouldKnow, setFriendsShouldKnow] = useState("");
  const [dealbreakers, setDealbreakers] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("ready");
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile) return;
    setAbout((current) => current || profile.bio || "");
    setLookingFor((current) => current || profile.openTo || "");
    setFriendsShouldKnow(
      (current) => current || profile.friendsShouldReferSomeoneWho || "",
    );
    setDealbreakers((current) => current || profile.doNotReferIf || "");
    setTagsInput((current) => current || profile.tags?.join(", ") || "");
  }, [profile]);

  useEffect(() => {
    if (agentStatus !== "recording") return;
    const timer = window.setInterval(() => {
      setElapsed((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [agentStatus]);

  const canSave =
    about.trim().length >= 24 && lookingFor.trim().length >= 24 && !saving;

  async function startRecording() {
    if (!sessionEmail) return;
    setError("");

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setAgentStatus("error");
      setError("Voice recording is not available in this browser. Use the written draft below.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        void transcribeRecording(blob);
      };

      setElapsed(0);
      setAgentStatus("recording");
      recorder.start();
    } catch {
      setAgentStatus("error");
      setError("Microphone access was not granted. You can still write the brief below.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setAgentStatus("thinking");
  }

  async function transcribeRecording(blob: Blob) {
    if (!sessionEmail) return;

    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "audio/webm" },
        body: blob,
      });
      if (!uploadResponse.ok) throw new Error("Upload failed");

      const { storageId } = (await uploadResponse.json()) as {
        storageId: string;
      };
      const result = await transcribeAndSave({
        storageId,
        email: sessionEmail,
        mimeType: blob.type || "audio/webm",
        fileName: `sohoist-voice-${Date.now()}.webm`,
      });
      const extracted = result.extracted as Record<string, unknown>;
      const whoYouAre = String(extracted.whoYouAre ?? "").trim();
      const realLife = String(extracted.realLife ?? "").trim();
      const looking = String(extracted.lookingFor ?? "").trim();
      const friends = String(extracted.friendsShouldKnow ?? "").trim();
      const blockers = String(extracted.dealbreakers ?? "").trim();
      const tags = Array.isArray(extracted.tags)
        ? extracted.tags.filter((tag) => typeof tag === "string").join(", ")
        : "";

      setAbout([whoYouAre, realLife].filter(Boolean).join(" "));
      setLookingFor(looking);
      setFriendsShouldKnow(friends);
      setDealbreakers(blockers);
      setTagsInput(tags);
      setAgentStatus("draft");
    } catch {
      setAgentStatus("error");
      setError(
        "The recording was saved, but the voice agent could not create a draft. Check the OpenAI key or use the written draft below.",
      );
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || !sessionEmail) return;

    setSaving(true);
    setError("");

    try {
      const tags = makeTags(
        `${about} ${lookingFor} ${friendsShouldKnow} ${dealbreakers}`,
        tagsInput,
      );
      const rawTranscript = [
        `Who I am\n${about.trim()}`,
        `Who I am looking for\n${lookingFor.trim()}`,
        friendsShouldKnow.trim()
          ? `What friends should know\n${friendsShouldKnow.trim()}`
          : "",
        dealbreakers.trim() ? `Dealbreakers\n${dealbreakers.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      await saveVoiceAnswers({
        email: sessionEmail,
        rawTranscript,
        tags,
        answers: [
          { question: "Who are you?", answer: about.trim() },
          { question: "What are you looking for?", answer: lookingFor.trim() },
          {
            question: "What should friends know before referring someone to you?",
            answer: friendsShouldKnow.trim(),
          },
          { question: "What are your dealbreakers?", answer: dealbreakers.trim() },
        ].filter((answer) => answer.answer.length > 0),
      });

      await updateProfile({
        email: sessionEmail,
        headline: makeHeadline(about),
        bio: about.trim(),
        openTo: lookingFor.trim(),
        friendsShouldReferSomeoneWho:
          friendsShouldKnow.trim() || lookingFor.trim(),
        doNotReferIf: dealbreakers.trim() || undefined,
        tags,
        conversationStarters: [
          "What kind of evening makes you feel most yourself?",
          "Who tends to bring out your best rhythm?",
        ],
        privateNotesForReferrers: friendsShouldKnow.trim() || undefined,
      });

      router.push("/dashboard/reward");
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
      subtitle="Speak naturally, then edit the draft into the version trusted referrers will see."
    >
      <div style={layoutStyle}>
        <PaperCard style={{ padding: 0, overflow: "hidden" }}>
          <Image src={dinnerScene} alt="" style={heroImageStyle} priority />
          <div style={agentPanelStyle}>
            <SectionHeading
              label="Voice agent"
              detail={<StatusBadge tone={agentStatus === "error" ? "danger" : "teal"}>{agentStatus}</StatusBadge>}
            />
            <p style={agentCopyStyle}>
              I will ask who you are, what you are like in real life, who you
              enjoy being around, and what friends should know before referring
              someone.
            </p>
            <div style={promptGridStyle}>
              {[
                "Who are you?",
                "What are you like in real life?",
                "Who are you looking for?",
                "What should friends know?",
                "What are your dealbreakers?",
              ].map((prompt) => (
                <span key={prompt} style={promptChipStyle}>
                  {prompt}
                </span>
              ))}
            </div>
            <div style={recorderStyle}>
              <div style={pulseStyle(agentStatus === "recording")}>
                {agentStatus === "recording" ? "Listening" : "Voice"}
              </div>
              <p style={timerStyle}>
                {agentStatus === "recording"
                  ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`
                  : agentStatus === "thinking"
                    ? "Creating draft..."
                    : interview
                      ? "Existing brief found"
                      : "Ready"}
              </p>
            </div>
            <button
              type="button"
              onClick={
                agentStatus === "recording" ? stopRecording : startRecording
              }
              disabled={agentStatus === "thinking"}
              style={{
                ...form.primary,
                width: "100%",
                opacity: agentStatus === "thinking" ? 0.45 : 1,
              }}
            >
              {agentStatus === "recording" ? "Stop and draft" : "Start voice agent"}
            </button>
          </div>
        </PaperCard>

        <PaperCard>
          <SectionHeading
            label="Editable draft"
            detail={agentStatus === "draft" ? "Generated" : "Manual fallback"}
          />

          <form onSubmit={handleSubmit} style={form.grid}>
            <label>
              <span style={form.label}>Who I am</span>
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
              <span style={form.label}>Who I am looking for</span>
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

            <label>
              <span style={form.label}>What friends should know</span>
              <textarea
                value={friendsShouldKnow}
                onChange={(event) => setFriendsShouldKnow(event.target.value)}
                placeholder="The context a trusted referrer should carry into an introduction."
                style={{ ...form.textarea, minHeight: 104 }}
              />
            </label>

            <label>
              <span style={form.label}>Do not refer if</span>
              <textarea
                value={dealbreakers}
                onChange={(event) => setDealbreakers(event.target.value)}
                placeholder="Optional boundaries, written calmly."
                style={{ ...form.textarea, minHeight: 92 }}
              />
            </label>

            <label>
              <span style={form.label}>Values and lifestyle tags</span>
              <input
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="Dinner conversation, values-led, active"
                style={form.input}
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
      </div>
    </MemberScaffold>
  );
}

const layoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
  gap: 24,
  alignItems: "start",
};

const heroImageStyle: React.CSSProperties = {
  width: "100%",
  height: 250,
  objectFit: "cover",
  display: "block",
};

const agentPanelStyle: React.CSSProperties = {
  padding: 24,
};

const agentCopyStyle: React.CSSProperties = {
  margin: "0 0 16px",
  color: palette.stone,
  fontFamily: palette.body,
  fontSize: 14,
  lineHeight: 1.7,
};

const promptGridStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 22,
};

const promptChipStyle: React.CSSProperties = {
  borderRadius: 999,
  border: `1px solid ${palette.border}`,
  backgroundColor: "rgba(220,230,234,0.56)",
  color: palette.stone,
  fontFamily: palette.body,
  fontSize: 12,
  padding: "7px 10px",
};

const recorderStyle: React.CSSProperties = {
  borderRadius: 18,
  border: `1px solid ${palette.border}`,
  backgroundColor: "rgba(245,239,230,0.58)",
  padding: 18,
  display: "grid",
  placeItems: "center",
  marginBottom: 16,
};

function pulseStyle(active: boolean): React.CSSProperties {
  return {
    width: 112,
    height: 112,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    border: `1px solid ${active ? palette.teal : palette.borderHard}`,
    background: active
      ? "radial-gradient(circle, rgba(143,175,179,0.30), rgba(220,230,234,0.18))"
      : "radial-gradient(circle, rgba(255,252,244,0.85), rgba(239,231,220,0.52))",
    color: active ? palette.ink : palette.stone,
    fontFamily: palette.display,
    fontSize: 24,
  };
}

const timerStyle: React.CSSProperties = {
  margin: "12px 0 0",
  color: palette.stone,
  fontFamily: palette.mono,
  fontSize: 13,
};
