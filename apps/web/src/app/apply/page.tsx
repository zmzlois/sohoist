"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@packages/backend/convex/_generated/api";
import {
  form,
  MemberScaffold,
  PaperCard,
  palette,
  StatusBadge,
} from "@/components/member/MemberScaffold";

const RELATIONSHIP_INTENTS = [
  "A serious, committed relationship",
  "Open to seeing what happens",
  "Companionship and meaningful connection",
  "Eventually settling down, no rush",
];

export default function ApplyPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const submitApplication = useMutation(api.applications.submitApplication);

  const sessionEmail = session?.user?.email ?? "";
  const existingApplication = useQuery(
    api.applications.getMyApplication,
    sessionEmail ? { email: sessionEmail } : "skip",
  );

  const [pseudonym, setPseudonym] = useState("");
  const [city, setCity] = useState("");
  const [profession, setProfession] = useState("");
  const [relationshipIntent, setRelationshipIntent] = useState("");
  const [whySohoist, setWhySohoist] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const name =
    session?.user?.name?.trim() ||
    pseudonym.trim() ||
    sessionEmail.split("@")[0] ||
    "Member";
  const canSubmit =
    Boolean(sessionEmail) &&
    city.trim().length > 1 &&
    profession.trim().length > 1 &&
    Boolean(relationshipIntent) &&
    whySohoist.trim().length >= 20;

  useEffect(() => {
    if (existingApplication) router.replace("/application-status");
  }, [existingApplication, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      await submitApplication({
        name,
        pseudonym: pseudonym.trim() || undefined,
        email: sessionEmail,
        city: city.trim(),
        profession: profession.trim(),
        relationshipIntent,
        whySohoist: whySohoist.trim(),
      });
      router.push("/application-status");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || (sessionEmail && existingApplication === undefined)) {
    return (
      <MemberScaffold
        eyebrow="Membership"
        title="Apply privately."
        subtitle="Loading your application state."
        narrow
      >
        <PaperCard>
          <p style={{ margin: 0, color: palette.stone }}>Loading...</p>
        </PaperCard>
      </MemberScaffold>
    );
  }

  if (existingApplication) {
    return null;
  }

  return (
    <MemberScaffold
      eyebrow="Membership"
      title="Apply privately."
      subtitle="Sohoist is built for thoughtful introductions, not public browsing. Your profile stays private by default."
      narrow
    >
      <PaperCard>
        <form onSubmit={handleSubmit} style={form.grid}>
          <div style={form.twoCol}>
            <label>
              <span style={form.label}>Name</span>
              <input
                value={session?.user?.name ?? name}
                disabled
                style={{ ...form.input, opacity: 0.72 }}
              />
            </label>

            <label>
              <span style={form.label}>Preferred name</span>
              <input
                value={pseudonym}
                onChange={(event) => setPseudonym(event.target.value)}
                placeholder="Optional"
                style={form.input}
              />
            </label>
          </div>

          <div style={form.twoCol}>
            <label>
              <span style={form.label}>City</span>
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="New York, San Francisco..."
                style={form.input}
                required
              />
            </label>

            <label>
              <span style={form.label}>Profession / background</span>
              <input
                value={profession}
                onChange={(event) => setProfession(event.target.value)}
                placeholder="Founder, designer, physician..."
                style={form.input}
                required
              />
            </label>
          </div>

          <div>
            <span style={form.label}>Relationship intent</span>
            <div style={{ display: "grid", gap: 10 }}>
              {RELATIONSHIP_INTENTS.map((intent) => (
                <button
                  key={intent}
                  type="button"
                  onClick={() => setRelationshipIntent(intent)}
                  style={{
                    ...choiceStyle,
                    borderColor:
                      relationshipIntent === intent
                        ? palette.amber
                        : palette.border,
                    backgroundColor:
                      relationshipIntent === intent
                        ? "rgba(214,181,109,0.13)"
                        : "rgba(245,239,230,0.52)",
                  }}
                >
                  <span>{intent}</span>
                  {relationshipIntent === intent ? (
                    <StatusBadge tone="amber">Selected</StatusBadge>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <label>
            <span style={form.label}>Why Sohoist?</span>
            <p style={form.hint}>
              Tell us what you are looking for and why introductions through
              friends feels right.
            </p>
            <textarea
              value={whySohoist}
              onChange={(event) => setWhySohoist(event.target.value)}
              placeholder="I would rather meet someone through people who know my rhythm, my taste, and what I am actually like in real life..."
              style={form.textarea}
              required
            />
          </label>

          {error ? <p style={form.error}>{error}</p> : null}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            style={{
              ...form.primary,
              opacity: canSubmit && !submitting ? 1 : 0.45,
              cursor: canSubmit && !submitting ? "pointer" : "default",
            }}
          >
            {submitting ? "Submitting..." : "Submit application"}
          </button>
        </form>
      </PaperCard>
    </MemberScaffold>
  );
}

const choiceStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 54,
  borderRadius: 16,
  border: "1px solid",
  color: palette.ink,
  fontFamily: palette.body,
  fontSize: 14,
  padding: "12px 14px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  textAlign: "left",
  cursor: "pointer",
};
