import type { CanonicalNodeLabel } from '../../../resolve';
import { layoutTextBlock } from '../../text';
import { layoutNodeLabelGeometry } from '../label-geometry';
import type { CompiledNodeLayout, MeasuredNodeLabel, NodeLabelLayout, NodeTextLayoutContext } from '../types';

/** 测量节点附属 label，不读取 Node rect */
export const measureNodeLabels = (
  input: NodeTextLayoutContext,
): Array<{ layout: MeasuredNodeLabel; canon: CanonicalNodeLabel }> | undefined => {
  const { canon, measureText, tex: texLowering } = input;
  if (canon.labels.length === 0) return undefined;
  const inlineWarn = texLowering?.warn ?? ((): void => {});

  return canon.labels.map(lab => {
    const laid = layoutTextBlock(
      lab.text.lines,
      {
        lineHeight: lab.text.lineHeight,
        maxTextWidth: lab.text.maxTextWidth,
      },
      { measureText, lowerTex: texLowering?.lowerTex, font: lab.text.font, warn: inlineWarn },
    );
    return {
      canon: lab,
      layout: {
        laid,
        measuredWidth: laid.width,
        measuredHeight: laid.height,
        ascent: laid.height / 2,
        descent: laid.height / 2,
      },
    };
  });
};

/** 把已测量 label 绑定到最终 Node rect */
export const layoutNodeLabels = (
  layout: CompiledNodeLayout,
  labels: Array<{ layout: MeasuredNodeLabel; canon: CanonicalNodeLabel }> | undefined,
): Array<NodeLabelLayout> | undefined =>
  labels?.map(label => layoutNodeLabelGeometry(layout, label.layout, label.canon));
