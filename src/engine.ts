/**
 * 王者荣耀战绩动力学逆推算法 (5v5 MOBA ELO Dynamics Solver)
 */

export interface PlayerInput {
  N: number;         // 总场次
  P_bar: number;     // 面板总胜率 (0.479 or 47.9)
  S_final: number;   // 当前巅峰积分 (1610.0)
  G: number;         // 顶级牌数 + 金牌数
  S_v: number;       // 银牌数
  P_5: number;       // 五连绝世数
  M_total: number;   // 总MVP数 (全场最佳 + 败方最佳)
}

export interface Segment {
  index: number;
  a: number;
  b: number;
  K: number;
}

export interface CalculationResult {
  M_pure: number;
  E_total: number;
  beta: number;
  R_0: number;
  R_true: number;
  delta_S_water: number;
  win_rates: { score: number; label: string; rate: number }[];
  S_max: number;
  current_K: number;
  iterations: number;
  method: 'newton' | 'bisection';
  converged: boolean;
  activeSegments: Segment[];
  error?: string;
}

const S_0 = 1200.0;
const D = 1600.0;
const T_BOUNDS = [1200.0, 1500.0, 1800.0, 2100.0, 3000.0];
const K_RATES = [1.0, 2.0, 3.0, 4.0];

// u(S, R) = 10^((S - R) / 1600)
function u(S: number, R: number): number {
  return Math.pow(10, (S - R) / D);
}

// B_i = 1.0 + beta / (15.0 * K_i)
function getB(beta: number, K_i: number): number {
  return 1.0 + beta / (15.0 * K_i);
}

// F_i(S, R) = (1600 / (ln(10) * (15.0 + beta / K_i))) * ln | u(S, R) / (u(S, R) - B_i) |
function F(S: number, R: number, beta: number, K_i: number): number {
  const u_val = u(S, R);
  const B_val = getB(beta, K_i);
  const diff = Math.abs(u_val - B_val);
  const safeDiff = diff < 1e-15 ? 1e-15 : diff;
  const ratio = Math.abs(u_val / safeDiff);
  const coeff = D / (Math.LN10 * (15.0 + beta / K_i));
  return coeff * Math.log(ratio);
}

// g_i(S, R) = 1 / ( 15.0 * 10^((S - R)/1600) - (15.0 + beta / K_i) )
function g(S: number, R: number, beta: number, K_i: number): number {
  const u_val = u(S, R);
  const denom = 15.0 * u_val - (15.0 + beta / K_i);
  if (Math.abs(denom) < 1e-15) {
    return denom < 0 ? -1e15 : 1e15;
  }
  return 1.0 / denom;
}

// f(R)
function computeF(
  R: number,
  activeSegments: Segment[],
  beta: number,
  NP_bar: number
): number {
  let sum = 0;
  for (const seg of activeSegments) {
    sum += F(seg.b, R, beta, seg.K) - F(seg.a, R, beta, seg.K);
  }
  return sum - NP_bar;
}

// f'(R)
function computeFPrime(
  R: number,
  activeSegments: Segment[],
  beta: number
): number {
  let sum = 0;
  for (const seg of activeSegments) {
    sum += g(seg.b, R, beta, seg.K) - g(seg.a, R, beta, seg.K);
  }
  return sum;
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

  // 1. M_pure & E_total & beta
  const M_pure = Math.max(0, M_total - G - S_v);
  const E_total = 6 * G + 3 * S_v + 4 * P_5 + 2 * M_pure;
  const NP_bar = N * P_bar;
  const beta = NP_bar > 0 ? E_total / NP_bar : 0.001;

  // 2. Active intervals
  const activeSegments: Segment[] = [];
  for (let i = 0; i < 4; i++) {
    const a_i = Math.max(S_0, T_BOUNDS[i]);
    const b_i = Math.min(S_final, T_BOUNDS[i + 1]);
    if (b_i > a_i) {
      activeSegments.push({
        index: i,
        a: a_i,
        b: b_i,
        K: K_RATES[i],
      });
    }
  }

  // If S_final <= 1200, mock single interval
  if (activeSegments.length === 0) {
    activeSegments.push({
      index: 0,
      a: S_0,
      b: Math.max(S_0 + 0.1, S_final),
      K: 1.0,
    });
  }

  // 3. Current K (for theoretical ceiling)
  let current_K = 1.0;
  if (S_final < 1500) current_K = 1.0;
  else if (S_final < 1800) current_K = 2.0;
  else if (S_final < 2100) current_K = 3.0;
  else current_K = 4.0;

  // 4. Initial estimate R_0
  const scoreSpan = Math.max(0.1, S_final - S_0);
  let sumKDelta = 0;
  for (const seg of activeSegments) {
    sumKDelta += seg.K * (seg.b - seg.a);
  }
  const k_bar = Math.max(1.0, sumKDelta / scoreSpan);

  let R_0 = S_final - 100.0;
  try {
    const lambdaExp =
      ((15.0 + beta / k_bar) * NP_bar - (S_final - S_0)) / D;
    const lambda = Math.pow(10, lambdaExp);

    if (lambda > 1.0000001 && isFinite(lambda)) {
      const termNumerator =
        lambda * Math.pow(10, S_final / D) - Math.pow(10, S_0 / D);
      const termDenominator =
        (1.0 + beta / (15.0 * k_bar)) * (lambda - 1.0);
      if (termNumerator > 0 && termDenominator > 0) {
        const est = D * Math.log10(termNumerator / termDenominator);
        if (isFinite(est) && est > 300 && est < 4000) {
          R_0 = est;
        }
      }
    }
  } catch {
    R_0 = S_final - 50.0;
  }

  // 5. Newton-Raphson Solver
  let R = R_0;
  let converged = false;
  let iterations = 0;
  let method: 'newton' | 'bisection' = 'newton';

  const MAX_STEPS = 100;
  for (let step = 0; step < MAX_STEPS; step++) {
    iterations = step + 1;
    const f_val = computeF(R, activeSegments, beta, NP_bar);
    const f_prime = computeFPrime(R, activeSegments, beta);

    if (Math.abs(f_val) < 1e-6) {
      converged = true;
      break;
    }

    if (!isFinite(f_val) || !isFinite(f_prime) || Math.abs(f_prime) < 1e-12) {
      break;
    }

    const R_next = R - f_val / f_prime;
    if (Math.abs(R_next - R) < 1e-5) {
      R = R_next;
      converged = true;
      break;
    }

    if (R_next < 100 || R_next > 4500 || !isFinite(R_next)) {
      // Diverged
      break;
    }

    R = R_next;
  }

  // Fallback: Bisection if Newton didn't converge
  if (!converged || !isFinite(R)) {
    method = 'bisection';
    let low = 500.0;
    let high = 3500.0;

    let f_low = computeF(low, activeSegments, beta, NP_bar);
    let f_high = computeF(high, activeSegments, beta, NP_bar);

    // Expand search if bracket doesn't cross zero
    if (f_low * f_high > 0) {
      low = 100.0;
      high = 4500.0;
      f_low = computeF(low, activeSegments, beta, NP_bar);
      f_high = computeF(high, activeSegments, beta, NP_bar);
    }

    if (f_low * f_high <= 0) {
      for (let step = 0; step < 120; step++) {
        iterations = step + 1;
        const mid = (low + high) / 2.0;
        const f_mid = computeF(mid, activeSegments, beta, NP_bar);

        if (Math.abs(f_mid) < 1e-6 || Math.abs(high - low) < 1e-5) {
          R = mid;
          converged = true;
          break;
        }

        if (f_low * f_mid <= 0) {
          high = mid;
          f_high = f_mid;
        } else {
          low = mid;
          f_low = f_mid;
        }
        R = mid;
      }
    } else {
      // Minimum absolute deviation search
      let bestR = R_0;
      let minAbsF = Infinity;
      for (let testR = 800; testR <= 3000; testR += 5) {
        const val = Math.abs(computeF(testR, activeSegments, beta, NP_bar));
        if (val < minAbsF) {
          minAbsF = val;
          bestR = testR;
        }
      }
      R = bestR;
      converged = true;
    }
  }

  const R_true = R;
  const delta_S_water = S_final - R_true;

  // Key segment win rates: p(S) = 1 / (1 + 10^((S - R_true)/1600))
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

  // Theoretical ceiling: S_max = R_true + 1600 * log10(1 + beta / (15 * k_current))
  const S_max =
    R_true + D * Math.log10(1.0 + beta / (15.0 * current_K));

  return {
    M_pure,
    E_total,
    beta,
    R_0,
    R_true,
    delta_S_water,
    win_rates,
    S_max,
    current_K,
    iterations,
    method,
    converged,
    activeSegments,
  };
}
