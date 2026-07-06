import type {
  BoundaryDefinition,
  ShapeDefinition,
  Transform,
} from '../../contract';
import type { ProviderCollection } from '../../providers/registry';
import type { IRLabelDefault, IRNode } from '../../schemas';
import type { NamespaceStack } from '../namespace';
import type { ResolveBetweenGlobal } from '../position';
import type { TextMeasurer } from '../text';
import type { NodeLayout, TexLoweringContext } from './types';

import { resolveBoundaryRegistry } from '../../providers/boundary';
import { resolveShapeRegistry } from '../../providers/shape';
import { DEG_TO_RAD } from '../../shared/geometry';
import { DEFAULT_FONT_SIZE, DEFAULT_LABEL_DISTANCE } from '../constants';
import { resolvePosition } from '../position';
import { resolveShadow } from '../style';
import { resolveFontSize } from '../text';
import { resolveAxisScale, resolveBoxSize, resolveBoxSpacing } from './box';
import { layoutNodeContent } from './content';
import { layoutNodeLabels } from './label-layout';
import { resolveNodeShape } from './shape';
import { DEFAULT_LINE_HEIGHT_FACTOR, resolveDashPattern } from './text';

const DEFAULT_PADDING = 8;

/** 节点 layout 阶段使用的编译依赖。 */
export type LayoutNodeContext = {
  /** 文本测量函数。 */
  measureText: TextMeasurer;
  /** id 查询栈。 */
  namespaceStack: NamespaceStack;
  /** 相对定位默认距离。 */
  nodeDistance?: number;
  /** 节点 label 默认距离。 */
  labelDistance?: number;
  /** preset 与 rem 字号解析的根字号。 */
  rootFontSize?: number;
  /** 当前 scope 累积 transform。 */
  scopeChain?: ReadonlyArray<Transform>;
  /** 当前样式栈解析出的 label 默认值。 */
  labelDefault?: IRLabelDefault;
  /** shape 注册表。 */
  shapes?: ProviderCollection<ShapeDefinition>;
  /** boundary 注册表。 */
  boundaries?: ProviderCollection<BoundaryDefinition>;
  /** between target 的全局点解析函数。 */
  resolveBetweenGlobal?: ResolveBetweenGlobal;
  /** TeX 降级上下文。 */
  texLowering?: TexLoweringContext;
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
  } = context;
  // 缩放影响节点尺寸与字体。
  // 字号取 min(sx,sy) 保 glyph 形状，避免非均匀缩放下文字被拉变形。
  const { x: sx, y: sy } = resolveAxisScale(node.scale, 1);
  const fontScale = Math.min(sx, sy);
  const { shapeName, shapeDef, shapeParams } = resolveNodeShape({ node, shapes, scaleX: sx, scaleY: sy });

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
  const center = resolvePosition(node.position, { namespaceStack, nodeDistance, scopeChain, resolveBetweenGlobal });
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
  const labels = layoutNodeLabels({
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

  return {
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
    labels,
    boundary: node.boundary,
    meta: node.meta,
    animations: node.animations,
    shapes,
    boundaries,
  };
};
