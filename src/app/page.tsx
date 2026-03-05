
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";
import Link from "next/link";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const mascot = PlaceHolderImages.find(img => img.id === 'sellers-mascot');
  
  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="z-10 w-full max-w-md space-y-8 flex flex-col items-center">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 glass">
             <Image 
                src="https://picsum.photos/seed/sellers-logo/80/80"
                alt="Sellers Logo"
                width={40}
                height={40}
                className="opacity-90"
             />
          </div>
          <h1 className="text-4xl font-headline font-bold tracking-tight text-white text-center">
            Sellers <span className="text-primary">Pulse</span>
          </h1>
          <p className="text-white/60 text-center font-medium max-w-[280px]">
            Acompanhamento digital de implantação de projetos
          </p>
        </div>

        <div className="relative group">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all duration-500" />
          <Image
            src={mascot?.imageUrl || "https://picsum.photos/seed/sellers-mascot/400/400"}
            alt="Sellers Mascot"
            width={240}
            height={240}
            className="relative transform hover:scale-105 transition-transform duration-500 cursor-pointer"
          />
        </div>

        <div className="w-full space-y-4">
          <Link href="/dashboard" className="block">
            <Button 
              className="w-full h-14 glass bg-white/5 hover:bg-white/10 text-white border-white/10 text-lg font-semibold rounded-2xl flex items-center justify-center gap-3 transition-all duration-300"
              variant="outline"
            >
              <LogIn className="w-5 h-5" />
              Entrar com Google
            </Button>
          </Link>
          <p className="text-xs text-center text-white/40 uppercase tracking-widest font-bold">
            Acesso Restrito Sellers Pulse
          </p>
        </div>
      </div>
    </main>
  );
}
