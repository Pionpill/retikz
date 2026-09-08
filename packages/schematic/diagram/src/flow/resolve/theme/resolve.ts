import type { ResolvedTheme } from '@retikz/core';

import { mergeGraphDefaults } from '@retikz/graph';

import type { FlowThemeStyleDefinition } from '../../contract';
import type {
  IRFlowDefaults,
  IRFlowDefaultsGroup,
  IRFlowDefaultsGroupCaptionTitle,
  IRFlowLayoutIntent,
} from '../../schemas';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import { FlowDefaultsSchema } from '../../schemas';

const definedFields = <T extends object>(value: T | undefined): Partial<T> =>
  value === undefined
    ? {}
    : (Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as Partial<T>);

const mergeFields = <T extends object>(base: T | undefined, override: T | undefined): T | undefined => {
  const merged = { ...definedFields(base), ...definedFields(override) };
  return Object.keys(merged).length === 0 ? undefined : (merged as T);
};

/** 合并两层稀疏 Flow 布局意图 */
export const mergeFlowLayoutIntent = (
  base: IRFlowLayoutIntent | undefined,
  override: IRFlowLayoutIntent | undefined,
): IRFlowLayoutIntent => mergeFields(base, override) ?? {};

/** 合并 Entity / Relation 片段并复用 Graph 的正式字段粒度规则 */
const mergeGraphFlowDefaults = (
  base: IRFlowDefaults | undefined,
  override: IRFlowDefaults | undefined,
): Pick<IRFlowDefaults, 'entity' | 'relation'> => {
  const merged = mergeGraphDefaults(
    base === undefined ? undefined : { entity: base.entity, relation: base.relation },
    override === undefined ? undefined : { entity: override.entity, relation: override.relation },
  );
  return {
    ...(merged?.entity === undefined ? {} : { entity: merged.entity }),
    ...(merged?.relation === undefined ? {} : { relation: merged.relation }),
  };
};

/** 合并一个 Flow Group caption title；字体字段在每层整体替换 */
const mergeGroupCaptionTitle = (
  base: IRFlowDefaultsGroupCaptionTitle | undefined,
  override: IRFlowDefaultsGroupCaptionTitle | undefined,
): IRFlowDefaultsGroupCaptionTitle | undefined => {
  const merged = mergeFields(base, override);
  if (merged === undefined) return undefined;
  const { font: _font, ...fields } = merged;
  void _font;
  const definedOverride = definedFields(override?.font);
  const candidateFont = Object.keys(definedOverride).length === 0 ? definedFields(base?.font) : definedOverride;
  const font = Object.keys(candidateFont).length === 0 ? undefined : candidateFont;
  const result = { ...fields, ...(font === undefined ? {} : { font }) };
  return Object.keys(result).length === 0 ? undefined : result;
};

const mergeGroupDefaults = (
  base: IRFlowDefaultsGroup | undefined,
  override: IRFlowDefaultsGroup | undefined,
): IRFlowDefaultsGroup | undefined => {
  if (base === undefined && override === undefined) return undefined;
  const { caption: baseCaption, ...baseSurface } = base ?? {};
  const { caption: overrideCaption, ...overrideSurface } = override ?? {};
  const surface = mergeFields(baseSurface, overrideSurface);
  const title = mergeGroupCaptionTitle(baseCaption?.title, overrideCaption?.title);
  const caption = title === undefined ? undefined : { title };
  return {
    ...(surface === undefined ? {} : surface),
    ...(caption === undefined ? {} : { caption }),
  };
};

/** 按 Source 同构路径合并 Flow defaults */
export const mergeFlowDefaults = (
  base: IRFlowDefaults | undefined,
  override: IRFlowDefaults | undefined,
): IRFlowDefaults => {
  const graph = mergeGraphFlowDefaults(base, override);
  const layout = mergeFields(base?.layout, override?.layout);
  const group = mergeGroupDefaults(base?.group, override?.group);
  return {
    ...(layout === undefined ? {} : { layout }),
    ...(graph.entity === undefined ? {} : { entity: graph.entity }),
    ...(group === undefined ? {} : { group }),
    ...(graph.relation === undefined ? {} : { relation: graph.relation }),
  };
};

const resolveRegisteredDefaults = (
  theme: ResolvedTheme,
  registry: ReadonlyMap<string, FlowThemeStyleDefinition>,
): IRFlowDefaults | undefined => {
  if (theme.style === undefined) return undefined;
  const definition = registry.get(theme.style);
  if (definition === undefined) {
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.DefinitionNotRegistered,
      message: `Flow theme style '${theme.style}' is not registered.`,
      details: { capability: 'flow-theme-style', key: theme.style, availableKeys: [...registry.keys()] },
    });
  }
  try {
    return FlowDefaultsSchema.parse(definition.resolve(theme));
  } catch (cause) {
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.DefinitionCallbackFailed,
      message: `Flow theme style '${theme.style}' resolution failed.`,
      details: { capability: 'flow-theme-style', key: theme.style },
      cause,
    });
  }
};

/** 按同名 Theme Definition 与 Flow Source defaults 解析最终 Flow defaults */
export const resolveFlowTheme = (
  theme: ResolvedTheme,
  styles: ReadonlyMap<string, FlowThemeStyleDefinition>,
  inline?: IRFlowDefaults,
): IRFlowDefaults => {
  const registered = resolveRegisteredDefaults(theme, styles);
  const source = inline === undefined ? undefined : FlowDefaultsSchema.parse(inline);
  return mergeFlowDefaults(registered, source);
};
