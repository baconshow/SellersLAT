import type { Metadata } from "next";
import { Outfit, DM_Sans, Orbitron } from 'next/font/google'
import "./globals.css";
import { FirebaseClientProvider } from "@/firebase";
import { AuthProvider } from "@/contexts/AuthContext";
import { NavActionsProvider } from "@/contexts/NavActionsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
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

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['400', '700', '900'],
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
      <body className={`${outfit.variable} ${dmSans.variable} ${orbitron.variable} antialiased`} style={{ fontFamily: 'var(--font-outfit), sans-serif' }} suppressHydrationWarning>
        <ThemeProvider>
          <FirebaseClientProvider>
            <AuthProvider>
              <NavActionsProvider>
                <div className="noise" />
                {children}
                <Toaster />
              </NavActionsProvider>
            </AuthProvider>
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
