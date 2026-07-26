import type { IRLabelDefault, IRNodeLabel } from '../../../schemas';
import type { FontSpec, LowerTex, TextMeasurer } from '../../text';
import type { MeasuredNodeLabel, NodeLabelLayout, NodeLayout, NodeTextLayoutContext } from '../types';

import { layoutInlineLine, normalizeTextMetrics, resolveFontSize, resolveLineRunsWithWarning } from '../../text';
import { normalizeLabelPosition, resolveNodeLabelGeometry } from './geometry';

/** 节点附属 label 布局输入 */
export type LayoutNodeLabelsInput = NodeTextLayoutContext & {
  /** 样式栈解析出的 label 默认值 */
  labelDefault?: IRLabelDefault;
  /** 节点 label 与节点边界的默认距离 */
  labelDistance: number;
  /** 基准字体大小 */
  baseFontSize: number;
  /** preset 与 rem 字号解析的根字号 */
  rootFontSize: number;
};

/** 只为 Node label 包装规范化文字度量 */
const nodeLabelMeasurer =
  (measureText: TextMeasurer): TextMeasurer =>
  (text, font) =>
    normalizeTextMetrics(measureText(text, font));

/** 只为 Node label 过滤非法 TeX 度量 */
const nodeLabelLowerTex = (lowerTex: LowerTex | undefined): LowerTex | undefined =>
  lowerTex === undefined
    ? undefined
    : (content, style) => {
        const lowered = lowerTex(content, style);
        if (lowered === null) return null;
        if (
          !Number.isFinite(lowered.width) ||
          lowered.width < 0 ||
          !Number.isFinite(lowered.height) ||
          lowered.height < 0 ||
          !Number.isFinite(lowered.depth) ||
          lowered.depth < 0 ||
          lowered.depth > lowered.height
        ) {
          return null;
        }
        return lowered;
      };

/** 测量节点附属 label，不读取 Node rect */
export const measureNodeLabels = (input: LayoutNodeLabelsInput): Array<MeasuredNodeLabel> | undefined => {
  const {
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
  } = input;
  const rawLabels: Array<IRNodeLabel> | undefined =
    node.label === undefined ? undefined : Array.isArray(node.label) ? node.label : [node.label];
  const texGatingOn = texLowering?.lowerTex !== undefined;
  const inlineWarn = texLowering?.warn ?? ((): void => {});
  const measureLabelText = nodeLabelMeasurer(measureText);
  const lowerLabelTex = nodeLabelLowerTex(texLowering?.lowerTex);
  return rawLabels?.map(lab => {
    const labFont = lab.font;
    const labelBaseFontSize = resolveFontSize(labelDefault?.font?.size, {
      rootFontSize,
      inheritedFontSize: baseFontSize,
    });
    const labFontSize =
      resolveFontSize(labFont?.size, {
        rootFontSize,
        inheritedFontSize: labelBaseFontSize,
      }) * fontScale;
    const labFamily = labFont?.family ?? labelDefault?.font?.family ?? fontFamily;
    const labWeight = labFont?.weight ?? labelDefault?.font?.weight ?? fontWeight;
    const labStyle = labFont?.style ?? labelDefault?.font?.style ?? fontStyle;
    const labTextColor = lab.textColor ?? labelDefault?.textColor ?? labelDefault?.color ?? node.textColor;
    const labOpacity = lab.opacity ?? labelDefault?.opacity;
    const labFontSpec: FontSpec = { size: labFontSize, family: labFamily, weight: labWeight, style: labStyle };
    const resolved = resolveLineRunsWithWarning(lab.text, {
      gatingOn: texGatingOn,
      warn: inlineWarn,
      warningMessage: 'Unbalanced `$` in node label; the trailing fragment is kept literal.',
    });
    const plainText = resolved.runs.map(r => ('text' in r ? r.text : '')).join('');
    const isMixed = resolved.hasMath || typeof lab.text === 'object';
    const laid = isMixed
      ? layoutInlineLine(resolved.runs, {
          measureText: measureLabelText,
          lowerTex: lowerLabelTex,
          font: labFontSpec,
          rootFontSize,
          color: labTextColor,
          opacity: labOpacity,
          warn: inlineWarn,
        })
      : undefined;
    const metrics = laid
      ? {
          width: laid.width,
          height: laid.ascent + laid.descent,
          ascent: laid.ascent,
          descent: laid.descent,
        }
      : normalizeTextMetrics(measureText(plainText, labFontSpec));
    return {
      text: plainText,
      laid,
      position: normalizeLabelPosition(lab.position),
      placement: lab.placement ?? 'outside',
      distance: lab.distance ?? labelDistance,
      textColor: labTextColor,
      opacity: labOpacity,
      fontSize: labFontSize,
      fontFamily: labFamily,
      fontWeight: labWeight,
      fontStyle: labStyle,
      rotate: lab.rotate,
      keepUpright: lab.keepUpright,
      measuredWidth: metrics.width,
      measuredHeight: metrics.height,
      ascent: metrics.ascent,
      descent: metrics.descent,
      pin: lab.pin,
    };
  });
};

/** 把已测量 label 绑定到最终 Node rect */
export const layoutNodeLabels = (
  layout: NodeLayout,
  labels: Array<MeasuredNodeLabel> | undefined,
): Array<NodeLabelLayout> | undefined => labels?.map(label => resolveNodeLabelGeometry(layout, label));
