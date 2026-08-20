import React from 'react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

const MANUAL_MARKDOWN = `# 📘 王者荣耀巅峰赛真实硬实力（$R_{true}$）分段动力学算法说明书

---

## 一、 模型核心假设与物理建模

### 1. 5v5 团队方差平抑假设（Elo-Logistic 胜率衰减）
*   **物理机制**：个人仅占 5v5 团队战力的 $\\frac{1}{5}$。单人真实水平 $R_{true}$ 偏离当前对局分段 $S$ 时，其实时单局胜率 $p(S)$ 服从团队方差平抑后的逻辑斯蒂分布：
    $$ p(S) = \\frac{1}{1 + 10^{\\frac{S - R_{true}}{D}}} $$
*   **战局影响力平抑常数 $D$**：
    $$ D = 1600.0 \\times \\gamma_{role} $$
    *   $\\gamma_{role}$ 为用户自评的战局影响力系数：
        *   吃大量经济的大核心/节奏野王（个人决定胜负方差大）：$\\gamma_{role} < 1.0$（$D$ 偏小，胜率对分差更敏感）；
        *   让经济的团队肉坦/开团硬辅（胜负依赖团队协同）：$\\gamma_{role} > 1.0$（$D$ 偏大，胜率曲线更平缓）；
        *   标准均衡打法：$\\gamma_{role} = 1.00$（默认基准）。

### 2. 能量获取互斥性与 Logit 优势比耦合（$\\beta$ 建模）
*   **官方 $\\max$ 互斥规则**：单局能量按 $\\max(E_{五杀}, E_{金牌}, E_{银牌}, E_{MVP})$ 结算，同局各项不重复叠加；
*   **50% 胜率中心化 Logit 修正**：为防止负胜率玩家靠输局独吞败方 MVP（SVP）虚假刷分，引入胜率优势比指数：
    $$ \\beta = \\bar{e} \\cdot e^{\\gamma \\cdot (\\bar{P} - 0.5)} \\quad (\\gamma = 2.5) $$
    *   $\\bar{P} > 50\\%$ 时，能量正向升值，认可硬核带飞统治力；
    *   $\\bar{P} < 50\\%$ 时，能量向下折损，压制靠输局刷牌子的水分。

### 3. 严格分段阶梯阻力模型
*   王者荣耀巅峰能量的掉分抵扣消耗随分段呈严格阶梯式跃迁：
    *   $1200 \\le S < 1500$：$k_1 = 1.0$（1点能量抵1分）
    *   $1500 \\le S < 1800$：$k_2 = 2.0$（2点能量抵1分）
    *   $1800 \\le S < 2100$：$k_3 = 3.0$（3点能量抵1分）
    *   $S \\ge 2100$：$k_4 = 4.0$（4点能量抵1分）
*   **本算法绝不在跨段时做粗糙的算术平均，而是将爬分轨迹严格切分为多个独立区间，分别求出单段解析原函数后求和求解。**

### 4. 边界可忽略性公理（大数定律收敛）
*   **MMR 加扣分不对等**：在 $N > 50$ 的大样本下，匹配机制的强弱扰动对称抵消，单局净胜得分期望严格收敛于 $\\pm 15$ 分；
*   **巅峰能量存储上限**：除极端炸鱼连胜外，绝大多数玩家能量处于“随产随抵”状态，无溢出损耗。

---

## 二、 符号与参数字典

| 符号 | 物理含义 | 来源 / 算法 |
| :--- | :--- | :--- |
| **$N$** | 总对局场次 | 面板直接读取 |
| **$\\bar{P}$** | 面板累计总胜率 | 小数形式（例如 $61.8\\%$ 记为 $0.618$） |
| **$S_{final}$** | 当前巅峰积分 | 面板直接读取（$\\ge 1200$） |
| **$S_0$** | 初始巅峰底分 | 恒定常数 $1200.0$ |
| **$G$** | 顶级牌 + 金牌总数 | 面板直接读取 |
| **$S_v$** | 银牌总数 | 面板直接读取 |
| **$P_5$** | 五连绝世（五杀）数 | 面板直接读取 |
| **$M_{total}$** | 总 MVP 次数 | 全场最佳数 + 败方最佳数 |
| **$\\gamma_{role}$** | 战局影响力系数 | 用户自定义（范围 $0.70 \\sim 1.50$，默认 $1.00$） |
| **$D$** | 团队平抑常数 | $D = 1600.0 \\times \\gamma_{role}$ |
| **$\\beta$** | 个人支配力系数 | 结合官方互斥与 Logit 加权求得 |
| **$R_{true}$** | 真实竞技硬实力分 | 算法核心输出目标分 |
| **$\\Delta S_{water}$** | 积分虚高水分 | $\\Delta S_{water} = S_{final} - R_{true}$ |
| **$S_{max}$** | 理论最高天花板 | 动力学极限平衡点 |

---

## 三、 核心数学公式体系

### 1. 个人支配力系数 $\\beta$ 计算公式
*   **纯 MVP 场次（去重）**：
    $$ M_{pure} = \\max(0, \\, M_{total} - G - S_v) $$
*   **去重总能量与场均能量**：
    $$ E_{total} = 6G + 3S_v + 4P_5 + 2M_{pure} $$
    $$ \\bar{e} = \\frac{E_{total}}{N} $$
*   **$\\beta$ 终极表达式**：
    $$ \\beta = \\bar{e} \\cdot e^{2.5 \\cdot (\\bar{P} - 0.5)} $$

---

### 2. 官方阶梯阻力分段区间定义

分段边界点数组：$T = [T_0, T_1, T_2, T_3, T_4] = [1200, 1500, 1800, 2100, +\\infty]$

| 区间序号 $i$ | 分数区间 $[T_{i-1}, T_i)$ | 对应阻力系数 $k_i$ |
| :--- | :--- | :--- |
| **$i = 1$** | $[1200, 1500)$ | $k_1 = 1.0$ |
| **$i = 2$** | $[1500, 1800)$ | $k_2 = 2.0$ |
| **$i = 3$** | $[1800, 2100)$ | $k_3 = 3.0$ |
| **$i = 4$** | $[2100, +\\infty)$ | $k_4 = 4.0$ |

对于任意给定的 $S_{final}$，第 $i$ 段的有效积分上下界为：
$$ a_i = \\max(1200, T_{i-1}), \\quad b_i = \\min(S_{final}, T_i) \\quad (\\text{仅对 } b_i > a_i \\text{ 的有效区间求和}) $$

---

### 3. 严格分段目标方程：$f(R_{true}) = 0$

系统依据各分段的解析原函数进行严格求和，建立非线性目标方程：

$$ f(R_{true}) = \\sum_{i \\, (b_i > a_i)} \\Big[ F_i(b_i, R_{true}) - F_i(a_i, R_{true}) \\Big] - N \\cdot \\bar{P} = 0 $$

#### 单段严格解析原函数 $F_i(S, R_{true})$：
$$ F_i(S, R_{true}) = \\frac{D}{\\ln 10 \\cdot \\left(15 + \\frac{\\beta}{k_i}\\right)} \\cdot \\ln \\left| \\frac{10^{\\frac{S - R_{true}}{D}}}{10^{\\frac{S - R_{true}}{D}} - \\left(1 + \\frac{\\beta}{15 k_i}\\right)} \\right| $$

---

### 4. 牛顿迭代法导数表达式：$f'(R_{true})$

牛顿迭代迭代格式：
$$ R_{n+1} = R_n - \\frac{f(R_n)}{f'(R_n)} $$

总导数方程：
$$ f'(R_{true}) = \\sum_{i \\, (b_i > a_i)} \\Big[ g_i(b_i, R_{true}) - g_i(a_i, R_{true}) \\Big] $$

#### 单段导数辅助函数 $g_i(S, R_{true})$：
$$ g_i(S, R_{true}) = \\frac{1}{15 \\cdot 10^{\\frac{S - R_{true}}{D}} - \\left(15 + \\frac{\\beta}{k_i}\\right)} $$

---

### 5. 牛顿法初值估计量 $R_0$

为了保证牛顿迭代快速收敛，利用加权平均阻力 $\\bar{k}$ 提供高精度初值 $R_0$：

$$ \\bar{k} = \\frac{1}{S_{final} - 1200} \\sum_{i \\, (b_i > a_i)} k_i (b_i - a_i) $$

$$ \\lambda = 10^{\\frac{\\left(15 + \\frac{\\beta}{\\bar{k}}\\right) \\cdot (N \\cdot \\bar{P}) - (S_{final} - 1200)}{D}} $$

$$ R_0 = D \\cdot \\log_{10} \\left( \\frac{\\lambda \\cdot 10^{\\frac{S_{final}}{D}} - 10^{\\frac{1200}{D}}}{\\left(1 + \\frac{\\beta}{15 \\bar{k}}\\right) \\cdot (\\lambda - 1)} \\right) $$

---

### 6. 衍生诊断指标

*   **积分虚高水分**：
    $$ \\Delta S_{water} = S_{final} - R_{true} $$
    *   $\\Delta S_{water} > 0$：积分虚高（靠场次与保分机制堆积）；
    *   $\\Delta S_{water} \\le 0$：场次未打满，实力仍处于上升期。
*   **理论最高天花板 $S_{max}$**：
    $$ S_{max} = R_{true} + D \\cdot \\log_{10}\\left( 1 + \\frac{\\beta}{15 \\cdot k_{cur}} \\right) $$
    *(其中 $k_{cur}$ 为 $S_{final}$ 所在当前分段的阻力系数)*
*   **任意分段 $S$ 处的实时单局胜率预测**：
    $$ p(S) = \\frac{1}{1 + 10^{\\frac{S - R_{true}}{D}}} $$

---

## 四、 算法计算流程协议（Execution Pipeline）

\`\`\`
[步骤 1: 参数输入与预处理]
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
  └─ 计算锚点分段 [1200, 1400, 1500, 1600, 1725, 1800, 2100, S_final] 的实时胜率 p(S)
\`\`\`

---

## 五、 算法优劣势与核心局限分析

### 1. 算法核心优势
1.  **严格分段动力学的高保真度**：彻底摒弃跨段平均，精准还原了 1200~1500（1倍抵扣）与 1500+（翻倍抵扣）的阻力跃迁；
2.  **导数严格解析化**：牛顿法每一步迭代都有闭式解析导数 $g_i$ 支持，收敛速度达二次收敛（通常 3~5 步内精准收敛）；
3.  **识破刷分伪装**：结合官方 $\\max$ 去重与 Logit 优势比折损，天然免疫保分型刷子。

### 2. 算法核心痛点与致命局限（使用须知）

#### ⚠️ 痛点一（最严重！）：【瓶颈期胜率均值回归陷阱】
*   **机理**：若玩家在自身极限分段（如 1800 分）**长期卡瓶颈滞留（例如打满 200~300 场，胜率被彻底稀释拉平至 50% 附近）**，回溯积分方程会将稀释后的 50% 胜率视作全程表现，导致**测算出的 $R_{true}$ 严重偏低**；
*   **黄金测试建议**：**请勿在打满数百场、长期卡在瓶颈期后测试！最佳测试窗口是刚打完冲分期、场次在 $50 \\sim 150$ 场以内时测算最为精准。**

#### ⚠️ 痛点二：【周末巅峰挑战赛的积分注入失真】
*   挑战赛是官方限时发放的场外积分红利。若玩家**极为重度地参与挑战赛并以此冲分**，其 $S_{final}$ 含有未记录在排位负场中的外生积分，会导致动力学时间方程出现速度偏快，测算出的 $R_{true}$ 会产生**轻微向上偏置（略微偏高）**。对于此类玩家，可参考纯胜率解耦估算。
`;

export default function AlgorithmManual() {
  return (
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
      <div className="markdown-doc">
        <Markdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
          components={{
            h1: ({ children }) => (
              <h2
                style={{
                  fontSize: '17px',
                  fontWeight: 'bold',
                  color: '#38bdf8',
                  margin: '0 0 12px 0',
                  borderBottom: '1px solid #1e293b',
                  paddingBottom: '8px',
                }}
              >
                {children}
              </h2>
            ),
            h2: ({ children }) => (
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 'bold',
                  color: '#facc15',
                  marginTop: '16px',
                  marginBottom: '8px',
                }}
              >
                {children}
              </h3>
            ),
            h3: ({ children }) => (
              <h4
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#e2e8f0',
                  marginTop: '12px',
                  marginBottom: '6px',
                }}
              >
                {children}
              </h4>
            ),
            h4: ({ children }) => (
              <h5
                style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#94a3b8',
                  marginTop: '8px',
                  marginBottom: '4px',
                }}
              >
                {children}
              </h5>
            ),
            hr: () => (
              <hr style={{ borderColor: '#1e293b', margin: '14px 0' }} />
            ),
            p: ({ children }) => (
              <p style={{ margin: '6px 0' }}>{children}</p>
            ),
            ul: ({ children }) => (
              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>{children}</ul>
            ),
            ol: ({ children }) => (
              <ol style={{ margin: '4px 0', paddingLeft: '20px' }}>{children}</ol>
            ),
            li: ({ children }) => (
              <li style={{ margin: '3px 0' }}>{children}</li>
            ),
            table: ({ children }) => (
              <div style={{ overflowX: 'auto', margin: '10px 0' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '12px',
                    border: '1px solid #1e293b',
                  }}
                >
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead style={{ backgroundColor: '#131b2e', color: '#38bdf8' }}>
                {children}
              </thead>
            ),
            tbody: ({ children }) => (
              <tbody>{children}</tbody>
            ),
            tr: ({ children }) => (
              <tr style={{ borderBottom: '1px solid #1e293b' }}>{children}</tr>
            ),
            th: ({ children }) => (
              <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #1e293b' }}>
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td style={{ padding: '6px 10px', border: '1px solid #1e293b' }}>
                {children}
              </td>
            ),
            code: ({ inline, children, ...props }: any) => {
              if (inline) {
                return (
                  <code
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#38bdf8',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
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
                    margin: '10px 0',
                  }}
                >
                  <code {...props}>{children}</code>
                </pre>
              );
            },
            blockquote: ({ children }) => (
              <blockquote
                style={{
                  borderLeft: '3px solid #38bdf8',
                  paddingLeft: '10px',
                  margin: '8px 0',
                  color: '#94a3b8',
                }}
              >
                {children}
              </blockquote>
            ),
          }}
        >
          {MANUAL_MARKDOWN}
        </Markdown>
      </div>
    </div>
  );
}
