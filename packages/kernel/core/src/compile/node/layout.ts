import type { BoundaryDefinition, ShapeDefinition, Transform } from '../../contract';
import type { ProviderCollection } from '../../providers/registry';
import type { IRAnchorPosition, IRLabelDefault, IRNode, IRPosition } from '../../schemas';
import type { NamespaceStack } from '../namespace';
import type { ResolveBetweenGlobal } from '../position';
import type { TextMeasurer } from '../text';
import type { CompileWarningCodeValue } from '../warning';
import type { NodeLayout, TexLoweringContext } from './types';

import { resolveBoundaryRegistry } from '../../providers/boundary';
import { resolveShapeRegistry } from '../../providers/shape';
import { CenterAnchor } from '../../shared';
import { DEG_TO_RAD } from '../../shared/geometry';
import { DEFAULT_FONT_SIZE, DEFAULT_LABEL_DISTANCE } from '../constants';
import { resolvePosition } from '../position';
import { resolveAnchorRefUncached } from '../reference';
import { resolveShadow } from '../style';
import { resolveFontSize } from '../text';
import { inverseTransformChain, isTransformChainInvertible, projectLayoutToGlobal } from '../transform';
import { resolveAxisScale, resolveBoxSize, resolveBoxSpacing } from './box';
import { layoutNodeContent } from './content/layout';
import { DEFAULT_LINE_HEIGHT_FACTOR, resolveDashPattern } from './content/text';
import { layoutNodeLabels, measureNodeLabels } from './label/layout';
import { resolveNodeShape } from './shape';

const DEFAULT_PADDING = 8;

/** 判断 Node.position 是否为锚点对锚点定位 */
const isAnchorPosition = (position: IRNode['position']): position is IRAnchorPosition =>
  !Array.isArray(position) && 'kind' in position;

/** 把全局位移反投影为当前 Scope 的局部位移 */
const localDeltaOf = (
  deltaGlobal: IRPosition,
  globalOrigin: IRPosition,
  scopeChain: ReadonlyArray<Transform>,
): IRPosition => {
  if (scopeChain.length === 0) return deltaGlobal;
  if (!isTransformChainInvertible(scopeChain)) {
    throw new Error('Cannot resolve anchor position through a Scope transform with a zero scale axis');
  }
  const before = inverseTransformChain(globalOrigin, scopeChain);
  const after = inverseTransformChain([globalOrigin[0] + deltaGlobal[0], globalOrigin[1] + deltaGlobal[1]], scopeChain);
  return [after[0] - before[0], after[1] - before[1]];
};

/** 根据 target 与 self anchor 平移完整 provisional layout */
const placeAnchorPositionedLayout = (
  node: IRNode,
  position: IRAnchorPosition,
  provisional: NodeLayout,
  namespaceStack: NamespaceStack,
  scopeChain: ReadonlyArray<Transform>,
): NodeLayout => {
  if (node.id !== undefined && node.id === position.target.id) {
    throw new Error(`Node anchor position cannot reference itself ('${node.id}')`);
  }
  const targetEntry = namespaceStack.lookupEntry(position.target.id);
  if (targetEntry === undefined) {
    throw new Error(
      `Cannot resolve anchor position target '${position.target.id}'; it is undefined or defined later in the IR`,
    );
  }
  if (targetEntry.state === 'scope-placeholder') {
    throw new Error(
      `Cannot resolve anchor position target '${position.target.id}'; the referenced Scope is still being laid out`,
    );
  }

  const targetAnchor = position.target.anchor ?? CenterAnchor.Center;
  const targetPointBase = resolveAnchorRefUncached(
    targetEntry.layout,
    targetAnchor,
    position.target.boundary ?? targetEntry.layout.boundary,
  );
  const targetPoint: IRPosition = position.target.offset
    ? [targetPointBase[0] + position.target.offset[0], targetPointBase[1] + position.target.offset[1]]
    : targetPointBase;

  const projected =
    scopeChain.length === 0
      ? { ...provisional, rect: { ...provisional.rect } }
      : projectLayoutToGlobal(provisional, scopeChain);
  const selfPoint = resolveAnchorRefUncached(projected, position.selfAnchor ?? CenterAnchor.Center, node.boundary);
  const deltaGlobal: IRPosition = [targetPoint[0] - selfPoint[0], targetPoint[1] - selfPoint[1]];
  const deltaLocal = localDeltaOf(deltaGlobal, [projected.rect.x, projected.rect.y], scopeChain);

  return {
    ...provisional,
    rect: {
      ...provisional.rect,
      x: provisional.rect.x + deltaLocal[0],
      y: provisional.rect.y + deltaLocal[1],
    },
    contentCenter: [provisional.contentCenter[0] + deltaLocal[0], provisional.contentCenter[1] + deltaLocal[1]],
  };
};

/** 节点 layout 阶段使用的编译依赖 */
export type LayoutNodeContext = {
  /** 文本测量函数 */
  measureText: TextMeasurer;
  /** id 查询栈 */
  namespaceStack: NamespaceStack;
  /** 相对定位默认距离 */
  nodeDistance?: number;
  /** 节点 label 默认距离 */
  labelDistance?: number;
  /** preset 与 rem 字号解析的根字号 */
  rootFontSize?: number;
  /** 当前 scope 累积 transform */
  scopeChain?: ReadonlyArray<Transform>;
  /** 当前样式栈解析出的 label 默认值 */
  labelDefault?: IRLabelDefault;
  /** shape 注册表 */
  shapes?: ProviderCollection<ShapeDefinition>;
  /** boundary 注册表 */
  boundaries?: ProviderCollection<BoundaryDefinition>;
  /** between target 的全局点解析函数 */
  resolveBetweenGlobal?: ResolveBetweenGlobal;
  /** TeX 降级上下文 */
  texLowering?: TexLoweringContext;
  /** 当前 node 的 IR 路径，用于 provider payload 诊断 */
  irPath?: string;
  /** 当前 node 的 compile warning 分发函数 */
  warn?: (code: CompileWarningCodeValue, message: string) => void;
};

export const layoutNode = (node: IRNode, context: LayoutNodeContext): NodeLayout => {
  const {
    measureText,
    namespaceStack,
    nodeDistance,
    labelDistance = DEFAULT_LABEL_DISTANCE,
    rootFontSize = DEFAULT_FONT_SIZE,
    scopeChain = [],
    labelDefault,
    shapes = resolveShapeRegistry(),
    boundaries = resolveBoundaryRegistry(),
    resolveBetweenGlobal,
    texLowering,
    irPath,
    warn,
  } = context;
  // 缩放影响节点尺寸与字体。
  // 字号取 min(sx,sy) 保 glyph 形状，避免非均匀缩放下文字被拉变形。
  const { x: sx, y: sy } = resolveAxisScale(node.scale, 1);
  const fontScale = Math.min(sx, sy);
  const { shapeName, shapeDef, shapeParams } = resolveNodeShape({ node, shapes, scaleX: sx, scaleY: sy, irPath });

  const baseFontSize = resolveFontSize(node.font?.size, {
    rootFontSize,
    inheritedFontSize: rootFontSize,
  });
  const fontSize = baseFontSize * fontScale;
  const fontFamily = node.font?.family;
  const fontWeight = node.font?.weight;
  const fontStyle = node.font?.style;
  // spacing 受 node scale 影响。
  const padding = resolveBoxSpacing(node.padding, DEFAULT_PADDING);
  const paddingLeft = padding.left * sx;
  const paddingRight = padding.right * sx;
  const paddingTop = padding.top * sy;
  const paddingBottom = padding.bottom * sy;
  const marginSpacing = resolveBoxSpacing(node.margin, 0);
  const margin = {
    top: marginSpacing.top * sy,
    right: marginSpacing.right * sx,
    bottom: marginSpacing.bottom * sy,
    left: marginSpacing.left * sx,
  };
  const lineHeight = (node.lineHeight ?? baseFontSize * DEFAULT_LINE_HEIGHT_FACTOR) * sy;
  const align = node.align ?? 'middle';

  // 折行阈值受 x 缩放。
  const maxTextWidth = node.maxTextWidth !== undefined ? node.maxTextWidth * sx : undefined;
  const { textWidth, textHeight, lines, inlineBlock } = layoutNodeContent({
    node,
    measureText,
    texLowering,
    fontSize,
    baseFontSize,
    fontScale,
    rootFontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    lineHeight,
    maxTextWidth,
  });

  // 内框半轴：content box + padding。
  const innerHalfW = (textWidth + paddingLeft + paddingRight) / 2;
  const innerHalfH = (textHeight + paddingTop + paddingBottom) / 2;
  const paddingOffsetX = (paddingRight - paddingLeft) / 2;
  const paddingOffsetY = (paddingBottom - paddingTop) / 2;

  // 外接边界半轴由 shape.circumscribe 派生。
  const circumscribed = shapeDef.circumscribe(innerHalfW, innerHalfH, shapeParams);

  // minimumSize 作用于外接边界，且随 scale 缩放。
  const minimumSize = resolveBoxSize(node.minimumSize, 0);
  const minHalfW = (minimumSize.width * sx) / 2;
  const minHalfH = (minimumSize.height * sy) / 2;
  const boundsHalfW = Math.max(circumscribed.halfWidth, minHalfW);
  const boundsHalfH = Math.max(circumscribed.halfHeight, minHalfH);

  const rotateDeg = node.rotate ?? 0;
  let anchorPosition: IRAnchorPosition | undefined;
  let center: IRPosition | null;
  if (isAnchorPosition(node.position)) {
    anchorPosition = node.position;
    center = [0, 0];
  } else {
    center = resolvePosition(node.position, { namespaceStack, nodeDistance, scopeChain, resolveBetweenGlobal });
  }
  if (!center) {
    throw new Error(
      `Cannot resolve position for node ${node.id ?? '(unnamed)'}; polar.origin / at.of / between endpoint may reference an undefined node`,
    );
  }
  // shape 可声明 AABB 中心相对 position 的偏移。
  const aabbOffset = shapeDef.circumscribeOffset?.(shapeParams);
  const rectCenterX = center[0] + paddingOffsetX + (aabbOffset?.[0] ?? 0);
  const rectCenterY = center[1] + paddingOffsetY + (aabbOffset?.[1] ?? 0);
  const contentCenter: [number, number] = [rectCenterX - paddingOffsetX, rectCenterY - paddingOffsetY];
  const measuredLabels = measureNodeLabels({
    node,
    measureText,
    texLowering,
    labelDefault,
    labelDistance,
    baseFontSize,
    rootFontSize,
    fontScale,
    fontFamily,
    fontWeight,
    fontStyle,
  });

  const provisional: NodeLayout = {
    irPath,
    id: node.id,
    shapeName,
    shapeDef,
    shapeParams,
    rect: {
      // x, y 是外接 AABB 几何中心。
      x: rectCenterX,
      y: rectCenterY,
      width: 2 * boundsHalfW,
      height: 2 * boundsHalfH,
      // geometry 用弧度。
      rotate: rotateDeg * DEG_TO_RAD,
    },
    contentCenter,
    rotateDeg,
    margin,
    lines,
    inlineBlock,
    textWidth,
    textHeight,
    align,
    lineHeight,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    fill: node.fill,
    fillOpacity: node.fillOpacity,
    stroke: node.stroke,
    strokeOpacity: node.strokeOpacity,
    strokeWidth: node.strokeWidth,
    dashPattern: resolveDashPattern(node.dashPattern, node.dashed, node.dotted),
    dashOffset: node.dashOffset,
    cornerRadius: node.cornerRadius,
    textColor: node.textColor,
    opacity: node.opacity,
    shadow: resolveShadow(node.shadow),
    blendMode: node.blendMode,
    boundary: node.boundary,
    meta: node.meta,
    animations: node.animations,
    shapes,
    boundaries,
    connectionEnvelopeCache: new Map(),
    connectionEnvelopeWarnings: new Set(),
    warn,
  };
  const resolved: NodeLayout = {
    ...provisional,
    labels: layoutNodeLabels(provisional, measuredLabels),
  };
  return anchorPosition
    ? placeAnchorPositionedLayout(node, anchorPosition, resolved, namespaceStack, scopeChain)
    : resolved;
};
