import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import fs from "node:fs";
import path from "node:path";

const globalCss = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");

export const metadata = {
  title: "DesignStocker | Curated Design Resources",
  description: "A clean directory of personally rated design resources for students and early-career designers.",
  icons: {
    icon: "/DS 2.jpg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style id="designstocker-critical-css" dangerouslySetInnerHTML={{ __html: globalCss }} />
      </head>
      <body suppressHydrationWarning>
        {children}
        <SpeedInsights />
        <Analytics />
        <GoogleAnalytics gaId="G-GVZWW45DDK" />
      </body>
    </html>
  );
}
