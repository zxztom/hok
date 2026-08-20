/**
 * 王者荣耀战绩双算法引擎 (DualEngineRankAnalyzer)
 * 支持纯 TypeScript 客户端运行
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
  delta_S_water: number; // 兼容旧版 UI 命名
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
   * 计算个人支配力 beta (max 互斥去重 + 50%胜率 Logit 指数优势比)
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

    const M_pure = Math.max(0, M_total - G - S_v);
    const E_total = 6 * G + 3 * S_v + 4 * P_5 + 2 * M_pure;
    const e_bar = E_total / N;

    let p_val = stats.P_bar;
    if (p_val > 1.0) {
      p_val = p_val / 100.0;
    }
    p_val = Math.max(0.001, Math.min(0.999, p_val));

    const beta = e_bar * Math.exp(gamma * (p_val - 0.5));
    return beta;
  }

  /**
   * 模式 A：稳健解耦模式 (纯胜率路径积分闭式解 - 免疫挑战赛干扰)
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
   * 模式 B：zxz 的智慧结晶 (含牌子与个人支配力 beta)
   */
  public static run_mode_b(stats: PlayerStats): CalculationResult {
    const gamma_role = stats.gamma_role ?? 1.00;
    const D = this.D_BASE * gamma_role;
    const delta_S = Math.max(1.0, stats.S_final - this.S_0);
    const beta = this.calculate_beta(stats);
    const k_bar = this._get_average_k(stats.S_final);

    let p_val = stats.P_bar;
    if (p_val > 1.0) {
      p_val = p_val / 100.0;
    }
    p_val = Math.max(0.001, Math.min(0.999, p_val));

    const N = Math.max(1, stats.N || 1);

    // 动力学累积常数 lambda
    const exponent = ((15.0 + beta / k_bar) * (N * p_val) - delta_S) / D;
    const lam = Math.pow(10.0, exponent);

    // 动力学解析解
    const B = 1.0 + beta / (15.0 * k_bar);
    const num = lam * Math.pow(10.0, stats.S_final / D) - Math.pow(10.0, this.S_0 / D);
    const den = B * (lam - 1.0);

    let R_true: number;
    if (den <= 0 || num <= 0 || !isFinite(num) || !isFinite(den)) {
      // 动力学发散或速度过载时自动降级保底
      R_true = this.run_mode_a(stats).R_true;
    } else {
      R_true = D * Math.log10(num / den);
      if (!isFinite(R_true) || isNaN(R_true)) {
        R_true = this.run_mode_a(stats).R_true;
      }
    }

    const water = stats.S_final - R_true;
    const k_cur = this._get_k(stats.S_final);
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
      win_rates: this._get_win_rate_list(R_true, D, stats.S_final),
      tier_win_rates: this._get_tier_win_rates(R_true, D, stats.S_final),
      tips: 'zxz 结晶：综合了金银牌与 MVP 加成；如果挑战赛打得多容易算偏高。',
    };
  }

  // 辅助方法
  public static _get_k(score: floatNumber): number {
    if (score < 1500) return 1.0;
    if (score < 1800) return 2.0;
    if (score < 2100) return 3.0;
    return 4.0;
  }

  public static _get_average_k(score: number): number {
    if (score <= 1500) return 1.0;
    if (score <= 1800) {
      return (1.0 * 300 + 2.0 * (score - 1500)) / (score - 1200);
    }
    if (score <= 2100) {
      return (1.0 * 300 + 2.0 * 300 + 3.0 * (score - 1800)) / (score - 1200);
    }
    return (1.0 * 300 + 2.0 * 300 + 3.0 * 300 + 4.0 * (score - 2100)) / (score - 1200);
  }

  public static _get_tier_win_rates(R_true: number, D: number, S_final: number): Record<string, string> {
    const scores = [1200, 1400, 1500, 1600, 1725, 1800, 2100, Math.round(S_final)];
    const res: Record<string, string> = {};
    for (const s of Array.from(new Set(scores)).sort((a, b) => a - b)) {
      const p = 1.0 / (1.0 + Math.pow(10.0, (s - R_true) / D));
      res[`${s}分`] = `${(p * 100).toFixed(1)}%`;
    }
    return res;
  }

  public static _get_win_rate_list(R_true: number, D: number, S_final: number): { score: number; label: string; rate: number }[] {
    const scores = [1200, 1400, 1500, 1600, 1725, 1800, 2100, Math.round(S_final)];
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

type floatNumber = number;

// 统一对外调度函数
export function solveDynamics(input: PlayerStats, mode: AlgorithmMode = 'mode_a'): CalculationResult {
  if (mode === 'mode_b') {
    return DualEngineRankAnalyzer.run_mode_b(input);
  }
  return DualEngineRankAnalyzer.run_mode_a(input);
}
