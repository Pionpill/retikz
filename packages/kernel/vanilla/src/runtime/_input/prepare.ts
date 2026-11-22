import { createCompositeInputBindings, resolveCoreProviderDependencies } from '@retikz/core';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import type {
  InputAuthoringSite,
  InputEmbedContribution,
  InputEmbedPreparation,
  InputEmbedSite,
  InputLayer,
  InputScene,
} from '../../normalize';
import { createInputSceneTraversal, isInputScene, BuiltinLayerName, normalizeSceneLayer } from '../../normalize';
import { createDefaultTextMeasurer } from './text';
import type { AsyncProcessingOptions, InputPreparedProcessing, ProcessingOptions, ProcessingSource } from './types';

/** 单图入口的默认层；显式层必须已经过视口分派 */
const implicitLayer = (source: InputScene): InputLayer => {
  if (source.children === undefined)
    throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Expected a single scene, received a layer stack');
  return { type: 'layer', name: BuiltinLayerName.Main, children: source.children };
};

const EMPTY_AUTHORING_SITES: ReadonlyArray<InputAuthoringSite> = Object.freeze([]);

/** 绑定归一结果的实例输入、Core 定义与文字测量器，供同步和异步入口共用 */
const prepareNormalizedInput = (
  normalized: ReturnType<typeof normalizeSceneLayer>,
  compile: ProcessingOptions['compile'],
): InputPreparedProcessing => {
  const definitions = resolveCoreProviderDependencies({
    contributions: normalized.contributions,
    definitions: compile,
  });
  return {
    source: normalized.ir,
    coreOptions: {
      ...compile,
      ...definitions,
      ...(normalized.runtimeInputs === undefined
        ? {}
        : {
            compositeInputs: createCompositeInputBindings(normalized.ir, normalized.runtimeInputs),
          }),
      measureText: compile?.measureText ?? createDefaultTextMeasurer(),
    },
    authoringSites: normalized.authoringSites,
  };
};

/** 将 typed InputScene 或已类型化 IRScene 准备为 processing 的唯一 Core 输入 */
export const prepareProcessingInput = (
  source: ProcessingSource,
  options: ProcessingOptions,
  layer?: InputLayer,
): InputPreparedProcessing => {
  if (isInputScene(source)) {
    const normalized = normalizeSceneLayer(source, layer ?? implicitLayer(source));
    return prepareNormalizedInput(normalized, options.compile);
  }

  return {
    source,
    coreOptions:
      options.compile?.measureText !== undefined
        ? options.compile
        : {
            ...options.compile,
            measureText: createDefaultTextMeasurer(),
          },
    authoringSites: EMPTY_AUTHORING_SITES,
  };
};

/** 在任意等待与同步提交边界检查当前请求是否仍有效 */
export const assertPreparationActive = (signal: AbortSignal): void => {
  if (signal.aborted)
    throw new RetikzVanillaError(
      RetikzVanillaErrorCode.Processing,
      'Authoring preparation is cancelled or invalidated',
      { cause: signal.reason },
    );
};

/** 领域中立的完整作者树准备；嵌套位置通过同一 context 登记 */
const prepareAuthoringContributions = async (
  sites: ReadonlyArray<InputEmbedSite>,
  signal: AbortSignal,
): Promise<() => Promise<Array<InputEmbedContribution>>> => {
  let phase: 'preparing' | 'executing' = 'preparing';

  const prepareSites = async (
    embedSites: ReadonlyArray<InputEmbedSite>,
  ): Promise<() => Promise<Array<InputEmbedContribution>>> => {
    const preparations: Array<{ site: InputEmbedSite; preparation: InputEmbedPreparation }> = [];

    for (const site of embedSites) {
      assertPreparationActive(signal);
      const adapter = site.input.adapter;
      if (adapter.prepare === undefined)
        throw new RetikzVanillaError(
          RetikzVanillaErrorCode.Processing,
          `Embed "${site.context.id}" at ${site.sourcePath} has no prepare adapter`,
        );

      let acceptingChildren = true;
      const children: Array<Promise<unknown>> = [];

      try {
        const preparation = await adapter.prepare(site.input.props as never, {
          ...site.context,
          signal,
          prepareChildren: nested => {
            if (!acceptingChildren || phase !== 'preparing')
              throw new RetikzVanillaError(
                RetikzVanillaErrorCode.Processing,
                'prepareChildren is only available while preparing the authoring tree',
              );

            const traversal = site.children(nested);
            const pending = prepareSites(traversal.sites).then(execute => ({
              execute: async () => {
                if (phase !== 'executing')
                  throw new RetikzVanillaError(
                    RetikzVanillaErrorCode.Processing,
                    'Cannot execute children during preparation',
                  );

                const contributions = await execute();
                assertPreparationActive(signal);

                return traversal.normalize(contributions);
              },
            }));
            children.push(pending);

            // 父级可以暂不 await；立即接住拒绝，最终仍由本次准备统一传播失败
            void pending.catch(() => undefined);

            return pending;
          },
        });
        acceptingChildren = false;

        for (const pending of children) await pending;
        assertPreparationActive(signal);
        preparations.push({ site, preparation });
      } catch (cause) {
        acceptingChildren = false;
        throw new RetikzVanillaError(
          RetikzVanillaErrorCode.Processing,
          `Embed "${site.context.id}" preparation failed at ${site.sourcePath}${cause instanceof Error ? `: ${cause.message}` : ''}`,
          { cause },
        );
      }
    }

    let consumed = false;

    return async () => {
      if (consumed)
        throw new RetikzVanillaError(
          RetikzVanillaErrorCode.Processing,
          'Authoring preparation execute can only run once',
        );

      consumed = true;
      assertPreparationActive(signal);
      const contributions: Array<InputEmbedContribution> = [];

      for (const { site, preparation } of preparations) {
        assertPreparationActive(signal);

        try {
          const contribution = await preparation.execute();
          assertPreparationActive(signal);
          contributions.push(contribution);
        } catch (cause) {
          throw new RetikzVanillaError(
            RetikzVanillaErrorCode.Processing,
            `Embed "${site.context.id}" execution failed at ${site.sourcePath}${cause instanceof Error ? `: ${cause.message}` : ''}`,
            { cause },
          );
        }
      }

      return contributions;
    };
  };

  const execute = await prepareSites(sites);

  return () => {
    phase = 'executing';
    return execute();
  };
};

/** 等待完整作者贡献后进入同一同步 normalizer 与 provider graph resolver */
export const prepareProcessingInputAsync = async (
  source: ProcessingSource,
  options: AsyncProcessingOptions,
  signal: AbortSignal,
  layer?: InputLayer,
): Promise<InputPreparedProcessing> => {
  assertPreparationActive(signal);
  if (!isInputScene(source)) return prepareProcessingInput(source, options);

  const traversal = createInputSceneTraversal(source, layer ?? implicitLayer(source));
  const execute = await prepareAuthoringContributions(traversal.sites, signal);
  assertPreparationActive(signal);
  const contributions = await execute();
  assertPreparationActive(signal);
  const normalized = traversal.normalize(contributions);

  return prepareNormalizedInput(normalized, options.compile);
};
