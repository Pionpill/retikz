import type { DiagramDefinitionOptions, DiagramThemeStyleDefinition } from '../contract';

import { resolveDiagramThemeStyleRegistry } from './theme';

/** 一次 Diagram definition 装配共享的已解析 registries */
export type ResolvedDiagramDefinitionOptions = Readonly<{
  diagramThemeStyles: ReadonlyMap<string, DiagramThemeStyleDefinition>;
}>;

/** 一次性校验并解析 Diagram definition options */
export const resolveDiagramDefinitionOptions = (
  options: DiagramDefinitionOptions = {},
): ResolvedDiagramDefinitionOptions => ({
  diagramThemeStyles: resolveDiagramThemeStyleRegistry(options.diagramThemeStyles),
});
