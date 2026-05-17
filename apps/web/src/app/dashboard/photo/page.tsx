"use client";

import Image from "next/image";
import { useState } from "react";
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

type SketchStyle =
  | "soft_graphite"
  | "editorial_pencil"
  | "watercolor_portrait"
  | "minimal_line";

type PhotoVisibility =
  | "sketch_only"
  | "photo_only"
  | "both"
  | "photo_after_approval";

const SKETCH_STYLES: { value: SketchStyle; label: string }[] = [
  { value: "soft_graphite", label: "Soft graphite" },
  { value: "editorial_pencil", label: "Editorial pencil" },
  { value: "watercolor_portrait", label: "Watercolor" },
  { value: "minimal_line", label: "Minimal line" },
];

const VISIBILITY_OPTIONS: { value: PhotoVisibility; label: string }[] = [
  { value: "sketch_only", label: "Sketch only" },
  { value: "photo_after_approval", label: "Photo after approval" },
  { value: "both", label: "Both" },
  { value: "photo_only", label: "Photo only" },
];

export default function PhotoSketchPage() {
  const { data: session } = useSession();
  const sessionEmail = session?.user?.email ?? "";
  const assets = useQuery(
    api.photos.getMyAssets,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const profile = useQuery(
    api.profile.getMyProfile,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const savePhoto = useMutation(api.photos.savePhoto);
  const generateSketch = useAction(api.photos.generateSketch);
  const setPhotoVisibility = useMutation(api.photos.setPhotoVisibility);

  const [photoStorageId, setPhotoStorageId] = useState("");
  const [localPreview, setLocalPreview] = useState("");
  const [style, setStyle] = useState<SketchStyle>("soft_graphite");
  const [visibility, setVisibility] =
    useState<PhotoVisibility>("sketch_only");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !sessionEmail) return;

    setStatus("Uploading photo...");
    setError("");
    setLocalPreview(URL.createObjectURL(file));

    try {
      const uploadUrl = await generateUploadUrl();
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      const { storageId } = (await uploadRes.json()) as { storageId: string };
      await savePhoto({ storageId, email: sessionEmail });
      setPhotoStorageId(storageId);
      setStatus("Photo uploaded.");
    } catch {
      setError("Upload failed. Try again.");
      setStatus("");
    }
  }

  async function handleGenerate() {
    const sourceStorageId = photoStorageId || assets?.photo?.storageId;
    if (!sourceStorageId || !sessionEmail) return;

    setStatus("Drawing your pencil portrait...");
    setError("");
    try {
      await generateSketch({
        photoStorageId: sourceStorageId,
        style,
        email: sessionEmail,
      });
      setStatus("Sketch generated.");
    } catch {
      setError(
        "Sketch generation failed. Check GEMINI_API_KEY and try again.",
      );
      setStatus("");
    }
  }

  async function handleVisibilitySave() {
    if (!sessionEmail) return;
    await setPhotoVisibility({ photoVisibility: visibility, email: sessionEmail });
    setStatus("Visibility saved.");
  }

  return (
    <MemberScaffold
      eyebrow="Pencil portrait"
      title="A softer way to be seen."
      subtitle="Upload a photo, generate a private sketch, and choose what approved viewers can see."
    >
      <div style={gridStyle}>
        <PaperCard>
          <SectionHeading
            label="Portrait"
            detail={
              assets?.sketch ? (
                <StatusBadge tone="teal">Sketch ready</StatusBadge>
              ) : (
                <StatusBadge tone="amber">Not generated</StatusBadge>
              )
            }
          />

          <div style={previewGridStyle}>
            <Preview
              label="Photo"
              src={localPreview || assets?.photo?.url || ""}
            />
            <Preview label="Sketch" src={assets?.sketch?.url || ""} />
          </div>
        </PaperCard>

        <PaperCard>
          <SectionHeading label="Create sketch" />
          <div style={form.grid}>
            <label>
              <span style={form.label}>Upload photo</span>
              <input type="file" accept="image/*" onChange={handleFile} />
            </label>

            <div>
              <span style={form.label}>Sketch style</span>
              <div style={{ display: "grid", gap: 10 }}>
                {SKETCH_STYLES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStyle(option.value)}
                    style={{
                      ...optionStyle,
                      borderColor:
                        style === option.value ? palette.amber : palette.border,
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              style={form.primary}
              onClick={handleGenerate}
              disabled={!photoStorageId && !assets?.photo}
            >
              Generate pencil sketch
            </button>

            <div>
              <span style={form.label}>Photo visibility</span>
              <div style={{ display: "grid", gap: 10 }}>
                {VISIBILITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setVisibility(option.value)}
                    style={{
                      ...optionStyle,
                      borderColor:
                        visibility === option.value
                          ? palette.teal
                          : palette.border,
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" style={form.secondary} onClick={handleVisibilitySave}>
              Save visibility
            </button>

            {status ? <p style={{ margin: 0, color: palette.teal }}>{status}</p> : null}
            {error ? <p style={form.error}>{error}</p> : null}
            {profile?.photoVisibility ? (
              <p style={form.hint}>Current setting: {profile.photoVisibility}</p>
            ) : null}
          </div>
        </PaperCard>
      </div>
    </MemberScaffold>
  );
}

function Preview({ label, src }: { label: string; src: string }) {
  return (
    <div>
      <p style={form.label}>{label}</p>
      {src ? (
        <Image
          src={src}
          alt=""
          width={600}
          height={600}
          unoptimized={src.startsWith("http")}
          style={imageStyle}
        />
      ) : (
        <div style={placeholderStyle}>Not added yet</div>
      )}
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
  gap: 24,
  alignItems: "start",
};

const previewGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const imageStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  borderRadius: 16,
  border: `1px solid ${palette.border}`,
};

const placeholderStyle: React.CSSProperties = {
  minHeight: 220,
  borderRadius: 16,
  border: `1px dashed ${palette.border}`,
  backgroundColor: "rgba(220,230,234,0.25)",
  display: "grid",
  placeItems: "center",
  color: palette.stone,
  fontFamily: palette.body,
};

const optionStyle: React.CSSProperties = {
  minHeight: 46,
  borderRadius: 14,
  border: "1px solid",
  backgroundColor: "rgba(245,239,230,0.56)",
  color: palette.ink,
  fontFamily: palette.body,
  fontSize: 14,
  textAlign: "left",
  padding: "0 14px",
  cursor: "pointer",
};
