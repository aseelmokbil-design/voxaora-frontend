import type { Metadata, Viewport } from "next";
import { Cairo, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ToastProvider } from "@/context/ToastContext";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallPrompt from "@/components/InstallPrompt";
import AppShell from "@/components/AppShell";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "900"],
  variable: "--font-cairo",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VOXAORA — تحدث فقط، ودع الذكاء ينفذ",
  description: "مساعدك الشخصي الذكي للطلبات. يعرفك، يختار الأفضل لك، ويجعل حياتك أسهل وأذكى.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VOXAORA",
  },
  openGraph: {
    title: "VOXAORA — تحدث فقط، ودع الذكاء ينفذ",
    description: "يعرفك، يختار الأفضل لك، يجعل حياتك أسهل.",
    type: "website",
    locale: "ar_SA",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0A0A0F",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${inter.variable}`}>
      <body suppressHydrationWarning>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <AppShell>{children}</AppShell>
              <InstallPrompt />
              <ServiceWorkerRegister />
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
