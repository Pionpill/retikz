import type { IRFont } from '../../schemas';
import { resolveFont, resolveTextBlock } from '../text';
import type { ColorResolvedTextLine } from '../text';
import type { NodeLabelColorSource, NodeResolveContext } from './types';

/** 节点字体和已确定颜色的正文、标签输入 */
type InputNodeContent = {
  /** 节点作者字体 */
  font?: IRFont;
  /** 作者显式行高 */
  lineHeight?: number;
  /** 正文自动折行宽度 */
  maxTextWidth?: number;
  /** 正文块内部对齐 */
  textAlign?: 'start' | 'middle' | 'end';
  /** 节点轴向缩放 */
  scale: { x: number; y: number };
  /** 已解析颜色的正文行 */
  text?: Array<ColorResolvedTextLine>;
  /** 已解析颜色的标签 */
  label?: Array<NodeLabelColorSource>;
  /** 节点文字主色 */
  textColor?: string;
};

/** 解析节点正文与标签的字体和分段，在单位求值后统一应用宿主缩放 */
export const resolveNodeContent = (
  input: InputNodeContent,
  context: Pick<NodeResolveContext, 'rootFontSize' | 'gatingOn' | 'warn'>,
) => {
  const { font: sourceFont, lineHeight, maxTextWidth, textAlign, scale, text, label, textColor } = input;
  const { rootFontSize, gatingOn, warn } = context;
  const baseFont = resolveFont(sourceFont, { rootFontSize, inheritedFont: { size: rootFontSize } });
  const textContext = { rootFontSize, gatingOn, warn, inheritedFont: baseFont, scale };
  return {
    text:
      text === undefined
        ? undefined
        : resolveTextBlock({ text, textColor, lineHeight, maxTextWidth, textAlign }, textContext),
    label: label?.map(
      ({
        text: labelText,
        font,
        textColor: labelColor,
        lineHeight: labelLineHeight,
        maxTextWidth: labelWidth,
        textAlign: labelAlign,
        ...host
      }) => ({
        ...host,
        text: resolveTextBlock(
          {
            text: labelText,
            font,
            textColor: labelColor ?? textColor,
            lineHeight: labelLineHeight,
            maxTextWidth: labelWidth,
            textAlign: labelAlign,
          },
          textContext,
        ),
      }),
    ),
  };
};
