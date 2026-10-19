// Server-side allowlist for the rich text José writes in /admin (same tags
// as components/os/RichText). A plain string pass, because isomorphic-dompurify
// pulls in jsdom, which crashes on Vercel's Node runtime.
const ALLOWED = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'ul', 'ol', 'li', 'a', 'div', 'span', 'h2', 'h3'])
const SAFE_URL = /^(?:https?:|mailto:|tel:|\/|#)/i

const escapeAttr = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function safeHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|object|embed|template|noscript|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (tag, rawName: string, attrs: string) => {
      const name = rawName.toLowerCase()
      if (!ALLOWED.has(name)) return ''
      if (tag.startsWith('</')) return `</${name}>`
      if (name !== 'a') return `<${name}>`
      const href = attrs.match(/\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
      const url = (href?.[1] ?? href?.[2] ?? href?.[3] ?? '').trim()
      return SAFE_URL.test(url) ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">` : '<a>'
    })
    // Anything left that only looks like the start of a tag (e.g. '<scr' from '<scr<script>…') becomes text.
    .replace(/<(?!\/?(?:p|br|strong|b|em|i|u|s|strike|ul|ol|li|a|div|span|h2|h3)>|a href="[^"<>]*" target="_blank" rel="noopener noreferrer">)/g, '&lt;')
}
