import type { InputEmbedContribution } from '@retikz/vanilla';

import { buildChartProviderContribution } from './contribution';
import { wrapChartPanel } from './scope';
import type { InputChartRuntime } from './types';

/** 绑定当前 Chart 实例的就绪数据，不在面板或布局内重复计算 */
export const lowerChartInput = (runtime: InputChartRuntime): InputEmbedContribution => {
  const node = wrapChartPanel(runtime.source, runtime.panel);
  return {
    node,
    providerDependencies: buildChartProviderContribution(runtime),
    ...(runtime.preparedData === undefined
      ? {}
      : { runtimeInputs: [{ path: node === runtime.source ? [] : ['children', 0], input: runtime.preparedData }] }),
  };
};
