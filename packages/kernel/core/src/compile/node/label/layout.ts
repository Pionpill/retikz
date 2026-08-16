import type { TextFont, TextMeasurer } from '../../text';
import type { MeasuredNodeLabel, NodeLabelLayout, NodeLayout, NodeTextLayoutContext } from '../types';

import { layoutInlineLine, normalizeTextMetrics, resolveFontSize, resolveLineRunsWithWarning } from '../../text';
import { resolveNodeLabelGeometry } from './geometry';

/** 节点附属 label 布局输入 */
export type LayoutNodeLabelsInput = NodeTextLayoutContext & {
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

/** 测量节点附属 label，不读取 Node rect */
export const measureNodeLabels = (input: LayoutNodeLabelsInput): Array<MeasuredNodeLabel> | undefined => {
  const {
    node,
    measureText,
    texLowering,
    labelDistance,
    baseFontSize,
    rootFontSize,
    fontScale,
    fontFamily,
    fontWeight,
    fontStyle,
  } = input;
  const rawLabels = node.label;
  const texGatingOn = texLowering?.lowerTex !== undefined;
  const inlineWarn = texLowering?.warn ?? ((): void => {});
  const measureLabelText = nodeLabelMeasurer(measureText);
  return rawLabels?.map(lab => {
    const labFont = lab.font;
    const labFontSize =
      resolveFontSize(labFont?.size, {
        rootFontSize,
        inheritedFontSize: baseFontSize,
      }) * fontScale;
    const labFamily = labFont?.family ?? fontFamily;
    const labWeight = labFont?.weight ?? fontWeight;
    const labStyle = labFont?.style ?? fontStyle;
    const labTextColor = lab.textColor ?? node.textColor;
    const labOpacity = lab.opacity;
    const labTextFont: TextFont = { size: labFontSize, family: labFamily, weight: labWeight, style: labStyle };
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
          lowerTex: texLowering?.lowerTex,
          font: labTextFont,
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
      : normalizeTextMetrics(measureText(plainText, labTextFont));
    return {
      text: plainText,
      laid,
      position: lab.position,
      placement: lab.placement,
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
