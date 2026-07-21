import type { IRTableSpec } from '@retikz/table';

import { compileToScene } from '@retikz/core';
import { lowerTables, lowerTableWithArtifacts, TableSpecSchema } from '@retikz/table';
import { renderToSvgString } from '@retikz/vanilla';

import type { RenderTable, RenderTableArtifactOptions, RenderTableArtifactResult, RenderTableOptions } from './types';

/** 判断 renderTable 是否请求 artifact sidecar */
const requestsArtifacts = (
  options: RenderTableOptions | RenderTableArtifactOptions,
): options is RenderTableArtifactOptions => options.artifacts === true;

/** 执行 Table schema 校验、lowering、Core compile 与 SVG 输出 */
const renderTableImpl = (
  spec: IRTableSpec,
  options: RenderTableOptions | RenderTableArtifactOptions = {},
): string | RenderTableArtifactResult => {
  const parsed = TableSpecSchema.parse(spec);
  const data = options.data ?? {};
  const lowerOptions = options.lowerOptions ?? {};
  const scene = compileToScene(
    { version: 1, type: 'scene', children: [parsed] },
    { composites: [...lowerTables(data, lowerOptions), ...(options.composites ?? [])] },
  );
  const svg = renderToSvgString(scene, { output: options.output });
  if (!requestsArtifacts(options)) return svg;
  const manifest = lowerTableWithArtifacts(parsed, data, lowerOptions).manifest;
  return Object.freeze({ svg, manifest });
};

/** 把单个 Table spec 一次性渲染为 SSR SVG，并可返回 layout manifest */
export const renderTable = renderTableImpl as RenderTable;
