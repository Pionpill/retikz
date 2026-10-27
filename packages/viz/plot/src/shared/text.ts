import type { IRNode, CompositeCompileContext } from '@retikz/core';
import { LayoutChildProbeKind, naturalLayoutProposal } from '@retikz/core';
import type { BoundsRect } from '@retikz/math';

/** 使用当前 Core 编译环境测量标签的未旋转尺寸，保留字体、富文本和换行配置 */
export type PlotLabelMeasure = (node: IRNode, fontSize: number) => Pick<BoundsRect, 'width' | 'height'>;

/** 隔离标签身份、位置和外框颜色，只测量文字几何 */
const textProbeOf = (node: IRNode, fontSize: number): IRNode => ({
  type: 'node',
  position: [0, 0],
  text: node.text,
  style: {
    font: { ...node.style?.font, size: node.style?.font?.size ?? fontSize },
    color: 'black',
    textColor: 'black',
    stroke: 'none',
    fill: 'none',
    strokeWidth: 0,
  },
  layout: { ...node.layout, padding: 0, minimumSize: 0 },
});

/** 将标签测量绑定到当前编译的宿主测量器、主题及 TeX 环境 */
export const createPlotTextMeasurer =
  (context: CompositeCompileContext): PlotLabelMeasure =>
  (node, fontSize) => {
    const probe = context.layoutChild(textProbeOf(node, fontSize), naturalLayoutProposal);
    if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
    return probe.result.visualBounds;
  };

/** 轴与图例共用的文字外观配置 */
export type GuideTextStyle = Partial<
  Pick<
    NonNullable<IRNode['style']> & NonNullable<IRNode['layout']> & Pick<IRNode, 'rotate'>,
    'font' | 'textColor' | 'opacity' | 'align' | 'lineHeight' | 'maxTextWidth' | 'rotate'
  >
>;

/** 把 guide 文本外观投影为 Core Node 的分组字段，供测量与绘制共用 */
export const guideTextSourceProps = (
  value: GuideTextStyle,
  fontSize?: number,
): Pick<IRNode, 'style' | 'layout' | 'rotate'> => {
  const { rotate, align, lineHeight, maxTextWidth, ...style } = value;
  return {
    style: { ...style, font: { ...style.font, size: style.font?.size ?? fontSize } },
    layout: {
      ...(align === undefined ? {} : { align }),
      ...(lineHeight === undefined ? {} : { lineHeight }),
      ...(maxTextWidth === undefined ? {} : { maxTextWidth }),
    },
    ...(rotate === undefined ? {} : { rotate }),
  };
};
