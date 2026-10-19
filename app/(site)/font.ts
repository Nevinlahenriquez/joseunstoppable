import { Plus_Jakarta_Sans } from 'next/font/google'

// One font for every public page. Pages read it as var(--font-jakarta).
export const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-jakarta',
})
