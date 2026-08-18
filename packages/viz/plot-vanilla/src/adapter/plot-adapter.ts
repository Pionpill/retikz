import type { CoreDependencyProvider, CoreProviderContribution } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { IRPlot, LowerPlotsOptions } from '@retikz/plot';
import type { InputEmbedAdapter, InputScope } from '@retikz/vanilla';

import { assertNonEmptyString } from '@retikz/foundation';
import {
  createPlotProvider as createPlotDependencyProvider,
  createPlotProviderContribution,
  PLOT_NAMESPACE,
  PlotComposite,
} from '@retikz/plot';
import { normalizeScopeWithChildren } from '@retikz/vanilla';

import type { InputPlotEmbed } from '../spec';

import { plotIROf } from '../spec';

/** 将 Plot 根节点包进可选的面板 Scope */
const wrapPlotPanel = (node: IRPlot, panel: InputPlotEmbed['panel']) => {
  if (panel === undefined) return node;
  const { x, y, transforms, zIndex, clip, theme } = panel;
  const panelTransforms =
    x !== undefined || y !== undefined
      ? [{ kind: 'translate' as const, x: x ?? 0, y: y ?? 0 }, ...(transforms ?? [])]
      : transforms;
  if (panelTransforms === undefined && zIndex === undefined && clip === undefined && theme === undefined) return node;
  const input: InputScope = {
    type: 'scope',
    ...(panelTransforms === undefined ? {} : { transforms: panelTransforms }),
    ...(zIndex === undefined ? {} : { zIndex }),
    ...(clip === undefined ? {} : { clip }),
    ...(theme === undefined ? {} : { theme }),
    children: [node],
  };
  return normalizeScopeWithChildren(input, () => [node]);
};

/** 完整 IRPlot 的 Vanilla contribution request */
export type PlotContributionRequest = Readonly<{
  /** 已完成的 IRPlot */
  spec: IRPlot;
  /** runtime-only dataset table */
  datasets: ExternalDatasets;
  /** Plot lowering runtime options */
  lowerOptions?: LowerPlotsOptions;
}>;

/** Plot-owned Vanilla contribution 解析结果 */
export type ResolvedPlotContribution = Readonly<{
  /** 已类型化的完整 Plot Source IR */
  spec: IRPlot;
  /** Plot composite 及其 Standard shape 依赖的 provider contribution */
  contribution: CoreProviderContribution;
}>;

/** 创建一个共享 datasets 与 lowering options 的 Plot dependency provider */
export const createPlotProvider = (input: {
  datasets: ExternalDatasets;
  lowerOptions?: LowerPlotsOptions;
}): CoreDependencyProvider => createPlotDependencyProvider(input.datasets, input.lowerOptions);

/** 将完整 IRPlot 归一为 Plot-owned dependency contribution */
export const resolvePlotContribution = (request: PlotContributionRequest): ResolvedPlotContribution => {
  return {
    spec: request.spec,
    contribution: createPlotProviderContribution(request.datasets, request.lowerOptions),
  };
};

/** 将 Plot authoring input 下沉为 Core contribution 的 InputEmbed adapter */
export const PlotInputEmbedAdapter: InputEmbedAdapter<InputPlotEmbed> = {
  kind: PLOT_NAMESPACE,
  lower: (props, context) => {
    assertNonEmptyString(context.id, 'plot vanilla embed id');
    const spec = plotIROf(props);
    const providerDependencies = createPlotProviderContribution(props.datasets, props.lowerOptions);
    const node =
      props.preserveRootIdentity === true ? spec : { ...spec, id: `${context.id}/${spec.id ?? PlotComposite.Plot}` };
    return {
      node: wrapPlotPanel(node, props.panel),
      providerDependencies,
    };
  },
};
