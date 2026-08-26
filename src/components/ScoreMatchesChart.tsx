import React, { useState, useRef, useMemo } from 'react';
import { RankDynamicsAnalyzer } from '../engine';

interface ScoreMatchesChartProps {
  STrue: number;
  SPresent: number;
  SPlacement: number;
  SMax: number;
  kF: number;
  PBar: number;
  MEP: number;
  currentN: number;
  hasData?: boolean;
}

export default function ScoreMatchesChart({
  STrue,
  SPresent,
  SPlacement,
  SMax,
  kF,
  PBar,
  MEP,
  currentN,
  hasData = true,
}: ScoreMatchesChartProps) {
  // 双向计算器状态
  const [calcMode, setCalcMode] = useState<'scoreToMatches' | 'matchesToScore'>('scoreToMatches');
  const [targetScoreInput, setTargetScoreInput] = useState<string>('');
  const [deltaMatchesInput, setDeltaMatchesInput] = useState<string>('50');

  // 图表交互 Hover 状态
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const safeSTrue = STrue > 0 ? STrue : 1400;
  const safeSPlacement = SPlacement > 0 ? SPlacement : 1400;
  const safeSPresent = SPresent > 0 ? SPresent : safeSPlacement;
  const safeSMax = SMax > 0 ? SMax : Math.max(safeSTrue + 200, 2400);
  const safeKF = kF > 0 ? kF : 450;
  const safePBar = PBar > 0 ? PBar : 0.6;
  const safeMEP = MEP > 0 ? MEP : 1.8;
  const safeCurrentN = currentN > 0 ? currentN : 5;

  const isValid = hasData && STrue > 0;

  // 默认目标分数预设为当前分 + 100 分，或 2100 / 2300 等
  const effectiveTargetScore = useMemo(() => {
    if (targetScoreInput !== '') {
      const parsed = parseFloat(targetScoreInput);
      return isNaN(parsed) ? safeSPresent + 100 : parsed;
    }
    return Math.min(Math.round(safeSMax - 10), Math.max(safeSPlacement + 50, safeSPresent + 100));
  }, [targetScoreInput, safeSPresent, safeSMax, safeSPlacement]);

  // 1. 目标分 -> 算场数
  const scoreToMatchesResult = useMemo(() => {
    if (!isValid) return null;
    return RankDynamicsAnalyzer.calculate_delta_matches_for_target(
      safeSPresent,
      effectiveTargetScore,
      safeSTrue,
      safePBar,
      safeMEP,
      safeKF,
      safeSMax
    );
  }, [isValid, safeSPresent, effectiveTargetScore, safeSTrue, safePBar, safeMEP, safeKF, safeSMax]);

  // 2. 计划场数 -> 算目标分
  const matchesToScoreResult = useMemo(() => {
    if (!isValid) return null;
    const deltaN = parseFloat(deltaMatchesInput) || 0;
    return RankDynamicsAnalyzer.calculate_target_score_from_delta_matches(
      safeSPresent,
      deltaN,
      safeSTrue,
      safePBar,
      safeMEP,
      safeKF,
      safeSMax
    );
  }, [isValid, safeSPresent, deltaMatchesInput, safeSTrue, safePBar, safeMEP, safeKF, safeSMax]);

  // 图表数据范围计算
  const minScore = Math.floor(Math.min(safeSPlacement, 1200) / 100) * 100;
  // 最大显示分数设为 S_max - 5 分或当前分以上
  const maxScore = Math.ceil(Math.max(safeSMax, safeSPresent + 100, 2400) / 100) * 100;

  // 生成连续场数-分数曲线点 (S 从 S_placement 开始往上算到 S_max - 1)
  const trajectoryData = useMemo(() => {
    if (!isValid) return [];
    const points: { score: number; totalN: number; winRate: number; velocity: number }[] = [];
    const step = 10;
    const endS = Math.min(maxScore, safeSMax - 1);

    for (let s = minScore; s <= endS; s += step) {
      const totalN = RankDynamicsAnalyzer.get_cumulative_matches(
        s,
        safeSPlacement,
        safeSTrue,
        safePBar,
        safeMEP,
        safeKF,
        safeSMax
      );

      const winRate = (1.0 / (1.0 + Math.pow(10.0, (s - safeSTrue) / safeKF))) * 100;
      const velocity = RankDynamicsAnalyzer.get_velocity(s, safeSTrue, safePBar, safeMEP, safeKF);

      if (isFinite(totalN) && totalN >= 0 && totalN <= 2500) {
        points.push({
          score: s,
          totalN,
          winRate,
          velocity,
        });
      }
    }
    return points;
  }, [isValid, minScore, maxScore, safeSPlacement, safeSTrue, safePBar, safeMEP, safeKF, safeSMax]);

  // Y 轴范围：总场数范围
  const maxN = useMemo(() => {
    if (trajectoryData.length === 0) return 500;
    const highestDataN = trajectoryData[trajectoryData.length - 1]?.totalN || 500;
    return Math.max(
      safeCurrentN * 1.5,
      Math.min(1500, Math.ceil(highestDataN / 100) * 100)
    );
  }, [trajectoryData, safeCurrentN]);

  // SVG 尺寸
  const width = 520;
  const height = 320;
  const padding = { top: 30, right: 35, bottom: 45, left: 55 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // 坐标映射
  const getX = (score: number) => {
    return padding.left + ((score - minScore) / (maxScore - minScore)) * plotWidth;
  };

  const getY = (totalMatches: number) => {
    return padding.top + (1 - Math.min(maxN, totalMatches) / maxN) * plotHeight;
  };

  // 生成 SVG 曲线路径
  const curvePoints = useMemo(() => {
    return trajectoryData
      .filter((pt) => pt.totalN <= maxN * 1.05)
      .map((pt) => ({
        ...pt,
        x: getX(pt.score),
        y: getY(pt.totalN),
      }));
  }, [trajectoryData, maxN]);

  const pathD = useMemo(() => {
    if (curvePoints.length === 0) return '';
    return curvePoints.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, '');
  }, [curvePoints]);

  const areaD = useMemo(() => {
    if (curvePoints.length === 0) return '';
    const bottomY = getY(0);
    const startX = curvePoints[0].x;
    const endX = curvePoints[curvePoints.length - 1].x;
    return `${pathD} L ${endX},${bottomY} L ${startX},${bottomY} Z`;
  }, [pathD, curvePoints]);

  // X 轴刻度
  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let s = minScore; s <= maxScore; s += 200) {
      ticks.push(s);
    }
    return ticks;
  }, [minScore, maxScore]);

  // Y 轴刻度
  const yTicks = useMemo(() => {
    const step = Math.max(50, Math.round(maxN / 5 / 50) * 50);
    const ticks: number[] = [];
    for (let n = 0; n <= maxN; n += step) {
      ticks.push(n);
    }
    return ticks;
  }, [maxN]);

  // 鼠标交互
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || curvePoints.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;

    if (svgX >= padding.left && svgX <= width - padding.right) {
      const scoreRatio = (svgX - padding.left) / plotWidth;
      const exactScore = minScore + scoreRatio * (maxScore - minScore);
      const roundedScore = Math.round(exactScore);

      // 找到最近的数据点
      let closest = curvePoints[0];
      let minDiff = Infinity;
      for (const pt of curvePoints) {
        const diff = Math.abs(pt.score - roundedScore);
        if (diff < minDiff) {
          minDiff = diff;
          closest = pt;
        }
      }

      setHoverScore(closest.score);
      setHoverPos({
        x: closest.x,
        y: closest.y,
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

  const activeHoverData = useMemo(() => {
    if (hoverScore === null) return null;
    const totalN = RankDynamicsAnalyzer.get_cumulative_matches(
      hoverScore,
      safeSPlacement,
      safeSTrue,
      safePBar,
      safeMEP,
      safeKF,
      safeSMax
    );
    const deltaN = RankDynamicsAnalyzer.calculate_delta_matches_for_target(
      safeSPresent,
      hoverScore,
      safeSTrue,
      safePBar,
      safeMEP,
      safeKF,
      safeSMax
    );
    const winRate = (1.0 / (1.0 + Math.pow(10.0, (hoverScore - safeSTrue) / safeKF))) * 100;
    const velocity = RankDynamicsAnalyzer.get_velocity(hoverScore, safeSTrue, safePBar, safeMEP, safeKF);

    return {
      score: hoverScore,
      totalN: Number(totalN.toFixed(1)),
      deltaMatches: deltaN.deltaMatches,
      reachable: deltaN.reachable,
      winRate: Number(winRate.toFixed(1)),
      velocity: Number(velocity.toFixed(2)),
    };
  }, [hoverScore, safeSPlacement, safeSTrue, safePBar, safeMEP, safeKF, safeSMax, safeSPresent]);

  if (!isValid) {
    return (
      <div
        id="section-score-matches"
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
          📊 场数与分数对应关系全景图 & 目标场次双向测算
        </div>
        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
          💡 请在上方输入战绩数据，系统将自动生成从头开始的累计场数-巅峰分对应动力学轨迹曲线。
        </div>
      </div>
    );
  }

  // 关键标记点坐标
  const placementX = getX(safeSPlacement);
  const placementY = getY(5);

  const presentX = getX(safeSPresent);
  const presentY = getY(safeCurrentN);

  const sTrueTotalN = RankDynamicsAnalyzer.get_cumulative_matches(
    safeSTrue,
    safeSPlacement,
    safeSTrue,
    safePBar,
    safeMEP,
    safeKF,
    safeSMax
  );
  const sTrueX = getX(safeSTrue);
  const sTrueY = getY(sTrueTotalN);

  const sMaxX = getX(safeSMax);

  return (
    <div
      id="section-score-matches"
      style={{
        backgroundColor: '#0b1329',
        border: '1px solid #1e293b',
        borderRadius: '10px',
        padding: '18px 20px',
        marginBottom: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* 标题栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🚀</span>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#38bdf8' }}>
              场数 - 分数动力学对应轨迹图 & 目标场次双向测算器
            </h3>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            展示从定级赛（{safeSPlacement}分, 5场）开始全周期的累计总场数与分数演化关系，支持任意目标分数或额外场次的精确微积分双向推算。
          </p>
        </div>
      </div>

      {/* 主体两栏网格布局 (图表 + 交互计算器) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.25fr) minmax(280px, 1fr)',
          gap: '18px',
          alignItems: 'start',
        }}
      >
        {/* 左栏：动态交互曲线图 */}
        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '12px 14px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#e2e8f0' }}>
              📈 从头开始的累计总场数对应曲线 (N_total ↔ 巅峰分 S)
            </span>
            <span style={{ fontSize: '11px', color: '#38bdf8' }}>
              💡 鼠标在图上滑动查看对应数据
            </span>
          </div>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                {/* 渐变填充 */}
                <linearGradient id="scoreMatchesAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#0284c7" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                </linearGradient>

                <linearGradient id="scoreMatchesLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="60%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>

              {/* 网格水平参考线 */}
              {yTicks.map((tick) => {
                const y = getY(tick);
                return (
                  <g key={`y-${tick}`}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="#1e293b"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 4}
                      fill="#64748b"
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      {tick}场
                    </text>
                  </g>
                );
              })}

              {/* 网格垂直参考线 */}
              {xTicks.map((tick) => {
                const x = getX(tick);
                return (
                  <g key={`x-${tick}`}>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={height - padding.bottom}
                      stroke="#1e293b"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                    <text
                      x={x}
                      y={height - padding.bottom + 14}
                      fill="#64748b"
                      fontSize="10"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* 理论最高分 S_max 极限渐近虚线 */}
              {sMaxX >= padding.left && sMaxX <= width - padding.right && (
                <g>
                  <line
                    x1={sMaxX}
                    y1={padding.top}
                    x2={sMaxX}
                    y2={height - padding.bottom}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                  />
                  <text
                    x={sMaxX}
                    y={padding.top - 8}
                    fill="#f59e0b"
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    S_max ({safeSMax.toFixed(0)}) 极限
                  </text>
                </g>
              )}

              {/* 面积填充 */}
              {areaD && <path d={areaD} fill="url(#scoreMatchesAreaGrad)" />}

              {/* 轨迹曲线主线条 */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="url(#scoreMatchesLineGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* 关键标记点 1：定级赛初始点 */}
              {placementX >= padding.left && (
                <g>
                  <circle cx={placementX} cy={placementY} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                  <text x={placementX + 6} y={placementY - 6} fill="#34d399" fontSize="10" fontWeight="bold">
                    定级起点 ({safeSPlacement}分, 5场)
                  </text>
                </g>
              )}

              {/* 关键标记点 2：当前实战点 */}
              {presentX >= padding.left && presentX <= width - padding.right && (
                <g>
                  <circle cx={presentX} cy={presentY} r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
                  <text x={presentX} y={presentY - 10} fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
                    当前 ({safeSPresent}分, {safeCurrentN}场)
                  </text>
                </g>
              )}

              {/* 关键标记点 3：硬实力分 S_true 点 */}
              {sTrueX >= padding.left && sTrueX <= width - padding.right && isFinite(sTrueTotalN) && (
                <g>
                  <circle cx={sTrueX} cy={sTrueY} r="5" fill="#a855f7" stroke="#ffffff" strokeWidth="1.5" />
                  <text x={sTrueX} y={sTrueY + 14} fill="#c084fc" fontSize="10" fontWeight="bold" textAnchor="middle">
                    S_true ({safeSTrue.toFixed(0)}分)
                  </text>
                </g>
              )}

              {/* 鼠标悬浮 Hover 吸附线与圆点 */}
              {hoverPos && (
                <g>
                  <line
                    x1={hoverPos.x}
                    y1={padding.top}
                    x2={hoverPos.x}
                    y2={height - padding.bottom}
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                    opacity="0.8"
                  />
                  <line
                    x1={padding.left}
                    y1={hoverPos.y}
                    x2={width - padding.right}
                    y2={hoverPos.y}
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                    opacity="0.6"
                  />
                  <circle
                    cx={hoverPos.x}
                    cy={hoverPos.y}
                    r="6"
                    fill="#fbbf24"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              )}

              {/* X / Y 轴标签 */}
              <text
                x={width - padding.right}
                y={height - padding.bottom + 28}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="end"
              >
                巅峰分数 (分) →
              </text>
              <text
                x={padding.left - 6}
                y={padding.top - 12}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="start"
              >
                ↑ 累计总场数 (从定级开始)
              </text>
            </svg>
          </div>

          {/* 实时悬浮数据看板 */}
          <div
            style={{
              marginTop: '10px',
              backgroundColor: '#1e293b',
              border: '1px solid #38bdf8',
              borderRadius: '6px',
              padding: '8px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '12px',
            }}
          >
            {activeHoverData ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>选中分数：</span>
                  <strong style={{ color: '#fbbf24', fontSize: '14px' }}>{activeHoverData.score} 分</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>累计总场数：</span>
                  <strong style={{ color: '#38bdf8', fontSize: '14px' }}>
                    {activeHoverData.totalN >= 2000 ? '≈ ∞ 场' : `${activeHoverData.totalN} 场`}
                  </strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>较当前还需：</span>
                  <strong style={{ color: activeHoverData.deltaMatches >= 0 ? '#34d399' : '#f87171', fontSize: '13px' }}>
                    {activeHoverData.deltaMatches >= 0 ? `+${activeHoverData.deltaMatches}` : `${activeHoverData.deltaMatches}`} 场
                  </strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>预期胜率 / 速度：</span>
                  <span style={{ color: '#cbd5e1' }}>
                    {activeHoverData.winRate}% (v={activeHoverData.velocity >= 0 ? `+${activeHoverData.velocity}` : activeHoverData.velocity}分/场)
                  </span>
                </div>
              </>
            ) : (
              <div style={{ color: '#94a3b8', width: '100%', textAlign: 'center' }}>
                💡 移动鼠标至上方轨迹图任意位置，实时探查分数与累计场次对应详情
              </div>
            )}
          </div>
        </div>

        {/* 右栏：目标分数 ↔ 还需要场次 互相双向测算器 */}
        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* 计算器模式切换 Tab */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#1e293b',
              borderRadius: '6px',
              padding: '3px',
              border: '1px solid #334155',
            }}
          >
            <button
              id="tab-calc-score-to-matches"
              onClick={() => setCalcMode('scoreToMatches')}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '12px',
                fontWeight: calcMode === 'scoreToMatches' ? 'bold' : 'normal',
                backgroundColor: calcMode === 'scoreToMatches' ? '#0284c7' : 'transparent',
                color: calcMode === 'scoreToMatches' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              🎯 定目标分 → 算还需场数
            </button>
            <button
              id="tab-calc-matches-to-score"
              onClick={() => setCalcMode('matchesToScore')}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '12px',
                fontWeight: calcMode === 'matchesToScore' ? 'bold' : 'normal',
                backgroundColor: calcMode === 'matchesToScore' ? '#0284c7' : 'transparent',
                color: calcMode === 'matchesToScore' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              ⏳ 定加打场数 → 算目标分
            </button>
          </div>

          {/* 模式 1：定目标分数，算还需要打的场数 */}
          {calcMode === 'scoreToMatches' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label
                  htmlFor="input-target-score"
                  style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px', fontWeight: '500' }}
                >
                  输入目标巅峰分 (分)：
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    id="input-target-score"
                    type="number"
                    step="1"
                    placeholder={`例如 ${Math.round(safeSPresent + 100)}`}
                    value={targetScoreInput !== '' ? targetScoreInput : String(effectiveTargetScore)}
                    onChange={(e) => setTargetScoreInput(e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      border: '1.5px solid #38bdf8',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '15px',
                      fontWeight: 'bold',
                    }}
                  />
                  <button
                    onClick={() => setTargetScoreInput(String(Math.round(safeSPresent + 50)))}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#94a3b8',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '6px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    +50分
                  </button>
                  <button
                    onClick={() => setTargetScoreInput(String(Math.round(safeSPresent + 100)))}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#94a3b8',
                      border: '1px solid #475569',
                      borderRadius: '4px',
                      padding: '6px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    +100分
                  </button>
                  <button
                    onClick={() => setTargetScoreInput(String(Math.round(safeSMax - 5)))}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#f59e0b',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: '4px',
                      padding: '6px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    极限分
                  </button>
                </div>
              </div>

              {/* 测算结果展示卡片 */}
              {scoreToMatchesResult && (
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    border: scoreToMatchesResult.reachable ? '1px solid #34d399' : '1px solid #f87171',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>从当前 ({safeSPresent}分) 还需打：</span>
                    {scoreToMatchesResult.reachable ? (
                      <strong style={{ fontSize: '20px', color: '#34d399', fontWeight: '900' }}>
                        {scoreToMatchesResult.deltaMatches >= 0
                          ? `+${scoreToMatchesResult.deltaMatches} 场`
                          : `${scoreToMatchesResult.deltaMatches} 场 (降分)`}
                      </strong>
                    ) : (
                      <strong style={{ fontSize: '14px', color: '#f87171' }}>理论不可达</strong>
                    )}
                  </div>

                  {scoreToMatchesResult.reachable ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1' }}>
                        <span>到达时累计总场数：</span>
                        <strong style={{ color: '#38bdf8' }}>
                          ≈ {Math.max(5, Math.round(safeCurrentN + scoreToMatchesResult.deltaMatches))} 场
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1' }}>
                        <span>到达分段单局胜率：</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>
                          {scoreToMatchesResult.targetWinRate.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1' }}>
                        <span>到达分段期望净胜速：</span>
                        <span style={{ color: scoreToMatchesResult.targetVelocity >= 0 ? '#4ade80' : '#f87171' }}>
                          {scoreToMatchesResult.targetVelocity >= 0 ? `+${scoreToMatchesResult.targetVelocity.toFixed(2)}` : scoreToMatchesResult.targetVelocity.toFixed(2)} 分/场
                        </span>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#fca5a5', lineHeight: '1.5' }}>
                      ⚠️ {scoreToMatchesResult.reason}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 模式 2：定加打场数，算能到达的分数 */}
          {calcMode === 'matchesToScore' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label
                  htmlFor="input-delta-matches"
                  style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px', fontWeight: '500' }}
                >
                  输入计划额外加打场数 (场)：
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    id="input-delta-matches"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="例如 50"
                    value={deltaMatchesInput}
                    onChange={(e) => setDeltaMatchesInput(e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      border: '1.5px solid #38bdf8',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '15px',
                      fontWeight: 'bold',
                    }}
                  />
                  {[20, 50, 100, 200].map((n) => (
                    <button
                      key={n}
                      onClick={() => setDeltaMatchesInput(String(n))}
                      style={{
                        backgroundColor: '#1e293b',
                        color: deltaMatchesInput === String(n) ? '#38bdf8' : '#94a3b8',
                        border: deltaMatchesInput === String(n) ? '1px solid #38bdf8' : '1px solid #475569',
                        borderRadius: '4px',
                        padding: '6px 8px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      +{n}场
                    </button>
                  ))}
                </div>
              </div>

              {/* 测算结果展示卡片 */}
              {matchesToScoreResult && (
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #38bdf8',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>加打 {deltaMatchesInput || 0} 场后预期可达：</span>
                    <strong style={{ fontSize: '20px', color: '#38bdf8', fontWeight: '900' }}>
                      {matchesToScoreResult.targetScore} 分
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1' }}>
                    <span>净上分幅度：</span>
                    <strong style={{ color: '#4ade80' }}>
                      +{Number((matchesToScoreResult.targetScore - safeSPresent).toFixed(1))} 分
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1' }}>
                    <span>届时累计总场数：</span>
                    <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>
                      {safeCurrentN + (parseInt(deltaMatchesInput, 10) || 0)} 场
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1' }}>
                    <span>届时单局胜率 / 速度：</span>
                    <span style={{ color: '#cbd5e1' }}>
                      {matchesToScoreResult.targetWinRate.toFixed(1)}% ({matchesToScoreResult.targetVelocity >= 0 ? `+${matchesToScoreResult.targetVelocity.toFixed(2)}` : matchesToScoreResult.targetVelocity.toFixed(2)}分/场)
                    </span>
                  </div>

                  {matchesToScoreResult.isApproachingMax && (
                    <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '2px' }}>
                      ⚠️ 已接近理论最高极限分 ({safeSMax.toFixed(1)}分)，边际上分速度趋近于 0。
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 底部基准参考小看板 */}
          <div
            style={{
              borderTop: '1px solid #1e293b',
              paddingTop: '8px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              fontSize: '11px',
              color: '#94a3b8',
            }}
          >
            <div>当前分：<strong style={{ color: '#ffffff' }}>{safeSPresent}</strong></div>
            <div>定级分：<strong style={{ color: '#10b981' }}>{safeSPlacement} (5场)</strong></div>
            <div>硬实力分：<strong style={{ color: '#a855f7' }}>{safeSTrue.toFixed(1)}</strong></div>
            <div>理论最高：<strong style={{ color: '#f59e0b' }}>{safeSMax.toFixed(1)}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
