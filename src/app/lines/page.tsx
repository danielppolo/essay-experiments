import type { Metadata } from 'next'
import LinesScrollStudy from '@/components/lines-scroll-study'

export const metadata: Metadata = {
  title: 'Lines — Scroll Drawing',
  description: 'Fine horizontal brush lines are drawn and erased by scrolling.',
}

export default function LinesPage() {
  return <LinesScrollStudy />
}
