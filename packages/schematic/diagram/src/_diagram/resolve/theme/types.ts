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
  textColor: NonNullable<IRNode['textColor']>;
  opacity: NonNullable<IRNode['opacity']>;
  font: NonNullable<IRNode['font']>;
  align: NonNullable<IRNode['align']>;
  lineHeight: NonNullable<IRNode['lineHeight']>;
  maxTextWidth?: IRNode['maxTextWidth'];
}>;

/** 当前 Core Theme 下解析完成的 Diagram Theme */
export type EffectiveDiagramTheme = Readonly<{
  frame: EffectiveDiagramThemeFrame;
  presentation: Readonly<{
    title: EffectiveDiagramTextAppearance;
    description: EffectiveDiagramTextAppearance;
  }>;
}>;
