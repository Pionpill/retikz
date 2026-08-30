import type { IRChild, IRNode, ResolvedTheme } from '@retikz/core';
import type { IRLegend } from '@retikz/standard';
import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type {
  DiagramFrameSchema,
  DiagramPresentationSchema,
  DiagramTextAppearanceSchema,
  DiagramThemeSchema,
} from './schema';

/** Diagram Presentation 的持久化类型 */
export type IRDiagramPresentation = ZodInfer<typeof DiagramPresentationSchema>;

/** Diagram Frame 的 authoring 输入 */
export type DiagramFrameInput = ZodInput<typeof DiagramFrameSchema>;

/** Diagram Frame 的持久化类型 */
export type IRDiagramFrame = ZodInfer<typeof DiagramFrameSchema>;

/** Diagram 文字 appearance 的持久化类型 */
export type IRDiagramTextAppearance = ZodInfer<typeof DiagramTextAppearanceSchema>;

/** Diagram Theme 的 authoring 输入 */
export type DiagramThemeInput = ZodInput<typeof DiagramThemeSchema>;

/** Diagram Theme 的持久化类型 */
export type IRDiagramTheme = ZodInfer<typeof DiagramThemeSchema>;

/** Diagram Theme style Definition 的运行时扩展契约 */
export type DiagramThemeStyleDefinition = Readonly<{
  /** 与 Core Theme style 对齐的稳定名称 */
  name: string;
  /** 根据已经生效的 Core Theme 返回稀疏 Diagram Theme */
  resolve: (theme: ResolvedTheme) => DiagramThemeInput;
}>;

/** Diagram Frame 在当前 Theme 与实例覆盖后的完整 appearance */
export type ResolvedDiagramFrame = Readonly<{
  /** Legend 停靠方位 */
  legendPosition: 'top' | 'right' | 'bottom' | 'left';
  /** Legend 沿停靠边的切线对齐 */
  legendAlign: 'start' | 'center' | 'end';
  /** Surface padding */
  padding: NonNullable<IRDiagramFrame['padding']>;
  /** title 与 description 之间的间距 */
  titleDescriptionGap: number;
  /** heading 与 main 之间的间距 */
  headingMainGap: number;
  /** drawing 与 Legend 之间的间距 */
  drawingLegendGap: number;
  /** Surface overflow */
  overflow: NonNullable<IRDiagramFrame['overflow']>;
  /** Surface background */
  background?: IRDiagramFrame['background'];
  /** Surface border */
  border?: IRDiagramFrame['border'];
  /** Surface corner radius */
  cornerRadius: number;
}>;

/** Diagram 文本 appearance 在当前 Core Theme 下的完整默认值 */
export type ResolvedDiagramTextAppearance = Readonly<{
  /** 块级文本颜色 */
  textColor: NonNullable<IRNode['textColor']>;
  /** 块级不透明度 */
  opacity: NonNullable<IRNode['opacity']>;
  /** 块级字体 */
  font: NonNullable<IRNode['font']>;
  /** 多行对齐方式 */
  align: NonNullable<IRNode['align']>;
  /** 行高 */
  lineHeight: NonNullable<IRNode['lineHeight']>;
  /** 自动换行宽度 */
  maxTextWidth?: NonNullable<IRNode['maxTextWidth']>;
}>;

/** Diagram Theme 解析结果 */
export type ResolvedDiagramAppearance = Readonly<{
  /** 完整 frame appearance */
  frame: Omit<ResolvedDiagramFrame, 'legendPosition' | 'legendAlign' | 'overflow'>;
  /** title 块级 appearance */
  title: ResolvedDiagramTextAppearance;
  /** description 块级 appearance */
  description: ResolvedDiagramTextAppearance;
}>;

/** Foundation 将一个不透明 drawing child 组装为完整外壳时的输入 */
export type DiagramAssemblyInput = Readonly<{
  /** 已校验的 Presentation 内容 */
  presentation: IRDiagramPresentation;
  /** 具体 Diagram drawing core 的不透明 child */
  drawing: IRChild;
  /** 实例级 Frame 覆盖 */
  frame?: DiagramFrameInput;
  /** 已按 Core Theme 解析的 Diagram appearance */
  appearance: ResolvedDiagramAppearance;
}>;

/** Foundation 允许内部复用的 Standard Legend 类型锚点 */
export type DiagramLegend = IRLegend;
