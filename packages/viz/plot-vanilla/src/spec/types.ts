import type { ExternalDatasets } from '@retikz/data';
import type { LowerPlotsOptions } from '@retikz/plot';
import type { InputScope } from '@retikz/vanilla';

import type { InputPlot } from '../normalize/plot';

/** Plot 嵌入到场景时可选的面板 Scope 输入 */
export type InputPlotPanel = Pick<InputScope, 'clip' | 'theme' | 'transforms' | 'zIndex'> & {
  /** 面板左上角横坐标 */
  x?: number;
  /** 面板左上角纵坐标 */
  y?: number;
};

/** Plot InputEmbed 交给 adapter 的属性 */
export type InputPlotEmbed = Readonly<{
  /** 待归一化的 Plot authoring Input */
  spec: InputPlot;
  /** Plot lowering 消费的外部 datasets */
  datasets: ExternalDatasets;
  /** Plot lowering runtime options */
  lowerOptions?: LowerPlotsOptions;
  /** 保留已有 Plot Source IR 根身份，不再由 embed identity 添加命名空间 */
  preserveRootIdentity?: boolean;
  /** 作用于 Plot 根节点的可选 Core Scope */
  panel?: InputPlotPanel;
}>;
