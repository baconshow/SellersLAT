
// Theme switching logic placeholder
export const setBrandColor = (color: string) => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--color-brand', color);
  }
};
