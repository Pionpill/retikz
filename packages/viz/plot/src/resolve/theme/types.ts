import type { IRNode, IRShapeValue } from '@retikz/core';

import type { IRPlotAxisDefaults, IRPlotDefaults, IRPlotLegendGuide } from '../../schemas';

type GuideTextStyle = Partial<
  Pick<
    NonNullable<IRNode['style']> & NonNullable<IRNode['layout']> & Pick<IRNode, 'rotate'>,
    'font' | 'textColor' | 'opacity' | 'align' | 'lineHeight' | 'maxTextWidth' | 'rotate'
  >
>;
type LegendStyle = NonNullable<IRPlotLegendGuide['style']>;

/** Plot palette 解析结果：所有默认配色入口收敛到一个对象 */
export type EffectivePlotPalette = {
  /** 分类 scale 默认颜色 */
  categorical: Array<string>;
  /** 无 color 编码的 mark / series 默认颜色 */
  series: Array<string>;
  /** 连续单向色阶默认 scheme */
  sequential: string;
  /** 发散色阶默认 scheme */
  diverging: string;
  /** 分类 shape 通道默认形状 */
  shape: Array<IRShapeValue>;
};

/** Plot legend 解析后的视觉 defaults */
export type EffectiveLegendGuideTokens = Required<
  Pick<
    LegendStyle,
    | 'swatchSize'
    | 'swatchGap'
    | 'entryGap'
    | 'titleGap'
    | 'rampLength'
    | 'rampThickness'
    | 'symbolSize'
    | 'symbolScale'
    | 'symbolFit'
  >
> & {
  /** Legend title 文本样式 */
  title: GuideTextStyle;
  /** Legend label 文本样式 */
  label: GuideTextStyle;
};

/** Plot defaults 解析结果：lowering 只消费确定的视觉默认值 */
export type EffectivePlotGuideTheme = {
  /** 绘图区视觉样式 */
  plotArea?: IRPlotDefaults['plotArea'];
  /** 全局 guide 文本默认样式 */
  typography: NonNullable<IRPlotDefaults['typography']>;
  /** 解析后的 palette */
  palette: EffectivePlotPalette;
  /** Axis 视觉默认值 */
  axis: IRPlotAxisDefaults;
  /** Legend 视觉默认值 */
  legend: EffectiveLegendGuideTokens;
};
