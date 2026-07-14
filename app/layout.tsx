import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import AuthProvider from "@/components/AuthProvider";
import { DirtyFormProvider } from "@/components/DirtyFormContext";
import ThemeApplier from "@/components/ThemeApplier";
import NumberInputWheelGuard from "@/components/NumberInputWheelGuard";

// Body font — clean, modern, similar readability to Calibri/Aptos
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
  display: "swap",
});

// Display font — rounded, pretty, used for headings and titles
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

// A malformed APP_URL env var (missing protocol, stray whitespace, etc.) would otherwise
// throw at build time via `new URL()` and fail the entire production build — fall back to
// the known-good default instead of letting one bad env var take the whole site down.
function safeMetadataBase(): URL {
  try {
    return new URL(process.env.APP_URL || "https://sportlogrun.vercel.app");
  } catch {
    return new URL("https://sportlogrun.vercel.app");
  }
}

export const metadata: Metadata = {
  metadataBase: safeMetadataBase(),
  title: "SportLogRun — Exercise Tracker",
  description: "Personal exercise and run tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    title: "SportLogRun",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F172A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${jakarta.variable} ${outfit.variable}`}>
      <body className="min-h-full bg-[#0F172A] text-[#F1F5F9]">
        <AuthProvider>
          <ThemeApplier />
          <NumberInputWheelGuard />
          <DirtyFormProvider>
            <div className="flex min-h-screen">
              <Nav />
              <main className="flex-1 md:ml-56 p-3 md:p-6 main-content w-full min-w-0">
                {children}
              </main>
            </div>
          </DirtyFormProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
