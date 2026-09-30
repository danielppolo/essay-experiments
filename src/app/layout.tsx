import type { Metadata, Viewport } from 'next'
import './globals.css'
import './fragment-controls.css'

export const metadata: Metadata = {
  title: 'Brush Motion Atlas',
  description: 'Interactive canvas studies of dry brush marks, botanical branches, landscape lines, and typographic motion.',
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#edf1e8' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
