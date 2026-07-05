import type { IRLabelDefault, IRNodeLabel } from '../../schemas';
import type { FontSpec } from '../text';
import type { NodeLabelLayout, NodeTextLayoutContext } from './types';

import { CompileWarningCode } from '../constants';
import { layoutInlineLine, resolveLineRuns } from '../text';
import { normalizeLabelPosition } from './label-geometry';

/** 节点附属 label 布局输入。 */
export type LayoutNodeLabelsInput = NodeTextLayoutContext & {
  /** 样式栈解析出的 label 默认值。 */
  labelDefault?: IRLabelDefault;
  /** 节点 label 与节点边界的默认距离。 */
  labelDistance: number;
  /** 基准字体大小。 */
  baseFontSize: number;
};

/** 布局节点附属 label。 */
export const layoutNodeLabels = (input: LayoutNodeLabelsInput): Array<NodeLabelLayout> | undefined => {
  const {
    node,
    measureText,
    texLowering,
    labelDefault,
    labelDistance,
    baseFontSize,
    fontScale,
    fontFamily,
    fontWeight,
    fontStyle,
  } = input;
  const rawLabels: Array<IRNodeLabel> | undefined =
    node.label === undefined ? undefined : Array.isArray(node.label) ? node.label : [node.label];
  const texGatingOn = texLowering?.lowerTex !== undefined;
  const inlineWarn = texLowering?.warn ?? ((): void => {});
  return rawLabels?.map(lab => {
    const labFont = lab.font;
    const labFontSize = (labFont?.size ?? labelDefault?.font?.size ?? baseFontSize) * fontScale;
    const labFamily = labFont?.family ?? labelDefault?.font?.family ?? fontFamily;
    const labWeight = labFont?.weight ?? labelDefault?.font?.weight ?? fontWeight;
    const labStyle = labFont?.style ?? labelDefault?.font?.style ?? fontStyle;
    const labTextColor = lab.textColor ?? labelDefault?.textColor ?? labelDefault?.color ?? node.textColor;
    const labOpacity = lab.opacity ?? labelDefault?.opacity;
    const labFontSpec: FontSpec = { size: labFontSize, family: labFamily, weight: labWeight, style: labStyle };
    const resolved = resolveLineRuns(lab.text, texGatingOn);
    if (resolved.warn) {
      inlineWarn(
        CompileWarningCode.TextTexParseError,
        'Unbalanced `$` in node label; the trailing fragment is kept literal.',
      );
    }
    const plainText = resolved.runs.map(r => ('text' in r ? r.text : '')).join('');
    const isMixed = resolved.hasMath || typeof lab.text === 'object';
    const laid = isMixed
      ? layoutInlineLine(resolved.runs, {
          measureText,
          lowerTex: texLowering?.lowerTex,
          font: labFontSpec,
          color: labTextColor,
          opacity: labOpacity,
          warn: inlineWarn,
        })
      : undefined;
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
      measuredWidth: laid ? laid.width : measureText(plainText, labFontSpec).width,
      pin: lab.pin,
    };
  });
};
