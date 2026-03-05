
"use client";

import { useEffect } from 'react';
import { hexToHsl } from '@/lib/utils';

interface ThemeHandlerProps {
  primaryColor?: string;
  secondaryColor?: string;
}

export function ThemeHandler({ primaryColor, secondaryColor }: ThemeHandlerProps) {
  useEffect(() => {
    const root = document.documentElement;
    if (primaryColor) {
      root.style.setProperty('--brand', hexToHsl(primaryColor));
      root.style.setProperty('--primary', hexToHsl(primaryColor));
      root.style.setProperty('--ring', hexToHsl(primaryColor));
      root.style.setProperty('--sidebar-primary', hexToHsl(primaryColor));
    } else {
      root.style.setProperty('--brand', '250 82% 60%');
      root.style.setProperty('--primary', '250 82% 60%');
    }

    if (secondaryColor) {
      root.style.setProperty('--brand-secondary', hexToHsl(secondaryColor));
    } else {
      root.style.setProperty('--brand-secondary', '260 70% 50%');
    }
  }, [primaryColor, secondaryColor]);

  return null;
}
