import { useState } from 'react'

export interface BarChartDatum {
  label: string
  value: number
}

/** Gráfico de barras simples em SVG puro (sem lib nova) — série única, por
 *  isso sem legenda (o título de quem usa o componente já nomeia a série).
 *  Substitui a barra de progresso (`width: %`) que o Painel de Estatísticas
 *  usava antes: aqui cada mês é uma barra de verdade, com eixo e tooltip ao
 *  passar o mouse/focar (teclado também, via `tabIndex`). */
export function BarChart({
  data,
  formatValue = (n: number) => String(n),
  height = 160,
}: {
  data: BarChartDatum[]
  formatValue?: (value: number) => string
  height?: number
}) {
  const [active, setActive] = useState<number | null>(null)

  const max = Math.max(1, ...data.map((d) => d.value))
  const barGap = 8
  const width = 600
  const chartHeight = height - 28 // reserva pro rótulo do eixo x
  const barWidth = data.length > 0 ? (width - barGap * (data.length - 1)) / data.length : 0

  if (data.length === 0) return null

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} role="img" aria-label="Gráfico de barras">
        <line x1="0" y1={chartHeight} x2={width} y2={chartHeight} className="stroke-stone-800" strokeWidth={1} />
        {data.map((d, i) => {
          const barHeight = max > 0 ? (d.value / max) * (chartHeight - 8) : 0
          const x = i * (barWidth + barGap)
          const y = chartHeight - barHeight
          return (
            <g key={i}>
              {/* Hit-target maior que a barra visível, pra facilitar hover/tap. */}
              <rect
                x={x}
                y={0}
                width={barWidth}
                height={chartHeight}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${d.label}: ${formatValue(d.value)}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="cursor-default outline-none"
              />
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                rx={Math.min(4, barWidth / 2)}
                className={`pointer-events-none transition-opacity ${active === i ? 'fill-amber-500' : 'fill-amber-600'}`}
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight + 16}
                textAnchor="middle"
                className="pointer-events-none fill-stone-500 text-[9px] capitalize"
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
      {active !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-xs whitespace-nowrap text-stone-100 shadow-lg"
          style={{
            left: `${(((active * (barWidth + barGap)) + barWidth / 2) / width) * 100}%`,
            top: `${((chartHeight - Math.max((data[active].value / max) * (chartHeight - 8), 2)) / height) * 100}%`,
          }}
        >
          {formatValue(data[active].value)}
        </div>
      )}
    </div>
  )
}
