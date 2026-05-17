"use client";

import { useRef, useState } from "react";
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
} from "@/components/member/MemberScaffold";

// curated list of major cities worldwide
const CITIES = [
  "Amsterdam, Netherlands",
  "Athens, Greece",
  "Atlanta, USA",
  "Austin, USA",
  "Bangkok, Thailand",
  "Barcelona, Spain",
  "Beijing, China",
  "Berlin, Germany",
  "Bogotá, Colombia",
  "Boston, USA",
  "Brussels, Belgium",
  "Buenos Aires, Argentina",
  "Cairo, Egypt",
  "Cape Town, South Africa",
  "Chicago, USA",
  "Copenhagen, Denmark",
  "Dallas, USA",
  "Delhi, India",
  "Denver, USA",
  "Dubai, UAE",
  "Dublin, Ireland",
  "Edinburgh, Scotland",
  "Frankfurt, Germany",
  "Geneva, Switzerland",
  "Glasgow, Scotland",
  "Guangzhou, China",
  "Hamburg, Germany",
  "Helsinki, Finland",
  "Hong Kong",
  "Houston, USA",
  "Istanbul, Turkey",
  "Jakarta, Indonesia",
  "Johannesburg, South Africa",
  "Karachi, Pakistan",
  "Kuala Lumpur, Malaysia",
  "Lagos, Nigeria",
  "Lahore, Pakistan",
  "Lima, Peru",
  "Lisbon, Portugal",
  "London, UK",
  "Los Angeles, USA",
  "Madrid, Spain",
  "Manila, Philippines",
  "Melbourne, Australia",
  "Mexico City, Mexico",
  "Miami, USA",
  "Milan, Italy",
  "Minneapolis, USA",
  "Montreal, Canada",
  "Moscow, Russia",
  "Mumbai, India",
  "Munich, Germany",
  "Nairobi, Kenya",
  "Nashville, USA",
  "New York, USA",
  "Osaka, Japan",
  "Oslo, Norway",
  "Paris, France",
  "Prague, Czech Republic",
  "Rio de Janeiro, Brazil",
  "Rome, Italy",
  "San Francisco, USA",
  "Santiago, Chile",
  "São Paulo, Brazil",
  "Seattle, USA",
  "Seoul, South Korea",
  "Shanghai, China",
  "Singapore",
  "Stockholm, Sweden",
  "Sydney, Australia",
  "Taipei, Taiwan",
  "Tehran, Iran",
  "Tel Aviv, Israel",
  "Tokyo, Japan",
  "Toronto, Canada",
  "Vancouver, Canada",
  "Vienna, Austria",
  "Warsaw, Poland",
  "Washington DC, USA",
  "Zürich, Switzerland",
].sort();

function filterCities(query: string): string[] {
  if (!query.trim() || query.trim().length < 2) return [];
  const q = query.toLowerCase();
  return CITIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 8);
}

async function uploadFile(uploadUrl: string, file: File): Promise<string> {
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || "image/jpeg" },
    body: file,
  });
  if (!res.ok) throw new Error("Upload failed");
  const body = (await res.json()) as { storageId?: string };
  if (!body.storageId) throw new Error("No storageId returned");
  return body.storageId;
}

export default function ProfileSetupPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const sessionEmail = session?.user?.email ?? "";

  const profile = useQuery(
    api.profile.getMyProfile,
    sessionEmail ? { email: sessionEmail } : "skip",
  );
  const assets = useQuery(
    api.photos.getMyAssets,
    sessionEmail ? { email: sessionEmail } : "skip",
  );

  const saveBasicProfile = useMutation(api.profile.saveBasicProfile);
  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const savePhoto = useMutation(api.photos.savePhoto);
  const generateSketch = useAction(api.photos.generateSketchWithNanoBanana);

  const [displayNameDraft, setDisplayName] = useState<string | null>(null);
  const [cityQueryDraft, setCityQuery] = useState<string | null>(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [sketchUrl, setSketchUrl] = useState("");
  const [photoStatus, setPhotoStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const cityDropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const displayName = displayNameDraft ?? profile?.displayName ?? "";
  const cityQuery = cityQueryDraft ?? profile?.city ?? "";
  const filteredCities = filterCities(cityQuery);
  const portrait = sketchUrl || assets?.sketch?.url || "";
  const canSave =
    displayName.trim().length >= 2 && cityQuery.trim().length >= 2;

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !sessionEmail) return;

    setPhotoStatus("Uploading…");
    setError("");
    try {
      const uploadUrl = await generateUploadUrl();
      const storageId = await uploadFile(uploadUrl, file);
      await savePhoto({ storageId, email: sessionEmail });

      setPhotoStatus("Generating pencil portrait…");
      const result = await generateSketch({
        photoStorageId: storageId,
        email: sessionEmail,
      });
      setSketchUrl(result.url ?? "");
      setPhotoStatus("Portrait ready.");
    } catch {
      setError("Couldn't process the photo. Try a different one.");
      setPhotoStatus("");
    } finally {
      e.target.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || !sessionEmail) return;

    setSaving(true);
    setError("");
    try {
      await saveBasicProfile({
        email: sessionEmail,
        displayName: displayName.trim(),
        city: cityQuery.trim(),
      });
      router.push("/dashboard/voice");
    } catch {
      setError("Couldn't save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (profile === undefined) {
    return (
      <MemberScaffold eyebrow="Profile" title="Setting up your profile." narrow>
        <PaperCard>
          <p style={{ margin: 0, color: palette.stone }}>Loading…</p>
        </PaperCard>
      </MemberScaffold>
    );
  }

  if (!profile) {
    return (
      <MemberScaffold eyebrow="Profile" title="Membership required." narrow>
        <PaperCard>
          <p style={{ margin: "0 0 18px", color: palette.stone }}>
            Your profile opens after your membership is approved.
          </p>
          <a href="/application-status" style={form.primary}>
            View application status
          </a>
        </PaperCard>
      </MemberScaffold>
    );
  }

  return (
    <MemberScaffold
      eyebrow="Step 1 of 3"
      title="Your profile."
      subtitle="A name, a city, and a portrait. Private by default."
      narrow
    >
      <form onSubmit={handleSave}>
        <PaperCard style={{ marginBottom: 16 }}>
          <SectionHeading label="Portrait" />

          <div
            style={{
              borderRadius: 14,
              overflow: "hidden",
              marginBottom: 12,
              backgroundColor: portrait
                ? "rgba(245,239,230,0.72)"
                : "rgba(220,230,234,0.4)",
              border: portrait
                ? `1px solid ${palette.border}`
                : `1px dashed rgba(93,90,87,0.28)`,
              minHeight: portrait ? 0 : 160,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {portrait ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={portrait}
                  alt="Your pencil portrait"
                  style={{
                    width: "100%",
                    maxHeight: 420,
                    objectFit: "contain",
                    display: "block",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: 10,
                    left: 10,
                    fontFamily: palette.body,
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: palette.stone,
                    backgroundColor: "rgba(245,239,230,0.88)",
                    borderRadius: 999,
                    padding: "4px 9px",
                  }}
                >
                  Pencil portrait
                </span>
              </>
            ) : (
              <p
                style={{
                  fontFamily: palette.display,
                  fontStyle: "italic",
                  fontSize: 32,
                  color: palette.stone,
                  opacity: 0.28,
                  margin: 0,
                }}
              >
                Portrait
              </p>
            )}
          </div>

          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <label
              style={{
                fontFamily: palette.body,
                fontSize: 13,
                color: palette.teal,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              {portrait ? "Change photo" : "Upload a photo"}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />
            </label>
          </div>
          {photoStatus && (
            <p
              style={{
                textAlign: "center",
                fontFamily: palette.body,
                fontSize: 12,
                color: palette.stone,
                margin: "6px 0 0",
              }}
            >
              {photoStatus}
            </p>
          )}
        </PaperCard>

        <PaperCard>
          <SectionHeading label="About you" />

          <div style={form.grid}>
            <label>
              <span style={form.label}>Your name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you'd like to be introduced"
                style={form.input}
                autoComplete="off"
              />
            </label>

            {/* city input with simple dropdown */}
            <div>
              <span style={form.label}>City</span>
              <div style={{ position: "relative" }}>
                <input
                  value={cityQuery}
                  onChange={(e) => {
                    setCityQuery(e.target.value);
                    setShowCityDropdown(true);
                  }}
                  onFocus={() => setShowCityDropdown(true)}
                  onBlur={() => {
                    cityDropdownTimeout.current = setTimeout(
                      () => setShowCityDropdown(false),
                      150,
                    );
                  }}
                  placeholder="Your city"
                  style={form.input}
                  autoComplete="off"
                />
                {showCityDropdown && filteredCities.length > 0 && (
                  <div
                    role="listbox"
                    style={{
                      position: "absolute",
                      zIndex: 50,
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      backgroundColor: "#F5EFE6",
                      border: `1px solid ${palette.border}`,
                      borderRadius: 14,
                      boxShadow: "0 12px 40px rgba(70,50,30,0.10)",
                      overflow: "hidden",
                    }}
                  >
                    {filteredCities.map((city) => (
                      <div
                        key={city}
                        role="option"
                        aria-selected={cityQuery === city}
                        onMouseDown={() => {
                          if (cityDropdownTimeout.current)
                            clearTimeout(cityDropdownTimeout.current);
                          setCityQuery(city);
                          setShowCityDropdown(false);
                        }}
                        style={{
                          padding: "10px 16px",
                          fontFamily: palette.body,
                          fontSize: 13,
                          color: palette.ink,
                          cursor: "pointer",
                          borderBottom: `1px solid ${palette.border}`,
                        }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLDivElement
                          ).style.backgroundColor = "rgba(220,230,234,0.40)";
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLDivElement
                          ).style.backgroundColor = "transparent";
                        }}
                      >
                        {city}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && <p style={form.error}>{error}</p>}

            <button
              type="submit"
              disabled={!canSave || saving}
              style={{
                ...form.primary,
                opacity: canSave && !saving ? 1 : 0.45,
                cursor: canSave && !saving ? "pointer" : "default",
              }}
            >
              {saving ? "Saving…" : "Continue to your intro brief →"}
            </button>
          </div>
        </PaperCard>
      </form>
    </MemberScaffold>
  );
}
