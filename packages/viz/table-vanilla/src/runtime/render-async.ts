import type { CompileArtifact } from '@retikz/core';
import type { IRTable, TableCompileArtifact } from '@retikz/table';
import { TABLE_NAMESPACE, TableComposite } from '@retikz/table';
import { processToStaticInputResultAsync, renderToSvgString, scene } from '@retikz/vanilla';

import { TableInputEmbedAdapter } from '../adapter';
import { RetikzTableVanillaError } from '../error';
import { embedTable } from '../spec';
import type { RenderTableAsync, RenderTableAsyncCommonOptions, RenderTableArtifactResult } from './types';

/** 只选择本次根Table的实际编译产物 */
const isRootTableArtifact = (artifact: CompileArtifact): artifact is TableCompileArtifact =>
  artifact.kind === 'composite' &&
  artifact.namespace === TABLE_NAMESPACE &&
  artifact.type === TableComposite.Table &&
  artifact.occurrence.sourcePath === 'children[0]' &&
  artifact.occurrence.expansionPath.length === 0;

/** 共享Vanilla准备、编译和提交，不建立Table私有异步状态机 */
const renderTableAsyncImpl = async <TSource = never>(
  spec: IRTable,
  options: RenderTableAsyncCommonOptions<TSource> & { artifacts?: boolean } = {},
): Promise<string | RenderTableArtifactResult> => {
  const input = embedTable(spec, {
    data: options.data,
    dataBindings: options.dataBindings,
    dataTransformExecutor: options.dataTransformExecutor,
    lowerOptions: options.lowerOptions,
    signal: options.signal,
  });
  const result = await processToStaticInputResultAsync(
    scene({ ...(options.theme === undefined ? {} : { theme: options.theme }), children: [input] }),
    {
      adapters: [TableInputEmbedAdapter],
      signal: options.signal,
      compile: options.compile,
    },
  );
  const svg = renderToSvgString(result.scene, { output: options.output, animation: options.animation });
  if (options.artifacts !== true) return svg;
  const artifacts = result.compileResult.artifacts.filter(isRootTableArtifact);
  if (artifacts.length !== 1)
    throw new RetikzTableVanillaError(`Table expected exactly one root artifact, received ${artifacts.length}`);
  return Object.freeze({ svg, manifest: artifacts[0].value });
};

/** 把单个Table异步准备并渲染为SVG，可返回同次manifest */
export const renderTableAsync = renderTableAsyncImpl as RenderTableAsync;
