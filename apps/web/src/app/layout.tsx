import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import ConvexClientProvider from "./ConvexClientProvider";
import AuthSessionProvider from "./AuthSessionProvider";

/* cormorant garamond — specific garamond cut that matches the brand kit */
const cormorant = localFont({
  src: [
    {
      path: "../../../../packages/assets/fonts/CormorantGaramond-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../../packages/assets/fonts/CormorantGaramond-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../../../packages/assets/fonts/CormorantGaramond-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../packages/assets/fonts/CormorantGaramond-MediumItalic.ttf",
      weight: "500",
      style: "italic",
    },
  ],
  variable: "--font-cormorant",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-ibm-mono",
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
          ibmPlexMono.variable,
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
