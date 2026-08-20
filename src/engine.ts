/**
 * 王者荣耀战绩动力学逆推算法
 */

export interface PlayerInput {
  N: number;            // 总场次 (如: 261)
  P_bar: number;        // 面板总胜率 (如: 0.479 或 47.9)
  S_final: number;      // 当前巅峰积分 (如: 1610.0)
  G: number;            // 顶级牌数 + 金牌数 (如: 6)
  S_v: number;          // 银牌数 (如: 13)
  P_5: number;          // 五连绝世数 (如: 0)
  M_total: number;      // 总MVP数 (全场最佳 + 败方最佳, 如: 43)
  gamma_role: number;   // 战局影响力系数 (默认 1.00, 范围 0.70 ~ 1.50)
}

export interface CalculationResult {
  M_pure: number;
  E_total: number;
  e_bar: number;
  beta: number;
  D: number;
  R_true: number;
  delta_S_water: number;
  S_max: number;
  k_cur: number;
  win_rates: { score: number; label: string; rate: number }[];
}

export function solveDynamics(input: PlayerInput): CalculationResult {
  const N = Math.max(1, Math.round(input.N));
  let P_bar = input.P_bar;
  if (P_bar > 1.0) {
    P_bar = P_bar / 100.0;
  }
  P_bar = Math.max(0.01, Math.min(0.999, P_bar));

  const S_final = input.S_final;
  const G = Math.max(0, input.G || 0);
  const S_v = Math.max(0, input.S_v || 0);
  const P_5 = Math.max(0, input.P_5 || 0);
  const M_total = Math.max(0, input.M_total || 0);
  const gamma_role = Math.max(0.5, Math.min(2.0, input.gamma_role || 1.0));

  // 1. 动态平抑常数计算
  const D = 1600.0 * gamma_role;

  // 2. 个人支配力系数 beta 计算 (官方互斥 + 50%胜率指数加权)
  const M_pure = Math.max(0, M_total - G - S_v);
  const E_total = 6 * G + 3 * S_v + 4 * P_5 + 2 * M_pure;
  const e_bar = E_total / Math.max(1, N);
  const beta = e_bar * Math.exp(2.5 * (P_bar - 0.5));

  // 3. 真实硬实力分 R_true 解析闭式解
  const delta_S = Math.max(1.0, S_final - 1200.0);
  const C = Math.pow(10.0, (delta_S * P_bar) / D);

  const denominator = Math.pow(10.0, -1200.0 / D) - C * Math.pow(10.0, -S_final / D);
  let R_true: number;

  if (denominator <= 0 || !isFinite(denominator)) {
    R_true = S_final;
  } else {
    const y = (C - 1.0) / denominator;
    R_true = D * Math.log10(Math.max(1.0, y));
  }

  if (!isFinite(R_true) || isNaN(R_true)) {
    R_true = S_final;
  }

  // 4. 衍生指标计算
  const delta_S_water = S_final - R_true; // 虚高水分

  // 当前段位阻力 k
  let k_cur = 1.0;
  if (S_final < 1500) {
    k_cur = 1.0;
  } else if (S_final < 1800) {
    k_cur = 2.0;
  } else if (S_final < 2100) {
    k_cur = 3.0;
  } else {
    k_cur = 4.0;
  }

  // 理论最高天花板
  const S_max = R_true + D * Math.log10(1.0 + beta / (15.0 * k_cur));

  // 各分段胜率预测 p(S) = 1 / (1 + 10^((S - R_true) / D))
  const keyScores = [1200, 1500, 1800, 2100];
  const winRateScores: number[] = [];
  for (const s of keyScores) {
    winRateScores.push(s);
  }
  if (!winRateScores.includes(Math.round(S_final))) {
    winRateScores.push(S_final);
  }
  winRateScores.sort((a, b) => a - b);

  const win_rates = winRateScores.map((score) => {
    const rate = 1.0 / (1.0 + Math.pow(10, (score - R_true) / D));
    return {
      score,
      label: score === S_final ? `${score} (当前)` : `${score}`,
      rate: rate * 100,
    };
  });

  return {
    M_pure,
    E_total,
    e_bar,
    beta,
    D,
    R_true,
    delta_S_water,
    S_max,
    k_cur,
    win_rates,
  };
}
