import React, { useState, useMemo } from 'react';
import { solveDynamics, PlayerStats, CalculationResult, RankDynamicsAnalyzer, BaselineType } from './engine';
import AlgorithmManual from './components/AlgorithmManual';
import WinRateChart from './components/WinRateChart';
import ScoreMatchesChart from './components/ScoreMatchesChart';

interface ExampleProfile {
  id: string;
  name: string;
  tag: string;
  color: string;
  stats: PlayerStats;
  rawPBar: string;
  desc?: string;
}

// 精选实战纯客观战绩示例（起始基准按继承分1475计算）
const EXAMPLES: ExampleProfile[] = [
  {
    id: 'ex-1',
    name: '重庆狼队·紫幻',
    tag: '237场 2410分',
    color: '#7e22ce',
    rawPBar: '62.0',
    stats: {
      N: 237,
      P_bar: 0.620,
      S_final: 2410.0,
      S_placement: 1475.0,
      baselineType: 'inherited',
      G: 35,
      S_v: 25,
      P_5: 0,
    },
    desc: '重庆狼队·紫幻（继承1475分，237场 62.0% 2410分，金35 / 银25 / 五杀0）',
  },
  {
    id: 'ex-zongshi',
    name: '宗师 2503',
    tag: '111场 83.8%',
    color: '#b45309',
    rawPBar: '83.8',
    stats: {
      N: 111,
      P_bar: 0.838,
      S_final: 2503.0,
      S_placement: 1475.0,
      baselineType: 'inherited',
      G: 41, // 顶级7 + 金34 = 41
      S_v: 24,
      P_5: 0,
    },
    desc: '宗师 2503分（继承1475分，111场 83.8% 超高胜率通天野王，顶级7 / 金34 / 银24）',
  },
  {
    id: 'ex-qingyan',
    name: 'KSG青炎 2248',
    tag: '143场 67.1%',
    color: '#047857',
    rawPBar: '67.1',
    stats: {
      N: 143,
      P_bar: 0.671,
      S_final: 2248.0,
      S_placement: 1475.0,
      baselineType: 'inherited',
      G: 31, // 顶级3 + 金28 = 31
      S_v: 25,
      P_5: 0,
    },
    desc: 'KSG青炎 2248分（继承1475分，143场 67.1%，顶级3 / 金28 / 银25）',
  },
  {
    id: 'ex-xiaomai',
    name: '小麦 2413',
    tag: '176场 65.9%',
    color: '#0d9488',
    rawPBar: '65.9',
    stats: {
      N: 176,
      P_bar: 0.659,
      S_final: 2413.0,
      S_placement: 1475.0,
      baselineType: 'inherited',
      G: 46, // 顶级4 + 金42 = 46
      S_v: 36,
      P_5: 1, // 五杀1
    },
    desc: '小麦 2413分（继承1475分，176场 65.9%，顶级4 / 金42 / 银36 / 五杀1）',
  },
  {
    id: 'ex-jiushu',
    name: '救赎 2304',
    tag: '261场 61.3%',
    color: '#4338ca',
    rawPBar: '61.3',
    stats: {
      N: 261,
      P_bar: 0.613,
      S_final: 2304.0,
      S_placement: 1475.0,
      baselineType: 'inherited',
      G: 35, // 顶级4 + 金31 = 35
      S_v: 31,
      P_5: 0,
    },
    desc: '救赎 2304分（继承1475分，261场 61.3% 职业辅助，顶级4 / 金31 / 银31）',
  },
  {
    id: 'ex-yinuo',
    name: '一诺 2277',
    tag: '226场 60.6%',
    color: '#e11d48',
    rawPBar: '60.6',
    stats: {
      N: 226,
      P_bar: 0.606,
      S_final: 2277.0,
      S_placement: 1475.0,
      baselineType: 'inherited',
      G: 50, // 顶级3 + 金47 = 50
      S_v: 37,
      P_5: 1, // 五杀1
    },
    desc: '一诺 2277分（继承1475分，226场 60.6% 顶级射手大核，顶级3 / 金47 / 银37 / 五杀1）',
  },
  {
    id: 'ex-daozai',
    name: '道崽 2230',
    tag: '560场 55.9%',
    color: '#6d28d9',
    rawPBar: '55.9',
    stats: {
      N: 560,
      P_bar: 0.559,
      S_final: 2230.0,
      S_placement: 1475.0,
      baselineType: 'inherited',
      G: 62, // 顶级3 + 金59 = 62
      S_v: 52,
      P_5: 1, // 五杀1
    },
    desc: '道崽 2230分（继承1475分，560场 55.9% 高场次战神，顶级3 / 金59 / 银52 / 五杀1）',
  },
];

interface RawFormInputs {
  S_final: string;
  S_placement: string;
  baselineType: BaselineType;
  N: string;
  P_bar: string;
  P_5: string;
  G: string;
  S_v: string;
}

export default function App() {
  // 进入时的输入框状态（全部留空，等待用户输入；示例中保留1400）
  const [rawInputs, setRawInputs] = useState<RawFormInputs>({
    S_final: '',
    S_placement: '',
    baselineType: 'placement',
    N: '',
    P_bar: '',
    P_5: '',
    G: '',
    S_v: '',
  });
  const [activeExId, setActiveExId] = useState<string>('');

  const handleInputChange = (field: keyof RawFormInputs, value: string) => {
    setActiveExId('');
    setRawInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const loadExample = (ex: ExampleProfile) => {
    setRawInputs({
      S_final: String(ex.stats.S_final),
      S_placement: String(ex.stats.S_placement ?? 1475),
      baselineType: ex.stats.baselineType || 'inherited',
      N: String(ex.stats.N),
      P_bar: ex.rawPBar,
      P_5: String(ex.stats.P_5),
      G: String(ex.stats.G),
      S_v: String(ex.stats.S_v),
    });
    setActiveExId(ex.id);
  };

  // 清空输入框
  const clearInputs = () => {
    setRawInputs({
      S_final: '',
      S_placement: '',
      baselineType: 'placement',
      N: '',
      P_bar: '',
      P_5: '',
      G: '',
      S_v: '',
    });
    setActiveExId('');
  };

  // 解析输入并检验是否就绪
  const parsedInputs: PlayerStats = useMemo(() => {
    const S_final = parseFloat(rawInputs.S_final) || 0;
    const S_placement = parseFloat(rawInputs.S_placement) || 0;
    const N = parseInt(rawInputs.N, 10) || 0;
    const pNum = parseFloat(rawInputs.P_bar) || 0;
    const P_bar = pNum > 1 ? pNum / 100 : pNum;
    const P_5 = parseInt(rawInputs.P_5, 10) || 0;
    const G = parseInt(rawInputs.G, 10) || 0;
    const S_v = parseInt(rawInputs.S_v, 10) || 0;

    return {
      S_final,
      S_placement,
      baselineType: rawInputs.baselineType,
      N,
      P_bar,
      P_5,
      G,
      S_v,
    };
  }, [rawInputs]);

  const isReady = useMemo(() => {
    const s = parseFloat(rawInputs.S_final);
    const sInit = parseFloat(rawInputs.S_placement);
    const n = parseInt(rawInputs.N, 10);
    const p = parseFloat(rawInputs.P_bar);
    return !isNaN(s) && s > 0 && !isNaN(sInit) && sInit > 0 && !isNaN(n) && n > 0 && !isNaN(p) && p > 0;
  }, [rawInputs]);

  const result: CalculationResult | null = useMemo(() => {
    if (!isReady) return null;
    return solveDynamics(parsedInputs);
  }, [parsedInputs, isReady]);

  // 全局通用基准参数计算
  const baseParams = useMemo(() => {
    if (!isReady) {
      return { P_bar: 0.62, M_EP: 1.8, k_F: 450 };
    }
    return RankDynamicsAnalyzer.calculate_base_params(parsedInputs);
  }, [parsedInputs, isReady]);

  // 判断场均能量高于/低于全服平均 1.8
  const mepDiff = baseParams.M_EP - 1.8;
  const mepRatio = (baseParams.M_EP / 1.8).toFixed(2);

  return (
    <div
      id="calculator-root"
      style={{
        backgroundColor: '#0b0f19',
        color: '#e2e8f0',
        minHeight: '100vh',
        padding: '16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
        lineHeight: '1.5',
      }}
    >
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #1e293b',
            paddingBottom: '12px',
            marginBottom: '14px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <h1
              id="app-title"
              style={{
                fontSize: '19px',
                fontWeight: 'bold',
                color: '#38bdf8',
                margin: 0,
                letterSpacing: '0.5px',
              }}
            >
              王者荣耀巅峰赛真实硬分计算器
            </h1>
          </div>

          <button
            id="btn-clear"
            onClick={clearInputs}
            style={{
              backgroundColor: '#1e293b',
              color: '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '5px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.15s ease',
            }}
          >
            清空重填
          </button>
        </div>

        {/* 提示信息横幅 */}
        <div
          id="notice-banner"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '14px',
            fontSize: '13px',
            color: '#cbd5e1',
            lineHeight: '1.6',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '16px' }}>💡</span>
          <div>
            <strong style={{ color: '#38bdf8' }}>提示：</strong>
            <span>
              {rawInputs.baselineType === 'placement'
                ? '已选【定级赛分数】：以定级赛分数（如1400）为积分起点，按 (N - 5) 场有效场次积分。'
                : '已选【继承分数】：以赛季继承分数（如1475）为积分起点，按全量 N 场积分。'}
            </span>
          </div>
        </div>

        {/* 快速填入实战案例 */}
        <div
          id="section-examples"
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '14px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
            快速载入精选实战数据：
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {EXAMPLES.map((ex) => {
              const isSelected = activeExId === ex.id;
              return (
                <button
                  id={`btn-example-${ex.id}`}
                  key={ex.id}
                  onClick={() => loadExample(ex)}
                  style={{
                    backgroundColor: isSelected ? ex.color : '#1e293b',
                    color: isSelected ? '#ffffff' : '#cbd5e1',
                    border: isSelected ? '1px solid #ffffff' : '1px solid #334155',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{ex.name}</span>
                  <span style={{ opacity: 0.85, fontSize: '11px' }}>({ex.tag})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 核心结论看板 (S_true 硬分、积分水分、S_max 理论最高、S_present 当前分、M_E/P 能量) */}
        <div
          id="hero-r-true"
          style={{
            background: 'linear-gradient(135deg, #071e22 0%, #0f172a 100%)',
            border: '2px solid #14b8a6',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* 上层主核心指标网格：顺序为 1. S_true -> 2. 积分水分 -> 3. 理论最高分 -> 4. 当前巅峰分 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px 14px',
              alignItems: 'stretch',
              borderBottom: '1px solid rgba(51, 65, 85, 0.6)',
              paddingBottom: '14px',
              marginBottom: '12px',
            }}
          >
            {/* 1. 真实竞技硬实力分 S_true */}
            <div
              id="card-s-true"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                border: '1.5px solid rgba(45, 212, 191, 0.45)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>
                  真实竞技硬实力分 (S_true)
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    backgroundColor: 'rgba(45, 212, 191, 0.15)',
                    color: '#2dd4bf',
                    border: '1px solid rgba(45, 212, 191, 0.3)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                  }}
                >
                  50%胜率基准
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
                <span
                  id="display-r-true"
                  style={{
                    fontSize: '34px',
                    fontWeight: '900',
                    color: '#2dd4bf',
                    lineHeight: '1.1',
                    textShadow: '0 0 14px rgba(45, 212, 191, 0.3)',
                  }}
                >
                  {isReady && result ? result.R_true.toFixed(2) : '--'}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 'bold' }}>分</span>
              </div>
            </div>

            {/* 2. 积分水分 / 虚高幅度 */}
            <div
              id="card-water"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                border: isReady && result ? (result.water > 0 ? '1.5px solid rgba(248, 113, 113, 0.45)' : '1.5px solid rgba(74, 222, 128, 0.45)') : '1.5px solid rgba(148, 163, 184, 0.25)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>
                  积分水分 / 虚高幅度
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    backgroundColor: isReady && result ? (result.water > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)') : 'rgba(148, 163, 184, 0.15)',
                    color: isReady && result ? (result.water > 0 ? '#fca5a5' : '#86efac') : '#94a3b8',
                    border: isReady && result ? (result.water > 0 ? '1px solid rgba(248, 113, 113, 0.3)' : '1px solid rgba(74, 222, 128, 0.3)') : '1px solid rgba(148, 163, 184, 0.2)',
                  }}
                >
                  {isReady && result ? (result.water > 0 ? '虚高水分' : '被低估实分') : '待测算'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
                <span
                  id="display-water"
                  style={{
                    fontSize: '34px',
                    fontWeight: '900',
                    color: isReady && result ? (result.water > 0 ? '#f87171' : '#4ade80') : '#94a3b8',
                    lineHeight: '1.1',
                  }}
                >
                  {isReady && result ? (result.water > 0 ? `+${result.water.toFixed(2)}` : `${result.water.toFixed(2)}`) : '--'}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 'bold' }}>分</span>
              </div>
            </div>

            {/* 3. 理论最高分 (S_max) */}
            <div
              id="card-s-max"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                border: '1.5px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>
                  理论最高分 (S_max)
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                  }}
                >
                  ds/dN=0天花板
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
                <span
                  id="display-s-max"
                  style={{
                    fontSize: '34px',
                    fontWeight: '900',
                    color: '#f59e0b',
                    lineHeight: '1.1',
                    textShadow: '0 0 14px rgba(245, 158, 11, 0.25)',
                  }}
                >
                  {isReady && result ? result.S_max.toFixed(2) : '--'}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 'bold' }}>分</span>
              </div>
            </div>

            {/* 4. 当前巅峰分 (S_present) */}
            <div
              id="card-s-present"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                border: '1.5px solid #334155',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>
                  当前巅峰分 (S_present)
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    backgroundColor: 'rgba(148, 163, 184, 0.15)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                  }}
                >
                  当前面板
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
                <span
                  id="display-s-present"
                  style={{
                    fontSize: '34px',
                    fontWeight: '800',
                    color: '#f8fafc',
                    lineHeight: '1.1',
                  }}
                >
                  {rawInputs.S_final ? rawInputs.S_final : '--'}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 'bold' }}>分</span>
              </div>
            </div>
          </div>

          {/* 下层：M_E/P 能量产出与玩家风格诊断 */}
          <div
            id="tag-mep-beside-strue"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px 14px',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              border: isReady ? (baseParams.M_EP >= 1.8 ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(251, 146, 60, 0.5)') : '1px solid #334155',
              borderRadius: '8px',
              padding: '8px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>场均能量产出：</span>
              <strong style={{ color: '#38bdf8', fontSize: '15px' }}>
                M_E/P = {isReady ? baseParams.M_EP.toFixed(3) : '--'}
              </strong>
              <span style={{ color: '#64748b', fontSize: '11px' }}>
                (全服基准均值: 1.800)
              </span>
              {isReady && (
                <span style={{ color: mepDiff >= 0 ? '#4ade80' : '#fb923c', fontWeight: 'bold', fontSize: '12px' }}>
                  {mepDiff >= 0 ? `+${mepDiff.toFixed(2)} (${mepRatio}x 均值)` : `${mepDiff.toFixed(2)} (${mepRatio}x 均值)`}
                </span>
              )}
            </div>

            <span
              style={{
                fontSize: '12px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 'bold',
                backgroundColor: !isReady
                  ? 'rgba(148, 163, 184, 0.15)'
                  : baseParams.M_EP >= 2.0
                  ? 'rgba(56, 189, 248, 0.2)'
                  : baseParams.M_EP >= 1.7
                  ? 'rgba(45, 212, 191, 0.15)'
                  : 'rgba(251, 146, 60, 0.2)',
                color: !isReady
                  ? '#94a3b8'
                  : baseParams.M_EP >= 2.0
                  ? '#38bdf8'
                  : baseParams.M_EP >= 1.7
                  ? '#2dd4bf'
                  : '#fb923c',
                border: !isReady
                  ? '1px solid #475569'
                  : baseParams.M_EP >= 2.0
                  ? '1px solid #38bdf8'
                  : baseParams.M_EP >= 1.7
                  ? '1px solid #2dd4bf'
                  : '1px solid #fb923c',
              }}
            >
              {!isReady
                ? '等待输入战绩数据'
                : baseParams.M_EP >= 2.1
                ? '🔥 极强核心 Carry 型玩家'
                : baseParams.M_EP >= 1.8
                ? '⚡ 偏 Carry 进攻型玩家'
                : baseParams.M_EP >= 1.5
                ? '🛡️ 扎实团队抗压/辅助型玩家'
                : '🛡️ 纯团队贡献/蓝领型玩家'}
            </span>
          </div>
        </div>

        {/* 基础战绩数据输入表单 与 上赛季继承分规则 */}
        <div
          id="section-inputs"
          style={{
            backgroundColor: '#0f172a',
            border: '1.5px solid #14b8a6',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '15px',
              color: '#2dd4bf',
              borderBottom: '1px solid #1e293b',
              paddingBottom: '8px',
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span>基础战绩数据输入</span>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'normal' }}>
              支持手动输入或点击右侧继承规则快捷填入
            </span>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'stretch' }}>
            {/* 左侧：输入字段 */}
            <div style={{ flex: '1 1 520px', minWidth: '280px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px 18px' }}>
                {/* 1. S_present */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="input-S_final" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                    1. 当前巅峰积分 (S_present)
                  </label>
                  <input
                    id="input-S_final"
                    type="number"
                    step="0.1"
                    value={rawInputs.S_final}
                    onChange={(e) => handleInputChange('S_final', e.target.value)}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      border: '1px solid #38bdf8',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      width: '110px',
                      textAlign: 'right',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}
                  />
                </div>

                {/* 2. 定级赛分数 / 继承分数 (可选切换) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: '500', color: '#e2e8f0' }}>2. 起始基准</span>
                    <select
                      id="select-baseline-type"
                      value={rawInputs.baselineType}
                      onChange={(e) => handleInputChange('baselineType', e.target.value)}
                      style={{
                        backgroundColor: '#1e293b',
                        color: '#38bdf8',
                        border: '1px solid #0284c7',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="placement">定级赛分数</option>
                      <option value="inherited">继承分数</option>
                    </select>
                  </div>
                  <input
                    id="input-S_placement"
                    type="number"
                    step="1"
                    placeholder=""
                    value={rawInputs.S_placement}
                    onChange={(e) => handleInputChange('S_placement', e.target.value)}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      border: '1px solid #38bdf8',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      width: '110px',
                      textAlign: 'right',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}
                  />
                </div>

                {/* 3. N */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="input-N" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                    3. 总场次 (N{rawInputs.baselineType === 'placement' ? ', 含定级赛' : ''})
                  </label>
                  <input
                    id="input-N"
                    type="number"
                    min="1"
                    value={rawInputs.N}
                    onChange={(e) => handleInputChange('N', e.target.value)}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      border: '1px solid #38bdf8',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      width: '110px',
                      textAlign: 'right',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}
                  />
                </div>

                {/* 4. P_bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="input-P_bar" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                    4. 面板胜率 (<span style={{ textDecoration: 'overline', textDecorationThickness: '1.5px', textUnderlineOffset: '2px' }}>P(s)</span>)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      id="input-P_bar"
                      type="text"
                      value={rawInputs.P_bar}
                      onChange={(e) => handleInputChange('P_bar', e.target.value)}
                      style={{
                        backgroundColor: '#1e293b',
                        color: '#ffffff',
                        border: '1px solid #38bdf8',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        width: '90px',
                        textAlign: 'right',
                        fontSize: '14px',
                        fontWeight: 'bold',
                      }}
                    />
                    <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>%</span>
                  </div>
                </div>

                {/* 5. PS (五连绝世) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label htmlFor="input-P_5" style={{ fontWeight: '500', color: '#e2e8f0', display: 'block' }}>
                      5. 五连绝世数 (PS)
                    </label>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>提示：去除定级赛的数量</span>
                  </div>
                  <input
                    id="input-P_5"
                    type="number"
                    min="0"
                    value={rawInputs.P_5}
                    onChange={(e) => handleInputChange('P_5', e.target.value)}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      border: '1px solid #38bdf8',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      width: '110px',
                      textAlign: 'right',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}
                  />
                </div>

                {/* 6. G (顶级牌+金牌) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label htmlFor="input-G" style={{ fontWeight: '500', color: '#e2e8f0', display: 'block' }}>
                      6. 顶级牌 + 金牌数 (G)
                    </label>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>提示：去除定级赛的数量</span>
                  </div>
                  <input
                    id="input-G"
                    type="number"
                    min="0"
                    value={rawInputs.G}
                    onChange={(e) => handleInputChange('G', e.target.value)}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      border: '1px solid #38bdf8',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      width: '110px',
                      textAlign: 'right',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}
                  />
                </div>

                {/* 7. SV (银牌) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label htmlFor="input-S_v" style={{ fontWeight: '500', color: '#e2e8f0', display: 'block' }}>
                      7. 银牌数 (SV)
                    </label>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>提示：去除定级赛的数量</span>
                  </div>
                  <input
                    id="input-S_v"
                    type="number"
                    min="0"
                    value={rawInputs.S_v}
                    onChange={(e) => handleInputChange('S_v', e.target.value)}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      border: '1px solid #38bdf8',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      width: '110px',
                      textAlign: 'right',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 右侧：上赛季继承分规则参考表 (字小一点，紧凑精致) */}
            <div
              style={{
                flex: '0 1 240px',
                minWidth: '220px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: '11px',
                  color: '#38bdf8',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #334155',
                  paddingBottom: '4px',
                }}
              >
                <span>上赛季分数继承规则</span>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'normal' }}>点按快捷填入</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', lineHeight: '1.4' }}>
                <thead>
                  <tr style={{ color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '2px 4px', textAlign: 'left', fontWeight: '500' }}>上赛季结算分</th>
                    <th style={{ padding: '2px 4px', textAlign: 'right', fontWeight: '500' }}>继承分</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { range: '≥ 2400 分', score: 1450 },
                    { range: '2200 ～ 2399 分', score: 1425 },
                    { range: '2000 ～ 2199 分', score: 1400 },
                    { range: '1800 ～ 1999 分', score: 1350 },
                    { range: '1600 ～ 1799 分', score: 1300 },
                    { range: '1400 ～ 1599 分', score: 1250 },
                    { range: '1200 ～ 1399 分', score: 1200 },
                    { range: '＜ 1200 分', score: 1200 },
                  ].map((row, idx, arr) => (
                    <tr
                      key={idx}
                      onClick={() => {
                        handleInputChange('S_placement', String(row.score));
                        handleInputChange('baselineType', 'inherited');
                      }}
                      style={{
                        borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #1e293b',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#334155')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      title={`点击快捷填入继承分 ${row.score}`}
                    >
                      <td style={{ padding: '2px 4px', color: '#e2e8f0', whiteSpace: 'nowrap' }}>{row.range}</td>
                      <td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 'bold', color: '#2dd4bf', whiteSpace: 'nowrap' }}>
                        {row.score} 分
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 场数与分数对应全景动力学轨迹图 + 目标分数与场次双向测算器 */}
        <ScoreMatchesChart
          hasData={isReady && result !== null}
          STrue={result ? result.R_true : 0}
          SPresent={parsedInputs.S_final}
          SPlacement={parsedInputs.S_placement || 1400}
          SMax={result ? result.S_max : 0}
          kF={result ? result.k_F : 450}
          PBar={baseParams.P_bar}
          MEP={baseParams.M_EP}
          currentN={parsedInputs.N}
          baselineType={parsedInputs.baselineType}
        />

        {/* 各巅峰分段单局胜率预测看板 (交互式图表 + 数据明细) */}
        <WinRateChart
          hasData={isReady && result !== null}
          STrue={result ? result.R_true : 0}
          SPresent={parsedInputs.S_final}
          SMax={result ? result.S_max : 0}
          kF={result ? result.k_F : 450}
          winRatesList={result ? result.win_rates : []}
        />

        {/* 算法数学模型与动力学微积分推导体系 */}
        <AlgorithmManual
          currentMEP={baseParams.M_EP}
          currentPBar={baseParams.P_bar}
        />
      </div>
    </div>
  );
}
