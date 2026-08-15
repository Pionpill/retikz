import type { CoreDependencyProvider, CoreProviderContribution } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { IRPlotSpec, LowerPlotsOptions } from '@retikz/plot';
import type { InputEmbedAdapter, InputScope } from '@retikz/vanilla';

import {
  createPlotProvider as createPlotDependencyProvider,
  createPlotProviderContribution,
  PLOT_NAMESPACE,
  PlotComposite,
} from '@retikz/plot';
import { normalizeScopeWithChildren } from '@retikz/vanilla';

import type { InputPlotEmbed } from '../spec';

import { normalizePlot } from '../normalize/plot';
import { assertPlotVanillaNonEmptyString } from '../shared';

/** 将 Plot 根节点包进可选的面板 Scope */
const wrapPlotPanel = (node: IRPlotSpec, panel: InputPlotEmbed['panel']) => {
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

/** 完整 PlotSpec 的 Vanilla contribution 输入 */
export type PlotContributionInput = Readonly<{
  /** 已完成的 PlotSpec */
  spec: IRPlotSpec;
  /** runtime-only dataset table */
  datasets: ExternalDatasets;
  /** Plot lowering runtime options */
  lowerOptions?: LowerPlotsOptions;
}>;

/** Plot-owned Vanilla contribution 解析结果 */
export type ResolvedPlotContribution = Readonly<{
  /** 已类型化的完整 Plot Source IR */
  spec: IRPlotSpec;
  /** 包含 Plot 所需 Standard Shape 与 `plot.plot` 的完整 provider contribution */
  contribution: CoreProviderContribution;
}>;

/** 创建一个共享 datasets 与 lowering options 的 Plot dependency provider */
export const createPlotProvider = (input: {
  datasets: ExternalDatasets;
  lowerOptions?: LowerPlotsOptions;
}): CoreDependencyProvider => createPlotDependencyProvider(input.datasets, input.lowerOptions);

/** 将完整 PlotSpec 归一为 Plot-owned dependency contribution */
export const resolvePlotContribution = (input: PlotContributionInput): ResolvedPlotContribution => {
  const contribution = createPlotProviderContribution(input.datasets, input.lowerOptions);
  return { spec: input.spec, contribution };
};

/** 将 Plot authoring input 下沉为 Core contribution 的 InputEmbed adapter */
export const PlotInputEmbedAdapter: InputEmbedAdapter<InputPlotEmbed> = {
  kind: PLOT_NAMESPACE,
  lower: (props, context) => {
    assertPlotVanillaNonEmptyString(context.id, 'plot vanilla: embed id must be non-empty');
    const spec = normalizePlot(props.spec);
    const providerDependencies = createPlotProviderContribution(props.datasets, props.lowerOptions);
    const node =
      props.preserveRootIdentity === true ? spec : { ...spec, id: `${context.id}/${spec.id ?? PlotComposite.Plot}` };
    return {
      node: wrapPlotPanel(node, props.panel),
      providerDependencies,
    };
  },
};
