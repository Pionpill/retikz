import type { IRNode, IRScope, LayoutCompositeCompileContext } from '@retikz/core';
import { compileToScene, LayoutChildProbeKind, NaturalLayoutProposal } from '@retikz/core';
import type { BoundsRect } from '@retikz/math';

/** 使用当前 Core 编译环境测量标签的未旋转尺寸，保留字体、富文本和换行配置 */
export type PlotLabelMeasure = (node: IRNode, fontSize: number) => Pick<BoundsRect, 'width' | 'height'>;

/** 隔离标签身份、位置和外框颜色，只测量文字几何 */
const textProbeOf = (node: IRNode, fontSize: number): IRScope => ({
  type: 'scope',
  defaults: {
    node: {
      style: { font: { size: fontSize }, stroke: 'none', fill: 'none', strokeWidth: 0 },
      layout: { padding: 0, minimumSize: 0 },
    },
  },
  children: [
    {
      type: 'node',
      position: [0, 0],
      text: node.text,
      style: {
        font: node.style?.font,
        color: 'black',
        textColor: 'black',
        stroke: 'none',
        fill: 'none',
        strokeWidth: 0,
      },
      layout: { ...node.layout, padding: 0, minimumSize: 0 },
    },
  ],
});

/** 独立下沉时通过 Core 默认编译环境测量文字，不维护另一套估算规则 */
export const measurePlotText: PlotLabelMeasure = (node, fontSize) =>
  compileToScene({ version: 1, type: 'scene', children: [textProbeOf(node, fontSize)] }, { padding: 0 }).scene.layout;

/** 将标签测量绑定到当前编译的宿主测量器、主题及 TeX 环境 */
export const createPlotTextMeasurer =
  (context: LayoutCompositeCompileContext): PlotLabelMeasure =>
  (node, fontSize) => {
    const probe = context.layoutChild(textProbeOf(node, fontSize), NaturalLayoutProposal);
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
export const guideTextSourceProps = (value: GuideTextStyle): Pick<IRNode, 'style' | 'layout' | 'rotate'> => {
  const { rotate, align, lineHeight, maxTextWidth, ...style } = value;
  return {
    style,
    layout: {
      ...(align === undefined ? {} : { align }),
      ...(lineHeight === undefined ? {} : { lineHeight }),
      ...(maxTextWidth === undefined ? {} : { maxTextWidth }),
    },
    ...(rotate === undefined ? {} : { rotate }),
  };
};
