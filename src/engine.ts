/**
 * 王者荣耀战绩动力学分析引擎 (RankDynamicsAnalyzer)
 * 
 * 依据手稿全量微积分动力学数学建模：
 * 1. 能量增长率 dE/dN 动态分段函数
 * 2. M_{E/P} = (10*PS + 6*G + 3*SV) / N，k_F = 900 * (1.8 / M_{E/P})
 * 3. 速度方程 ds/dN = 30*P(s) - 15 + (dE/dN)/k(s)
 * 4. 场数积分方程 N = \int_{1200}^{S_{present}} \frac{1}{v(s)} ds，数值试出 S_true
 * 5. 内置物理超光速熔断安全机制
 */

export interface PlayerStats {
  N: number;           // 总场次 (N)
  P_bar: number;       // 面板总胜率 (0.001 ~ 0.999 或 0 ~ 100)
  S_final: number;     // 当前巅峰积分 (S_present)
  P_5: number;         // 五连绝世数 (PS)
  G: number;           // 顶级牌 + 金牌数 (G)
  S_v: number;         // 银牌数 (SV)
  mvp_count?: number;  // 兼容字段
  gamma_role?: number; // 兼容字段
}

export type AlgorithmMode = 'dynamics';

export interface BaseParams {
  P_bar: number;
  M_EP: number;
  k_F: number;
}

export interface CalculationResult {
  mode: string;
  modeKey: string;
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
  tol: number = 1e-4,
  maxRecursion: number = 14
): number {
  const h = b - a;
  if (Math.abs(h) < 1e-12) return 0;
  const c = (a + b) / 2;
  const fa = f(a);
  const fb = f(b);
  const fc = f(c);
  const S = (h / 6) * (fa + 4 * fc + fb);

  function recursiveSimpson(
    a: number,
    b: number,
    fa: number,
    fb: number,
    fc: number,
    S: number,
    tol: number,
    depth: number
  ): number {
    const c = (a + b) / 2;
    const d = (a + c) / 2;
    const e = (c + b) / 2;
    const fd = f(d);
    const fe = f(e);
    const Sleft = ((c - a) / 6) * (fa + 4 * fd + fc);
    const Sright = ((b - c) / 6) * (fc + 4 * fe + fb);
    const S2 = Sleft + Sright;

    if (depth <= 0 || Math.abs(S2 - S) <= 15 * tol) {
      return S2 + (S2 - S) / 15;
    }
    return (
      recursiveSimpson(a, c, fa, fc, fd, Sleft, tol / 2, depth - 1) +
      recursiveSimpson(c, b, fc, fb, fe, Sright, tol / 2, depth - 1)
    );
  }

  return recursiveSimpson(a, b, fa, fb, fc, S, tol, maxRecursion);
}

// 辅助数值求根：Brent-Dekker 求根算法 (Brent's Method)
function brentq(
  f: (x: number) => number,
  x1: number,
  x2: number,
  tol: number = 1e-4,
  maxIter: number = 60
): number {
  let a = x1;
  let b = x2;
  let fa = f(a);
  let fb = f(b);

  if (fa * fb > 0) {
    // 同号则沿负梯度简单二分兜底
    for (let step = 0; step < 50; step++) {
      const mid = (a + b) / 2;
      const fmid = f(mid);
      if (Math.abs(fmid) < tol) return mid;
      if (Math.abs(fa) < Math.abs(fb)) {
        b = mid;
        fb = fmid;
      } else {
        a = mid;
        fa = fmid;
      }
    }
    return Math.abs(fa) < Math.abs(fb) ? a : b;
  }

  let c = a;
  let fc = fa;
  let d = b - a;
  let e = d;

  for (let iter = 0; iter < maxIter; iter++) {
    if (Math.abs(fc) < Math.abs(fb)) {
      a = b;
      b = c;
      c = a;
      fa = fb;
      fb = fc;
      fc = fa;
    }

    const tolAct = 2 * 1e-11 * Math.abs(b) + tol / 2;
    const newStep = (c - b) / 2;

    if (Math.abs(newStep) <= tolAct || fb === 0) {
      return b;
    }

    if (Math.abs(e) >= tolAct && Math.abs(fa) > Math.abs(fb)) {
      let p: number;
      let q: number;
      const s = fb / fa;

      if (a === c) {
        p = 2 * newStep * s;
        q = 1 - s;
      } else {
        q = fa / fc;
        const r = fb / fc;
        p = s * (2 * newStep * q * (q - r) - (b - a) * (r - 1));
        q = (q - 1) * (r - 1) * (s - 1);
      }

      if (p > 0) q = -q;
      p = Math.abs(p);

      if (2 * p < Math.min(3 * newStep * q - Math.abs(tolAct * q), Math.abs(e * q))) {
        e = d;
        d = p / q;
      } else {
        d = newStep;
        e = d;
      }
    } else {
      d = newStep;
      e = d;
    }

    a = b;
    fa = fb;
    if (Math.abs(d) > tolAct) {
      b += d;
    } else {
      b += newStep > 0 ? tolAct : -tolAct;
    }
    fb = f(b);
    if ((fb > 0 && fc > 0) || (fb < 0 && fc < 0)) {
      c = a;
      fc = fa;
      d = b - a;
      e = d;
    }
  }

  return b;
}

export class RankDynamicsAnalyzer {
  public static S_0 = 1200.0; // 赛季初继承基准分

  /**
   * 能量抵扣系数分段函数 k(s)
   */
  public static get_k_s(s: number): number {
    if (s < 1500) return 1.0;
    if (s < 1800) return 2.0;
    if (s < 2100) return 3.0;
    return 4.0;
  }

  /**
   * 计算基础动力学参数
   */
  public static calculate_base_params(stats: PlayerStats): BaseParams {
    let p_val = stats.P_bar;
    if (p_val > 1.0) p_val = p_val / 100.0;
    const P_bar = Math.min(0.999, Math.max(0.001, p_val));

    const N = Math.max(0, stats.N || 0);
    const PS = Math.max(0, stats.P_5 || 0);
    const G = Math.max(0, stats.G || 0);
    const SV = Math.max(0, stats.S_v || 0);

    // 1. 场均能量 M_EP = (10*PS + 6*G + 3*SV) / N
    let M_EP = N > 0 ? (10.0 * PS + 6.0 * G + 3.0 * SV) / N : 0.0;
    M_EP = Math.max(0.01, M_EP); // 兜底保护

    // 2. 动态 ELO 常数 k_F = 900 * (1.8 / M_EP)
    const k_F = 900.0 * (1.8 / M_EP);

    return { P_bar, M_EP, k_F };
  }

  /**
   * 全量微积分动力学算法 (zxz的智慧结晶（新）)
   * 严格按照微积分方程 N = \int (1/v) ds 求根
   */
  public static run_dynamics(stats: PlayerStats): CalculationResult {
    const { P_bar, M_EP, k_F } = this.calculate_base_params(stats);
    const S_0 = this.S_0;
    const N = Math.max(1, stats.N || 1);
    const S_present = Math.max(S_0, stats.S_final || S_0);

    // 简易闭式解兜底器（当微分方程无实数解时启动）
    const runFallback = (): number => {
      const C_1 = 30.0;
      const C_2 = 15.0;
      const S_present_eff = S_present;
      const k_present = this.get_k_s(S_present_eff);
      const v_E = M_EP / k_present;
      const v_eff = (S_present_eff - S_0) / N;
      const P_eff = Math.min(0.999, Math.max(0.001, (v_eff + C_2 - v_E) / C_1));
      return S_present_eff - k_F * Math.log10(1.0 / P_eff - 1.0);
    };

    // 【物理熔断校验】：检测“挑战赛严重注水”导致的超光速异常
    const max_v = 15.0 + 6.0 / 1.0; // 绝对物理极限速度 (~21分/场)
    if ((S_present - S_0) / max_v > N) {
      const fallbackR = runFallback();
      const water = S_present - fallbackR;
      const k_cur = this.get_k_s(S_present);
      const S_max = this.calculate_S_max(fallbackR, P_bar, M_EP, k_F);
      return {
        mode: '动力学微积分',
        modeKey: 'dynamics',
        R_true: Number(fallbackR.toFixed(2)),
        water: Number(water.toFixed(2)),
        M_EP: Number(M_EP.toFixed(3)),
        k_F: Number(k_F.toFixed(1)),
        S_max: Number(S_max.toFixed(2)),
        k_cur,
        win_rates: this._get_win_rate_list(fallbackR, k_F, S_present),
        tier_win_rates: this._get_tier_win_rates(fallbackR, k_F, S_present),
        tips: '⚠️ 触发物理熔断（爬分所需最小物理场次 > 实际场次，场外加分过多），已自动启用闭式保底测算',
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

    // 如果依然找不到根，采用闭式解保底
    if (S_true === null || isNaN(S_true) || !isFinite(S_true)) {
      const fallbackR = runFallback();
      const water = S_present - fallbackR;
      const k_cur = this.get_k_s(S_present);
      const S_max = this.calculate_S_max(fallbackR, P_bar, M_EP, k_F);
      return {
        mode: '动力学微积分',
        modeKey: 'dynamics',
        R_true: Number(fallbackR.toFixed(2)),
        water: Number(water.toFixed(2)),
        M_EP: Number(M_EP.toFixed(3)),
        k_F: Number(k_F.toFixed(1)),
        S_max: Number(S_max.toFixed(2)),
        k_cur,
        win_rates: this._get_win_rate_list(fallbackR, k_F, S_present),
        tier_win_rates: this._get_tier_win_rates(fallbackR, k_F, S_present),
        tips: '⚠️ 时间微积分目标方程在搜索域内无实数解，已自动启动闭式保底测算',
        isFallback: true,
        fallbackReason: '目标方程在搜索域内无实数解，已启动闭式保底测算。',
      };
    }

    const water = S_present - S_true;
    const k_cur = this.get_k_s(S_present);
    const S_max = this.calculate_S_max(S_true, P_bar, M_EP, k_F);

    return {
      mode: '动力学微积分',
      modeKey: 'dynamics',
      R_true: Number(S_true.toFixed(2)),
      water: Number(water.toFixed(2)),
      M_EP: Number(M_EP.toFixed(3)),
      k_F: Number(k_F.toFixed(1)),
      S_max: Number(S_max.toFixed(2)),
      k_cur,
      win_rates: this._get_win_rate_list(S_true, k_F, S_present),
      tier_win_rates: this._get_tier_win_rates(S_true, k_F, S_present),
      tips: '通过全量动力学时间微积分方程严格求根求得 S_true。',
      isFallback: false,
    };
  }

  /**
   * 理论最高分数 S_max 纯代数算法
   * 物理定义：上分速度 ds/dN = 0 时对应的平衡极限分数
   */
  public static calculate_S_max(
    S_true: number,
    P_bar: number,
    M_EP: number,
    k_F: number
  ): number {
    const k_list = [1, 2, 3, 4];
    for (const k of k_list) {
      // 步骤 2：求解当前 k 下的极限平衡胜率 P*
      let P_star: number;

      // 1. 先假设极限胜率 <= 面板均值胜率 (情况 A)
      const denomA = 30.0 + M_EP / (k * P_bar);
      const P_star_A = 15.0 / Math.max(0.001, denomA);

      if (P_star_A <= P_bar) {
        P_star = P_star_A;
      } else {
        // 2. 否则，极限胜率 > 面板均值胜率 (情况 B)
        const m = (6.0 - M_EP) / Math.max(0.001, 1.0 - P_bar);
        const P_star_B = (15.0 * k + m - 6.0) / Math.max(0.001, 30.0 * k + m);
        P_star = P_star_B;
      }

      // 边界保护 0.001 ~ 0.999
      P_star = Math.min(0.999, Math.max(0.001, P_star));

      // 步骤 3：反解 S_max 并校验区间
      const S_max = S_true + k_F * Math.log10((1.0 - P_star) / P_star);

      // 区间校验
      if (k === 1 && S_max < 1500) {
        return Number(S_max.toFixed(2));
      } else if (k === 2 && S_max >= 1500 && S_max < 1800) {
        return Number(S_max.toFixed(2));
      } else if (k === 3 && S_max >= 1800 && S_max < 2100) {
        return Number(S_max.toFixed(2));
      } else if (k === 4) {
        return Number(S_max.toFixed(2));
      }
    }
    return Number(S_true.toFixed(2));
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

// 统一对外求解入口
export function solveDynamics(input: PlayerStats): CalculationResult {
  return RankDynamicsAnalyzer.run_dynamics(input);
}
