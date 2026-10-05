import type { Metadata } from 'next'
import SolBrushStory from '@/components/sol-brush-story'

export const metadata: Metadata = {
  title: 'Sol Brush Story — Scroll Drawing',
  description: 'A scroll-led brush drawing interrupted by typewritten passages.',
}

export default function SolBrushStoryPage() {
  return <SolBrushStory />
}
