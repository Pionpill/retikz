import type { TextMeasurer } from '../../../contract';
import type { CanonicalNodeLabel } from '../../../resolve';
import { resolveTextMetrics } from '../../../resolve';
import { layoutInlineLine } from '../../text';
import { layoutNodeLabelGeometry } from '../label-geometry';
import type { CompiledNodeLayout, MeasuredNodeLabel, NodeLabelLayout, NodeTextLayoutContext } from '../types';
import { DEFAULT_LINE_HEIGHT_FACTOR } from './text';

/** 只为 Node label 包装规范化文字度量 */
const createNodeLabelMeasurer =
  (measureText: TextMeasurer): TextMeasurer =>
  (text, font, disableCache) =>
    resolveTextMetrics(measureText(text, font, disableCache));

/** 测量节点附属 label，不读取 Node rect */
export const measureNodeLabels = (
  input: NodeTextLayoutContext,
): Array<{ layout: MeasuredNodeLabel; properties: CanonicalNodeLabel }> | undefined => {
  const { canon, measureText, tex: texLowering } = input;
  if (canon.labels.length === 0) return undefined;
  const inlineWarn = texLowering?.warn ?? ((): void => {});
  const measureLabelText = createNodeLabelMeasurer(measureText);

  return canon.labels.map(lab => {
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
  labels?.map(label => layoutNodeLabelGeometry(layout, label.layout, label.properties));
