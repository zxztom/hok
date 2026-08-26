import React, { useState, useRef, useMemo } from 'react';

interface WinRateChartProps {
  STrue: number;
  SPresent: number;
  SMax: number;
  kF: number;
  winRatesList: { score: number; label: string; rate: number }[];
  hasData?: boolean;
}

export default function WinRateChart({
  STrue,
  SPresent,
  SMax,
  kF,
  winRatesList,
  hasData = true,
}: WinRateChartProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const safeSTrue = STrue > 0 ? STrue : 1200;
  const safeKF = kF > 0 ? kF : 450;
  const isValid = hasData && STrue > 0;

  // 计算图表 X 轴范围：动态适配（不人为锁死在 3000）
  const minScore = Math.floor(Math.min(1200, safeSTrue - 200, SPresent || 1200) / 100) * 100;
  const maxScore = Math.ceil(Math.max(2400, safeSTrue + 300, SPresent || 0, SMax || 0) / 100) * 100;

  // SVG 视图尺寸
  const width = 760;
  const height = 300;
  const padding = { top: 30, right: 35, bottom: 45, left: 55 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // 坐标映射
  const getX = (score: number) => {
    return padding.left + ((score - minScore) / (maxScore - minScore)) * plotWidth;
  };

  const getY = (ratePercent: number) => {
    return padding.top + (1 - ratePercent / 100) * plotHeight;
  };

  const getRateAtScore = (score: number) => {
    return (1.0 / (1.0 + Math.pow(10.0, (score - safeSTrue) / safeKF))) * 100;
  };

  // 生成平滑曲线点（固定 80 步长采样，永远不会死循环）
  const curvePoints = useMemo(() => {
    if (!isValid) return [];
    const points: { x: number; y: number; score: number; rate: number }[] = [];
    const totalSteps = 80;
    const step = Math.max(1, (maxScore - minScore) / totalSteps);
    for (let s = minScore; s <= maxScore; s += step) {
      const rate = (1.0 / (1.0 + Math.pow(10.0, (s - safeSTrue) / safeKF))) * 100;
      points.push({
        score: s,
        rate,
        x: padding.left + ((s - minScore) / (maxScore - minScore)) * plotWidth,
        y: padding.top + (1 - rate / 100) * plotHeight,
      });
    }
    return points;
  }, [isValid, safeSTrue, safeKF, minScore, maxScore, plotWidth, plotHeight, padding.left, padding.top]);

  // 生成 SVG 路径
  const pathD = useMemo(() => {
    if (curvePoints.length === 0) return '';
    return curvePoints.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, '');
  }, [curvePoints]);

  // 生成面积路径
  const areaD = useMemo(() => {
    if (curvePoints.length === 0) return '';
    const bottomY = getY(0);
    const startX = curvePoints[0].x;
    const endX = curvePoints[curvePoints.length - 1].x;
    return `${pathD} L ${endX},${bottomY} L ${startX},${bottomY} Z`;
  }, [pathD, curvePoints]);

  // X 轴刻度
  const xTicks = useMemo(() => {
    if (!isFinite(minScore) || !isFinite(maxScore) || minScore >= maxScore) return [1200, 1400, 1600, 1800, 2000, 2200, 2400];
    const range = maxScore - minScore;
    const roughStep = range / 6;
    const step = Math.max(50, Math.ceil(roughStep / 50) * 50);
    const ticks: number[] = [];
    for (let s = minScore; s <= maxScore + 1e-5; s += step) {
      ticks.push(s);
    }
    return ticks;
  }, [minScore, maxScore]);

  if (!isValid) {
    return (
      <div
        id="section-winrate-forecast"
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '24px 16px',
          marginBottom: '16px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#e2e8f0', marginBottom: '8px' }}>
          📈 各巅峰分段单局胜率预测动态曲线
        </div>
        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
          💡 等待输入以生成交互式胜率预测曲线。
        </div>
      </div>
    );
  }

  // Y 轴刻度
  const yTicks = [0, 25, 50, 75, 100];

  // 鼠标交互事件
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;

    if (svgX >= padding.left && svgX <= width - padding.right) {
      const scoreRatio = (svgX - padding.left) / plotWidth;
      const exactScore = minScore + scoreRatio * (maxScore - minScore);
      const roundedScore = Math.round(exactScore);
      setHoverScore(roundedScore);
      setHoverPos({
        x: svgX,
        y: getY(getRateAtScore(roundedScore)),
      });
    } else {
      setHoverScore(null);
      setHoverPos(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverScore(null);
    setHoverPos(null);
  };

  const activeHoverRate = hoverScore !== null ? getRateAtScore(hoverScore) : null;

  // 关键分位点
  const keyMarkers = [
    {
      score: STrue,
      label: 'S_true (真实硬分)',
      sub: '50% 均势平衡点',
      color: '#2dd4bf',
      rate: getRateAtScore(STrue),
      isPrimary: true,
    },
    {
      score: SPresent,
      label: 'S_present (当前分)',
      sub: '当前所在积分',
      color: '#38bdf8',
      rate: getRateAtScore(SPresent),
      isPrimary: false,
    },
    {
      score: SMax,
      label: 'S_max (理论最高分)',
      sub: '上分速度归零天花板',
      color: '#f59e0b',
      rate: getRateAtScore(SMax),
      isPrimary: false,
    },
  ];

  return (
    <div
      id="section-winrate-forecast"
      style={{
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
      }}
    >
      {/* 头部标题与视图切换 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '10px',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#e2e8f0' }}>
            各巅峰分段单局胜率预测动态曲线
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            鼠标悬浮图表任意位置，即可实时交互查看对应分数下的预测单局胜率
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#1e293b', padding: '2px', borderRadius: '6px' }}>
          <button
            id="btn-view-chart"
            onClick={() => setViewMode('chart')}
            style={{
              backgroundColor: viewMode === 'chart' ? '#0284c7' : 'transparent',
              color: viewMode === 'chart' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: viewMode === 'chart' ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
          >
            📈 曲线图表
          </button>
          <button
            id="btn-view-table"
            onClick={() => setViewMode('table')}
            style={{
              backgroundColor: viewMode === 'table' ? '#0284c7' : 'transparent',
              color: viewMode === 'table' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: viewMode === 'table' ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
          >
            📋 数据明细表
          </button>
        </div>
      </div>

      {viewMode === 'chart' ? (
        <div>
          {/* 交互式 SVG 胜率曲线图 */}
          <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              style={{
                width: '100%',
                minWidth: '600px',
                height: 'auto',
                display: 'block',
                cursor: 'crosshair',
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                {/* 曲线下方渐变背景 */}
                <linearGradient id="winrate-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#0284c7" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                </linearGradient>

                {/* 50% 基准线光效 */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* 背景网格线 */}
              {yTicks.map((yVal) => (
                <g key={`grid-y-${yVal}`}>
                  <line
                    x1={padding.left}
                    y1={getY(yVal)}
                    x2={width - padding.right}
                    y2={getY(yVal)}
                    stroke={yVal === 50 ? '#3b82f6' : '#1e293b'}
                    strokeWidth={yVal === 50 ? 1.5 : 1}
                    strokeDasharray={yVal === 50 ? '4 4' : undefined}
                    strokeOpacity={yVal === 50 ? 0.7 : 0.8}
                  />
                  <text
                    x={padding.left - 8}
                    y={getY(yVal) + 4}
                    fill={yVal === 50 ? '#60a5fa' : '#64748b'}
                    fontSize="11"
                    textAnchor="end"
                    fontWeight={yVal === 50 ? 'bold' : 'normal'}
                  >
                    {yVal}%
                  </text>
                </g>
              ))}

              {xTicks.map((xVal) => (
                <g key={`grid-x-${xVal}`}>
                  <line
                    x1={getX(xVal)}
                    y1={padding.top}
                    x2={getX(xVal)}
                    y2={height - padding.bottom}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <text
                    x={getX(xVal)}
                    y={height - padding.bottom + 18}
                    fill="#64748b"
                    fontSize="11"
                    textAnchor="middle"
                  >
                    {xVal}
                  </text>
                </g>
              ))}

              {/* X 轴和 Y 轴轴线 */}
              <line
                x1={padding.left}
                y1={height - padding.bottom}
                x2={width - padding.right}
                y2={height - padding.bottom}
                stroke="#334155"
                strokeWidth="1.5"
              />
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={height - padding.bottom}
                stroke="#334155"
                strokeWidth="1.5"
              />

              {/* 曲线与阴影面积 */}
              <path d={areaD} fill="url(#winrate-gradient)" />
              <path
                d={pathD}
                fill="none"
                stroke="#2dd4bf"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* 50% 胜率平衡线文字说明 */}
              <text
                x={width - padding.right - 6}
                y={getY(50) - 6}
                fill="#60a5fa"
                fontSize="11"
                textAnchor="end"
                fontWeight="500"
              >
                50% 均势平衡胜率基准线
              </text>

              {/* 关键分段垂直标记线与标点 */}
              {keyMarkers.map((marker, i) => {
                const mx = getX(marker.score);
                const my = getY(marker.rate);
                if (mx < padding.left || mx > width - padding.right) return null;

                return (
                  <g key={`marker-${i}`}>
                    {/* 垂直指示虚线 */}
                    <line
                      x1={mx}
                      y1={padding.top}
                      x2={mx}
                      y2={height - padding.bottom}
                      stroke={marker.color}
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      strokeOpacity="0.75"
                    />

                    {/* 点光晕 */}
                    <circle cx={mx} cy={my} r="6" fill={marker.color} fillOpacity="0.25" />
                    {/* 实体中心点 */}
                    <circle cx={mx} cy={my} r="4" fill={marker.color} stroke="#0f172a" strokeWidth="1.5" />

                    {/* 顶部标签 */}
                    <rect
                      x={mx - 36}
                      y={padding.top - 20}
                      width="72"
                      height="16"
                      rx="3"
                      fill="#0f172a"
                      stroke={marker.color}
                      strokeWidth="1"
                    />
                    <text
                      x={mx}
                      y={padding.top - 8}
                      fill={marker.color}
                      fontSize="9.5"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {marker.score.toFixed(0)}分
                    </text>
                  </g>
                );
              })}

              {/* 鼠标悬浮竖线与当前高亮圆点 */}
              {hoverPos && hoverScore !== null && activeHoverRate !== null && (
                <g>
                  {/* 悬浮十字垂线 */}
                  <line
                    x1={hoverPos.x}
                    y1={padding.top}
                    x2={hoverPos.x}
                    y2={height - padding.bottom}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    strokeOpacity="0.8"
                  />
                  {/* 高亮圆环 */}
                  <circle cx={hoverPos.x} cy={hoverPos.y} r="7" fill="#ffffff" fillOpacity="0.3" filter="url(#glow)" />
                  <circle cx={hoverPos.x} cy={hoverPos.y} r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
                </g>
              )}
            </svg>

            {/* 鼠标悬浮时的浮动气泡 Tooltip */}
            {hoverPos && hoverScore !== null && activeHoverRate !== null && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(hoverPos.x / width) * 100}%`,
                  top: `${(hoverPos.y / height) * 100}%`,
                  transform: hoverPos.x > width * 0.65 ? 'translate(-105%, -110%)' : 'translate(8%, -110%)',
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1.5px solid #38bdf8',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  pointerEvents: 'none',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                  zIndex: 20,
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '4px' }}>
                  巅峰积分: <span style={{ color: '#38bdf8' }}>{hoverScore} 分</span>
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>单局预测胜率:</span>
                  <strong style={{ color: activeHoverRate >= 50 ? '#4ade80' : '#f87171', fontSize: '13px' }}>
                    {activeHoverRate.toFixed(2)}%
                  </strong>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  与真实硬分差值:{' '}
                  <span style={{ color: hoverScore - STrue > 0 ? '#fb923c' : '#2dd4bf' }}>
                    {hoverScore - STrue >= 0 ? `+${(hoverScore - STrue).toFixed(0)} 分` : `${(hoverScore - STrue).toFixed(0)} 分`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 图例说明栏 */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '16px',
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid #1e293b',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#2dd4bf', display: 'inline-block' }} />
              <span style={{ color: '#cbd5e1' }}>
                <strong>S_true (真实硬分)</strong>: {STrue.toFixed(1)}分 (50%胜率基准)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#38bdf8', display: 'inline-block' }} />
              <span style={{ color: '#cbd5e1' }}>
                <strong>S_present (当前分)</strong>: {SPresent.toFixed(0)}分 (胜率 {getRateAtScore(SPresent).toFixed(1)}%)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
              <span style={{ color: '#cbd5e1' }}>
                <strong>S_max (理论最高分)</strong>: {SMax.toFixed(1)}分 (胜率 {getRateAtScore(SMax).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* 数据明细表 */
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '13px' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>巅峰分段</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>单局预测胜率</th>
            </tr>
          </thead>
          <tbody>
            {winRatesList.map((item) => {
              const isCurrent = item.label.includes('当前');
              const isHighWin = item.rate >= 50;

              return (
                <tr
                  key={item.score}
                  style={{
                    borderBottom: '1px solid #1e293b',
                    backgroundColor: isCurrent ? '#1e293b' : 'transparent',
                  }}
                >
                  <td style={{ padding: '8px', textAlign: 'left', fontWeight: isCurrent ? 'bold' : '500' }}>
                    <span style={{ color: isCurrent ? '#38bdf8' : '#e2e8f0' }}>
                      {item.label} 分
                    </span>
                    {isCurrent && (
                      <span
                        style={{
                          marginLeft: '6px',
                          fontSize: '11px',
                          backgroundColor: '#0284c7',
                          color: '#fff',
                          padding: '1px 6px',
                          borderRadius: '3px',
                        }}
                      >
                        当前分段
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '8px',
                      textAlign: 'right',
                      fontWeight: 'bold',
                      fontSize: '15px',
                      color: isHighWin ? '#4ade80' : '#f87171',
                    }}
                  >
                    {item.rate.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
