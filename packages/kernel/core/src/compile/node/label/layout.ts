import type { CanonicalFont } from '../../../resolve';
import { resolveFont, resolveTextLine } from '../../../resolve';
import type { TextMeasurer } from '../../text';
import { layoutInlineLine, resolveTextMetrics } from '../../text';
import { DEFAULT_LINE_HEIGHT_FACTOR } from '../content/text';
import type {
  MeasuredNodeLabel,
  NodeLabelResolution,
  NodeLabelLayout,
  CompiledNodeLayout,
  NodeTextLayoutContext,
} from '../types';
import { resolveNodeLabelGeometry } from './geometry';

/** 节点附属 label 布局输入 */
type InputNodeLabelsLayout = NodeTextLayoutContext & {
  /** 基准字体大小 */
  baseFontSize: number;
  /** preset 与 rem 字号解析的根字号 */
  rootFontSize: number;
};

/** 只为 Node label 包装规范化文字度量 */
const nodeLabelMeasurer =
  (measureText: TextMeasurer): TextMeasurer =>
  (text, font) =>
    resolveTextMetrics(measureText(text, font));

/** 测量节点附属 label，不读取 Node rect */
export const measureNodeLabels = (
  input: InputNodeLabelsLayout,
): Array<{ layout: MeasuredNodeLabel; properties: NodeLabelResolution }> | undefined => {
  const { node, measureText, texLowering, baseFontSize, rootFontSize, fontScale, fontFamily, fontWeight, fontStyle } =
    input;
  const rawLabels = node.label;
  const texGatingOn = texLowering?.lowerTex !== undefined;
  const inlineWarn = texLowering?.warn ?? ((): void => {});
  const measureLabelText = nodeLabelMeasurer(measureText);

  return rawLabels?.map(lab => {
    const resolvedLabelFont = resolveFont(lab.font, {
      rootFontSize,
      inheritedFont: { size: baseFontSize, family: fontFamily, weight: fontWeight, style: fontStyle },
    });
    const labFontSize = resolvedLabelFont.size * fontScale;
    const labFamily = resolvedLabelFont.family;
    const labWeight = resolvedLabelFont.weight;
    const labStyle = resolvedLabelFont.style;
    const labTextColor = lab.textColor ?? node.textColor;
    const labTextFont: CanonicalFont = { size: labFontSize, family: labFamily, weight: labWeight, style: labStyle };

    const sourceLines = typeof lab.text === 'string' ? lab.text.split('\n') : lab.text;
    const resolved = sourceLines.map(line =>
      resolveTextLine(line, {
        rootFontSize,
        inheritedFont: labTextFont,
        gatingOn: texGatingOn,
        warn: inlineWarn,
        warningMessage: 'Unbalanced `$` in node label; the trailing fragment is kept literal.',
      }),
    );
    const laid =
      resolved.length > 1 || resolved[0].mixed || resolved[0].style !== undefined
        ? resolved.map(line =>
            layoutInlineLine(line.segments, {
              measureText: measureLabelText,
              lowerTex: texLowering?.lowerTex,
              font: labTextFont,
              warn: inlineWarn,
            }),
          )
        : undefined;
    const height = laid?.reduce(
      (total, line) =>
        total +
        (laid.length > 1
          ? Math.max(labFontSize * DEFAULT_LINE_HEIGHT_FACTOR, line.ascent + line.descent)
          : line.ascent + line.descent),
      0,
    );
    const metrics =
      laid && height !== undefined
        ? { width: Math.max(...laid.map(line => line.width)), height, ascent: height / 2, descent: height / 2 }
        : resolveTextMetrics(measureText(resolved[0].plainText, labTextFont));

    return {
      properties: { ...lab, text: resolved, font: labTextFont, textColor: labTextColor },
      layout: {
        laid,
        measuredWidth: metrics.width,
        measuredHeight: metrics.height,
        ascent: metrics.ascent,
        descent: metrics.descent,
      },
    };
  });
};

/** 把已测量 label 绑定到最终 Node rect */
export const layoutNodeLabels = (
  layout: CompiledNodeLayout,
  labels: Array<{ layout: MeasuredNodeLabel; properties: NodeLabelResolution }> | undefined,
): Array<NodeLabelLayout> | undefined =>
  labels?.map(label => resolveNodeLabelGeometry(layout, label.layout, label.properties));
