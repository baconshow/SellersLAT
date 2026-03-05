"use client";

import { useEffect } from 'react';
import { hexToHsl } from '@/lib/utils';
import { hexToRgb } from '@/lib/theme';

interface ThemeHandlerProps {
  primaryColor?: string;
  secondaryColor?: string;
}

export function ThemeHandler({ primaryColor, secondaryColor }: ThemeHandlerProps) {
  useEffect(() => {
    const root = document.documentElement;
    if (primaryColor) {
      const rgb = hexToRgb(primaryColor);
      root.style.setProperty('--color-brand', primaryColor);
      root.style.setProperty('--color-brand-rgb', rgb);
      root.style.setProperty('--color-brand-soft', `rgba(${rgb}, 0.15)`);
      root.style.setProperty('--color-brand-glow', `rgba(${rgb}, 0.35)`);
      
      // For Shadcn HSL components
      const hsl = hexToHsl(primaryColor);
      root.style.setProperty('--primary', hsl);
    }

    if (secondaryColor) {
      root.style.setProperty('--color-brand-secondary', secondaryColor);
    }
  }, [primaryColor, secondaryColor]);

  return null;
}
