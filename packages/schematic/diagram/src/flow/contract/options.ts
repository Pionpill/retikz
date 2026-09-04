import type { GraphDefinitionOptions } from '@retikz/graph';

import type { DiagramDefinitionOptions } from '../../_diagram';
import type { FlowLayoutDefinition } from './layout';
import type { FlowThemeStyleDefinition } from './theme';

/** Flow Diagram provider assembly 可注入的完整运行时能力 */
export type FlowDiagramDefinitionOptions = DiagramDefinitionOptions &
  GraphDefinitionOptions &
  Readonly<{
    /** 与 Core Theme style 同名的 Flow Theme definitions */
    flowThemeStyles?: ReadonlyArray<FlowThemeStyleDefinition>;
    /** 自定义 Flow Layout definitions */
    flowLayouts?: ReadonlyArray<FlowLayoutDefinition>;
    /** 当前 assembly 选中的 Flow Layout definition 名称 */
    defaultFlowLayout?: string;
  }>;
