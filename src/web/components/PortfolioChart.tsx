import React, { useState, useRef, useMemo, useCallback } from 'react';
import type { ChartPoint, Change24hInfo } from '../../core/chart.js';

interface Props {
  points: ChartPoint[];
  change24h: Change24hInfo;
  onHoverPoint?: (point: ChartPoint | null) => void;
}

export const PortfolioChart: React.FC<Props> = ({
  points,
  change24h,
  onHoverPoint,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Lebar dan tinggi kanvas SVG
  const width = 360;
  const height = 80;
  const paddingY = 12;

  // Warna dinamis berdasarkan tren 24 jam
  const chartColor = useMemo(() => {
    if (change24h.isNeutral) return '#705BFF'; // Rabby Primary Purple
    return change24h.isPositive ? '#10B981' : '#EF4444'; // Green or Red
  }, [change24h]);

  // Koordinat ternormalisasi untuk SVG
  const coords = useMemo(() => {
    if (points.length === 0) return [];

    const values = points.map((p) => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal;

    const availableHeight = height - paddingY * 2;

    return points.map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      let y = height / 2;

      if (range > 0) {
        // Balikkan sumbu Y (karena SVG Y=0 berada di atas)
        y = height - paddingY - ((p.value - minVal) / range) * availableHeight;
      }

      return { x, y, point: p };
    });
  }, [points, width, height, paddingY]);

  // Bangun path kurva Bezier halus
  const { linePath, areaPath } = useMemo(() => {
    if (coords.length < 2) {
      return { linePath: `M 0 ${height / 2} L ${width} ${height / 2}`, areaPath: '' };
    }

    let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;

    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const midX = (curr.x + next.x) / 2;

      // Smooth horizontal tangent cubic bezier
      d += ` C ${midX.toFixed(1)} ${curr.y.toFixed(1)}, ${midX.toFixed(1)} ${next.y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
    }

    const first = coords[0];
    const last = coords[coords.length - 1];
    const area = `${d} L ${last.x.toFixed(1)} ${height} L ${first.x.toFixed(1)} ${height} Z`;

    return { linePath: d, areaPath: area };
  }, [coords, width, height]);

  // Penanganan interaksi scrubbing mouse/touch
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!svgRef.current || coords.length === 0) return;

      const rect = svgRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, relativeX / rect.width));
      const idx = Math.round(ratio * (coords.length - 1));

      if (idx >= 0 && idx < coords.length) {
        setHoverIndex(idx);
        onHoverPoint?.(coords[idx].point);
      }
    },
    [coords, onHoverPoint]
  );

  const handlePointerLeave = useCallback(() => {
    setHoverIndex(null);
    onHoverPoint?.(null);
  }, [onHoverPoint]);

  const activeCoord = hoverIndex !== null && coords[hoverIndex] ? coords[hoverIndex] : null;

  return (
    <div className="rabby-chart-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="rabby-chart-svg"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerMove}
      >
        <defs>
          <linearGradient id="rabbyChartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColor} stopOpacity="0.22" />
            <stop offset="85%" stopColor={chartColor} stopOpacity="0.02" />
            <stop offset="100%" stopColor={chartColor} stopOpacity="0.00" />
          </linearGradient>
        </defs>

        {/* Area Fill */}
        {areaPath && (
          <path
            d={areaPath}
            fill="url(#rabbyChartGradient)"
            style={{ transition: 'fill 0.3s ease' }}
          />
        )}

        {/* Main Curve Line */}
        <path
          d={linePath}
          fill="none"
          stroke={chartColor}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'stroke 0.3s ease' }}
        />

        {/* Hover Scrubbing Crosshair & Dot */}
        {activeCoord && (
          <g className="rabby-chart-crosshair-group">
            {/* Vertical Guide Line */}
            <line
              x1={activeCoord.x}
              y1={0}
              x2={activeCoord.x}
              y2={height}
              stroke="rgba(112, 91, 255, 0.35)"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />

            {/* Glowing Outer Dot */}
            <circle
              cx={activeCoord.x}
              cy={activeCoord.y}
              r={7}
              fill={chartColor}
              opacity="0.3"
            />

            {/* Solid Center Dot */}
            <circle
              cx={activeCoord.x}
              cy={activeCoord.y}
              r={3.5}
              fill="#ffffff"
              stroke={chartColor}
              strokeWidth="2.2"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
