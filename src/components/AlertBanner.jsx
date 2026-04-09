export default function AlertBanner({ status, gastado, presupuesto }) {
  if (status === 'en-control') return null

  const pct = presupuesto > 0
    ? Math.round((gastado / presupuesto) * 100)
    : 0

  const isCritical = status === 'excedido'

  return (
    <div className={`alert alert-${isCritical ? 'danger' : 'warning'}`}>
      <div className="alert-content">
        <strong>{isCritical ? '🚨 Alerta crítica' : '⚠️ Advertencia financiera'}</strong>
        <p>
          {isCritical
            ? `Ya consumiste el ${pct}% de tu presupuesto mensual. Detén gastos no esenciales y revisa tus movimientos.`
            : `Ya consumiste el ${pct}% de tu presupuesto mensual. Entra en modo precaución y evita gastos innecesarios.`}
        </p>
      </div>
    </div>
  )
}