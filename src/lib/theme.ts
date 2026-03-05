export function applyTheme(primary: string, secondary: string, rgb: string) {
  const root = document.documentElement
  root.style.setProperty('--color-brand', primary)
  root.style.setProperty('--color-brand-secondary', secondary)
  root.style.setProperty('--color-brand-rgb', rgb)
  root.style.setProperty('--color-brand-soft', `rgba(${rgb}, 0.15)`)
  root.style.setProperty('--color-brand-glow', `rgba(${rgb}, 0.35)`)
}

export function resetTheme() {
  applyTheme('#00D4AA', '#8B5CF6', '0,212,170')
}

export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '0,212,170'
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
}
