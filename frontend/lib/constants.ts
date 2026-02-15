export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

export const ANIMATION = {
  duration: { fast: 0.2, normal: 0.3, slow: 0.5 },
  ease: [0.16, 1, 0.3, 1] as const,
  stagger: 0.08,
  spring: { stiffness: 400, damping: 30 },
} as const
