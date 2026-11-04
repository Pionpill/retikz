import type { TextMeasurer } from '../../../contract';
import { resolveTextMetrics } from '../../../resolve';
import type { CanonicalNodeLabel } from '../../../resolve';
import { layoutInlineLine } from '../../text';
import { DEFAULT_LINE_HEIGHT_FACTOR } from '../content';
import type { CompiledNodeLayout, MeasuredNodeLabel, NodeLabelLayout, NodeTextLayoutContext } from '../types';
import { resolveNodeLabelGeometry } from './geometry';

/** 只为 Node label 包装规范化文字度量 */
const nodeLabelMeasurer =
  (measureText: TextMeasurer): TextMeasurer =>
  (text, font) =>
    resolveTextMetrics(measureText(text, font));

/** 测量节点附属 label，不读取 Node rect */
export const measureNodeLabels = (
  input: NodeTextLayoutContext,
): Array<{ layout: MeasuredNodeLabel; properties: CanonicalNodeLabel }> | undefined => {
  const { node, measureText, tex: texLowering } = input;
  const inlineWarn = texLowering?.warn ?? ((): void => {});
  const measureLabelText = nodeLabelMeasurer(measureText);

  return node.label?.map(lab => {
    const { font: labTextFont, text: resolved } = lab;
    const labFontSize = labTextFont.size;
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
      properties: lab,
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
  labels: Array<{ layout: MeasuredNodeLabel; properties: CanonicalNodeLabel }> | undefined,
): Array<NodeLabelLayout> | undefined =>
  labels?.map(label => resolveNodeLabelGeometry(layout, label.layout, label.properties));
