import type { Metadata } from 'next'
import ShortLinesBlock from '@/components/short-lines-block'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Short Lines — Scroll Drawing',
  description: 'Columns of short blue brush marks drawn by scrolling, interrupted by a paragraph.',
}

export default function LinesShortPage() {
  return <main className={styles.page}>
    <ShortLinesBlock seed={613} label="First block of short blue lines" title="hello, reader" />
    <section className={styles.interlude} aria-label="Text between drawings">
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
    </section>
    <ShortLinesBlock seed={1213} label="Second block of short blue lines" />
  </main>
}
