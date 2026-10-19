// Re-mounts on each navigation, so every page fades in under the fixed header.
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>
}
