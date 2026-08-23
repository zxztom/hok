import React, { useState, useMemo } from 'react';
import { solveDynamics, PlayerStats, CalculationResult, RankDynamicsAnalyzer } from './engine';
import AlgorithmManual from './components/AlgorithmManual';
import myImage from './1.jpg';
import WinRateChart from './components/WinRateChart';

interface ExampleProfile {
  id: string;
  name: string;
  tag: string;
  color: string;
  stats: PlayerStats;
  rawPBar: string;
  desc?: string;
}

// 精选实战纯客观战绩示例
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
      G: 35,
      S_v: 25,
      P_5: 0,
    },
    desc: '重庆狼队·紫幻（237场 62.0% 2410分，金35 / 银25 / 五杀0）',
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
      G: 41, // 顶级7 + 金34 = 41
      S_v: 24,
      P_5: 0,
    },
    desc: '宗师 2503分（111场 83.8% 超高胜率通天野王，顶级7 / 金34 / 银24）',
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
      G: 31, // 顶级3 + 金28 = 31
      S_v: 25,
      P_5: 0,
    },
    desc: 'KSG青炎 2248分（143场 67.1%，顶级3 / 金28 / 银25）',
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
      G: 46, // 顶级4 + 金42 = 46
      S_v: 36,
      P_5: 1, // 五杀1
    },
    desc: '小麦 2413分（176场 65.9%，顶级4 / 金42 / 银36 / 五杀1）',
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
      G: 35, // 顶级4 + 金31 = 35
      S_v: 31,
      P_5: 0,
    },
    desc: '救赎 2304分（261场 61.3% 职业辅助，顶级4 / 金31 / 银31）',
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
      G: 50, // 顶级3 + 金47 = 50
      S_v: 37,
      P_5: 1, // 五杀1
    },
    desc: '一诺 2277分（226场 60.6% 顶级射手大核，顶级3 / 金47 / 银37 / 五杀1）',
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
      G: 62, // 顶级3 + 金59 = 62
      S_v: 52,
      P_5: 1, // 五杀1
    },
    desc: '道崽 2230分（560场 55.9% 高场次战神，顶级3 / 金59 / 银52 / 五杀1）',
  },
];

export default function App() {
  const [inputs, setInputs] = useState<PlayerStats>(EXAMPLES[0].stats);
  const [rawPBar, setRawPBar] = useState<string>(EXAMPLES[0].rawPBar);
  const [activeExId, setActiveExId] = useState<string>(EXAMPLES[0].id);

  const handleInputChange = (field: keyof PlayerStats, value: string) => {
    setActiveExId('');
    if (field === 'P_bar') {
      setRawPBar(value);
      const num = parseFloat(value);
      if (!isNaN(num)) {
        setInputs((prev) => ({
          ...prev,
          P_bar: num > 1 ? num / 100 : num,
        }));
      }
    } else {
      const num = parseFloat(value);
      setInputs((prev) => ({
        ...prev,
        [field]: isNaN(num) ? 0 : num,
      }));
    }
  };

  const loadExample = (ex: ExampleProfile) => {
    setInputs(ex.stats);
    setRawPBar(ex.rawPBar);
    setActiveExId(ex.id);
  };

  const clearInputs = () => {
    setInputs({
      N: 0,
      P_bar: 0.5,
      S_final: 1200.0,
      G: 0,
      S_v: 0,
      P_5: 0,
    });
    setRawPBar('50.0');
    setActiveExId('');
  };

  const result: CalculationResult = useMemo(() => {
    return solveDynamics(inputs);
  }, [inputs]);

  // 全局通用基准参数计算
  const baseParams = useMemo(() => {
    return RankDynamicsAnalyzer.calculate_base_params(inputs);
  }, [inputs]);

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
              挑战赛使分数预测偏高。实力分指的是胜率50%的分数。理论巅峰最高分是会无限场次趋近值。真最高分会更高。
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
                  {result.R_true.toFixed(2)}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 'bold' }}>分</span>
              </div>
            </div>

            {/* 2. 积分水分 / 虚高幅度 */}
            <div
              id="card-water"
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                border: result.water > 0 ? '1.5px solid rgba(248, 113, 113, 0.45)' : '1.5px solid rgba(74, 222, 128, 0.45)',
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
                    backgroundColor: result.water > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                    color: result.water > 0 ? '#fca5a5' : '#86efac',
                    border: result.water > 0 ? '1px solid rgba(248, 113, 113, 0.3)' : '1px solid rgba(74, 222, 128, 0.3)',
                  }}
                >
                  {result.water > 0 ? '虚高水分' : '被低估实分'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
                <span
                  id="display-water"
                  style={{
                    fontSize: '34px',
                    fontWeight: '900',
                    color: result.water > 0 ? '#f87171' : '#4ade80',
                    lineHeight: '1.1',
                  }}
                >
                  {result.water > 0 ? `+${result.water.toFixed(2)}` : `${result.water.toFixed(2)}`}
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
                  {result.S_max.toFixed(2)}
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
                  {inputs.S_final}
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
              border: baseParams.M_EP >= 1.8 ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(251, 146, 60, 0.5)',
              borderRadius: '8px',
              padding: '8px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>场均能量产出：</span>
              <strong style={{ color: '#38bdf8', fontSize: '15px' }}>
                M_E/P = {baseParams.M_EP.toFixed(3)}
              </strong>
              <span style={{ color: '#64748b', fontSize: '11px' }}>
                (全服基准均值: 1.800)
              </span>
              <span style={{ color: mepDiff >= 0 ? '#4ade80' : '#fb923c', fontWeight: 'bold', fontSize: '12px' }}>
                {mepDiff >= 0 ? `+${mepDiff.toFixed(2)} (${mepRatio}x 均值)` : `${mepDiff.toFixed(2)} (${mepRatio}x 均值)`}
              </span>
            </div>

            <span
              style={{
                fontSize: '12px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 'bold',
                backgroundColor: baseParams.M_EP >= 2.0 ? 'rgba(56, 189, 248, 0.2)' : baseParams.M_EP >= 1.7 ? 'rgba(45, 212, 191, 0.15)' : 'rgba(251, 146, 60, 0.2)',
                color: baseParams.M_EP >= 2.0 ? '#38bdf8' : baseParams.M_EP >= 1.7 ? '#2dd4bf' : '#fb923c',
                border: baseParams.M_EP >= 2.0 ? '1px solid #38bdf8' : baseParams.M_EP >= 1.7 ? '1px solid #2dd4bf' : '1px solid #fb923c',
              }}
            >
              {baseParams.M_EP >= 2.1
                ? '🔥 极强核心 Carry 型玩家'
                : baseParams.M_EP >= 1.8
                ? '⚡ 偏 Carry 进攻型玩家'
                : baseParams.M_EP >= 1.5
                ? '🛡️ 扎实团队抗压/辅助型玩家'
                : '🛡️ 纯团队贡献/蓝领型玩家'}
            </span>
          </div>
        </div>

        {/* 基础战绩数据输入表单 */}
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
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>基础战绩数据</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px 20px' }}>
            {/* 1. S_present */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="input-S_final" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                1. 当前巅峰积分 (S_present)
              </label>
              <input
                id="input-S_final"
                type="number"
                step="0.1"
                value={inputs.S_final === 0 ? '' : inputs.S_final}
                onChange={(e) => handleInputChange('S_final', e.target.value)}
                placeholder="如: 2410"
                style={{
                  backgroundColor: '#1e293b',
                  color: '#ffffff',
                  border: '1px solid #38bdf8',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  width: '120px',
                  textAlign: 'right',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              />
            </div>

            {/* 2. N */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="input-N" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                2. 总场次 (N)
              </label>
              <input
                id="input-N"
                type="number"
                min="1"
                value={inputs.N === 0 ? '' : inputs.N}
                onChange={(e) => handleInputChange('N', e.target.value)}
                placeholder="如: 237"
                style={{
                  backgroundColor: '#1e293b',
                  color: '#ffffff',
                  border: '1px solid #38bdf8',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  width: '120px',
                  textAlign: 'right',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              />
            </div>

            {/* 3. P_bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="input-P_bar" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                3. 面板总胜率 (P̄)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  id="input-P_bar"
                  type="text"
                  value={rawPBar}
                  onChange={(e) => handleInputChange('P_bar', e.target.value)}
                  placeholder="如: 62.0"
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    border: '1px solid #38bdf8',
                    borderRadius: '4px',
                    padding: '6px 10px',
                    width: '100px',
                    textAlign: 'right',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                />
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>%</span>
              </div>
            </div>

            {/* 4. PS (五连绝世) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="input-P_5" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                4. 五连绝世数 (PS)
              </label>
              <input
                id="input-P_5"
                type="number"
                min="0"
                value={inputs.P_5}
                onChange={(e) => handleInputChange('P_5', e.target.value)}
                placeholder="如: 0"
                style={{
                  backgroundColor: '#1e293b',
                  color: '#ffffff',
                  border: '1px solid #38bdf8',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  width: '120px',
                  textAlign: 'right',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              />
            </div>

            {/* 5. G (顶级牌+金牌) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="input-G" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                5. 顶级牌 + 金牌数 (G)
              </label>
              <input
                id="input-G"
                type="number"
                min="0"
                value={inputs.G}
                onChange={(e) => handleInputChange('G', e.target.value)}
                placeholder="顶级+金牌合计数"
                style={{
                  backgroundColor: '#1e293b',
                  color: '#ffffff',
                  border: '1px solid #38bdf8',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  width: '120px',
                  textAlign: 'right',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              />
            </div>

            {/* 6. SV (银牌) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="input-S_v" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                6. 银牌数 (SV)
              </label>
              <input
                id="input-S_v"
                type="number"
                min="0"
                value={inputs.S_v}
                onChange={(e) => handleInputChange('S_v', e.target.value)}
                placeholder="银牌数"
                style={{
                  backgroundColor: '#1e293b',
                  color: '#ffffff',
                  border: '1px solid #38bdf8',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  width: '120px',
                  textAlign: 'right',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              />
            </div>
          </div>
        </div>

        {/* 各巅峰分段单局胜率预测看板 (交互式图表 + 数据明细) */}
        <WinRateChart
          STrue={result.R_true}
          SPresent={inputs.S_final}
          SMax={result.S_max}
          kF={result.k_F}
          winRatesList={result.win_rates}
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
