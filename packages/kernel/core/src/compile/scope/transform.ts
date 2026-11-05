import type { Transform } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type {
  IRAtTranslateTransform,
  IRBetweenPosition,
  IRBetweenTranslateTransform,
  IROffsetTranslateTransform,
  IRPolarTranslateTransform,
  IRPosition,
  IRScopeSelfPoint,
  IRTransform,
  IRTranslateTransform,
  PolarPosition,
} from '../../schemas';
import { evaluateAnchorReference } from '../node';
import type { CompiledBoundaryGeometry } from '../reference';
import { evaluatePosition } from '../reference';
import type { PositionEvaluation, PositionEvaluateContext, PositionTargetEvaluateContext } from '../reference';
import { createCompileInvariantError } from '../shared';

/** scope transform lowering 所需的编译上下文 */
type ScopeTransformsLoweringContext = {
  /** 位置引用求值上下文 */
  positionContext: PositionTargetEvaluateContext;
  /** transform 引用解析失败时的回调 */
  onUnresolved?: (failed: IRTransform) => void;
  /** 旋转与缩放中心求值使用的 Scope 固有包络查询上下文 */
  intrinsicContext?: CompiledBoundaryGeometry;
};

/** 断言 self point / placement 计算结果是可发布的有限坐标 */
const assertFiniteScopePoint = (point: IRPosition, label: string): void => {
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `${label} must resolve to a finite point`);
  }
};

/**
 * 在 Scope 固有包络上解析 self point
 * @description `origin` 与显式坐标不依赖包络；anchor 引用统一走现有 shape / boundary resolver
 */
const evaluateScopeSelfPoint = (
  point: IRScopeSelfPoint,
  intrinsicContext: CompiledBoundaryGeometry | undefined,
): IRPosition => {
  if (point === 'origin') return [0, 0];
  if (Array.isArray(point)) {
    const finitePoint: IRPosition = [point[0], point[1]];
    assertFiniteScopePoint(finitePoint, 'scope self point');
    return finitePoint;
  }
  if (intrinsicContext === undefined) {
    throw createCompileInvariantError('internal: intrinsic Scope layout is required to resolve an anchor self point');
  }

  const finitePoint: IRPosition = evaluateAnchorReference(intrinsicContext, point);
  assertFiniteScopePoint(finitePoint, 'scope self point');
  return finitePoint;
};

/**
 * 将已确定的 Scope transform lowered 为 Scene transform
 *
 * @description 该步骤依赖当前 namespace，因此保留在 traversal 编译过程中执行；输出只包含 renderer
 * 可直接消费的 `translate` / `rotate` / `scale` 形态。引用解析失败时返回 null
 */
export const lowerScopeTransforms = (
  transforms: ReadonlyArray<IRTransform>,
  context: ScopeTransformsLoweringContext,
): Array<Transform> | null => {
  const { positionContext, onUnresolved, intrinsicContext: intrinsicContext } = context;
  const out: Array<Transform> = [];

  for (const t of transforms) {
    switch (t.kind) {
      case 'translate':
      case 'polar-translate':
      case 'at-translate':
      case 'offset-translate':
      case 'between-translate': {
        const resolved = evaluateTransformTranslation(t, positionContext)?.localPoint;
        if (!resolved) {
          onUnresolved?.(t);
          return null;
        }

        out.push({ kind: 'translate', x: resolved[0], y: resolved[1] });
        break;
      }
      case 'rotate': {
        const r: Transform = { kind: 'rotate', degrees: t.degrees };
        if (t.pivot !== undefined && t.pivot !== 'origin') {
          const [cx, cy] = evaluateScopeSelfPoint(t.pivot, intrinsicContext);
          r.cx = cx;
          r.cy = cy;
        }

        out.push(r);
        break;
      }
      case 'scale': {
        const s: Transform = { kind: 'scale', x: t.x };
        if (t.y !== undefined) s.y = t.y;
        if (t.pivot === undefined || t.pivot === 'origin') {
          out.push(s);
          break;
        }

        const [px, py] = evaluateScopeSelfPoint(t.pivot, intrinsicContext);
        if (px === 0 && py === 0) {
          out.push(s);
          break;
        }

        out.push({ kind: 'translate', x: px, y: py }, s, { kind: 'translate', x: -px, y: -py });
        break;
      }
    }
  }

  return out;
};

/** 位置解析器支持的平移配置 */
type IRTranslationTransform =
  | IRTranslateTransform
  | IRPolarTranslateTransform
  | IRAtTranslateTransform
  | IROffsetTranslateTransform
  | IRBetweenTranslateTransform;

/** 解析平移配置对应的局部与世界坐标；依赖的位置无法解析时返回 null */
export const evaluateTransformTranslation = (
  source: IRTranslationTransform,
  context: PositionEvaluateContext,
): PositionEvaluation | null => {
  switch (source.kind) {
    case 'translate': {
      const localPoint: [number, number] = [source.x, source.y];
      return { localPoint, worldPoint: context.toWorld(localPoint) };
    }
    case 'polar-translate': {
      const position: PolarPosition = { angle: source.angle, radius: source.radius };
      if (source.origin !== undefined) position.origin = source.origin;
      return evaluatePosition(position, context);
    }
    case 'at-translate':
      return evaluatePosition(
        {
          direction: source.direction,
          of: source.of,
          ...(source.distance === undefined ? {} : { distance: source.distance }),
        },
        context,
      );
    case 'offset-translate':
      return evaluatePosition({ of: source.of, offset: source.offset ?? [0, 0] }, context);
    case 'between-translate': {
      const position: IRBetweenPosition = { between: source.between, fraction: source.fraction };
      return evaluatePosition(position, context);
    }
  }
};
