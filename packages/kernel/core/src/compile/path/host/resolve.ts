import type { CanonicalPath } from '../../../resolve/path';
import type { PaintResolver } from '../../resource';
import type { PathBaseProps } from '../stroke';

/** 已解析默认值后的 PathPrim 公共样式属性 */
export type ResolvedPathBaseProps = PathBaseProps & {
  /** 最终描边宽度；缺省 path.strokeWidth 时为 1 */
  strokeWidth: number;
};

/** path 基础样式解析上下文 */
export type ResolvePathBasePropsContext = {
  /** PaintSpec 解析器；直调 emit 时通常只透传字符串 */
  resolvePaint: PaintResolver;
};

/**
 * 解析 PathPrim 公共样式属性
 * @description 只处理 path 自身样式与默认值，不处理几何命令、箭头、marks 或整体 transform
 */
export const resolvePathBaseProps = (
  path: CanonicalPath,
  context: ResolvePathBasePropsContext,
): ResolvedPathBaseProps => {
  const { resolvePaint } = context;
  return {
    stroke: resolvePaint(path.stroke) ?? 'currentColor',
    strokeWidth: path.strokeWidth ?? 1,
    // path.fill 缺省 'none'（仅描边）；纯色 / PaintSpec gradient 经 resolvePaint → PaintValue
    fill: resolvePaint(path.fill) ?? 'none',
    fillRule: path.fillRule,
    dashPattern: path.dashPattern,
    dashOffset: path.dashOffset,
    strokeLinecap: path.lineCap,
    strokeLinejoin: path.lineJoin,
    opacity: path.opacity,
    fillOpacity: path.fillOpacity,
    strokeOpacity: path.strokeOpacity,
    shadow: path.shadow,
    blendMode: path.blendMode,
  };
};
