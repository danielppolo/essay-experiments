import type { Metadata } from 'next'
import SolBrushStory from '@/components/sol-brush-story'

export const metadata: Metadata = {
  title: 'Sol Brush Story — Scroll Drawing',
  description: 'A scroll-led brush drawing interrupted by typewritten passages.',
}

export default function SolBrushStoryPage() {
  const date = new Intl.DateTimeFormat('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles',
  }).format(new Date())

  return <SolBrushStory date={date} />
}
