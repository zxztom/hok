/**
 * 王者荣耀战绩双算法引擎 (DualEngineRankAnalyzer)
 * 包含：
 * 1. 模式 A (简易算法 / 稳健解耦模式)
 * 2. 模式 B (zxz 的智慧结晶 / 严格分段微积分牛顿迭代法)
 */

export interface PlayerStats {
  N: number;           // 总场次
  P_bar: number;       // 面板总胜率 (0.0 ~ 1.0 或 0 ~ 100)
  S_final: number;     // 当前巅峰积分
  G?: number;          // 顶级牌 + 金牌数
  S_v?: number;        // 银牌数
  P_5?: number;        // 五连绝世数
  M_total?: number;    // 总MVP数 (胜方MVP + 败方MVP)
  gamma_role?: number; // 战局影响力系数 (大核<1.0, 默认=1.0, 肉坦硬辅>1.0)
}

export type AlgorithmMode = 'mode_a' | 'mode_b';

export interface CalculationResult {
  mode: string;
  modeKey: AlgorithmMode;
  R_true: number;
  water: number;
  delta_S_water: number; // 兼容命名
  beta: number;
  S_max: number;
  k_cur: number;
  D: number;
  win_rates: { score: number; label: string; rate: number }[];
  tier_win_rates: Record<string, string>;
  tips: string;
}

export class DualEngineRankAnalyzer {
  public static readonly S_0: number = 1200.0;
  public static readonly D_BASE: number = 1600.0;

  /**
   * 1. (2) 个人支配力系数 beta (官方 max 互斥去重 + 50% 胜率 Logit 指数加权)
   */
  public static calculate_beta(stats: PlayerStats, gamma: number = 2.5): number {
    const N = stats.N || 0;
    if (N <= 0) {
      return 1.0;
    }

    const G = Math.max(0, stats.G || 0);
    const S_v = Math.max(0, stats.S_v || 0);
    const P_5 = Math.max(0, stats.P_5 || 0);
    const M_total = Math.max(0, stats.M_total || 0);

    // M_pure = max(0, M_total - G - S_v)
    const M_pure = Math.max(0, M_total - G - S_v);
    // E_total = 6G + 3S_v + 4P_5 + 2M_pure
    const E_total = 6 * G + 3 * S_v + 4 * P_5 + 2 * M_pure;
    // e_bar = E_total / N
    const e_bar = E_total / N;

    let p_val = stats.P_bar;
    if (p_val > 1.0) {
      p_val = p_val / 100.0;
    }
    p_val = Math.max(0.001, Math.min(0.999, p_val));

    // beta = e_bar * exp(gamma * (P_bar - 0.5))
    const beta = e_bar * Math.exp(gamma * (p_val - 0.5));
    return beta;
  }

  /**
   * 模式 A：简易算法 (纯胜率路径积分闭式解 - 免疫挑战赛干扰)
   */
  public static run_mode_a(stats: PlayerStats): CalculationResult {
    const gamma_role = stats.gamma_role ?? 1.00;
    const D = this.D_BASE * gamma_role;
    const delta_S = Math.max(1.0, stats.S_final - this.S_0);

    let p_val = stats.P_bar;
    if (p_val > 1.0) {
      p_val = p_val / 100.0;
    }
    p_val = Math.max(0.001, Math.min(0.999, p_val));

    // 纯胜率路径定积分闭式解
    const C = Math.pow(10.0, (delta_S * p_val) / D);
    const term_S0 = Math.pow(10.0, -this.S_0 / D);
    const term_Sfinal = Math.pow(10.0, -stats.S_final / D);

    const denominator = term_S0 - C * term_Sfinal;
    let R_true: number;

    if (denominator <= 0 || !isFinite(denominator)) {
      R_true = stats.S_final;
    } else {
      const y = (C - 1.0) / denominator;
      R_true = D * Math.log10(Math.max(1.0, y));
    }

    if (!isFinite(R_true) || isNaN(R_true)) {
      R_true = stats.S_final;
    }

    const beta = this.calculate_beta(stats);
    const water = stats.S_final - R_true;
    const k_cur = this._get_k(stats.S_final);
    const S_max = R_true + D * Math.log10(1.0 + beta / (15.0 * k_cur));

    return {
      mode: '模式 A (简易算法)',
      modeKey: 'mode_a',
      R_true: Number(R_true.toFixed(2)),
      water: Number(water.toFixed(2)),
      delta_S_water: Number(water.toFixed(2)),
      beta: Number(beta.toFixed(3)),
      S_max: Number(S_max.toFixed(2)),
      k_cur,
      D,
      win_rates: this._get_win_rate_list(R_true, D, stats.S_final),
      tier_win_rates: this._get_tier_win_rates(R_true, D, stats.S_final),
      tips: '简易算法：不看场次快慢，只看胜率爬坡，不易受挑战赛加分干扰。',
    };
  }

  /**
   * 模式 B：zxz 的智慧结晶 (严格分段目标方程与牛顿迭代法求解析 R_true)
   */
  public static run_mode_b(stats: PlayerStats): CalculationResult {
    const gamma_role = stats.gamma_role ?? 1.00;
    const D = this.D_BASE * gamma_role;
    const beta = this.calculate_beta(stats);

    let p_val = stats.P_bar;
    if (p_val > 1.0) {
      p_val = p_val / 100.0;
    }
    p_val = Math.max(0.001, Math.min(0.999, p_val));
    const N = Math.max(1, stats.N || 1);
    const S_final = stats.S_final;

    // 2. 官方阶梯阻力分段定义: T = [1200, 1500, 1800, 2100, Infinity]
    const tiers = [
      { T_prev: 1200, T_next: 1500, k: 1.0 },
      { T_prev: 1500, T_next: 1800, k: 2.0 },
      { T_prev: 1800, T_next: 2100, k: 3.0 },
      { T_prev: 2100, T_next: 99999, k: 4.0 },
    ];

    // 获取所有 b_i > a_i 的有效区间
    const activeSegments: { a: number; b: number; k: number }[] = [];
    let sumKDelta = 0;
    let totalDelta = Math.max(1.0, S_final - 1200);

    for (const t of tiers) {
      const a = Math.max(1200, t.T_prev);
      const b = Math.min(S_final, t.T_next);
      if (b > a) {
        activeSegments.push({ a, b, k: t.k });
        sumKDelta += t.k * (b - a);
      }
    }

    // 5. 牛顿法初值估计量 R_0
    const k_bar = sumKDelta / totalDelta;
    const exponent = ((15.0 + beta / k_bar) * (N * p_val) - (S_final - 1200)) / D;
    const lam = Math.pow(10.0, exponent);

    let R_0: number;
    const B_approx = 1.0 + beta / (15.0 * k_bar);
    const num_approx = lam * Math.pow(10.0, S_final / D) - Math.pow(10.0, this.S_0 / D);
    const den_approx = B_approx * (lam - 1.0);

    if (den_approx > 0 && num_approx > 0 && isFinite(num_approx) && isFinite(den_approx)) {
      R_0 = D * Math.log10(num_approx / den_approx);
    } else {
      R_0 = this.run_mode_a(stats).R_true;
    }

    if (!isFinite(R_0) || isNaN(R_0)) {
      R_0 = S_final;
    }

    // 单段解析原函数 F_i(S, R_true)
    const F_i = (S: number, R: number, k: number): number => {
      const B = 1.0 + beta / (15.0 * k);
      const diffExp = (S - R) / D;
      const tenExp = Math.pow(10.0, diffExp);
      const denom = tenExp - B;
      const ratio = Math.abs(tenExp / (Math.abs(denom) < 1e-12 ? (denom >= 0 ? 1e-12 : -1e-12) : denom));
      const lnPart = Math.log(Math.max(1e-15, ratio));
      const factor = D / (Math.LN10 * (15.0 + beta / k));
      return factor * lnPart;
    };

    // 单段导数辅助函数 g_i(S, R_true)
    const g_i = (S: number, R: number, k: number): number => {
      const diffExp = (S - R) / D;
      const tenExp = Math.pow(10.0, diffExp);
      const denom = 15.0 * tenExp - (15.0 + beta / k);
      if (Math.abs(denom) < 1e-12) {
        return denom >= 0 ? 1e12 : -1e12;
      }
      return 1.0 / denom;
    };

    // 目标方程 f(R) = sum(F_i(b_i) - F_i(a_i)) - N * P_bar
    const targetWins = N * p_val;
    const f = (R: number): number => {
      let sum = 0;
      for (const seg of activeSegments) {
        sum += (F_i(seg.b, R, seg.k) - F_i(seg.a, R, seg.k));
      }
      return sum - targetWins;
    };

    // 导数方程 f'(R) = sum(g_i(b_i) - g_i(a_i))
    const f_prime = (R: number): number => {
      let sum = 0;
      for (const seg of activeSegments) {
        sum += (g_i(seg.b, R, seg.k) - g_i(seg.a, R, seg.k));
      }
      return sum;
    };

    // 4. 牛顿迭代求解 R_true
    let R_cur = R_0;
    let iterations = 0;
    const maxIterations = 35;
    const tol = 1e-4;

    while (iterations < maxIterations) {
      const f_val = f(R_cur);
      if (Math.abs(f_val) < tol) {
        break;
      }
      const df_val = f_prime(R_cur);
      if (Math.abs(df_val) < 1e-14 || !isFinite(df_val)) {
        break;
      }
      let delta = f_val / df_val;
      // 步长阻尼保护防止数值飞跃
      if (Math.abs(delta) > 300) {
        delta = Math.sign(delta) * 300;
      }
      R_cur = R_cur - delta;
      iterations++;
    }

    let R_true = R_cur;
    if (!isFinite(R_true) || isNaN(R_true)) {
      R_true = R_0;
    }

    const water = S_final - R_true;
    const k_cur = this._get_k(S_final);
    const S_max = R_true + D * Math.log10(1.0 + beta / (15.0 * k_cur));

    return {
      mode: '模式 B (zxz 的智慧结晶)',
      modeKey: 'mode_b',
      R_true: Number(R_true.toFixed(2)),
      water: Number(water.toFixed(2)),
      delta_S_water: Number(water.toFixed(2)),
      beta: Number(beta.toFixed(3)),
      S_max: Number(S_max.toFixed(2)),
      k_cur,
      D,
      win_rates: this._get_win_rate_list(R_true, D, S_final),
      tier_win_rates: this._get_tier_win_rates(R_true, D, S_final),
      tips: 'zxz 结晶：严格分段微积分与牛顿迭代，综合牌子能量；若挑战赛占比较大则会偏高。',
    };
  }

  // 辅助方法
  public static _get_k(score: number): number {
    if (score < 1500) return 1.0;
    if (score < 1800) return 2.0;
    if (score < 2100) return 3.0;
    return 4.0;
  }

  public static _get_tier_win_rates(R_true: number, D: number, S_final: number): Record<string, string> {
    const scores = [1200, 1400, 1500, 1600, 1725, 1800, 2100, 2410, Math.round(S_final)];
    const res: Record<string, string> = {};
    for (const s of Array.from(new Set(scores)).sort((a, b) => a - b)) {
      const p = 1.0 / (1.0 + Math.pow(10.0, (s - R_true) / D));
      res[`${s}分`] = `${(p * 100).toFixed(1)}%`;
    }
    return res;
  }

  public static _get_win_rate_list(R_true: number, D: number, S_final: number): { score: number; label: string; rate: number }[] {
    const scores = [1200, 1400, 1500, 1600, 1725, 1800, 2100, 2410, Math.round(S_final)];
    const unique = Array.from(new Set(scores)).sort((a, b) => a - b);
    return unique.map((s) => {
      const p = 1.0 / (1.0 + Math.pow(10.0, (s - R_true) / D));
      return {
        score: s,
        label: s === Math.round(S_final) ? `${s} (当前)` : `${s}`,
        rate: p * 100,
      };
    });
  }
}

// 统一对外调度函数
export function solveDynamics(input: PlayerStats, mode: AlgorithmMode = 'mode_a'): CalculationResult {
  if (mode === 'mode_b') {
    return DualEngineRankAnalyzer.run_mode_b(input);
  }
  return DualEngineRankAnalyzer.run_mode_a(input);
}
