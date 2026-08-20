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
    desc: '重庆狼队·紫幻（237场 62.0% 2410分，60全场最佳+48败方最佳）',
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
    desc: '？？？（76场 61.8% 1725分，核心冲分期）',
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
    desc: '某神秘辅助（261场 47.9% 1610分，场次多且胜率低于50%的瓶颈期代表）',
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
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
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

        {/* 📘 王者荣耀巅峰赛真实硬实力（R_true）分段动力学算法说明书 */}
        <div
          id="section-algorithm-manual"
          style={{
            marginTop: '20px',
            backgroundColor: '#090d16',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '20px 22px',
            fontSize: '13px',
            lineHeight: '1.7',
            color: '#cbd5e1',
          }}
        >
          {/* Header */}
          <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 'bold', color: '#38bdf8', margin: '0 0 6px 0' }}>
              📘 王者荣耀巅峰赛真实硬实力（R_true）分段动力学算法说明书
            </h2>
          </div>

          {/* Section 1 */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#facc15', marginBottom: '8px' }}>
              一、 模型核心假设与物理建模
            </h3>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', color: '#e2e8f0', marginBottom: '4px' }}>
                1. 5v5 团队方差平抑假设（Elo-Logistic 胜率衰减）
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>
                  <strong>物理机制</strong>：个人仅占 5v5 团队战力的 1/5。单人真实水平 <i>R<sub>true</sub></i> 偏离当前对局分段 <i>S</i> 时，其实时单局胜率 <i>p(S)</i> 服从团队方差平抑后的逻辑斯蒂分布：
                  <div style={{ backgroundColor: '#131b2e', padding: '6px 12px', borderRadius: '4px', margin: '6px 0', fontFamily: 'monospace', color: '#38bdf8' }}>
                    p(S) = 1 / [1 + 10^((S - R_true) / D)]
                  </div>
                </li>
                <li>
                  <strong>战局影响力平抑常数 <i>D</i></strong>：
                  <div style={{ backgroundColor: '#131b2e', padding: '6px 12px', borderRadius: '4px', margin: '6px 0', fontFamily: 'monospace', color: '#38bdf8' }}>
                    D = 1600.0 × γ_role
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    * <i>γ_role</i> 为用户自评的战局影响力系数：<br />
                    • 吃大量经济的大核心/节奏野王（个人决定胜负方差大）：<i>γ_role &lt; 1.0</i>（<i>D</i> 偏小，胜率对分差更敏感）；<br />
                    • 让经济的团队肉坦/开团硬辅（胜负依赖团队协同）：<i>γ_role &gt; 1.0</i>（<i>D</i> 偏大，胜率曲线更平缓）；<br />
                    • 标准均衡打法：<i>γ_role = 1.00</i>（默认基准）。
                  </div>
                </li>
              </ul>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', color: '#e2e8f0', marginBottom: '4px' }}>
                2. 能量获取互斥性与 Logit 优势比耦合（β 建模）
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>官方 max 互斥规则</strong>：单局能量按 max(E_五杀, E_金牌, E_银牌, E_MVP) 结算，同局各项不重复叠加；</li>
                <li>
                  <strong>50% 胜率中心化 Logit 修正</strong>：为防止负胜率玩家靠输局独吞败方 MVP（SVP）虚假刷分，引入胜率优势比指数：
                  <div style={{ backgroundColor: '#131b2e', padding: '6px 12px', borderRadius: '4px', margin: '6px 0', fontFamily: 'monospace', color: '#38bdf8' }}>
                    β = e_bar · e^[γ · (P_bar - 0.5)]   (γ = 2.5)
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    • P_bar &gt; 50% 时，能量正向升值，认可硬核带飞统治力；<br />
                    • P_bar &lt; 50% 时，能量向下折损，压制靠输局刷牌子的水分。
                  </div>
                </li>
              </ul>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', color: '#e2e8f0', marginBottom: '4px' }}>
                3. 严格分段阶梯阻力模型
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>王者荣耀巅峰能量的掉分抵扣消耗随分段呈严格阶梯式跃迁：</li>
                <li style={{ listStyleType: 'circle', marginLeft: '16px' }}>1200 ≤ S &lt; 1500：k₁ = 1.0（1点能量抵1分）</li>
                <li style={{ listStyleType: 'circle', marginLeft: '16px' }}>1500 ≤ S &lt; 1800：k₂ = 2.0（2点能量抵1分）</li>
                <li style={{ listStyleType: 'circle', marginLeft: '16px' }}>1800 ≤ S &lt; 2100：k₃ = 3.0（3点能量抵1分）</li>
                <li style={{ listStyleType: 'circle', marginLeft: '16px' }}>S ≥ 2100：k₄ = 4.0（4点能量抵1分）</li>
                <li><strong>本算法绝不在跨段时做粗糙的算术平均，而是将爬分轨迹严格切分为多个独立区间，分别求出单段解析原函数后求和求解。</strong></li>
              </ul>
            </div>

            <div>
              <div style={{ fontWeight: 'bold', color: '#e2e8f0', marginBottom: '4px' }}>
                4. 边界可忽略性公理（大数定律收敛）
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>MMR 加扣分不对等</strong>：在 N &gt; 50 的大样本下，匹配机制的强弱扰动对称抵消，单局净胜得分期望严格收敛于 ±15 分；</li>
                <li><strong>巅峰能量存储上限</strong>：除极端炸鱼连胜外，绝大多数玩家能量处于“随产随抵”状态，无溢出损耗。</li>
              </ul>
            </div>
          </div>

          {/* Section 2 */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#facc15', marginBottom: '8px' }}>
              二、 符号与参数字典
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#131b2e', borderBottom: '1px solid #1e293b', color: '#38bdf8' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>符号</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>物理含义</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>来源 / 算法</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '5px 10px', fontWeight: 'bold' }}>N</td><td>总对局场次</td><td>面板直接读取</td></tr>
                <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '5px 10px', fontWeight: 'bold' }}>P_bar</td><td>面板累计总胜率</td><td>小数形式（如 61.8% 记为 0.618）</td></tr>
                <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '5px 10px', fontWeight: 'bold' }}>S_final</td><td>当前巅峰积分</td><td>面板直接读取（≥ 1200）</td></tr>
                <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '5px 10px', fontWeight: 'bold' }}>S_0</td><td>初始巅峰底分</td><td>恒定常数 1200.0</td></tr>
                <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '5px 10px', fontWeight: 'bold' }}>G</td><td>顶级牌 + 金牌总数</td><td>面板直接读取</td></tr>
                <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '5px 10px', fontWeight: 'bold' }}>S_v</td><td>银牌总数</td><td>面板直接读取</td></tr>
                <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '5px 10px', fontWeight: 'bold' }}>P_5</td><td>五连绝世（五杀）数</td><td>面板直接读取</td></tr>
                <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '5px 10px', fontWeight: 'bold' }}>M_total</td><td>总 MVP 次数</td><td>全场最佳数 + 败方最佳数</td></tr>
                <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '5px 10px', fontWeight: 'bold' }}>γ_role</td><td>战局影响力系数</td><td>用户自定义（范围 0.70 ~ 1.50，默认 1.00）</td></tr>
                <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '5px 10px', fontWeight: 'bold' }}>D</td><td>团队平抑常数</td><td>D = 1600.0 × γ_role</td></tr>
                <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '5px 10px', fontWeight: 'bold' }}>β</td><td>个人支配力系数</td><td>结合官方互斥与 Logit 加权求得</td></tr>
                <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '5px 10px', fontWeight: 'bold', color: '#38bdf8' }}>R_true</td><td style={{ color: '#38bdf8' }}>真实竞技硬实力分</td><td>算法核心输出目标分</td></tr>
                <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '5px 10px', fontWeight: 'bold' }}>ΔS_water</td><td>积分虚高水分</td><td>ΔS_water = S_final - R_true</td></tr>
                <tr><td style={{ padding: '5px 10px', fontWeight: 'bold' }}>S_max</td><td>理论最高天花板</td><td>动力学极限平衡点</td></tr>
              </tbody>
            </table>
          </div>

          {/* Section 3 */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#facc15', marginBottom: '8px' }}>
              三、 核心数学公式体系
            </h3>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', color: '#e2e8f0' }}>1. 个人支配力系数 β 计算公式</div>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                <li>纯 MVP 场次（去重）：<code>M_pure = max(0, M_total - G - S_v)</code></li>
                <li>去重总能量与场均能量：<code>E_total = 6G + 3S_v + 4P_5 + 2M_pure</code>，<code>e_bar = E_total / N</code></li>
                <li>β 终极表达式：<code>β = e_bar · e^[2.5 · (P_bar - 0.5)]</code></li>
              </ul>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', color: '#e2e8f0' }}>2. 官方阶梯阻力分段区间定义</div>
              <div style={{ fontSize: '12px', margin: '4px 0' }}>
                分段边界点数组：T = [1200, 1500, 1800, 2100, +∞]<br />
                有效积分上下界：a_i = max(1200, T_(i-1)), b_i = min(S_final, T_i) （仅对 b_i &gt; a_i 的有效区间求和）
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', color: '#e2e8f0' }}>3. 严格分段目标方程：f(R_true) = 0</div>
              <div style={{ backgroundColor: '#131b2e', padding: '6px 12px', borderRadius: '4px', margin: '6px 0', fontFamily: 'monospace', color: '#38bdf8' }}>
                f(R_true) = ∑ [ F_i(b_i, R_true) - F_i(a_i, R_true) ] - N · P_bar = 0
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                单段严格解析原函数 F_i(S, R_true)：<br />
                <code>F_i(S, R) = [D / (ln10 · (15 + β/k_i))] · ln | 10^((S-R)/D) / ( 10^((S-R)/D) - (1 + β/(15·k_i)) ) |</code>
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', color: '#e2e8f0' }}>4. 牛顿迭代法导数表达式：f'(R_true)</div>
              <div style={{ backgroundColor: '#131b2e', padding: '6px 12px', borderRadius: '4px', margin: '6px 0', fontFamily: 'monospace', color: '#38bdf8' }}>
                R_(n+1) = R_n - f(R_n) / f'(R_n)<br />
                f'(R_true) = ∑ [ g_i(b_i, R_true) - g_i(a_i, R_true) ]
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                单段导数辅助函数 g_i(S, R_true)：<br />
                <code>g_i(S, R) = 1 / [ 15 · 10^((S-R)/D) - (15 + β/k_i) ]</code>
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', color: '#e2e8f0' }}>5. 牛顿法初值估计量 R_0</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                k_bar = [1 / (S_final - 1200)] · ∑ k_i (b_i - a_i)<br />
                λ = 10^[ ((15 + β/k_bar) · N · P_bar - (S_final - 1200)) / D ]<br />
                <code>R_0 = D · log10 [ (λ · 10^(S_final/D) - 10^(1200/D)) / ((1 + β/(15·k_bar)) · (λ - 1)) ]</code>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 'bold', color: '#e2e8f0' }}>6. 衍生诊断指标</div>
              <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', fontSize: '12px' }}>
                <li>积分虚高水分：<code>ΔS_water = S_final - R_true</code>（&gt;0 代表积分虚高；≤0 代表场次未打满仍处于上升期）</li>
                <li>理论最高天花板：<code>S_max = R_true + D · log10(1 + β / (15 · k_cur))</code></li>
                <li>实时单局胜率预测：<code>p(S) = 1 / [1 + 10^((S - R_true) / D)]</code></li>
              </ul>
            </div>
          </div>

          {/* Section 4 */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#facc15', marginBottom: '8px' }}>
              四、 算法计算流程协议（Execution Pipeline）
            </h3>
            <pre
              style={{
                backgroundColor: '#131b2e',
                border: '1px solid #1e293b',
                borderRadius: '6px',
                padding: '12px',
                fontSize: '11px',
                color: '#38bdf8',
                overflowX: 'auto',
                lineHeight: '1.5',
              }}
            >
{`[步骤 1: 参数输入与预处理]
  ├─ 读入 N, P_bar, S_final, G, S_v, P_5, M_total, gamma_role
  └─ 计算平抑常数 D = 1600.0 * gamma_role

[步骤 2: 个人支配力 beta 计算]
  ├─ 互斥去重得到纯 MVP 场次: M_pure = max(0, M_total - G - S_v)
  ├─ 计算去重总能量 E_total 与场均能量 e_bar
  └─ 胜率 Logit 加权: beta = e_bar * exp(2.5 * (P_bar - 0.5))

[步骤 3: 确定有效分段与边界]
  └─ 对 [1200, 1500, 1800, 2100, +∞] 划分出所有满足 b_i > a_i 的有效分段与对应 k_i

[步骤 4: 牛顿迭代法求解 R_true]
  ├─ 计算估算初值 R_0
  └─ 迭代执行 R_{n+1} = R_n - f(R_n) / f'(R_n)，直至收敛（|f(R)| < 1e-6）

[步骤 5: 衍生诊断指标装配]
  ├─ 计算积分虚高水分: Delta S_{water} = S_final - R_true
  ├─ 计算理论极限天花板: S_max
  └─ 计算锚点分段 [1200, 1400, 1500, 1600, 1725, 1800, 2100, S_final] 的实时胜率 p(S)`}
            </pre>
          </div>

          {/* Section 5 */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#facc15', marginBottom: '8px' }}>
              五、 算法优劣势与核心局限分析
            </h3>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', color: '#4ade80', marginBottom: '4px' }}>
                1. 算法核心优势
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li><strong>严格分段动力学的高保真度</strong>：彻底摒弃跨段平均，精准还原了 1200~1500（1倍抵扣）与 1500+（翻倍抵扣）的阻力跃迁；</li>
                <li><strong>导数严格解析化</strong>：牛顿法每一步迭代都有闭式解析导数 g_i 支持，收敛速度达二次收敛（通常 3~5 步内精准收敛）；</li>
                <li><strong>识破刷分伪装</strong>：结合官方 max 去重与 Logit 优势比折损，天然免疫保分型刷子。</li>
              </ul>
            </div>

            <div>
              <div style={{ fontWeight: 'bold', color: '#f87171', marginBottom: '4px' }}>
                2. 算法核心痛点与致命局限（使用须知）
              </div>
              <div
                style={{
                  backgroundColor: '#1f1315',
                  borderLeft: '3px solid #f87171',
                  padding: '8px 12px',
                  borderRadius: '0 4px 4px 0',
                  color: '#fca5a5',
                  marginBottom: '8px',
                  fontSize: '12px',
                }}
              >
                <strong>⚠️ 痛点一（最严重！）：【瓶颈期胜率均值回归陷阱】</strong><br />
                • <strong>机理</strong>：若玩家在自身极限分段（如 1800 分）<strong>长期卡瓶颈滞留（例如打满 200~300 场，胜率被彻底稀释拉平至 50% 附近）</strong>，回溯积分方程会将稀释后的 50% 胜率视作全程表现，导致<strong>测算出的 R_true 严重偏低</strong>；<br />
                • <strong>黄金测试建议</strong>：<strong>请勿在打满数百场、长期卡在瓶颈期后测试！最佳测试窗口是刚打完冲分期、场次在 50 ~ 150 场以内时测算最为精准。</strong>
              </div>

              <div
                style={{
                  backgroundColor: '#1f1315',
                  borderLeft: '3px solid #fbbf24',
                  padding: '8px 12px',
                  borderRadius: '0 4px 4px 0',
                  color: '#fde68a',
                  fontSize: '12px',
                }}
              >
                <strong>⚠️ 痛点二：【周末巅峰挑战赛的积分注入失真】</strong><br />
                • 挑战赛是官方限时发放的场外积分红利。若玩家<strong>极为重度地参与挑战赛并以此冲分</strong>，其 S_final 含有未记录在排位负场中的外生积分，会导致动力学时间方程出现速度偏快，测算出的 R_true 会产生<strong>轻微向上偏置（略微偏高）</strong>。对于此类玩家，可参考纯胜率解耦估算（模式 A）。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
