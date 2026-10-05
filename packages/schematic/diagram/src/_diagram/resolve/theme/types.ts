import type { IRNode } from '@retikz/core';
import type { IRSurface } from '@retikz/standard/presentation';

/** Diagram Theme 解析后的完整 Frame baseline */
export type EffectiveDiagramThemeFrame = Readonly<{
  /** 主题提供的外框内边距 */
  padding: IRSurface['padding'];
  /** 主题提供的标题与说明间距 */
  titleDescriptionGap: number;
  /** 主题提供的标题说明块与主体间距 */
  headingMainGap: number;
  /** 主题提供的绘图区与图例间距 */
  drawingLegendGap: number;
  /** 主题提供的外框圆角半径 */
  cornerRadius: number;
  /** 主题提供的外框背景绘制输入 */
  background?: IRSurface['background'];
  /** 主题提供的外框描边 */
  border?: IRSurface['border'];
}>;

/** Diagram Theme 解析后的完整 presentation 文本 baseline */
export type EffectiveDiagramTextAppearance = Readonly<{
  /** 文字使用的颜色 */
  textColor: NonNullable<NonNullable<IRNode['style']>['textColor']>;
  /** 文字的整体透明度 */
  opacity: NonNullable<NonNullable<IRNode['style']>['opacity']>;
  /** 文字排版使用的字体属性 */
  font: NonNullable<NonNullable<IRNode['style']>['font']>;
  /** 文字行在内容框中的水平对齐方式 */
  align: NonNullable<NonNullable<IRNode['layout']>['align']>;
  /** 文字排版使用的行高 */
  lineHeight: NonNullable<NonNullable<IRNode['layout']>['lineHeight']>;
  /** 文字排版的最大宽度约束 */
  maxTextWidth?: NonNullable<IRNode['layout']>['maxTextWidth'];
}>;

/** 当前 Core Theme 下解析完成的 Diagram Theme */
export type EffectiveDiagramTheme = Readonly<{
  /** 用于补全外框输入的有效主题参数 */
  frame: EffectiveDiagramThemeFrame;
  /** 标题与说明各自的有效文字外观 */
  presentation: Readonly<{
    /** 标题区域使用的文字外观 */
    title: EffectiveDiagramTextAppearance;
    /** 说明区域使用的文字外观 */
    description: EffectiveDiagramTextAppearance;
  }>;
}>;
