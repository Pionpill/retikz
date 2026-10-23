import type { DiagramDefinitionOptions, DiagramThemeDefinition } from '../contract';
import { resolveDiagramThemeRegistry } from './theme';

/** 一次 Diagram definition 装配共享的已解析 registries */
export type ResolvedDiagramDefinitionOptions = Readonly<{
  /** 按名称索引的有效 Diagram 主题样式定义 */
  diagramThemeDefinitions: ReadonlyMap<string, DiagramThemeDefinition>;
}>;

/** 一次性校验并解析 Diagram definition options */
export const resolveDiagramDefinitionOptions = (
  options: DiagramDefinitionOptions = {},
): ResolvedDiagramDefinitionOptions => ({
  diagramThemeDefinitions: resolveDiagramThemeRegistry(options.diagramThemeDefinitions),
});
