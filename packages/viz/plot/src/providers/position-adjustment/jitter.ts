import type {
  AnyPositionAdjustmentDefinition,
  RolePositionAdjustmentContext,
  RolePositionAdjustmentDefinition,
} from '../../contract';
import type { IRPlotJitterPositionAdjustment } from '../../schemas';

import { definePositionAdjustment } from '../../contract';
import { RetikzPlotError } from '../../error';
import { JitterPositionAdjustmentSchema } from '../../schemas';

/** 稳定的 32 位伪随机序列；只由显式 seed 与 target 顺序决定 */
const createRandom = (seed: number): (() => number) => {
  let state = Math.trunc(seed) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

/** 以有限项近似标准正态分布累积分布函数，供截断正态的分位数求解使用 */
const normalCdf = (value: number, sigma: number): number => {
  const normalizedValue = value / sigma;
  const sign = normalizedValue < 0 ? -1 : 1;
  const absoluteValue = Math.abs(normalizedValue);
  const t = 1 / (1 + 0.2316419 * absoluteValue);
  const density = 0.3989422804014327 * Math.exp(-(absoluteValue * absoluteValue) / 2);
  const tail = density * ((((1.330274429 * t - 1.821255978) * t + 1.781477937) * t - 0.356563782) * t + 0.31938153) * t;
  const probability = 1 - tail;
  return sign === 1 ? probability : 1 - probability;
};

/** 用固定次数二分求解 [-1, 1] 支持域内的截断正态分位数 */
const truncatedNormalSample = (unit: number, sigma: number): number => {
  const lowerProbability = normalCdf(-1, sigma);
  const upperProbability = normalCdf(1, sigma);
  const probability = lowerProbability + unit * (upperProbability - lowerProbability);
  let lower = -1;
  let upper = 1;
  for (let iteration = 0; iteration < 32; iteration += 1) {
    const midpoint = (lower + upper) / 2;
    if (normalCdf(midpoint, sigma) < probability) {
      lower = midpoint;
    } else {
      upper = midpoint;
    }
  }
  return (lower + upper) / 2;
};

/** 解析 jitter 作用 role；省略时只允许唯一具有正 step 的离散 role */
const jitterRoleOf = (operation: IRPlotJitterPositionAdjustment, context: RolePositionAdjustmentContext): string => {
  if (operation.role !== undefined) {
    if (!context.roles.includes(operation.role)) {
      throw new RetikzPlotError(`lowerPlots: jitter role "${operation.role}" is not provided by the coordinate frame`);
    }
    if (context.roleScales[operation.role] === undefined) {
      throw new RetikzPlotError(`lowerPlots: jitter role "${operation.role}" does not expose a position scale`);
    }
    return operation.role;
  }
  const candidates = context.roles.filter(role => (context.roleScales[role]?.step ?? 0) > 0);
  if (candidates.length !== 1) {
    throw new RetikzPlotError(
      `lowerPlots: jitter without role requires exactly one discrete coordinate role, found ${candidates.length}`,
    );
  }
  return candidates[0];
};

/** 解析 jitter 总宽；ratio 只允许正离散 step */
const jitterSpanOf = (
  operation: IRPlotJitterPositionAdjustment,
  context: RolePositionAdjustmentContext,
  role: string,
): number => {
  const span = operation.span ?? { kind: 'ratio', value: 0.3 };
  if (typeof span === 'number') return span;
  const step = context.roleScales[role]?.step ?? 0;
  if (!Number.isFinite(step) || step <= 0) {
    throw new RetikzPlotError(`lowerPlots: ratio jitter on role "${role}" requires a positive discrete scale step`);
  }
  return span.value * step;
};

/** 内置 role-space jitter Definition */
const jitterDefinition = {
  space: 'role',
  schema: JitterPositionAdjustmentSchema,
  containment: {
    policy: 'contain',
    measure: (operation, context) => {
      const role = jitterRoleOf(operation, context);
      const halfSpan = jitterSpanOf(operation, context, role) / 2;
      return { space: 'role', byRole: { [role]: { lower: halfSpan, upper: halfSpan } } };
    },
  },
  initialize: (operation, context) => {
    const role = jitterRoleOf(operation, context);
    const roleIndex = context.roles.indexOf(role);
    const span = jitterSpanOf(operation, context, role);
    const random = createRandom(operation.seed ?? 0);
    return context.targets.map(target => {
      const unit = random();
      if (target.mappedRoles === null || span === 0) {
        return { key: target.key, mappedRoles: target.mappedRoles };
      }
      const mappedRoles = [...target.mappedRoles];
      const distribution = operation.distribution ?? { kind: 'uniform' };
      if (distribution.kind === 'uniform') {
        mappedRoles[roleIndex] += (unit - 0.5) * span;
      } else {
        mappedRoles[roleIndex] += truncatedNormalSample(unit, distribution.sigma ?? 0.5) * (span / 2);
      }
      return { key: target.key, mappedRoles };
    });
  },
} satisfies RolePositionAdjustmentDefinition<IRPlotJitterPositionAdjustment>;

export const jitterPositionAdjustmentDefinition =
  definePositionAdjustment<IRPlotJitterPositionAdjustment>(jitterDefinition);

/** registry 宽类型下的内置 jitter Definition */
export const jitterPositionAdjustment: AnyPositionAdjustmentDefinition = jitterPositionAdjustmentDefinition;
