import React from 'react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

interface ManualProps {
  currentMEP?: number;
  currentPBar?: number;
}

const FORMULA_MARKDOWN = `### **① 能量增长率 $\\frac{dE}{dN}$ 分段函数**

$$\\frac{dE}{dN} = \\begin{cases} \\dfrac{M_{E/P}}{\\overline{P(s)}} P(s) & P(s) \\in (0, \\overline{P(s)}) \\\\[2ex] \\dfrac{6 - M_{E/P}}{1 - \\overline{P(s)}} (P(s) - 1) + 6 & P(s) \\in [\\overline{P(s)}, 1) \\end{cases}$$

---

### **② $M_{E/P}$ 与 $k_F$ 建模**

$$M_{E/P} = \\frac{10\\text{PS} + 6\\text{G} + 3\\text{SV}}{N}$$

* **建模理论：** $k_F$ 与场均能量产出 $M_{E/P}$ 紧密关联
* $M_{E/P}$ 全服均值约为 $1.800$
* 隐式 ELO 离散度：
  $$k_F = 1600 \\times \\dfrac{1.8N}{10\\text{PS} + 6\\text{G} + 3\\text{SV}}$$

---

### **③ 微分方程与积分公式**

* **积分微分关系：**
  $$\\frac{ds}{dN} = 30P(s) - 15 + \\frac{\\frac{dE}{dN}}{k(s)}$$

* **场数 $N$ 闭式路径积分方程：**
  $$N = \\int_{1200}^{S_{present}} \\left( \\frac{1}{30P(s) - 15 + \\dfrac{\\frac{dE}{dN}}{k(s)}} \\right) ds$$

---

### **④ 胜率函数 $P(s)$**

$$P(s) = \\frac{1}{1 + 10^{\\frac{s - S_{true}}{k_F}}}$$

---

### **⑤ 能量抵扣/阻力系数分段函数 $k(s)$**

$$k(s) = \\begin{cases} 1 & S \\in [1200, 1500) \\\\ 2 & S \\in [1500, 1800) \\\\ 3 & S \\in [1800, 2100) \\\\ 4 & S \\in [2100, +\\infty) \\end{cases}$$

---

### **求解结构说明**

**需要已知：**
$$\\begin{cases} \\overset{\\text{PS}}{\\text{五杀/诛}}、\\overset{\\text{G}}{\\text{金}}、\\overset{\\text{SV}}{\\text{银}} \\\\[1ex] \\text{场数 } N \\\\[1ex] \\text{面板胜率 } \\overline{P(s)} \\\\[1ex] \\text{当前巅峰分 } S_{present} \\end{cases}$$

**逆推解出：** $S_{true}$（真实硬分）
`;

export default function AlgorithmManual({ currentMEP = 1.8, currentPBar = 0.62 }: ManualProps) {
  return (
    <div
      id="section-algorithm-manual"
      style={{
        marginTop: '20px',
        backgroundColor: '#090d16',
        border: '1.5px solid #1e293b',
        borderRadius: '10px',
        padding: '20px 22px',
        fontSize: '13px',
        lineHeight: '1.7',
        color: '#cbd5e1',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1e293b',
          paddingBottom: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📜</span>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#38bdf8', margin: 0 }}>
            算法数学模型与动力学微积分推导体系
          </h2>
        </div>
      </div>

      {/* 完整 LaTeX 公式渲染 */}
      <div className="markdown-body">
        <Markdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
        >
          {FORMULA_MARKDOWN}
        </Markdown>
      </div>
    </div>
  );
}
