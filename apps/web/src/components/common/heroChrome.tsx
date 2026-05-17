import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { brand, logo } from "@packages/ui";
import { webImages } from "@packages/ui/assets/web";

type HeroHeaderProps = {
  right?: ReactNode;
};

export function HeroHeader({ right }: HeroHeaderProps) {
  return (
    <>
      <div style={brandWrapStyle}>
        <Link href="/" style={brandLinkStyle}>
          <span style={logoWrapStyle}>
            <Image
              src={webImages.logoMark}
              alt=""
              width={logo.webSize}
              height={logo.webSize}
              style={logoImageStyle}
            />
          </span>
          <span style={wordmarkStyle}>{brand.name}</span>
        </Link>
      </div>

      {right ? <div style={rightWrapStyle}>{right}</div> : null}
    </>
  );
}

export const heroHeaderLinkStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 13,
  fontWeight: 500,
  color: "#F5EFE6",
  textDecoration: "none",
  padding: "7px 16px",
  borderRadius: 999,
  backgroundColor: "rgba(43,42,40,0.45)",
  border: "1px solid rgba(245,239,230,0.18)",
  backdropFilter: "blur(8px)",
  display: "inline-block",
};

export const heroCtaTextStyle: CSSProperties = {
  fontFamily: "var(--font-cormorant), Cormorant, Georgia, serif",
  fontStyle: "italic",
  fontSize: 20,
  fontWeight: 400,
  lineHeight: 1,
  paddingBottom: 2,
};

const brandWrapStyle: CSSProperties = {
  position: "absolute",
  top: 28,
  left: 28,
  zIndex: 20,
};

const brandLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  textDecoration: "none",
};

const logoWrapStyle: CSSProperties = {
  width: logo.webSize,
  height: logo.webSize,
  borderRadius: "50%",
  overflow: "hidden",
  flexShrink: 0,
  boxShadow: "0 2px 12px rgba(0,0,0,0.28)",
};

const logoImageStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const wordmarkStyle: CSSProperties = {
  fontFamily: "var(--font-cormorant), Cormorant, Georgia, serif",
  fontSize: 30,
  fontWeight: 400,
  lineHeight: 1,
  color: "#F5EFE6",
  textShadow: "0 1px 10px rgba(0,0,0,0.38)",
};

const rightWrapStyle: CSSProperties = {
  position: "absolute",
  top: 28,
  right: 28,
  zIndex: 20,
};
