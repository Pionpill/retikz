import type {
  AnyInputEmbed,
  EmbedChildrenNormalizationResult,
  InputEmbedContext,
  InputEmbedContribution,
} from '../element';
import { normalizeEmbeddedChildren } from './children';
import type { SceneNormalizeContext } from './context';
import { childSourcePath, embedSlotSourcePath, inputEmbedIdentityOf, scopeContextOf } from './context';
import { normalizeSceneLayer } from './normalize';
import type { InputChild, InputLayer, InputScene, NormalizedScene } from './types';

/** 准备 traversal 只描述作者位置，不执行 adapter 或构造占位贡献 */
export type InputEmbedSite = Readonly<{
  /** 当前作者位置的原始嵌入声明 */
  input: AnyInputEmbed;
  /** 用于准备该嵌入的身份、分层及主题上下文 */
  context: Omit<InputEmbedContext, 'normalizeChildren'>;
  /** 该嵌入在最终 Source 结构中的诊断路径 */
  sourcePath: string;
  /** 为当前嵌入的子内容创建独立遍历入口 */
  children: (children: ReadonlyArray<InputChild>) => InputChildrenTraversal;
}>;

/** 子项完整贡献就绪后，复用同步 normalizer */
type InputChildrenTraversal = Readonly<{
  /** 按归一化遍历顺序收集的待准备嵌入位置 */
  sites: ReadonlyArray<InputEmbedSite>;
  /** 将与 sites 顺序对应的已完成贡献交给同步归一化流程 */
  normalize: (contributions: ReadonlyArray<InputEmbedContribution>) => EmbedChildrenNormalizationResult;
}>;

/** 根 traversal 与唯一 Source 归一化的衔接 */
type InputSceneTraversal = Readonly<{
  /** 整张场景按归一化遍历顺序收集的嵌入位置 */
  sites: ReadonlyArray<InputEmbedSite>;
  /** 将与 sites 顺序对应的已完成贡献组装为唯一场景 Source */
  normalize: (contributions: ReadonlyArray<InputEmbedContribution>) => NormalizedScene;
}>;

/** adapter contribution 到达后按固定作者位置消费，不能在归一化时发现新计算 */
const preparedContributionsOf = (
  contributions: ReadonlyArray<InputEmbedContribution>,
): NonNullable<SceneNormalizeContext['prepared']> => {
  let index = 0;
  return () => contributions[index++];
};

/** 沿唯一作者分派规则读取实际嵌入位置；opaque props 的子项由 adapter 明确登记 */
const collectChildEmbedSites = (
  children: ReadonlyArray<InputChild>,
  ctx: SceneNormalizeContext,
  sites: Array<InputEmbedSite> = [],
): Array<InputEmbedSite> => {
  for (const [index, input] of children.entries()) {
    if ('namespace' in input || (input.type !== 'scope' && input.type !== 'embed')) continue;
    const context = { ...ctx, sourcePath: childSourcePath(ctx, index) };
    if (input.type === 'embed') {
      const id = inputEmbedIdentityOf(input, context);
      const identityPath = [...ctx.path, id];
      const location: Omit<InputEmbedContext, 'normalizeChildren'> = {
        id,
        kind: input.adapter.kind,
        layerId: ctx.layerId,
        identityPath,
      };

      let slotIndex = 0;
      sites.push({
        input,
        context: location,
        sourcePath: context.sourcePath,
        children: nested => {
          const nestedContext = {
            ...context,
            path: identityPath,
            sourcePath: embedSlotSourcePath(context.sourcePath, slotIndex++),
          };
          const nestedSites = collectChildEmbedSites(nested, nestedContext);

          return {
            sites: nestedSites,
            normalize: contributions =>
              normalizeEmbeddedChildren(nested, {
                ...nestedContext,
                prepared: preparedContributionsOf(contributions),
              }),
          };
        },
      });
    } else {
      const nested = scopeContextOf(input, context);
      collectChildEmbedSites(input.children, nested, sites);
    }
  }

  return sites;
};

/** 准备阶段与同步归一化共用的作者分层上下文 */
export const createInputSceneTraversal = (scene: InputScene, layer: InputLayer): InputSceneTraversal => {
  const context: SceneNormalizeContext = {
    layerId: layer.name,
    path: [layer.name],
    contributions: [],
    sourcePath: '',
    runtimePath: [],
    runtimeInputs: [],
    authoringSites: [],
  };
  const sites = collectChildEmbedSites(layer.children, context);
  return {
    sites,
    normalize: contributions => normalizeSceneLayer(scene, layer, preparedContributionsOf(contributions)),
  };
};
