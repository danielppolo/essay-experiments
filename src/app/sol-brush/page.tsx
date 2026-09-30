import type { Metadata } from 'next'
import SolScrollStudy from '@/components/sol-scroll-study'

export const metadata: Metadata = {
  title: 'Sol Brush — Scroll Drawing',
  description: 'A square-grid brush drawing whose textured marks extend and retract with scroll position.',
}

export default function SolBrushPage() {
  return <SolScrollStudy brush />
}
