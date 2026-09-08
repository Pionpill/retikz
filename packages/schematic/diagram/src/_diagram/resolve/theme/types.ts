import type { IRNode } from '@retikz/core';
import type { IRSurface } from '@retikz/standard';

/** Diagram Theme 解析后的完整 Frame baseline */
export type EffectiveDiagramThemeFrame = Readonly<{
  padding: IRSurface['padding'];
  titleDescriptionGap: number;
  headingMainGap: number;
  drawingLegendGap: number;
  cornerRadius: number;
  background?: IRSurface['background'];
  border?: IRSurface['border'];
}>;

/** Diagram Theme 解析后的完整 presentation 文本 baseline */
export type EffectiveDiagramTextAppearance = Readonly<{
  textColor: NonNullable<NonNullable<IRNode['style']>['textColor']>;
  opacity: NonNullable<NonNullable<IRNode['style']>['opacity']>;
  font: NonNullable<NonNullable<IRNode['style']>['font']>;
  align: NonNullable<NonNullable<IRNode['layout']>['align']>;
  lineHeight: NonNullable<NonNullable<IRNode['layout']>['lineHeight']>;
  maxTextWidth?: NonNullable<IRNode['layout']>['maxTextWidth'];
}>;

/** 当前 Core Theme 下解析完成的 Diagram Theme */
export type EffectiveDiagramTheme = Readonly<{
  frame: EffectiveDiagramThemeFrame;
  presentation: Readonly<{
    title: EffectiveDiagramTextAppearance;
    description: EffectiveDiagramTextAppearance;
  }>;
}>;
