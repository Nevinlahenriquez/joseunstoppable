import TrafficPanel from '../TrafficPanel'

export default function InsightsPage() {
  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="os-page-header">
        <div>
          <h1 className="os-page-title">Estadísticas</h1>
          <p className="os-page-sub">Visitas a la web, fuentes de tráfico y conversión de cada embudo.</p>
        </div>
      </div>
      <TrafficPanel />
    </div>
  )
}
