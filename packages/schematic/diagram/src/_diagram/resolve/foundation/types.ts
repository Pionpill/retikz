import type { ResolvedTheme } from '@retikz/core';
import type { IRSurface } from '@retikz/standard';

import type { DiagramThemeStyleDefinition } from '../../contract';
import type { IRDiagramFrame, IRDiagramPresentation, IRDiagramTheme } from '../../schemas';
import type { EffectiveDiagramTextAppearance } from '../theme';

/** Diagram Foundation 解析使用的持久化片段集合 */
export type DiagramFoundationSource = Readonly<{
  presentation?: IRDiagramPresentation;
  frame?: IRDiagramFrame;
  diagramTheme?: IRDiagramTheme;
}>;

/** Diagram Foundation 解析所需的调用位置上下文 */
export type DiagramFoundationResolveContext = Readonly<{
  theme: ResolvedTheme;
  diagramThemeStyles: ReadonlyMap<string, DiagramThemeStyleDefinition>;
}>;

/** Diagram Foundation 解析后的完整 Frame */
export type CanonicalDiagramFrame = Readonly<{
  legendPosition: NonNullable<IRDiagramFrame['legendPosition']>;
  legendAlign: NonNullable<IRDiagramFrame['legendAlign']>;
  titleDescriptionGap: number;
  headingMainGap: number;
  drawingLegendGap: number;
  padding: IRSurface['padding'];
  background?: IRSurface['background'];
  border?: IRSurface['border'];
  cornerRadius: number;
  overflow: NonNullable<IRDiagramFrame['overflow']>;
}>;

/** Diagram Foundation lowering 的 canonical 输入 */
export type DiagramFoundationResolution = Readonly<{
  presentation?: IRDiagramPresentation;
  frame: CanonicalDiagramFrame;
  title: EffectiveDiagramTextAppearance;
  description: EffectiveDiagramTextAppearance;
}>;
