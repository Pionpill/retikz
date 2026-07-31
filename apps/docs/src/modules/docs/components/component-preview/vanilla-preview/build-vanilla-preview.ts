import type { IRChild } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { IRPlotSpec } from '@retikz/plot';
import type { IRTableSpec } from '@retikz/table';
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
import { TableSpecSchema, TableStructureKind } from '@retikz/table';
import { createTableAdapter, embedTable } from '@retikz/table-vanilla';
import { figure, renderToSvgString, scope } from '@retikz/vanilla';

import type { PreviewIR } from '../utils/build-preview-ir';
import type { BuildVanillaPreviewOptions, VanillaPreviewArtifact } from './types';

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

const findTableDatasets = (preview: PreviewIR, spec: IRTableSpec): ExternalDatasets | null => {
  if (spec.data === undefined) return {};
  let dataset: unknown;
  let found = false;
  for (const contribution of preview.contributions) {
    if (contribution.namespace !== 'table' || !Object.hasOwn(contribution.datasets, spec.data.reference)) continue;
    const candidate = contribution.datasets[spec.data.reference];
    if (found && dataset !== candidate) {
      throw new Error(`Table dataset reference "${spec.data.reference}" resolves to different values.`);
    }
    dataset = candidate;
    found = true;
  }
  return found ? ({ [spec.data.reference]: dataset } as ExternalDatasets) : null;
};

type DatasetImportCode = {
  imports: string;
  expression: string;
};

const identifierPattern = /^[A-Za-z_$][\w$]*$/;

const buildDatasetImportCode = (
  datasets: ExternalDatasets,
  options: BuildVanillaPreviewOptions,
): DatasetImportCode | null => {
  const references = Object.keys(datasets);
  if (references.length === 0) return { imports: '', expression: '{}' };
  const bindings = references.map(reference => options.datasetImports?.[reference]);
  if (bindings.some(binding => binding === undefined)) return null;

  const importsBySource = new Map<string, Array<string>>();
  bindings.forEach(binding => {
    if (binding === undefined) return;
    if (!identifierPattern.test(binding.name)) {
      throw new Error(`Dataset import name "${binding.name}" is not a supported identifier.`);
    }
    const names = importsBySource.get(binding.from) ?? [];
    if (!names.includes(binding.name)) names.push(binding.name);
    importsBySource.set(binding.from, names);
  });
  const imports = Array.from(
    importsBySource,
    ([from, names]) => `import { ${names.join(', ')} } from ${formatVanillaValue(from)};`,
  ).join('\n');
  const expression = `{ ${references
    .map((reference, index) => {
      const key = identifierPattern.test(reference) ? reference : formatVanillaValue(reference);
      return `${key}: ${bindings[index]?.name ?? 'undefined'}`;
    })
    .join(', ')} }`;
  return { imports, expression };
};

const buildTableCode = (
  spec: IRTableSpec,
  datasets: ExternalDatasets,
  preview: PreviewIR,
  options: BuildVanillaPreviewOptions,
): string => {
  const hasDatasets = Object.keys(datasets).length > 0;
  const datasetImport = hasDatasets ? buildDatasetImportCode(datasets, options) : null;
  const importCode = datasetImport === null || datasetImport.imports.length === 0 ? '' : `${datasetImport.imports}\n`;
  const dataCode = hasDatasets && datasetImport === null ? `const datasets = ${formatVanillaValue(datasets)};\n\n` : '';
  const dataExpression = datasetImport?.expression ?? 'datasets';
  const embedOptions = hasDatasets ? `, { data: ${dataExpression} }` : '';
  const childrenCode = `[embedTable('preview-table-1', spec${embedOptions})]`;
  const figureCode = formatVanillaValue({
    ...(preview.ir.viewBox !== undefined ? { viewBox: preview.ir.viewBox } : {}),
    ...(preview.ir.animations !== undefined ? { animations: preview.ir.animations } : {}),
    children: '__CHILDREN__',
  }).replace("'__CHILDREN__'", childrenCode);
  const size = outputSize(preview);
  const renderOptions = {
    adapters: '__ADAPTERS__',
    ...(Object.keys(size).length > 0 ? { output: size } : {}),
  };
  const optionsCode = formatVanillaValue(renderOptions).replace("'__ADAPTERS__'", '[createTableAdapter()]');
  return `import { createTableAdapter, embedTable } from '@retikz/table-vanilla';\nimport { figure, renderToSvgString } from '@retikz/vanilla';\n${importCode}\nconst spec = ${formatVanillaValue(spec)};\n${dataCode}const input = figure(${figureCode});\n\nexport const svg = renderToSvgString(input, ${optionsCode});\n`;
};

const buildTablePreview = (
  preview: PreviewIR,
  composite: CompositeChild,
  options: BuildVanillaPreviewOptions,
): VanillaPreviewArtifact => {
  const spec = TableSpecSchema.parse(composite);
  if (spec.structure.kind !== TableStructureKind.Detail && spec.structure.kind !== TableStructureKind.Manual) {
    return diagnostic(
      `Cannot generate Vanilla preview: Table structure "${spec.structure.kind}" requires runtime definitions that cannot be serialized.`,
    );
  }
  const datasets = findTableDatasets(preview, spec);
  if (datasets === null && spec.data !== undefined) {
    return diagnostic(`Cannot generate Vanilla preview: Table dataset "${spec.data.reference}" was not captured.`);
  }
  const resolvedDatasets = datasets ?? {};
  const input = figure({
    ...(preview.ir.viewBox !== undefined ? { viewBox: preview.ir.viewBox } : {}),
    ...(preview.ir.animations !== undefined ? { animations: preview.ir.animations } : {}),
    children: [
      embedTable('preview-table-1', spec, Object.keys(resolvedDatasets).length > 0 ? { data: resolvedDatasets } : {}),
    ],
  });
  return {
    code: buildTableCode(spec, resolvedDatasets, preview, options),
    svg: renderToSvgString(input, { adapters: [createTableAdapter()], output: outputSize(preview) }),
    replacePreviewRender: false,
  };
};

/** 从统一的预览 IR 上下文生成 Core、Standard、Plot 或 Table 的 Vanilla 源码与真实 SVG。 */
export const buildVanillaPreview = (
  preview: PreviewIR,
  options: BuildVanillaPreviewOptions = {},
): VanillaPreviewArtifact => {
  const composites = collectComposites(preview.ir.children);
  try {
    if (composites.length === 0) return buildCorePreview(preview);
    const firstComposite = composites[0];
    if (composites.every(child => child.namespace === 'standard')) return buildStandardPreview(preview);
    if (composites.length === 1 && firstComposite.namespace === 'plot' && firstComposite.type === 'plot') {
      return buildPlotPreview(preview, firstComposite);
    }
    if (composites.length === 1 && firstComposite.namespace === 'table' && firstComposite.type === 'table') {
      return buildTablePreview(preview, firstComposite, options);
    }
    const unsupported = composites.find(
      child =>
        child.namespace !== 'standard' &&
        !(child.namespace === 'plot' && child.type === 'plot') &&
        !(child.namespace === 'table' && child.type === 'table'),
    );
    const child = unsupported ?? firstComposite;
    return diagnostic(`Cannot generate Vanilla preview for Tier 2 composite "${child.namespace}.${child.type}".`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return diagnostic(`Failed to generate Vanilla preview: ${message}`);
  }
};
