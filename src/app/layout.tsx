import type { Metadata } from "next";
import { Outfit, DM_Sans } from 'next/font/google'
import "./globals.css";
import { FirebaseClientProvider } from "@/firebase";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600', '700'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'LAT — Live Autonomous Tracker',
  description: 'Autônomo por design. Presente em cada etapa.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${outfit.variable} ${dmSans.variable} antialiased`} style={{ fontFamily: 'var(--font-outfit), sans-serif' }} suppressHydrationWarning>
        <FirebaseClientProvider>
          <AuthProvider>
            <div className="noise" />
            {children}
            <Toaster />
          </AuthProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
