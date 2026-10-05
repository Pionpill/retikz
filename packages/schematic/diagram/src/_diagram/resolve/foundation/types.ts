import type { ResolvedTheme } from '@retikz/core';
import type { IRSurface } from '@retikz/standard/presentation';

import type { DiagramThemeStyleDefinition } from '../../contract';
import type { IRDiagramDefaults, IRDiagramFrame, IRDiagramPresentation } from '../../schemas';
import type { EffectiveDiagramTheme } from '../theme';

/** Diagram Foundation 解析使用的持久化片段集合 */
export type DiagramFoundationSource = Readonly<{
  /** 图示标题、说明与显式图例内容 */
  presentation?: IRDiagramPresentation;
  /** 覆盖主题的外框样式与区域间距 */
  frame?: IRDiagramFrame;
  /** 应用于当前图示的稀疏默认片段 */
  diagramDefaults?: IRDiagramDefaults;
}>;

/** Diagram Foundation 解析所需的调用位置上下文 */
export type DiagramFoundationResolveContext = Readonly<{
  /** 当前宿主已经解析的 Core 主题 */
  theme: ResolvedTheme;
  /** 可供当前图示选择的主题样式定义 */
  diagramThemeStyles: ReadonlyMap<string, DiagramThemeStyleDefinition>;
}>;

/** Diagram Foundation 解析后的完整 Frame */
export type CanonicalDiagramFrame = Readonly<{
  /** 图例相对绘图区的最终方位 */
  legendPosition: NonNullable<IRDiagramFrame['legendPosition']>;
  /** 图例沿绘图区交叉轴的对齐方式 */
  legendAlign: NonNullable<IRDiagramFrame['legendAlign']>;
  /** 标题和说明区域之间的净间距 */
  titleDescriptionGap: number;
  /** 标题说明块与绘图图例主体之间的净间距 */
  headingMainGap: number;
  /** 绘图区与图例之间的净间距 */
  drawingLegendGap: number;
  /** 外框边界与内部区域之间的内边距 */
  padding: IRSurface['padding'];
  /** 已合并主题与显式覆盖的背景绘制输入 */
  background?: IRSurface['background'];
  /** 已合并主题与显式覆盖的外框描边 */
  border?: IRSurface['border'];
  /** 外框最终圆角半径 */
  cornerRadius: number;
  /** 内部内容超出外框时的可见性策略 */
  overflow: NonNullable<IRDiagramFrame['overflow']>;
}>;

/** Diagram Foundation lowering 的 canonical 输入 */
export type DiagramFoundationResolution = Readonly<{
  /** 待装配的标题、说明与显式图例内容 */
  presentation?: IRDiagramPresentation;
  /** 已完成默认值与主题合并的外框参数 */
  frame: CanonicalDiagramFrame;
  /** 用于标题与说明的最终文字外观 */
  presentationAppearance: EffectiveDiagramTheme['presentation'];
}>;
