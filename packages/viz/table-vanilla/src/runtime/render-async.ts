import { isPropertyPathEqual } from '@retikz/foundation';
import type { CompositeArtifact } from '@retikz/reconciler';
import type { IRTable, TableCompileArtifact } from '@retikz/table';
import { prepareTableData, TABLE_NAMESPACE, TableComposite } from '@retikz/table';
import { compileToScene, renderToSvg, scene } from '@retikz/vanilla';

import { RetikzTableVanillaError } from '../error';
import { embedTable } from '../spec';
import type { AsyncTableRenderer, TableRenderArtifactResult, TableRenderAsyncCommonOptions } from './types';

/** 只选择本次根Table的实际编译产物 */
const isRootTableArtifact = (artifact: CompositeArtifact): artifact is TableCompileArtifact =>
  artifact.namespace === TABLE_NAMESPACE &&
  artifact.type === TableComposite.Table &&
  isPropertyPathEqual(artifact.occurrence.sourcePath, ['children', 0]) &&
  artifact.occurrence.expansionPath.length === 0;

/** 等待 Table 的数据计算，再同步编译与渲染 */
const renderTableAsyncImpl = async <TSource = never>(
  spec: IRTable,
  options: TableRenderAsyncCommonOptions<TSource> & { artifacts?: boolean } = {},
): Promise<string | TableRenderArtifactResult> => {
  const preparation = await prepareTableData(
    spec,
    {
      dataBindings:
        options.dataBindings ??
        Object.fromEntries(
          Object.entries(options.data ?? {}).map(([name, rows]) => [name, { kind: 'rows' as const, rows }]),
        ),
      dataTransformExecutor: options.dataTransformExecutor,
      signal: options.signal,
    },
    options.lowerOptions,
  );
  const input = embedTable(spec, { preparedData: await preparation.execute(), lowerOptions: options.lowerOptions });
  const result = compileToScene(
    scene({ ...(options.theme === undefined ? {} : { theme: options.theme }), children: [input] }),
    {
      compile: options.compile,
    },
  );
  const svg = renderToSvg(result.scene, { output: options.output, animation: options.animation });
  if (options.artifacts !== true) return svg;

  const artifacts = result.artifacts.filter(isRootTableArtifact);
  if (artifacts.length !== 1)
    throw new RetikzTableVanillaError(`Table expected exactly one root artifact, received ${artifacts.length}`);

  return Object.freeze({ svg, manifest: artifacts[0].value });
};

/** 把单个Table异步准备并渲染为SVG，可返回同次manifest */
export const renderTableAsync = renderTableAsyncImpl as AsyncTableRenderer;
