import type { DiagramThemeStyleDefinition } from './theme';

/** 具体 Diagram Definition 可以注入的共享运行时能力 */
export type DiagramDefinitionOptions = Readonly<{
  diagramThemeStyles?: ReadonlyArray<DiagramThemeStyleDefinition>;
}>;
