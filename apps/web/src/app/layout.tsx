import type { Metadata } from "next";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import "./globals.css";
import ConvexClientProvider from "./ConvexClientProvider";
import AuthSessionProvider from "./AuthSessionProvider";

/* cormorant — shared brand display font */
const cormorant = localFont({
  src: [
    {
      path: "../../../../packages/assets/fonts/Cormorant-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../packages/assets/fonts/Cormorant-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../../../packages/assets/fonts/Cormorant-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../../../packages/assets/fonts/Cormorant-SemiBoldItalic.ttf",
      weight: "600",
      style: "italic",
    },
  ],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = localFont({
  src: [
    {
      path: "../../../../packages/ui/assets/fonts/Inter-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../packages/ui/assets/fonts/Inter-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../packages/ui/assets/fonts/Inter-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../../../packages/ui/assets/fonts/Inter-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sohoist — Private Introductions",
  description:
    "A private introduction network where trusted people make thoughtful matches.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={cn(
          cormorant.variable,
          inter.variable,
          "font-body antialiased",
        )}
      >
        <AuthSessionProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
