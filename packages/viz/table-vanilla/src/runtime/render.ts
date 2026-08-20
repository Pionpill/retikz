import type { IRTable } from '@retikz/table';

import { compileTable } from '@retikz/table';
import { renderToSvgString } from '@retikz/vanilla';

import type { RenderTable, RenderTableArtifactOptions, RenderTableArtifactResult, RenderTableOptions } from './types';

/** 判断 renderTable 是否请求 artifact sidecar */
const requestsArtifacts = (
  options: RenderTableOptions | RenderTableArtifactOptions,
): options is RenderTableArtifactOptions => options.artifacts === true;

/** 执行 Table schema 校验、lowering、Core compile 与 SVG 输出 */
const renderTableImpl = (
  spec: IRTable,
  options: RenderTableOptions | RenderTableArtifactOptions = {},
): string | RenderTableArtifactResult => {
  const data = options.data ?? {};
  const lowerOptions = options.lowerOptions ?? {};
  const result = compileTable(spec, data, {
    lower: lowerOptions,
    ...(options.theme === undefined ? {} : { theme: options.theme }),
    compile: options.compile,
  });
  const svg = renderToSvgString(result.scene, { output: options.output, animation: options.animation });
  if (!requestsArtifacts(options)) return svg;
  return Object.freeze({ svg, manifest: result.manifest });
};

/** 把单个 Table spec 一次性渲染为 SSR SVG，并可返回 layout manifest */
export const renderTable = renderTableImpl as RenderTable;
