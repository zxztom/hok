/**
 * 王者荣耀战绩动力学分析引擎 (RankDynamicsAnalyzer)
 * 
 * 支持三种算法模式，按 A、B、C 严格顺序排列：
 * 
 * 模式 A：全量微积分动力学算法 (终极纯净版 · 核心推荐)
 * 依据用户手稿数学建模：
 * 1. 能量增长率 dE/dN 动态分段函数
 * 2. M_{E/P} = (10*PS + 6*G + 3*SV) / N，k_F = 1600 * (1.8 / M_{E/P})
 * 3. 速度方程 ds/dN = 30*P(s) - 15 + (dE/dN)/k(s)
 * 4. 场数积分方程 N = \int_{1200}^{S_{present}} \frac{1}{v(s)} ds，数值试出 S_true
 * 5. 内置物理超光速熔断安全机制
 * 
 * 模式 B：简易算法 (纯胜率闭式解 · 免疫挑战赛)
 * 纯胜率路径积分闭式解，不考虑时间微分，免疫周末挑战赛外生积分干扰，作为安全保底
 * 
 * 模式 C：zxz 的智慧结晶 (经典原函数牛顿法 · 引入 MVP 与战局影响力系数)
 * 引入 MVP 权重与分路影响力系数 \gamma_{role} 的经典严格微积分原函数牛顿迭代算法
 */

export interface PlayerStats {
  N: number;           // 总场次 (N)
  P_bar: number;       // 面板总胜率 (0.001 ~ 0.999 或 0 ~ 100)
  S_final: number;     // 当前巅峰积分 (S_present)
  P_5: number;         // 五连绝世数 (PS)
  G: number;           // 顶级牌 + 金牌数 (G)
  S_v: number;         // 银牌数 (SV)
  // 模式 C 专属拓展字段 (选填)
  mvp_count?: number;  // 总 MVP 次数
  gamma_role?: number; // 分路战局影响力系数 (默认 1.0)
}

export type AlgorithmMode = 'mode_a' | 'mode_b' | 'mode_c';

export interface BaseParams {
  P_bar: number;
  M_EP: number;
  k_F: number;
}

export interface CalculationResult {
  mode: string;
  modeKey: AlgorithmMode;
  R_true: number;          // 真实硬分 S_true
  water: number;           // 积分水分 S_present - S_true
  M_EP: number;            // 场均能量产出 M_{E/P}
  k_F: number;             // 隐藏 ELO 离散度 k_F
  S_max: number;           // 理论最高天花板
  k_cur: number;           // 当前分段阻力系数
  win_rates: { score: number; label: string; rate: number }[];
  tier_win_rates: Record<string, string>;
  tips: string;
  isFallback?: boolean;
  fallbackReason?: string;
}

// 辅助数值积分：自适应辛普森求积 (Adaptive Simpson's Method)
function adaptiveSimpson(
  f: (x: number) => number,
  a: number,
  b: number,
  eps: number = 1e-5,
  maxDepth: number = 16
): number {
  const simpson = (x0: number, x1: number): number => {
    const xm = (x0 + x1) / 2;
    return ((x1 - x0) / 6) * (f(x0) + 4 * f(xm) + f(x1));
  };

  const recursive = (x0: number, x1: number, curEps: number, whole: number, depth: number): number => {
    const xm = (x0 + x1) / 2;
    const left = simpson(x0, xm);
    const right = simpson(xm, x1);
    const diff = left + right - whole;
    if (depth <= 0 || Math.abs(diff) <= 15 * curEps) {
      return left + right + diff / 15;
    }
    return (
      recursive(x0, xm, curEps / 2, left, depth - 1) +
      recursive(xm, x1, curEps / 2, right, depth - 1)
    );
  };

  const initial = simpson(a, b);
  return recursive(a, b, eps, initial, maxDepth);
}

// 辅助求根：Brent 算法 (Brent-Dekker Method)
function brentq(
  f: (x: number) => number,
  a: number,
  b: number,
  tol: number = 1e-4,
  maxIter: number = 60
): number | null {
  let fa = f(a);
  let fb = f(b);

  if (fa === 0) return a;
  if (fb === 0) return b;
  if (fa * fb > 0) return null; // 未正确夹住根

  let c = a;
  let fc = fa;
  let d = b - a;
  let e = d;

  for (let iter = 0; iter < maxIter; iter++) {
    if (fb === 0 || Math.abs(b - a) < tol) {
      return b;
    }

    if (fa * fb > 0) {
      a = c;
      fa = fc;
      d = b - a;
      e = d;
    }

    if (Math.abs(fa) < Math.abs(fb)) {
      c = b;
      b = a;
      a = c;
      fc = fb;
      fb = fa;
      fa = fc;
    }

    const m = 0.5 * (a - b);
    const tolAct = 2 * 1e-15 * Math.abs(b) + 0.5 * tol;

    if (Math.abs(m) <= tolAct || fb === 0) {
      return b;
    }

    if (Math.abs(e) >= tolAct && Math.abs(fc) > Math.abs(fb)) {
      let s = fb / fc;
      let p: number;
      let q: number;

      if (a === c) {
        p = 2 * m * s;
        q = 1 - s;
      } else {
        q = fc / fa;
        const r = fb / fa;
        p = s * (2 * m * q * (q - r) - (b - c) * (r - 1));
        q = (q - 1) * (r - 1) * (s - 1);
      }

      if (p > 0) {
        q = -q;
      } else {
        p = -p;
      }

      if (2 * p < Math.min(3 * m * q - Math.abs(tolAct * q), Math.abs(e * q))) {
        e = d;
        d = p / q;
      } else {
        d = m;
        e = m;
      }
    } else {
      d = m;
      e = m;
    }

    c = b;
    fc = fb;

    if (Math.abs(d) > tolAct) {
      b += d;
    } else {
      b += m > 0 ? tolAct : -tolAct;
    }
    fb = f(b);
  }

  return b;
}

export class RankDynamicsAnalyzer {
  public static readonly S_0: number = 1200.0;

  /**
   * 能量抵扣系数分段函数 k(s)
   */
  public static get_k_s(S: number): number {
    if (S < 1500) return 1.0;
    if (S < 1800) return 2.0;
    if (S < 2100) return 3.0;
    return 4.0;
  }

  /**
   * 计算基准能量与动态 ELO 离散度 (全局通用)
   */
  public static calculate_base_params(stats: PlayerStats): BaseParams {
    let p_val = stats.P_bar;
    if (p_val > 1.0) p_val = p_val / 100.0;
    // 防止胜率绝对为 0 或 1 导致数学奇点
    const P_bar = Math.min(0.999, Math.max(0.001, p_val));

    const N = Math.max(0, stats.N || 0);
    const PS = Math.max(0, stats.P_5 || 0);
    const G = Math.max(0, stats.G || 0);
    const SV = Math.max(0, stats.S_v || 0);

    // 1. 场均能量 M_EP = (10*PS + 6*G + 3*SV) / N
    let M_EP = N > 0 ? (10.0 * PS + 6.0 * G + 3.0 * SV) / N : 0.0;
    M_EP = Math.max(0.01, M_EP); // 兜底保护，防止除零

    // 2. 动态 ELO 常数 k_F = 1600 * (1.8 / M_EP)
    const k_F = 1600.0 * (1.8 / M_EP);

    return { P_bar, M_EP, k_F };
  }

  /**
   * 模式 A：全量微积分动力学算法 (手稿最新算法 · 核心推荐)
   * 严格按照微积分方程 N = \int (1/v) ds 求根
   */
  public static run_mode_a(stats: PlayerStats): CalculationResult {
    const { P_bar, M_EP, k_F } = this.calculate_base_params(stats);
    const S_0 = this.S_0;
    const N = Math.max(1, stats.N || 1);
    const S_present = Math.max(S_0, stats.S_final || S_0);

    // 【物理熔断校验】：检测“挑战赛严重注水”导致的超光速异常
    const max_v = 15.0 + 6.0 / 1.0; // 绝对物理极限速度 (~21分/场)
    if ((S_present - S_0) / max_v > N) {
      // 实际场次比物理最小场次还少，微积分方程必无实数解，降级至模式 B
      const fallbackRes = this.run_mode_b(stats);
      return {
        ...fallbackRes,
        mode: '模式 A (全量微积分动力学)',
        modeKey: 'mode_a',
        tips: '⚠️ 触发物理熔断（爬分所需最小物理场次 > 实际场次，场外加分过多），已自动切至简易模式 B 进行闭式保底测算',
        isFallback: true,
        fallbackReason: '实际场次比物理极限最小场次还少，说明含有较多周末巅峰挑战赛等场外积分。',
      };
    }

    // ① 能量获取与实时胜率的动态分段耦合 dE/dN
    const get_dE_dN = (P_s: number): number => {
      if (P_s <= P_bar) {
        return (M_EP / P_bar) * P_s;
      } else {
        return ((6.0 - M_EP) / (1.0 - P_bar)) * (P_s - 1.0) + 6.0;
      }
    };

    // 核心速度方程 ds/dN = 30*P_s - 15 + dE_dN/k(s)
    const velocity = (S: number, S_true_guess: number): number => {
      const P_s = 1.0 / (1.0 + Math.pow(10.0, (S - S_true_guess) / k_F));
      const k_s = this.get_k_s(S);
      const dE_dN = get_dE_dN(P_s);
      return 30.0 * P_s - 15.0 + (dE_dN / k_s);
    };

    // 分段切片：依据 1200, 1500, 1800, 2100 阶梯跃迁点做自适应积分
    const tierBreaks = [1200, 1500, 1800, 2100, Infinity];
    const subIntervals: [number, number][] = [];
    for (let i = 0; i < tierBreaks.length - 1; i++) {
      const a = Math.max(1200, tierBreaks[i]);
      const b = Math.min(S_present, tierBreaks[i + 1]);
      if (b > a) {
        subIntervals.push([a, b]);
      }
    }

    // ② 定义积分目标函数 f(S_true) = \int_{1200}^{S_present} (1/v) ds - N = 0
    const objectiveFunc = (S_true_guess: number): number => {
      let totalIntegral = 0;
      for (const [a, b] of subIntervals) {
        const segIntegral = adaptiveSimpson(
          (s: number) => {
            const v = velocity(s, S_true_guess);
            return 1.0 / Math.max(0.001, v);
          },
          a,
          b,
          1e-4,
          14
        );
        totalIntegral += segIntegral;
      }
      return totalIntegral - N;
    };

    // 使用 brentq (数值求根) 试出答案
    let lower_bound = Math.max(800.0, S_present - 1000.0);
    let upper_bound = S_present + 1000.0;

    let fLow = objectiveFunc(lower_bound);
    let fHigh = objectiveFunc(upper_bound);

    if (fLow * fHigh > 0) {
      lower_bound = Math.max(400.0, S_present - 1800.0);
      upper_bound = S_present + 1800.0;
      fLow = objectiveFunc(lower_bound);
      fHigh = objectiveFunc(upper_bound);
    }

    let S_true: number | null = null;
    if (fLow * fHigh <= 0) {
      S_true = brentq(objectiveFunc, lower_bound, upper_bound, 1e-4, 60);
    }

    // 如果依然找不到根，降级至模式 B
    if (S_true === null || isNaN(S_true) || !isFinite(S_true)) {
      const fallbackRes = this.run_mode_b(stats);
      return {
        ...fallbackRes,
        mode: '模式 A (全量微积分动力学)',
        modeKey: 'mode_a',
        tips: '⚠️ 动力学寻根受场外机制干扰，已自动切至简易模式 B',
        isFallback: true,
        fallbackReason: '时间微积分目标方程在搜索域内无实数解，已自动启动模式 B 进行闭式保底测算。',
      };
    }

    const water = S_present - S_true;
    const k_cur = this.get_k_s(S_present);
    const S_max = S_true + k_F * Math.log10(1.0 + M_EP / (15.0 * k_cur));

    return {
      mode: 'zxz的智慧结晶（新）',
      modeKey: 'mode_a',
      R_true: Number(S_true.toFixed(2)),
      water: Number(water.toFixed(2)),
      M_EP: Number(M_EP.toFixed(3)),
      k_F: Number(k_F.toFixed(1)),
      S_max: Number(S_max.toFixed(2)),
      k_cur,
      win_rates: this._get_win_rate_list(S_true, k_F, S_present),
      tier_win_rates: this._get_tier_win_rates(S_true, k_F, S_present),
      tips: '成功 (模式 A)：通过 zxz的智慧结晶（新）全量动力学时间微积分方程严格求根求得 S_true。',
      isFallback: false,
    };
  }

  /**
   * 模式 B：简易算法（只看胜率）
   * 用途：纯胜率路径积分闭式解，不考虑时间微分，不受挑战赛影响，作为安全保底
   */
  public static run_mode_b(stats: PlayerStats): CalculationResult {
    const { P_bar, M_EP, k_F } = this.calculate_base_params(stats);
    const S_0 = this.S_0;
    const S_present = Math.max(S_0, stats.S_final || S_0);
    const delta_S = Math.max(1.0, S_present - S_0);

    const C = Math.pow(10.0, (delta_S * P_bar) / k_F);
    const term_S0 = Math.pow(10.0, -S_0 / k_F);
    const term_Spresent = Math.pow(10.0, -S_present / k_F);

    const denominator = term_S0 - C * term_Spresent;
    let S_true: number;

    if (denominator <= 0 || !isFinite(denominator)) {
      S_true = S_present;
    } else {
      const y = (C - 1.0) / denominator;
      S_true = k_F * Math.log10(Math.max(1.0, y));
    }

    if (!isFinite(S_true) || isNaN(S_true)) {
      S_true = S_present;
    }

    const water = S_present - S_true;
    const k_cur = this.get_k_s(S_present);
    const S_max = S_true + k_F * Math.log10(1.0 + M_EP / (15.0 * k_cur));

    return {
      mode: '简易算法（只看胜率）',
      modeKey: 'mode_b',
      R_true: Number(S_true.toFixed(2)),
      water: Number(water.toFixed(2)),
      M_EP: Number(M_EP.toFixed(3)),
      k_F: Number(k_F.toFixed(1)),
      S_max: Number(S_max.toFixed(2)),
      k_cur,
      win_rates: this._get_win_rate_list(S_true, k_F, S_present),
      tier_win_rates: this._get_tier_win_rates(S_true, k_F, S_present),
      tips: '模式 B（简易算法）：纯胜率路径积分闭式解，不受挑战赛影响。',
      isFallback: false,
    };
  }

  /**
   * 模式 C：经典动力学算法 (引入 MVP 与战局影响力系数)
   */
  public static run_mode_c(stats: PlayerStats): CalculationResult {
    let p_val = stats.P_bar;
    if (p_val > 1.0) p_val = p_val / 100.0;
    const P_bar = Math.min(0.999, Math.max(0.001, p_val));

    const N = Math.max(1, stats.N || 1);
    const S_0 = this.S_0;
    const S_present = Math.max(S_0, stats.S_final || S_0);
    const PS = Math.max(0, stats.P_5 || 0);
    const G = Math.max(0, stats.G || 0);
    const SV = Math.max(0, stats.S_v || 0);
    const MVP = Math.max(0, stats.mvp_count ?? Math.round(0.35 * N * P_bar));
    const gamma_role = Math.max(0.5, Math.min(1.8, stats.gamma_role ?? 1.0));

    // 经典场均能量
    let M_EP = (10.0 * PS + 6.0 * G + 3.0 * SV) / N;
    M_EP = Math.max(0.01, M_EP);

    // 经典个人影响力系数 I_ind = (1.5*MVP + 1.0*G + 0.5*SV) / N
    const I_ind = (1.5 * MVP + 1.0 * G + 0.5 * SV) / N;
    const k_F = 1600.0 * (1.8 / M_EP) * (1.0 / (gamma_role * Math.max(0.5, I_ind)));

    // 经典牛顿切线法
    let S_true_guess = S_present + (P_bar - 0.5) * 400;

    const evalIntegral = (S_t: number) => {
      const p_int = (s: number) => 1.0 / (1.0 + Math.pow(10.0, (s - S_t) / k_F));
      return adaptiveSimpson(
        (s: number) => {
          const p = p_int(s);
          const ks = RankDynamicsAnalyzer.get_k_s(s);
          const v = Math.max(0.1, 30.0 * p - 15.0 + M_EP / ks);
          return 1.0 / v;
        },
        S_0,
        S_present,
        1e-4,
        12
      );
    };

    for (let iter = 0; iter < 20; iter++) {
      const f_val = evalIntegral(S_true_guess) - N;
      if (Math.abs(f_val) < 0.05) break;

      const eps = 1.0;
      const f_plus = evalIntegral(S_true_guess + eps) - N;
      const df = (f_plus - f_val) / eps;

      if (Math.abs(df) < 1e-6) break;
      const step = f_val / df;
      S_true_guess -= Math.max(-100, Math.min(100, step));
    }

    if (!isFinite(S_true_guess) || isNaN(S_true_guess)) {
      S_true_guess = S_present;
    }

    const water = S_present - S_true_guess;
    const k_cur = this.get_k_s(S_present);
    const S_max = S_true_guess + k_F * Math.log10(1.0 + M_EP / (15.0 * k_cur));

    return {
      mode: 'zxz的智慧结晶（旧）',
      modeKey: 'mode_c',
      R_true: Number(S_true_guess.toFixed(2)),
      water: Number(water.toFixed(2)),
      M_EP: Number(M_EP.toFixed(3)),
      k_F: Number(k_F.toFixed(1)),
      S_max: Number(S_max.toFixed(2)),
      k_cur,
      win_rates: this._get_win_rate_list(S_true_guess, k_F, S_present),
      tier_win_rates: this._get_tier_win_rates(S_true_guess, k_F, S_present),
      tips: '模式 C（zxz 的智慧结晶）：经典原函数牛顿法，结合了 MVP 与分路战局影响力系数。',
      isFallback: false,
    };
  }

  // 辅助输出
  public static _get_tier_win_rates(R_true: number, k_F: number, S_final: number): Record<string, string> {
    const scores = [1200, 1400, 1500, 1600, 1725, 1800, 2100, 2250, 2400, 2500, Math.round(S_final)];
    const res: Record<string, string> = {};
    for (const s of Array.from(new Set(scores)).sort((a, b) => a - b)) {
      const p = 1.0 / (1.0 + Math.pow(10.0, (s - R_true) / k_F));
      res[`${s}分`] = `${(p * 100).toFixed(1)}%`;
    }
    return res;
  }

  public static _get_win_rate_list(R_true: number, k_F: number, S_final: number): { score: number; label: string; rate: number }[] {
    const scores = [1200, 1400, 1500, 1600, 1725, 1800, 2100, 2250, 2400, 2500, Math.round(S_final)];
    const unique = Array.from(new Set(scores)).sort((a, b) => a - b);
    return unique.map((s) => {
      const p = 1.0 / (1.0 + Math.pow(10.0, (s - R_true) / k_F));
      return {
        score: s,
        label: s === Math.round(S_final) ? `${s} (当前)` : `${s}`,
        rate: p * 100,
      };
    });
  }
}

// 统一对外求解入口 (按照 ABC 顺序排列)
export function solveDynamics(input: PlayerStats, mode: AlgorithmMode = 'mode_a'): CalculationResult {
  if (mode === 'mode_a') {
    return RankDynamicsAnalyzer.run_mode_a(input);
  }
  if (mode === 'mode_b') {
    return RankDynamicsAnalyzer.run_mode_b(input);
  }
  return RankDynamicsAnalyzer.run_mode_c(input);
}
