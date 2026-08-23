import React from 'react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

interface ManualProps {
  currentMEP?: number;
  currentPBar?: number;
}

const S_TRUE_MARKDOWN = `### **① 能量增长率 $\\frac{dE}{dN}$ 分段函数**

$$\\frac{dE}{dN} = \\begin{cases} \\dfrac{M_{E/P}}{\\overline{P(s)}} P(s) & P(s) \\in (0, \\overline{P(s)}) \\\\[2ex] \\dfrac{6 - M_{E/P}}{1 - \\overline{P(s)}} (P(s) - 1) + 6 & P(s) \\in [\\overline{P(s)}, 1) \\end{cases}$$

---

### **② $M_{E/P}$ 与 $k_F$ 建模**

$$M_{E/P} = \\frac{10\\text{PS} + 6\\text{G} + 3\\text{SV}}{N}$$

* **建模理论：** $k_F$ 与场均能量产出 $M_{E/P}$ 及面板胜率 $\\overline{P(s)}$ 紧密关联
* $M_{E/P}$ 全服均值约为 $1.800$
* 隐式 ELO 离散度：
  $$k_F = 450 \\times \\dfrac{1.8N}{(10\\text{PS} + 6\\text{G} + 3\\text{SV}) \\cdot \\overline{P(s)}}$$

---

### **③ 微分方程与闭式路径积分公式**

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

### **⑥ 求解结构说明**

**已知输入：**
$$\\begin{cases} \\overset{\\text{PS}}{\\text{五杀/诛}}、\\overset{\\text{G}}{\\text{金}}、\\overset{\\text{SV}}{\\text{银}} \\\\[1ex] \\text{场数 } N \\\\[1ex] \\text{面板胜率 } \\overline{P(s)} \\\\[1ex] \\text{当前巅峰分 } S_{present} \\end{cases}$$

**逆推解出：**
* $S_{true}$（真实竞技硬实力分 · 胜率50%均势基准分）
* 积分水分 / 虚高幅度 $= S_{present} - S_{true}$
`;

const S_MAX_MARKDOWN = `理论最高分（天花板）的物理定义是：**当玩家打到该分数时，单局期望上分速度恰好衰减为 $0$**。推导无需微积分，纯代数精准可解，推导过程如下：

#### **1. 建立极限平衡方程**
根据上分速度公式：
$$\\frac{ds}{dN} = 30P(s) - 15 + \\frac{\\frac{dE}{dN}}{k(s)}$$
令 $\\frac{ds}{dN} = 0$，此时对应的胜率即为**极限平衡胜率 $P^*$**。

#### **2. 求解极限平衡胜率 $P^*$**
由于能量获取率 $\\frac{dE}{dN}$ 是关于面板均值胜率 $\\overline{P(s)}$ 的折线分段函数，求解需分两种情况（针对当前抵扣系数 $k$）：

* **情况 A：假设极限胜率 $\\le$ 面板均值胜率（绝大多数情况）**
  代入左侧折线公式 $\\frac{dE}{dN} = \\frac{M_{E/P}}{\\overline{P(s)}} P^*$，解得：
  $$P^*_A = \\frac{15}{30 + \\dfrac{M_{E/P}}{k \\cdot \\overline{P(s)}}}$$
  *(若算出 $P^*_A \\le \\overline{P(s)}$，则 $P^* = P^*_A$；否则执行情况 B)*

* **情况 B：假设极限胜率 $>$ 面板均值胜率（极端低胜率高牌子玩家）**
  代入右侧折线公式，令斜率 $m = \\frac{6 - M_{E/P}}{1 - \\overline{P(s)}}$，解得：
  $$P^*_B = \\frac{15k + m - 6}{30k + m}$$
  *(此时 $P^* = P^*_B$)*

#### **3. 由 $P^*$ 反解理论天花板 $S_{max}$**
求出 $P^*$ 后，根据胜率衰减函数 $P(s) = \\frac{1}{1 + 10^{\\frac{s - S_{true}}{k_F}}}$，直接移项取对数反解分数：
$$S_{max} = S_{true} + k_F \\log_{10} \\left( \\frac{1 - P^*}{P^*} \\right)$$

#### **4. 阶梯区间校验**
由于抵扣系数 $k$ 随分数段跳变，算法会按顺序遍历 $k \\in [1, 2, 3, 4]$：
* 代入 $k=1$ 算出 $S_{max}$，若 $<1500$，则为最终结果；
* 若不满足，代入 $k=2$，若落在 $[1500, 1800)$ 则为最终结果；
* 依此类推，直到求出的 $S_{max}$ 与其对应的 $k$ 值区间完美自洽。唯一自洽的解即为该玩家的绝对理论天花板。
`;

export default function AlgorithmManual({ currentMEP = 1.8, currentPBar = 0.62 }: ManualProps) {
  return (
    <div
      id="section-algorithm-manual"
      style={{
        marginTop: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* 算法 1：真实竞技硬实力分 (S_true) 的计算 */}
      <div
        id="card-algo-strue"
        style={{
          backgroundColor: '#090d16',
          border: '2px solid rgba(45, 212, 191, 0.5)',
          borderRadius: '10px',
          padding: '20px 22px',
          fontSize: '13px',
          lineHeight: '1.7',
          color: '#cbd5e1',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1.5px solid rgba(45, 212, 191, 0.3)',
            paddingBottom: '12px',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                backgroundColor: '#0f766e',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '13px',
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              算法 ①
            </span>
            <h2 style={{ fontSize: '17px', fontWeight: 'bold', color: '#2dd4bf', margin: 0 }}>
              真实竞技硬实力分 (S_true) 的计算
            </h2>
          </div>
        </div>

        {/* S_true LaTeX 渲染 */}
        <div className="markdown-body">
          <Markdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
          >
            {S_TRUE_MARKDOWN}
          </Markdown>
        </div>
      </div>

      {/* 算法 2：理论最高分 (S_max) 的计算 */}
      <div
        id="card-algo-smax"
        style={{
          backgroundColor: '#090d16',
          border: '2px solid rgba(245, 158, 11, 0.5)',
          borderRadius: '10px',
          padding: '20px 22px',
          fontSize: '13px',
          lineHeight: '1.7',
          color: '#cbd5e1',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1.5px solid rgba(245, 158, 11, 0.3)',
            paddingBottom: '12px',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                backgroundColor: '#b45309',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '13px',
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              算法 ②
            </span>
            <h2 style={{ fontSize: '17px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>
              理论最高分 (S_max) 的计算
            </h2>
          </div>
        </div>

        {/* S_max LaTeX 渲染 */}
        <div className="markdown-body">
          <Markdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
          >
            {S_MAX_MARKDOWN}
          </Markdown>
        </div>
      </div>
    </div>
  );
}
