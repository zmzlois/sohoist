"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  form,
  MemberScaffold,
  PaperCard,
  palette,
  SectionHeading,
  StatusBadge,
} from "@/components/member/MemberScaffold";

type Step = "record" | "review" | "home-photos";
type RecordState = "idle" | "recording" | "processing" | "error";

async function uploadBlob(uploadUrl: string, blob: Blob): Promise<string> {
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": blob.type || "audio/webm" },
    body: blob,
  });
  if (!res.ok) throw new Error("Upload failed");
  const body = (await res.json()) as { storageId?: string };
  if (!body.storageId) throw new Error("No storageId");
  return body.storageId;
}

async function uploadImageFile(uploadUrl: string, file: File): Promise<string> {
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || "image/jpeg" },
    body: file,
  });
  if (!res.ok) throw new Error("Upload failed");
  const body = (await res.json()) as { storageId?: string };
  if (!body.storageId) throw new Error("No storageId");
  return body.storageId;
}

export default function VoiceBriefPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const sessionEmail = session?.user?.email ?? "";

  const profile = useQuery(
    api.profile.getMyProfile,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const homePhotos = useQuery(
    api.photos.getMyHomePhotos,
    sessionEmail ? { email: sessionEmail } : "skip",
  );

  const generateVoiceUploadUrl = useMutation(api.voice.generateUploadUrl);
  const generatePhotoUploadUrl = useMutation(api.photos.generateUploadUrl);
  const transcribeAndSave = useAction(api.voice.transcribeAndSave);
  const updateProfile = useMutation(api.profile.updateProfile);
  const saveHomePhoto = useMutation(api.photos.saveHomePhoto);
  const resolveHomePhotoUrl = useAction(api.photos.resolveHomePhotoUrl);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [stepDraft, setStep] = useState<Step | null>(null);
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [recordError, setRecordError] = useState("");

  const [aboutBulletsDraft, setAboutBullets] = useState<string[] | null>(null);
  const [lookingForBulletsDraft, setLookingForBullets] = useState<
    string[] | null
  >(null);
  const [savingBrief, setSavingBrief] = useState(false);
  const [briefError, setBriefError] = useState("");

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoCaption, setPhotoCaption] = useState("");
  const [localHomePhotoDrafts, setLocalHomePhotos] = useState<
    { url: string; caption?: string }[]
  >([]);

  const step = stepDraft ?? (profile?.voiceInterviewId ? "review" : "record");
  const aboutBullets =
    aboutBulletsDraft ??
    (profile?.aboutBullets?.length ? profile.aboutBullets : []);
  const lookingForBullets =
    lookingForBulletsDraft ??
    (profile?.lookingForBullets?.length ? profile.lookingForBullets : []);
  const savedHomePhotos =
    homePhotos
      ?.filter((photo) => photo.url)
      .map((photo) => ({
        url: photo.url!,
        caption: photo.caption ?? undefined,
      })) ?? [];
  const localHomePhotos = [...savedHomePhotos, ...localHomePhotoDrafts];

  useEffect(() => {
    if (recordState !== "recording") return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [recordState]);

  async function startRecording() {
    setRecordError("");
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setRecordError("Voice recording is not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        void processRecording(blob);
      };
      setElapsed(0);
      setRecordState("recording");
      recorder.start();
    } catch {
      setRecordState("error");
      setRecordError("Microphone access denied. Use the written option below.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecordState("processing");
  }

  async function processRecording(blob: Blob) {
    if (!sessionEmail) return;
    try {
      const uploadUrl = await generateVoiceUploadUrl();
      const storageId = await uploadBlob(uploadUrl, blob);
      const result = await transcribeAndSave({
        storageId,
        email: sessionEmail,
        mimeType: blob.type || "audio/webm",
        fileName: `sohoist-voice-${Date.now()}.webm`,
      });
      const { aboutBullets: ab = [], lookingForBullets: lb = [] } = result as {
        aboutBullets?: string[];
        lookingForBullets?: string[];
      };
      setAboutBullets(ab.length ? ab : [""]);
      setLookingForBullets(lb.length ? lb : [""]);
      setStep("review");
      setRecordState("idle");
    } catch {
      setRecordState("error");
      setRecordError(
        "Couldn't process the recording. Check the OpenAI key, or skip to type your answers.",
      );
    }
  }

  async function saveBrief() {
    if (!sessionEmail) return;
    setSavingBrief(true);
    setBriefError("");
    try {
      await updateProfile({
        email: sessionEmail,
        aboutBullets: aboutBullets.filter((b) => b.trim()),
        lookingForBullets: lookingForBullets.filter((b) => b.trim()),
      });
      setStep("home-photos");
    } catch {
      setBriefError("Couldn't save. Try again.");
    } finally {
      setSavingBrief(false);
    }
  }

  async function handleHomePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !sessionEmail) return;
    setUploadingPhoto(true);
    try {
      const uploadUrl = await generatePhotoUploadUrl();
      const storageId = await uploadImageFile(uploadUrl, file);
      const localUrl = URL.createObjectURL(file);
      const order = localHomePhotos.length;
      const photoId = await saveHomePhoto({
        email: sessionEmail,
        storageId,
        caption: photoCaption.trim() || undefined,
        order,
      });
      void resolveHomePhotoUrl({ email: sessionEmail, storageId, photoId });
      setLocalHomePhotos((prev) => [
        ...prev,
        { url: localUrl, caption: photoCaption.trim() || undefined },
      ]);
      setPhotoCaption("");
    } catch {
      /* silent — user sees no change */
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }

  if (profile === undefined) {
    return (
      <MemberScaffold eyebrow="Intro brief" title="Loading…" narrow>
        <PaperCard>
          <p style={{ margin: 0, color: palette.stone }}>Loading…</p>
        </PaperCard>
      </MemberScaffold>
    );
  }

  if (!profile) {
    return (
      <MemberScaffold
        eyebrow="Intro brief"
        title="Membership required."
        subtitle="Your intro brief opens after your membership is approved."
        narrow
      >
        <PaperCard>
          <a href="/application-status" style={form.primary}>
            View application status
          </a>
        </PaperCard>
      </MemberScaffold>
    );
  }

  // ── step: record ─────────────────────────────────────────────────────────────

  if (step === "record") {
    return (
      <MemberScaffold
        eyebrow="Step 2 of 3"
        title="Your intro brief."
        subtitle="Speak for 60–90 seconds answering both questions. We'll turn it into bullet points."
        narrow
      >
        <PaperCard style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 20,
            }}
          >
            {[
              {
                q: "Who I am",
                hint: "Who are you, what do you value, what's your life like?",
              },
              {
                q: "Who I am looking for",
                hint: "What kind of person, what kind of chemistry?",
              },
            ].map(({ q, hint }) => (
              <div
                key={q}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: `1px solid ${palette.border}`,
                  backgroundColor: "rgba(220,230,234,0.28)",
                }}
              >
                <p
                  style={{
                    margin: "0 0 4px",
                    fontFamily: palette.body,
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: palette.teal,
                  }}
                >
                  {q}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontFamily: palette.body,
                    fontSize: 13,
                    color: palette.stone,
                  }}
                >
                  {hint}
                </p>
              </div>
            ))}
          </div>

          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${recordState === "recording" ? palette.teal : palette.border}`,
              backgroundColor: "rgba(245,239,230,0.56)",
              padding: 24,
              display: "grid",
              placeItems: "center",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                border: `1px solid ${recordState === "recording" ? palette.teal : palette.borderHard}`,
                background:
                  recordState === "recording"
                    ? "radial-gradient(circle, rgba(143,175,179,0.35), rgba(220,230,234,0.20))"
                    : "radial-gradient(circle, rgba(255,252,244,0.9), rgba(239,231,220,0.55))",
                fontFamily: palette.display,
                fontSize: 36,
                color:
                  recordState === "recording" ? palette.teal : palette.stone,
                marginBottom: 12,
              }}
            >
              {recordState === "recording" ? "●" : "○"}
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: palette.mono,
                fontSize: 13,
                color: palette.stone,
              }}
            >
              {recordState === "recording"
                ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")} — listening`
                : recordState === "processing"
                  ? "Creating your brief…"
                  : "Ready to record"}
            </p>
          </div>

          <button
            type="button"
            onClick={
              recordState === "recording" ? stopRecording : startRecording
            }
            disabled={recordState === "processing"}
            style={{
              ...form.primary,
              width: "100%",
              textAlign: "center",
              opacity: recordState === "processing" ? 0.45 : 1,
            }}
          >
            {recordState === "recording"
              ? "Done — create my brief"
              : recordState === "processing"
                ? "Processing…"
                : "Start recording"}
          </button>

          {recordError && (
            <p style={{ ...form.error, marginTop: 10 }}>{recordError}</p>
          )}
        </PaperCard>

        <button
          type="button"
          onClick={() => {
            setAboutBullets(profile.aboutBullets ?? [""]);
            setLookingForBullets(profile.lookingForBullets ?? [""]);
            setStep("review");
          }}
          style={{ ...form.secondary, width: "100%", textAlign: "center" }}
        >
          Skip — write my brief instead
        </button>
      </MemberScaffold>
    );
  }

  // ── step: review bullets ──────────────────────────────────────────────────────

  if (step === "review") {
    return (
      <MemberScaffold
        eyebrow="Step 2 of 3"
        title="Review your brief."
        subtitle="Edit until these sound exactly like you. These bullets are what trusted people will read."
        narrow
      >
        <PaperCard style={{ marginBottom: 16 }}>
          <SectionHeading
            label="Who I am"
            detail={
              <StatusBadge tone="teal">
                {aboutBullets.filter(Boolean).length} bullets
              </StatusBadge>
            }
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {(aboutBullets.length ? aboutBullets : [""]).map((bullet, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
              >
                <span
                  style={{
                    fontFamily: palette.body,
                    fontSize: 14,
                    color: palette.stone,
                    paddingTop: 12,
                    flexShrink: 0,
                  }}
                >
                  –
                </span>
                <textarea
                  value={bullet}
                  onChange={(e) => {
                    const updated = [...aboutBullets];
                    updated[i] = e.target.value;
                    setAboutBullets(updated);
                  }}
                  rows={2}
                  style={{ ...form.textarea, minHeight: 56, flex: 1 }}
                />
                {aboutBullets.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setAboutBullets(aboutBullets.filter((_, j) => j !== i))
                    }
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: palette.stone,
                      fontSize: 20,
                      paddingTop: 8,
                      opacity: 0.4,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAboutBullets([...aboutBullets, ""])}
            style={{
              ...form.secondary,
              fontSize: 12,
              padding: "0 14px",
              minHeight: 36,
            }}
          >
            + Add bullet
          </button>
        </PaperCard>

        <PaperCard style={{ marginBottom: 16 }}>
          <SectionHeading
            label="Who I am looking for"
            detail={
              <StatusBadge tone="teal">
                {lookingForBullets.filter(Boolean).length} bullets
              </StatusBadge>
            }
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {(lookingForBullets.length ? lookingForBullets : [""]).map(
              (bullet, i) => (
                <div
                  key={i}
                  style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
                >
                  <span
                    style={{
                      fontFamily: palette.body,
                      fontSize: 14,
                      color: palette.stone,
                      paddingTop: 12,
                      flexShrink: 0,
                    }}
                  >
                    –
                  </span>
                  <textarea
                    value={bullet}
                    onChange={(e) => {
                      const updated = [...lookingForBullets];
                      updated[i] = e.target.value;
                      setLookingForBullets(updated);
                    }}
                    rows={2}
                    style={{ ...form.textarea, minHeight: 56, flex: 1 }}
                  />
                  {lookingForBullets.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setLookingForBullets(
                          lookingForBullets.filter((_, j) => j !== i),
                        )
                      }
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: palette.stone,
                        fontSize: 20,
                        paddingTop: 8,
                        opacity: 0.4,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ),
            )}
          </div>
          <button
            type="button"
            onClick={() => setLookingForBullets([...lookingForBullets, ""])}
            style={{
              ...form.secondary,
              fontSize: 12,
              padding: "0 14px",
              minHeight: 36,
            }}
          >
            + Add bullet
          </button>
        </PaperCard>

        {briefError && (
          <p style={{ ...form.error, marginBottom: 12 }}>{briefError}</p>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => setStep("record")}
            style={{ ...form.secondary, flex: 1, textAlign: "center" }}
          >
            ← Re-record
          </button>
          <button
            type="button"
            onClick={saveBrief}
            disabled={savingBrief}
            style={{
              ...form.primary,
              flex: 2,
              textAlign: "center",
              opacity: savingBrief ? 0.45 : 1,
            }}
          >
            {savingBrief ? "Saving…" : "This sounds like me →"}
          </button>
        </div>
      </MemberScaffold>
    );
  }

  // ── step: home photos ─────────────────────────────────────────────────────────

  return (
    <MemberScaffold
      eyebrow="Step 3 of 3"
      title="Your home."
      subtitle="Research shows people with similar home aesthetics connect more naturally. Share a few photos of your space — living room, bookshelf, desk, kitchen."
      narrow
    >
      <PaperCard style={{ marginBottom: 16 }}>
        <SectionHeading
          label="Home photos"
          detail={
            <StatusBadge tone="neutral">
              {localHomePhotos.length} added
            </StatusBadge>
          }
        />

        {localHomePhotos.length > 0 && (
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            style={{ marginBottom: 16 }}
          >
            {localHomePhotos.map((photo, i) => (
              <div
                key={i}
                style={{
                  position: "relative",
                  borderRadius: 12,
                  overflow: "hidden",
                  aspectRatio: "4/3",
                  backgroundColor: "rgba(220,230,234,0.4)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption ?? `Home photo ${i + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {photo.caption && (
                  <p
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      margin: 0,
                      padding: "6px 8px",
                      fontFamily: palette.body,
                      fontSize: 10,
                      color: palette.paper,
                      backgroundColor: "rgba(43,42,40,0.55)",
                    }}
                  >
                    {photo.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {localHomePhotos.length < 6 && (
          <div style={{ marginBottom: 4 }}>
            <input
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              placeholder="Optional caption (e.g. 'My reading corner')"
              style={{ ...form.input, marginBottom: 10 }}
            />
            <label
              style={{
                display: "block",
                border: `1px dashed rgba(93,90,87,0.28)`,
                borderRadius: 14,
                padding: "18px",
                textAlign: "center",
                cursor: uploadingPhoto ? "default" : "pointer",
                fontFamily: palette.body,
                fontSize: 13,
                color: palette.stone,
                opacity: uploadingPhoto ? 0.5 : 1,
              }}
            >
              {uploadingPhoto ? "Uploading…" : "+ Add a home photo"}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                disabled={uploadingPhoto}
                onChange={handleHomePhotoUpload}
              />
            </label>
          </div>
        )}

        <p
          style={{
            margin: "10px 0 0",
            fontFamily: palette.body,
            fontSize: 11,
            color: palette.stone,
            opacity: 0.55,
            lineHeight: 1.6,
          }}
        >
          Up to 6 photos. Only visible to people you share your profile with.
        </p>
      </PaperCard>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={() => setStep("review")}
          style={{ ...form.secondary, flex: 1, textAlign: "center" }}
        >
          ← Back to brief
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/shared-preview")}
          style={{ ...form.primary, flex: 2, textAlign: "center" }}
        >
          {localHomePhotos.length === 0
            ? "Skip for now →"
            : "Preview my profile →"}
        </button>
      </div>
    </MemberScaffold>
  );
}
