import type { IRChild } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { IRPlotSpec } from '@retikz/plot';
import type { AnyVanillaTier2Adapter, VanillaChildSpec } from '@retikz/vanilla';

import { PlotSpecSchema } from '@retikz/plot';
import { renderPlot } from '@retikz/plot-vanilla';
import { AxesSchema, FrameSchema, GridSchema } from '@retikz/standard';
import {
  axes,
  AxesVanillaAdapter,
  frame,
  FrameVanillaAdapter,
  grid,
  GridVanillaAdapter,
} from '@retikz/standard-vanilla';
import { figure, renderToSvgString, scope } from '@retikz/vanilla';

import type { PreviewIR } from '../utils/build-preview-ir';
import type { VanillaPreviewArtifact } from './types';

import { formatVanillaValue, irToVanillaCode } from '../utils/ir-to-vanilla-code';

type CompositeChild = IRChild & { namespace: string; type: string };

const isComposite = (child: IRChild): child is CompositeChild => 'namespace' in child;

const collectComposites = (children: ReadonlyArray<IRChild>): Array<CompositeChild> => {
  const composites: Array<CompositeChild> = [];
  const visit = (child: IRChild): void => {
    if (isComposite(child)) {
      composites.push(child);
      return;
    }
    if (child.type === 'scope') child.children.forEach(visit);
  };
  children.forEach(visit);
  return composites;
};

const outputSize = (preview: PreviewIR): { width?: number; height?: number } => ({
  ...(typeof preview.width === 'number' ? { width: preview.width } : {}),
  ...(typeof preview.height === 'number' ? { height: preview.height } : {}),
});

const diagnostic = (message: string): VanillaPreviewArtifact => ({ code: `// ${message}` });

const buildCorePreview = (preview: PreviewIR): VanillaPreviewArtifact => {
  const input = figure({
    ...(preview.ir.viewBox !== undefined ? { viewBox: preview.ir.viewBox } : {}),
    ...(preview.ir.animations !== undefined ? { animations: preview.ir.animations } : {}),
    children: preview.ir.children,
  });
  return {
    code: irToVanillaCode(preview.ir),
    svg: renderToSvgString(input, { output: outputSize(preview) }),
  };
};

type StandardKind = 'grid' | 'axes' | 'frame';

type StandardConversionState = {
  counts: Record<StandardKind, number>;
  adapters: Set<StandardKind>;
};

const nextStandardId = (kind: StandardKind, state: StandardConversionState): string => {
  state.counts[kind] += 1;
  state.adapters.add(kind);
  return `preview-${kind}-${state.counts[kind]}`;
};

const convertStandardChild = (child: IRChild, state: StandardConversionState): VanillaChildSpec => {
  if (isComposite(child)) {
    switch (child.type) {
      case 'grid': {
        const { namespace: _namespace, type: _type, ...input } = GridSchema.parse(child);
        void _namespace;
        void _type;
        return grid(nextStandardId('grid', state), input);
      }
      case 'axes': {
        const { namespace: _namespace, type: _type, ...input } = AxesSchema.parse(child);
        void _namespace;
        void _type;
        return axes(nextStandardId('axes', state), input);
      }
      case 'frame': {
        const { namespace: _namespace, type: _type, id: _id, ...input } = FrameSchema.parse(child);
        void _namespace;
        void _type;
        void _id;
        return frame(nextStandardId('frame', state), input);
      }
      default:
        throw new Error(`Unsupported Standard composite "${child.namespace}.${child.type}".`);
    }
  }
  if (child.type !== 'scope') return child;
  const { children, type: _type, ...config } = child;
  void _type;
  return scope(
    config,
    children.map(nested => convertStandardChild(nested, state)),
  );
};

const standardAdapters = (state: StandardConversionState): ReadonlyArray<AnyVanillaTier2Adapter> => [
  ...(state.adapters.has('grid') ? [GridVanillaAdapter as AnyVanillaTier2Adapter] : []),
  ...(state.adapters.has('axes') ? [AxesVanillaAdapter as AnyVanillaTier2Adapter] : []),
  ...(state.adapters.has('frame') ? [FrameVanillaAdapter as AnyVanillaTier2Adapter] : []),
];

const buildStandardPreview = (preview: PreviewIR): VanillaPreviewArtifact => {
  const state: StandardConversionState = {
    counts: { grid: 0, axes: 0, frame: 0 },
    adapters: new Set(),
  };
  const input = figure({
    ...(preview.ir.viewBox !== undefined ? { viewBox: preview.ir.viewBox } : {}),
    ...(preview.ir.animations !== undefined ? { animations: preview.ir.animations } : {}),
    children: preview.ir.children.map(child => convertStandardChild(child, state)),
  });
  return {
    code: irToVanillaCode(preview.ir),
    svg: renderToSvgString(input, { adapters: standardAdapters(state), output: outputSize(preview) }),
  };
};

const findPlotDataset = (preview: PreviewIR, spec: IRPlotSpec): ExternalDatasets | null => {
  let dataset: unknown;
  let found = false;
  for (const contribution of preview.contributions) {
    if (contribution.namespace !== 'plot' || !Object.hasOwn(contribution.datasets, spec.data.reference)) continue;
    const candidate = contribution.datasets[spec.data.reference];
    if (found && dataset !== candidate) {
      throw new Error(`Plot dataset reference "${spec.data.reference}" resolves to different values.`);
    }
    dataset = candidate;
    found = true;
  }
  return found ? ({ [spec.data.reference]: dataset } as ExternalDatasets) : null;
};

const buildPlotCode = (spec: IRPlotSpec, datasets: ExternalDatasets, preview: PreviewIR): string => {
  const size = outputSize(preview);
  const options = Object.keys(size).length > 0 ? `, ${formatVanillaValue(size)}` : '';
  return `import { renderPlot } from '@retikz/plot-vanilla';\n\nconst spec = ${formatVanillaValue(spec)};\nconst datasets = ${formatVanillaValue(datasets)};\n\nexport const svg = renderPlot(spec, datasets${options});\n`;
};

const buildPlotPreview = (preview: PreviewIR, composite: CompositeChild): VanillaPreviewArtifact => {
  const spec = PlotSpecSchema.parse(composite);
  const datasets = findPlotDataset(preview, spec);
  if (datasets === null) {
    return diagnostic(`Cannot generate Vanilla preview: Plot dataset "${spec.data.reference}" was not captured.`);
  }
  const size = outputSize(preview);
  return {
    code: buildPlotCode(spec, datasets, preview),
    svg: renderPlot(spec, datasets, size),
  };
};

/** 从统一的预览 IR 上下文生成 Core、Standard 或 Plot 的 Vanilla 源码与真实 SVG。 */
export const buildVanillaPreview = (preview: PreviewIR): VanillaPreviewArtifact => {
  const composites = collectComposites(preview.ir.children);
  try {
    if (composites.length === 0) return buildCorePreview(preview);
    const firstComposite = composites[0];
    if (composites.every(child => child.namespace === 'standard')) return buildStandardPreview(preview);
    if (composites.length === 1 && firstComposite.namespace === 'plot' && firstComposite.type === 'plot') {
      return buildPlotPreview(preview, firstComposite);
    }
    const unsupported = composites.find(
      child => child.namespace !== 'standard' && !(child.namespace === 'plot' && child.type === 'plot'),
    );
    const child = unsupported ?? firstComposite;
    return diagnostic(`Cannot generate Vanilla preview for Tier 2 composite "${child.namespace}.${child.type}".`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return diagnostic(`Failed to generate Vanilla preview: ${message}`);
  }
};
