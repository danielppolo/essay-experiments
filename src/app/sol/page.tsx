import type { Metadata } from 'next'
import SolScrollStudy from '@/components/sol-scroll-study'

export const metadata: Metadata = {
  title: 'Sol — Scroll Drawing',
  description: 'A square-grid drawing whose lines extend and retract with scroll position.',
}

export default function SolPage() {
  return <SolScrollStudy />
}
