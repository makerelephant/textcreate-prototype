import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-geist",
});

export const metadata = {
  title: "In Motion — Visual Collections",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body style={{ fontFamily: "var(--font-geist), system-ui, -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
