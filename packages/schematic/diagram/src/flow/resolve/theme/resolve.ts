import type { ResolvedTheme } from '@retikz/core';

import { strictObject } from 'zod';

import type { FlowThemeStyleDefinition } from '../../contract';
import type {
  IRFlowEntityStyle,
  IRFlowGroupStyle,
  IRFlowLayoutIntent,
  IRFlowRelationStyle,
  IRFlowTextStyle,
  IRFlowTheme,
  IRFlowThemeTokenOverrides,
} from '../../schemas';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import { FlowThemeTokenOverridesSchema } from '../../schemas';
import { FlowRoutingKind } from '../../shared';

const FlowThemeStyleResolutionSchema = strictObject({
  tokens: FlowThemeTokenOverridesSchema.optional(),
});

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

const setNestedValue = (target: Record<string, unknown>, path: ReadonlyArray<string>, value: unknown): void => {
  let current = target;
  path.forEach((segment, index) => {
    if (index === path.length - 1) {
      current[segment] = value;
      return;
    }
    const child = current[segment];
    if (isPlainRecord(child)) {
      current = child;
      return;
    }
    const created: Record<string, unknown> = {};
    current[segment] = created;
    current = created;
  });
};

const tokenPath = (key: keyof IRFlowThemeTokenOverrides): ReadonlyArray<string> => {
  const segments = key.split('.');
  const owner = segments[1];
  const rest = segments.slice(2);
  if (owner === 'layout' || owner === 'routing') {
    return owner === 'layout' ? ['layout', ...rest] : ['layout', 'routing', ...rest];
  }
  if (owner === 'entity') {
    return ['entity', rest[0] === 'minimumSize' || rest[0] === 'margin' ? 'layout' : 'style', ...rest];
  }
  if (owner === 'group') return ['group', 'style', ...rest];
  if (owner === 'relation') {
    return rest[0] === 'routing' ? ['relation', 'layout', ...rest] : ['relation', 'style', ...rest];
  }
  return segments;
};

/** 把已校验扁平 token 投影为同字段边界的结构化 Flow Theme */
export const projectFlowThemeTokens = (tokens: IRFlowThemeTokenOverrides | undefined): IRFlowTheme => {
  if (tokens === undefined) return {};
  const projected: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(tokens)) {
    setNestedValue(projected, tokenPath(key as keyof IRFlowThemeTokenOverrides), value);
  }
  if (tokens['flow.routing.cornerRadius'] !== undefined && tokens['flow.routing.kind'] === undefined) {
    setNestedValue(projected, ['layout', 'routing', 'kind'], FlowRoutingKind.Orthogonal);
  }
  if (
    tokens['flow.relation.routing.cornerRadius'] !== undefined &&
    tokens['flow.relation.routing.kind'] === undefined
  ) {
    setNestedValue(projected, ['relation', 'layout', 'routing', 'kind'], FlowRoutingKind.Orthogonal);
  }
  return projected;
};

const mergeTextStyle = (
  base: IRFlowTextStyle | undefined,
  override: IRFlowTextStyle | undefined,
): IRFlowTextStyle | undefined =>
  base === undefined && override === undefined
    ? undefined
    : { ...base, ...override, font: { ...base?.font, ...override?.font } };

const mergeEntityStyle = (
  base: IRFlowEntityStyle | undefined,
  override: IRFlowEntityStyle | undefined,
): IRFlowEntityStyle | undefined =>
  base === undefined && override === undefined
    ? undefined
    : { ...base, ...override, font: { ...base?.font, ...override?.font } };

const mergeGroupStyle = (
  base: IRFlowGroupStyle | undefined,
  override: IRFlowGroupStyle | undefined,
): IRFlowGroupStyle | undefined =>
  base === undefined && override === undefined
    ? undefined
    : { ...base, ...override, label: mergeTextStyle(base?.label, override?.label) };

const mergeRelationStyle = (
  base: IRFlowRelationStyle | undefined,
  override: IRFlowRelationStyle | undefined,
): IRFlowRelationStyle | undefined =>
  base === undefined && override === undefined
    ? undefined
    : {
        ...base,
        ...override,
        sourceMarker: { ...base?.sourceMarker, ...override?.sourceMarker },
        targetMarker: { ...base?.targetMarker, ...override?.targetMarker },
        labelFont: { ...base?.labelFont, ...override?.labelFont },
      };

/** 合并两个稀疏 Flow layout intent */
export const mergeFlowLayoutIntent = (
  base: IRFlowLayoutIntent | undefined,
  override: IRFlowLayoutIntent | undefined,
): IRFlowLayoutIntent => {
  const routing = (() => {
    if (override?.routing === undefined) return base?.routing;
    if (override.routing.kind === 'straight') return override.routing;
    return base?.routing?.kind === 'orthogonal' ? { ...base.routing, ...override.routing } : override.routing;
  })();
  return { ...base, ...override, ...(routing === undefined ? {} : { routing }) };
};

/** 按稀疏字段和命名子对象合并 Flow Theme */
export const mergeFlowTheme = (base: IRFlowTheme, override: IRFlowTheme | undefined): IRFlowTheme => {
  if (override === undefined) return base;
  return {
    ...(base.layout === undefined && override.layout === undefined
      ? {}
      : { layout: mergeFlowLayoutIntent(base.layout, override.layout) }),
    ...(base.entity === undefined && override.entity === undefined
      ? {}
      : {
          entity: {
            style: mergeEntityStyle(base.entity?.style, override.entity?.style),
            layout: { ...base.entity?.layout, ...override.entity?.layout },
          },
        }),
    ...(base.group === undefined && override.group === undefined
      ? {}
      : { group: { style: mergeGroupStyle(base.group?.style, override.group?.style) } }),
    ...(base.relation === undefined && override.relation === undefined
      ? {}
      : {
          relation: {
            style: mergeRelationStyle(base.relation?.style, override.relation?.style),
            layout: mergeFlowLayoutIntent(base.relation?.layout, override.relation?.layout),
          },
        }),
  };
};

/** 按 Neutral、同名 Definition、Source tokens 与结构化配置解析 Flow Theme */
export const resolveFlowTheme = (
  theme: ResolvedTheme,
  styles: ReadonlyMap<string, FlowThemeStyleDefinition>,
  sourceTokens?: IRFlowThemeTokenOverrides,
  inline?: IRFlowTheme,
): IRFlowTheme => {
  let resolved: IRFlowTheme = {};
  if (theme.style !== undefined) {
    const definition = styles.get(theme.style);
    if (definition === undefined) {
      throw new RetikzDiagramError({
        code: RetikzDiagramErrorCode.DefinitionNotRegistered,
        message: `Flow theme style '${theme.style}' is not registered.`,
        details: {
          capability: 'flow-theme-style',
          key: theme.style,
          availableKeys: [...styles.keys()],
        },
      });
    }
    try {
      const resolution = FlowThemeStyleResolutionSchema.parse(definition.resolve(theme));
      resolved = mergeFlowTheme(resolved, projectFlowThemeTokens(resolution.tokens));
    } catch (cause) {
      throw new RetikzDiagramError({
        code: RetikzDiagramErrorCode.DefinitionCallbackFailed,
        message: `Flow theme style '${theme.style}' resolution failed.`,
        details: { capability: 'flow-theme-style', key: theme.style },
        cause,
      });
    }
  }
  resolved = mergeFlowTheme(resolved, projectFlowThemeTokens(sourceTokens));
  return mergeFlowTheme(resolved, inline);
};
