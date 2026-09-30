import type { GraphDefinitionOptions } from '@retikz/graph';

import type { DiagramDefinitionOptions } from '../../_diagram';
import type { FlowLayoutDefinition } from './layout';
import type { FlowThemeStyleDefinition } from './theme';

/** Flow Diagram provider assembly 可注入的完整运行时能力 */
export type FlowDiagramDefinitionOptions = DiagramDefinitionOptions &
  GraphDefinitionOptions &
  Readonly<{
    /**
     * 与 Core Theme style 同名的 Flow Theme definitions；使用命名主题时需提供匹配定义
     * @default []
     */
    flowThemeStyles?: ReadonlyArray<FlowThemeStyleDefinition>;
    /**
     * 追加到内置布局目录的自定义定义；名称不能与不同定义重复
     * @default []
     */
    flowLayouts?: ReadonlyArray<FlowLayoutDefinition>;
    /**
     * 当前编译使用的布局名称，必须已注册；省略时使用内置 layered 布局
     * @default LayeredFlowLayoutDefinition.name
     */
    defaultFlowLayout?: string;
  }>;
