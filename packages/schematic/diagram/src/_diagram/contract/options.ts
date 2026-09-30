import type { DiagramThemeStyleDefinition } from './theme';

/** 具体 Diagram Definition 可以注入的共享运行时能力 */
export type DiagramDefinitionOptions = Readonly<{
  /**
   * 与 Core Theme style 同名的 Diagram Theme definitions；使用命名主题时需提供匹配定义
   * @default []
   */
  diagramThemeStyles?: ReadonlyArray<DiagramThemeStyleDefinition>;
}>;
