import React, { useState, useMemo } from 'react';
import { solveDynamics, PlayerStats, CalculationResult, AlgorithmMode } from './engine';

interface ExampleProfile {
  id: string;
  name: string;
  tag: string;
  color: string;
  stats: PlayerStats;
  rawPBar: string;
  desc?: string;
}

const PRESETS = [
  { label: '野王/绝对大核', value: 0.88 },
  { label: '中路游走/核心射手', value: 0.94 },
  { label: '全能/均衡打法（默认）', value: 1.00 },
  { label: '对抗路战士/单带', value: 1.05 },
  { label: '团队肉坦/开团硬辅', value: 1.20 },
];

// 所有精选实战示例
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
      M_total: 108, // 全场最佳60 + 败方最佳48
      gamma_role: 1.20,
    },
    desc: '某神秘辅助（237场 62.0% 2410分，60全场最佳+48败方最佳，高分肉辅/硬辅路线）',
  },
  {
    id: 'ex-2',
    name: '？？？',
    tag: '76场 1725分',
    color: '#0369a1',
    rawPBar: '61.8',
    stats: {
      N: 76,
      P_bar: 0.618,
      S_final: 1725.0,
      G: 8,
      S_v: 8,
      P_5: 0,
      M_total: 20,
      gamma_role: 0.94,
    },
    desc: '重庆狼队·紫幻（76场 61.8% 1725分，核心法王冲分期）',
  },
  {
    id: 'ex-3',
    name: '某神秘辅助',
    tag: '261场 1610分',
    color: '#334155',
    rawPBar: '47.9',
    stats: {
      N: 261,
      P_bar: 0.479,
      S_final: 1610.0,
      G: 6,
      S_v: 13,
      P_5: 0,
      M_total: 43,
      gamma_role: 1.00,
    },
    desc: '？？？（261场 47.9% 1610分，场次多且胜率低于50%的瓶颈期代表）',
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
      M_total: 61, // MVP 54 + SVP 7 = 61
      gamma_role: 0.88,
    },
    desc: '宗师 2503分（111场 83.8% 超高胜率通天野王，顶级7/金34/银24，MVP54/SVP7）',
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
      M_total: 75, // MVP 56 + SVP 19 = 75
      gamma_role: 0.94,
    },
    desc: 'KSG青炎 2248分（143场 67.1%，顶级3/金28/银25，MVP56/SVP19）',
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
      M_total: 73, // MVP 54 + SVP 19 = 73
      gamma_role: 0.92,
    },
    desc: '小麦 2413分（176场 65.9%，顶级4/金42/银36/五杀1，MVP54/SVP19）',
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
      M_total: 41, // MVP 24 + SVP 17 = 41
      gamma_role: 1.20,
    },
    desc: '救赎 2304分（261场 61.3% 职业辅助，顶级4/金31/银31，MVP24/SVP17）',
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
      M_total: 100, // MVP 68 + SVP 32 = 100
      gamma_role: 0.90,
    },
    desc: '一诺 2277分（226场 60.6% 顶级射手大核，顶级3/金47/银37/五杀1，MVP68/SVP32）',
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
      M_total: 151, // MVP 93 + SVP 58 = 151
      gamma_role: 0.92,
    },
    desc: '道崽 2230分（560场 55.9% 高场次战神，顶级3/金59/银52/五杀1，MVP93/SVP58）',
  },
];

export default function App() {
  const [mode, setMode] = useState<AlgorithmMode>('mode_a');
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

  const handleGammaPreset = (val: number) => {
    setInputs((prev) => ({
      ...prev,
      gamma_role: val,
    }));
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
      M_total: 0,
      gamma_role: 1.00,
    });
    setRawPBar('50.0');
    setActiveExId('');
  };

  const result: CalculationResult = useMemo(() => {
    return solveDynamics(inputs, mode);
  }, [inputs, mode]);

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
      <div style={{ maxWidth: '740px', margin: '0 auto' }}>
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
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#38bdf8',
                margin: 0,
                letterSpacing: '0.5px',
              }}
            >
              王者荣耀战绩硬分逆推计算器
            </h1>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Dual-Engine 双模式架构 (支持全量职业/路人战绩测算)
            </span>
          </div>

          <button
            id="btn-clear"
            onClick={clearInputs}
            style={{
              backgroundColor: '#1e293b',
              color: '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            清空输入
          </button>
        </div>

        {/* 快捷示例选择区 (精选实战数据) */}
        <div
          id="section-example-selector"
          style={{
            backgroundColor: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>
              🎯 快捷载入测试选手战绩：
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              点击即刻自动填入完整战绩与分路系数
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {EXAMPLES.map((ex) => {
              const isSelected = activeExId === ex.id;
              return (
                <button
                  key={ex.id}
                  id={`btn-${ex.id}`}
                  onClick={() => loadExample(ex)}
                  style={{
                    backgroundColor: isSelected ? ex.color : '#1e293b',
                    color: isSelected ? '#ffffff' : '#cbd5e1',
                    border: isSelected ? '1px solid #ffffff' : '1px solid #334155',
                    borderRadius: '6px',
                    padding: '5px 9px',
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
                  <span style={{ opacity: 0.8, fontSize: '11px' }}>({ex.tag})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. 算法模式切换器（置于表单最顶部） */}
        <div
          id="mode-selector"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          {/* 模式 A */}
          <div
            id="option-mode-a"
            onClick={() => setMode('mode_a')}
            style={{
              backgroundColor: mode === 'mode_a' ? '#0f2744' : '#0f172a',
              border: mode === 'mode_a' ? '2px solid #38bdf8' : '1px solid #334155',
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: mode === 'mode_a' ? '0 0 16px rgba(56, 189, 248, 0.2)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <input
                type="radio"
                name="algorithm_mode"
                checked={mode === 'mode_a'}
                onChange={() => setMode('mode_a')}
                style={{ accentColor: '#38bdf8', cursor: 'pointer' }}
              />
              <span
                style={{
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: mode === 'mode_a' ? '#38bdf8' : '#e2e8f0',
                }}
              >
                模式 A：简易算法
              </span>
              <span
                style={{
                  fontSize: '11px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: '3px',
                  fontWeight: 'bold',
                }}
              >
                免疫挑战赛
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', paddingLeft: '24px', lineHeight: '1.4' }}>
              简单直接只看胜率，不受周末挑战赛加分影响，适合绝大多数玩家。
            </div>
          </div>

          {/* 模式 B */}
          <div
            id="option-mode-b"
            onClick={() => setMode('mode_b')}
            style={{
              backgroundColor: mode === 'mode_b' ? '#20164d' : '#0f172a',
              border: mode === 'mode_b' ? '2px solid #a855f7' : '1px solid #334155',
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: mode === 'mode_b' ? '0 0 16px rgba(168, 85, 247, 0.2)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <input
                type="radio"
                name="algorithm_mode"
                checked={mode === 'mode_b'}
                onChange={() => setMode('mode_b')}
                style={{ accentColor: '#a855f7', cursor: 'pointer' }}
              />
              <span
                style={{
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: mode === 'mode_b' ? '#c084fc' : '#e2e8f0',
                }}
              >
                模式 B：zxz 的智慧结晶
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', paddingLeft: '24px', lineHeight: '1.4' }}>
              算上了金银牌与 MVP 加成；<strong>打了很多周末挑战赛的玩家不能用（会算高）</strong>。
            </div>
          </div>
        </div>

        {/* 2. 精简选型说明与核心警告 */}
        <div
          id="alert-box-guidelines"
          style={{
            backgroundColor: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '12px',
            lineHeight: '1.5',
            color: '#cbd5e1',
          }}
        >
          <div style={{ marginBottom: '6px' }}>
            💡 <strong>说明</strong>：模式 A 是简易算法（免疫挑战赛干扰）；模式 B 是 zxz 的智慧结晶（挑战赛占比较大时不能使用）。<strong>注：两种模式下挑战赛都会增加预期分数</strong>。
          </div>
          <div
            style={{
              backgroundColor: '#1f1315',
              borderLeft: '3px solid #f87171',
              padding: '6px 10px',
              borderRadius: '0 4px 4px 0',
              color: '#fca5a5',
            }}
          >
            ⚠️ <strong>警告</strong>：长期处于<strong>瓶颈期</strong>以及<strong>极端高分高场次</strong>（等效瓶颈、长时间 50% 胜率），均会导致测算结果偏低。建议在刚结束冲分期测算。
          </div>
        </div>

        {/* Real Hard-Score Hero Banner */}
        <div
          id="hero-r-true"
          style={{
            background: mode === 'mode_a'
              ? 'linear-gradient(135deg, #0f172a 0%, #0c4a6e 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #3b0764 100%)',
            border: mode === 'mode_a' ? '2px solid #38bdf8' : '2px solid #a855f7',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s ease',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>
                真实竞技硬分 (R_true)
              </span>
              <span
                style={{
                  fontSize: '11px',
                  backgroundColor: mode === 'mode_a' ? '#0369a1' : '#6b21a8',
                  color: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                }}
              >
                {result.mode}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <span
                id="display-r-true"
                style={{
                  fontSize: '40px',
                  fontWeight: '900',
                  color: mode === 'mode_a' ? '#38bdf8' : '#c084fc',
                  lineHeight: '1',
                  textShadow: '0 0 16px rgba(56, 189, 248, 0.3)',
                }}
              >
                {result.R_true.toFixed(2)}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 'bold' }}>分</span>
            </div>
          </div>

          <div
            style={{
              borderLeft: '1px solid #334155',
              paddingLeft: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '13px',
            }}
          >
            <div>
              <span style={{ color: '#94a3b8' }}>当前巅峰分：</span>
              <span style={{ fontWeight: 'bold', color: '#ffffff' }}>{inputs.S_final} 分</span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>积分虚高/水分：</span>
              <span
                style={{
                  fontWeight: 'bold',
                  color: result.water > 0 ? '#f87171' : '#4ade80',
                }}
              >
                {result.water > 0 ? `+${result.water.toFixed(2)}` : result.water.toFixed(2)} 分
              </span>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>理论最高天花板：</span>
              <span style={{ fontWeight: 'bold', color: '#facc15' }}>{result.S_max.toFixed(2)} 分</span>
            </div>
          </div>
        </div>

        {/* Input Form Card */}
        <div
          id="section-inputs"
          style={{
            backgroundColor: '#0f172a',
            border: '1.5px solid #0284c7',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '15px',
              color: '#38bdf8',
              borderBottom: '1px solid #1e293b',
              paddingBottom: '8px',
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>战绩数据输入</span>
            <span style={{ fontSize: '12px', color: '#38bdf8', backgroundColor: '#0369a133', padding: '2px 8px', borderRadius: '4px' }}>
              自动计算
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px 20px' }}>
            {/* N */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="input-N" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                总场次 (N)
              </label>
              <input
                id="input-N"
                type="number"
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

            {/* P_bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="input-P_bar" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                面板总胜率 (P_bar)
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

            {/* S_final */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="input-S_final" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                当前巅峰积分 (S_final)
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

            {/* G */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="input-G" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                顶级牌 + 金牌数 (G)
              </label>
              <input
                id="input-G"
                type="number"
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

            {/* S_v */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="input-S_v" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                银牌数 (S_v)
              </label>
              <input
                id="input-S_v"
                type="number"
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

            {/* P_5 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="input-P_5" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                五连绝世数 (五杀 P_5)
              </label>
              <input
                id="input-P_5"
                type="number"
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

            {/* M_total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="input-M_total" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                总MVP数 (胜方MVP+败方SVP)
              </label>
              <input
                id="input-M_total"
                type="number"
                value={inputs.M_total}
                onChange={(e) => handleInputChange('M_total', e.target.value)}
                placeholder="MVP+SVP合计数"
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

            {/* gamma_role Input */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#131e33',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #38bdf8',
              }}
            >
              <div>
                <label htmlFor="input-gamma_role" style={{ fontWeight: 'bold', color: '#38bdf8' }}>
                  战局影响力系数 (γ_role)
                </label>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  ★ 可按打法自由调整
                </div>
              </div>
              <input
                id="input-gamma_role"
                type="number"
                step="0.01"
                min="0.70"
                max="1.50"
                value={inputs.gamma_role}
                onChange={(e) => handleInputChange('gamma_role', e.target.value)}
                placeholder="1.00"
                style={{
                  backgroundColor: '#1e293b',
                  color: '#38bdf8',
                  border: '1.5px solid #38bdf8',
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

          {/* gamma_role Notice & Presets Matrix */}
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 'bold' }}>
                👉 γ_role 系数完全支持自行调整（快捷预设点选）：
              </span>
              <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                大核单带填小（0.85~0.95），蓝领肉坦硬辅填大（1.10~1.25）
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PRESETS.map((preset) => {
                const isActive = Math.abs((inputs.gamma_role ?? 1.0) - preset.value) < 0.001;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleGammaPreset(preset.value)}
                    style={{
                      backgroundColor: isActive ? '#0284c7' : '#1e293b',
                      color: isActive ? '#ffffff' : '#cbd5e1',
                      border: isActive ? '1px solid #38bdf8' : '1px solid #334155',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontWeight: isActive ? 'bold' : 'normal',
                    }}
                  >
                    {preset.label}: <span style={{ color: isActive ? '#fff' : '#38bdf8', fontWeight: 'bold' }}>{preset.value.toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Win Rate Forecast Table */}
        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '14px',
          }}
        >
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '15px',
              color: '#e2e8f0',
              borderBottom: '1px solid #1e293b',
              paddingBottom: '8px',
              marginBottom: '10px',
            }}
          >
            各巅峰分段单局胜率预测 ({result.mode})
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '13px' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>巅峰分段</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>单局预测胜率</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>对抗难度</th>
              </tr>
            </thead>
            <tbody>
              {result.win_rates.map((item) => {
                const diff = item.score - result.R_true;
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
                          当前位置
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
                    <td style={{ padding: '8px', textAlign: 'right', color: '#94a3b8', fontSize: '13px' }}>
                      {diff > 80 ? (
                        <span style={{ color: '#f87171' }}>极难 (+{diff.toFixed(0)})</span>
                      ) : diff > 0 ? (
                        <span style={{ color: '#fbbf24' }}>偏难 (+{diff.toFixed(0)})</span>
                      ) : diff > -80 ? (
                        <span style={{ color: '#4ade80' }}>均势 ({diff.toFixed(0)})</span>
                      ) : (
                        <span style={{ color: '#38bdf8' }}>轻松 ({diff.toFixed(0)})</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bilibili Video Reference & Notes */}
        <div
          id="section-bilibili-reference"
          style={{
            marginTop: '16px',
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '14px 16px',
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#cbd5e1',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '15px' }}>📺</span>
            <span style={{ fontWeight: 'bold', color: '#38bdf8', fontSize: '14px' }}>
              算法背景与详细视频说明：
            </span>
          </div>

          <div style={{ marginBottom: '8px', wordBreak: 'break-all' }}>
            <a
              id="link-bilibili-video"
              href="https://www.bilibili.com/video/BV14VHZzLEg3/?spm_id_from=333.337.search-card.all.click&vd_source=7d6ef64be58b4b28a1ef9cd9382d7046"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#38bdf8',
                textDecoration: 'underline',
                fontWeight: '500',
              }}
            >
              https://www.bilibili.com/video/BV14VHZzLEg3/ (点击跳转 B站原视频)
            </a>
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            上方测试选手战绩示例对应说明：
            <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
              <li><strong>示例一</strong>：某神秘辅助（237场 62.0% 2410分）</li>
              <li><strong>示例二</strong>：重庆狼队·紫幻（76场 61.8% 1725分）</li>
              <li><strong>示例三</strong>：？？？（261场 47.9% 1610分）</li>
              <li><strong>宗师 2503</strong>：111场 83.8%，顶级7/金34/银24，MVP 54/SVP 7</li>
              <li><strong>KSG青炎 2248</strong>：143场 67.1%，顶级3/金28/银25，MVP 56/SVP 19</li>
              <li><strong>小麦 2413</strong>：176场 65.9%，顶级4/金42/银36/五杀1，MVP 54/SVP 19</li>
              <li><strong>救赎 2304</strong>：261场 61.3%，顶级4/金31/银31，MVP 24/SVP 17</li>
              <li><strong>一诺 2277</strong>：226场 60.6%，顶级3/金47/银37/五杀1，MVP 68/SVP 32</li>
              <li><strong>道崽 2230</strong>：560场 55.9%，顶级3/金59/银52/五杀1，MVP 93/SVP 58</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
