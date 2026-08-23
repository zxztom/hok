import React, { useState, useMemo } from 'react';
import { solveDynamics, PlayerStats, CalculationResult, AlgorithmMode, RankDynamicsAnalyzer } from './engine';
import AlgorithmManual from './components/AlgorithmManual';
import myImage from './1.jpg';

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
      mvp_count: 52,
      gamma_role: 1.05,
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
      mvp_count: 48,
      gamma_role: 1.15,
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
      mvp_count: 32,
      gamma_role: 1.05,
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
      mvp_count: 45,
      gamma_role: 1.15,
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
      mvp_count: 28,
      gamma_role: 0.90,
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
      mvp_count: 55,
      gamma_role: 1.15,
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
      mvp_count: 98,
      gamma_role: 1.15,
    },
    desc: '道崽 2230分（560场 55.9% 高场次战神，顶级3 / 金59 / 银52 / 五杀1）',
  },
];

export default function App() {
  // 按照 A、B、C 顺序：模式 A 默认推荐 (手稿全量微积分动力学)，模式 B 为简易解耦闭式解，模式 C 为 zxz 的智慧结晶
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
      mvp_count: 0,
      gamma_role: 1.0,
    });
    setRawPBar('50.0');
    setActiveExId('');
  };

  const result: CalculationResult = useMemo(() => {
    return solveDynamics(inputs, mode);
  }, [inputs, mode]);

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
              王者荣耀巅峰赛真实硬分（S_true）动力学逆推计算器
            </h1>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              手稿全量微积分动力学 · 纯客观 6 项数据推导 · 支持 A/B/C 三种算法模式
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
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
          >
            清空重置
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
              🎯 快捷载入职业/高分段客观战绩测试样本：
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              点击自动填入客观数据（场次、胜率、分段、五杀、金牌、银牌）
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

        {/* 1. 三模式切换器 (按 A、B、C 严格顺序排列) */}
        <div
          id="mode-selector"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '10px',
            marginBottom: '14px',
          }}
        >
          {/* 模式 A：zxz的智慧结晶（新） */}
          <div
            id="option-mode-a"
            onClick={() => setMode('mode_a')}
            style={{
              backgroundColor: mode === 'mode_a' ? '#042f2e' : '#0f172a',
              border: mode === 'mode_a' ? '2px solid #14b8a6' : '1px solid #334155',
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: mode === 'mode_a' ? '0 0 16px rgba(20, 184, 166, 0.25)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="radio"
                name="algorithm_mode"
                checked={mode === 'mode_a'}
                onChange={() => setMode('mode_a')}
                style={{ accentColor: '#14b8a6', cursor: 'pointer' }}
              />
              <span
                style={{
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: mode === 'mode_a' ? '#2dd4bf' : '#e2e8f0',
                }}
              >
                A. zxz的智慧结晶（新）
              </span>
            </div>
            <span
              style={{
                fontSize: '11px',
                backgroundColor: '#0f766e',
                color: '#ffffff',
                padding: '1px 6px',
                borderRadius: '3px',
                fontWeight: 'bold',
              }}
            >
              推荐
            </span>
          </div>

          {/* 模式 B：简易算法（只看胜率） */}
          <div
            id="option-mode-b"
            onClick={() => setMode('mode_b')}
            style={{
              backgroundColor: mode === 'mode_b' ? '#0f2744' : '#0f172a',
              border: mode === 'mode_b' ? '2px solid #38bdf8' : '1px solid #334155',
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: mode === 'mode_b' ? '0 0 16px rgba(56, 189, 248, 0.2)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="radio"
                name="algorithm_mode"
                checked={mode === 'mode_b'}
                onChange={() => setMode('mode_b')}
                style={{ accentColor: '#38bdf8', cursor: 'pointer' }}
              />
              <span
                style={{
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: mode === 'mode_b' ? '#38bdf8' : '#e2e8f0',
                }}
              >
                B. 简易算法（只看胜率）
              </span>
            </div>
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
              不受挑战赛影响
            </span>
          </div>

          {/* 模式 C：zxz的智慧结晶（旧） */}
          <div
            id="option-mode-c"
            onClick={() => setMode('mode_c')}
            style={{
              backgroundColor: mode === 'mode_c' ? '#2e1065' : '#0f172a',
              border: mode === 'mode_c' ? '2px solid #a855f7' : '1px solid #334155',
              borderRadius: '8px',
              padding: '12px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: mode === 'mode_c' ? '0 0 16px rgba(168, 85, 247, 0.2)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="radio"
                name="algorithm_mode"
                checked={mode === 'mode_c'}
                onChange={() => setMode('mode_c')}
                style={{ accentColor: '#a855f7', cursor: 'pointer' }}
              />
              <span
                style={{
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: mode === 'mode_c' ? '#c084fc' : '#e2e8f0',
                }}
              >
                C. zxz的智慧结晶（旧）
              </span>
            </div>
          </div>
        </div>

        {/* 核心结论看板 (S_true 硬分 与 M_E/P、积分水分) */}
        <div
          id="hero-r-true"
          style={{
            background: mode === 'mode_a'
              ? 'linear-gradient(135deg, #062822 0%, #0f172a 100%)'
              : mode === 'mode_b'
              ? 'linear-gradient(135deg, #0c4a6e 0%, #0f172a 100%)'
              : 'linear-gradient(135deg, #3b0764 0%, #0f172a 100%)',
            border: mode === 'mode_a'
              ? '2px solid #14b8a6'
              : mode === 'mode_b'
              ? '2px solid #38bdf8'
              : '2px solid #a855f7',
            borderRadius: '10px',
            padding: '18px 22px',
            marginBottom: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            {/* 左侧：S_true 主指标与并列呼应的 M_E/P */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>
                  真实竞技硬实力分 (S_true)
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    backgroundColor: mode === 'mode_a' ? '#0f766e' : mode === 'mode_b' ? '#0369a1' : '#7e22ce',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  {result.mode}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span
                    id="display-r-true"
                    style={{
                      fontSize: '44px',
                      fontWeight: '900',
                      color: mode === 'mode_a' ? '#2dd4bf' : mode === 'mode_b' ? '#38bdf8' : '#c084fc',
                      lineHeight: '1',
                      textShadow: '0 0 18px rgba(45, 212, 191, 0.3)',
                    }}
                  >
                    {result.R_true.toFixed(2)}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 'bold' }}>分</span>
                </div>

                {/* 与 S_true 并列搭配的 M_E/P 徽章：清晰呈现与全服均值 1.8 对比及玩家风格类型 */}
                <div
                  id="tag-mep-beside-strue"
                  style={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    gap: '2px',
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    border: baseParams.M_EP >= 1.8 ? '1.5px solid rgba(56, 189, 248, 0.65)' : '1.5px solid rgba(251, 146, 60, 0.65)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>场均能量产出</span>
                    <strong style={{ color: '#38bdf8', fontSize: '14px' }}>
                      M_E/P = {baseParams.M_EP.toFixed(3)}
                    </strong>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>
                      (均值: 1.800)
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ color: mepDiff >= 0 ? '#4ade80' : '#fb923c', fontWeight: 'bold' }}>
                      {mepDiff >= 0 ? `高于均值 +${mepDiff.toFixed(2)} (${mepRatio}x)` : `低于均值 ${mepDiff.toFixed(2)} (${mepRatio}x)`}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '3px',
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
              </div>
            </div>

            {/* 右侧关键衍生数据 (当前巅峰分 与 积分水分) */}
            <div
              style={{
                borderLeft: '1px solid #334155',
                paddingLeft: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '13px',
              }}
            >
              <div>
                <span style={{ color: '#94a3b8' }}>当前巅峰分 (S_present)：</span>
                <span style={{ fontWeight: 'bold', color: '#ffffff' }}>{inputs.S_final} 分</span>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>积分水分 / 虚高幅度：</span>
                <span
                  id="display-water"
                  style={{
                    fontWeight: 'bold',
                    color: result.water > 0 ? '#f87171' : '#4ade80',
                  }}
                >
                  {result.water > 0 ? `+${result.water.toFixed(2)} (虚高)` : `${result.water.toFixed(2)} (被低估)`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 基础战绩数据输入表单 */}
        <div
          id="section-inputs"
          style={{
            backgroundColor: '#0f172a',
            border: mode === 'mode_a' ? '1.5px solid #14b8a6' : mode === 'mode_b' ? '1.5px solid #0284c7' : '1.5px solid #7e22ce',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontWeight: 'bold',
              fontSize: '15px',
              color: mode === 'mode_a' ? '#2dd4bf' : mode === 'mode_b' ? '#38bdf8' : '#c084fc',
              borderBottom: '1px solid #1e293b',
              paddingBottom: '8px',
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              {mode === 'mode_c' ? '基础战绩数据 (含 MVP 与分路微调)' : '基础战绩数据'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px 20px' }}>
            {/* 1. N */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="input-N" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                1. 总场次 (N)
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

            {/* 2. P_bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="input-P_bar" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                2. 面板总胜率 (P̄)
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

            {/* 3. S_present */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="input-S_final" style={{ fontWeight: '500', color: '#e2e8f0' }}>
                3. 当前巅峰积分 (S_present)
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

            {/* 模式 C 专属输入字段 */}
            {mode === 'mode_c' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="input-mvp_count" style={{ fontWeight: '500', color: '#c084fc' }}>
                    7. 总 MVP 次数
                  </label>
                  <input
                    id="input-mvp_count"
                    type="number"
                    min="0"
                    value={inputs.mvp_count ?? ''}
                    onChange={(e) => handleInputChange('mvp_count', e.target.value)}
                    placeholder="MVP次数"
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      border: '1px solid #a855f7',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      width: '120px',
                      textAlign: 'right',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="input-gamma_role" style={{ fontWeight: '500', color: '#c084fc' }}>
                    8. 分路战局影响力 (γ)
                  </label>
                  <select
                    id="input-gamma_role"
                    value={inputs.gamma_role ?? 1.0}
                    onChange={(e) => handleInputChange('gamma_role', e.target.value)}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#ffffff',
                      border: '1px solid #a855f7',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      width: '140px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                    }}
                  >
                    <option value="1.15">打野/核心射手 (1.15)</option>
                    <option value="1.05">法师大核 (1.05)</option>
                    <option value="1.00">对抗路/均势 (1.00)</option>
                    <option value="0.90">游走/辅助 (0.90)</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 各巅峰分段单局胜率预测看板 */}
        <div
          id="section-winrate-forecast"
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '16px',
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
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>各巅峰分段单局胜率预测 ({result.mode})</span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              基于真实硬分 S_true = {result.R_true.toFixed(1)} 与 k_F = {result.k_F.toFixed(0)}
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '13px' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>巅峰分段</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>单局预测胜率</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>对抗难度期望</th>
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
                    <td style={{ padding: '8px', textAlign: 'right', color: '#94a3b8', fontSize: '13px' }}>
                      {diff > 80 ? (
                        <span style={{ color: '#f87171' }}>极难 (+{diff.toFixed(0)})</span>
                      ) : diff > 0 ? (
                        <span style={{ color: '#fbbf24' }}>偏难 (+{diff.toFixed(0)})</span>
                      ) : diff > -80 ? (
                        <span style={{ color: '#4ade80' }}>均势 ({diff.toFixed(0)})</span>
                      ) : (
                        <span style={{ color: '#38bdf8' }}>碾压 ({diff.toFixed(0)})</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 📘 替换为用户指定的手稿配图与精确公式说明区 */}
        <img src={myImage} alt="11" />;
      </div>
    </div>
  );
}
