// Shared frame for the legal pages: a plain, readable column.
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <section className="sec legal">
      <div className="wrap">
        <div className="head">
          <span className="eyebrow">Legal</span>
          <h1 className="disp">{title}</h1>
          <p className="micro">Última actualización: {updated}</p>
          <p className="micro" data-en>This page is in Spanish, the language of the contract. Message José on WhatsApp for an English summary.</p>
        </div>
        <div className="prose">{children}</div>
      </div>
    </section>
  )
}
