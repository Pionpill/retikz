import { RetikzVanillaError, RetikzVanillaErrorCode } from '../error';
import type { AnyInputEmbedAdapter, InputEmbedContribution, InputEmbedPreparation } from '../normalize';
import type { InputEmbedSite } from '../normalize/scene';

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
export const prepareAuthoringContributions = async (
  sites: ReadonlyArray<InputEmbedSite>,
  adapters: ReadonlyArray<AnyInputEmbedAdapter & Required<Pick<AnyInputEmbedAdapter, 'prepare'>>>,
  signal: AbortSignal,
): Promise<() => Promise<Array<InputEmbedContribution>>> => {
  const registry = new Map<string, AnyInputEmbedAdapter & Required<Pick<AnyInputEmbedAdapter, 'prepare'>>>();
  for (const adapter of adapters) {
    if (registry.has(adapter.kind))
      throw new RetikzVanillaError(
        RetikzVanillaErrorCode.Processing,
        `Duplicate input embed adapter kind "${adapter.kind}"`,
      );
    registry.set(adapter.kind, adapter);
  }
  let phase: 'preparing' | 'executing' = 'preparing';
  const prepareSites = async (
    positions: ReadonlyArray<InputEmbedSite>,
  ): Promise<() => Promise<Array<InputEmbedContribution>>> => {
    const preparations: Array<{ site: InputEmbedSite; preparation: InputEmbedPreparation }> = [];
    for (const site of positions) {
      assertPreparationActive(signal);
      const adapter = registry.get(site.input.kind);
      if (adapter?.prepare === undefined)
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
