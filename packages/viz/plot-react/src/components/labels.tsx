import type { IRPlotLabel } from '@retikz/plot';
import type { FC, ReactNode } from 'react';

type TextPlotLabel = Extract<IRPlotLabel, { type: 'text' }>;

/** Plot 级文本标签内容；多行和富文本块复用 core TextBlock 契约。 */
export type PlotLabelText = TextPlotLabel['text'];

/** Plot 级文本标签组件共享 props。 */
export type PlotTextLabelProps = Omit<TextPlotLabel, 'role' | 'text' | 'type'> & {
  /** 标签文本块；多行可传字符串数组或 styled text block。 */
  text?: PlotLabelText;
  /** React children 文本入口；可用 core <Text> 子元素声明 styled line。 */
  children?: ReactNode;
};

/** 整图标题标签。 */
export type TitleLabelProps = PlotTextLabelProps;

/** 整图说明标签。 */
export type CaptionLabelProps = PlotTextLabelProps;

/** 整图标题声明组件。 */
export const TitleLabel: FC<TitleLabelProps> = () => null;

/** 整图说明声明组件。 */
export const CaptionLabel: FC<CaptionLabelProps> = () => null;
