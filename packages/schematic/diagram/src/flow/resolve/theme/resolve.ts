import type { CanonicalTheme } from '@retikz/core';
import { mergeProperties } from '@retikz/foundation';
import { mergeGraphDefaults } from '@retikz/graph';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import type { FlowThemeDefinition } from '../../contract';
import type {
  IRFlowDefaults,
  IRFlowDefaultsGroup,
  IRFlowDefaultsGroupCaptionText,
  IRFlowLayoutIntent,
} from '../../schemas';

const mergeFields = <T extends object>(base: T | undefined, override: T | undefined): T | undefined => {
  const merged = mergeProperties<Partial<T>>([base, override], { shouldOverride: value => value !== undefined });
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
    ...(merged?.relation === undefined && base?.relation === undefined && override?.relation === undefined
      ? {}
      : {
          relation: {
            ...merged?.relation,
            source: mergeFields(base?.relation?.source, override?.relation?.source),
            target: mergeFields(base?.relation?.target, override?.relation?.target),
          },
        }),
  };
};

/** 合并一个 Group caption 文本格式片段；字体字段在每层整体替换 */
const mergeGroupCaptionText = (
  base: IRFlowDefaultsGroupCaptionText | undefined,
  override: IRFlowDefaultsGroupCaptionText | undefined,
): IRFlowDefaultsGroupCaptionText | undefined => {
  const merged = mergeFields(base, override);
  if (merged === undefined) return undefined;

  const { font: _font, ...fields } = merged;
  void _font;
  const definedOverride = mergeProperties([override?.font], { shouldOverride: value => value !== undefined });
  const candidateFont =
    Object.keys(definedOverride).length === 0
      ? mergeProperties([base?.font], { shouldOverride: value => value !== undefined })
      : definedOverride;
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
  const { title: baseTitle, description: baseDescription, ...baseArrangement } = baseCaption ?? {};
  const { title: overrideTitle, description: overrideDescription, ...overrideArrangement } = overrideCaption ?? {};
  const title = mergeGroupCaptionText(baseTitle, overrideTitle);
  const description = mergeGroupCaptionText(baseDescription, overrideDescription);
  const caption =
    baseCaption === undefined && overrideCaption === undefined
      ? undefined
      : {
          ...mergeFields(baseArrangement, overrideArrangement),
          ...(title === undefined ? {} : { title }),
          ...(description === undefined ? {} : { description }),
        };

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
  theme: CanonicalTheme,
  registry: ReadonlyMap<string, FlowThemeDefinition>,
): IRFlowDefaults | undefined => {
  if (theme.name === undefined) return undefined;

  const definition = registry.get(theme.name);
  if (definition === undefined) {
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.DefinitionNotRegistered,
      message: `Flow theme '${theme.name}' is not registered.`,
      details: { capability: 'flow-theme', key: theme.name, availableKeys: [...registry.keys()] },
    });
  }

  try {
    return structuredClone(definition.resolve(theme));
  } catch (cause) {
    throw new RetikzDiagramError({
      code: RetikzDiagramErrorCode.DefinitionCallbackFailed,
      message: `Flow theme '${theme.name}' resolution failed.`,
      details: { capability: 'flow-theme', key: theme.name },
      cause,
    });
  }
};

/** 按同名 Theme Definition 与 Flow Source defaults 解析最终 Flow defaults */
export const resolveFlowTheme = (
  theme: CanonicalTheme,
  styles: ReadonlyMap<string, FlowThemeDefinition>,
  inline?: IRFlowDefaults,
): IRFlowDefaults => {
  const registered = resolveRegisteredDefaults(theme, styles);
  const source = inline;
  return mergeFlowDefaults(registered, source);
};
