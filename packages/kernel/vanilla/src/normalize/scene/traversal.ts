import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import type {
  AnyInputEmbed,
  EmbedChildrenNormalizationResult,
  InputEmbedContext,
  InputEmbedContribution,
} from '../element';
import { normalizeEmbeddedChildren } from './children';
import type { ReusedEmbedIdentity, SceneNormalizeContext } from './context';
import {
  childSourcePath,
  embedSlotSourcePath,
  inputEmbedIdentityOf,
  isInputEmbed,
  isInputScope,
  readIdentity,
  scopeContextOf,
} from './context';
import { normalizeSceneLayer } from './normalize';
import type { InputChild, InputLayer, InputNormalizeOptions, InputScene, SceneNormalizationResult } from './types';

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
  normalize: (contributions: ReadonlyArray<InputEmbedContribution>) => SceneNormalizationResult;
}>;

/** adapter contribution 到达后按固定作者位置消费，不能在归一化时发现新计算 */
const completedAdaptersOf = (
  sites: ReadonlyArray<InputEmbedSite>,
  contributions: ReadonlyArray<InputEmbedContribution>,
): NonNullable<InputNormalizeOptions['adapters']> => {
  const kinds = [...new Set(sites.map(site => site.input.kind))];
  return kinds.map(kind => {
    const positions = sites.flatMap((site, index) =>
      site.input.kind === kind ? [{ site, contribution: contributions[index] }] : [],
    );
    let index = 0;

    return {
      kind,
      lower: (props, context) => {
        const position = positions[index++];
        if (
          position.site.input.props !== props ||
          position.site.context.id !== context.id ||
          JSON.stringify(position.site.context.identityPath) !== JSON.stringify(context.identityPath)
        )
          throw new RetikzVanillaError(
            RetikzVanillaErrorCode.Normalize,
            'Prepared contribution does not match its authoring position',
          );

        return position.contribution;
      },
    };
  });
};

/** 沿唯一作者分派规则读取实际嵌入位置；opaque props 的子项由 adapter 明确登记 */
const collectChildEmbedSites = (
  children: ReadonlyArray<InputChild>,
  ctx: SceneNormalizeContext,
  offset = 0,
): Array<InputEmbedSite> => {
  const sites: Array<InputEmbedSite> = [];

  for (const [index, input] of children.entries()) {
    const context = { ...ctx, sourcePath: childSourcePath(ctx, offset + index) };
    if (isInputEmbed(input)) {
      const id = inputEmbedIdentityOf(input, context);
      const location: Omit<InputEmbedContext, 'normalizeChildren'> = {
        id,
        kind: input.kind,
        layerId: ctx.layerId,
        identityPath: [...ctx.path, id],
        ...(ctx.embedThemeContext === undefined
          ? {}
          : { theme: ctx.embedThemeContext.theme, themeDefinitions: ctx.embedThemeContext.themeDefinitions }),
      };

      let slotIndex = 0;
      const reusedEmbedIdentity: ReusedEmbedIdentity = { id, used: false };
      sites.push({
        input,
        context: location,
        sourcePath: context.sourcePath,
        children: nested => {
          const nestedContext = {
            ...context,
            parentId: id,
            path: [...ctx.path, id],
            sourcePath: embedSlotSourcePath(context.sourcePath, slotIndex++),
          };
          const nestedSites = collectChildEmbedSites(nested, nestedContext);

          return {
            sites: nestedSites,
            normalize: contributions =>
              normalizeEmbeddedChildren(
                nested,
                {
                  ...nestedContext,
                  adapters: completedAdaptersOf(nestedSites, contributions),
                },
                reusedEmbedIdentity,
              ),
          };
        },
      });
    } else if (isInputScope(input)) {
      const nested = scopeContextOf(input, readIdentity(input), context);
      sites.push(...collectChildEmbedSites(input.children, nested));
    }
  }

  return sites;
};

/** 准备阶段与同步归一化共用的作者分层上下文 */
export const createInputSceneTraversal = (
  scene: InputScene,
  layer: InputLayer,
  options: InputNormalizeOptions = {},
): InputSceneTraversal => {
  const context: SceneNormalizeContext = {
    layerId: layer.name,
    parentId: layer.name,
    path: [layer.name],
    adapters: options.adapters,
    embedThemeContext: options.embedThemeContext?.root,
    resolveEmbedScopeTheme: options.embedThemeContext?.resolveScope,
    contributions: [],
    identityIndex: new Map(),
    parentIndex: new Map(),
    identityFrame: '',
    sourcePath: '',
    runtimePath: [],
    runtimeInputs: [],
    authoringSites: [],
  };
  const sites = collectChildEmbedSites(layer.children, context);
  return {
    sites,
    normalize: contributions =>
      normalizeSceneLayer(scene, layer, { ...options, adapters: completedAdaptersOf(sites, contributions) }),
  };
};
