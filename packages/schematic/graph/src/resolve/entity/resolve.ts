import type { IRNode } from '@retikz/core';

import { ThemeMode } from '@retikz/core';

import type { IREntity } from '../../schemas';
import type { IRGraphEntityThemeTokenRule, IRGraphThemeTokenOverrides } from '../../schemas';
import type { CanonicalEntityPresentation, EntityPresentationResolveContext } from './types';

import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';
import { EntityVariant } from '../../providers';
import { GraphEntityAppearanceTokenOverridesSchema, GraphThemeToken } from '../../schemas';
import { resolveGraphTheme } from '../theme';

const availableKeys = (registry: ReadonlyMap<string, unknown>): string => [...registry.keys()].join(', ');

const requiredDefinition = <T>(registry: ReadonlyMap<string, T>, key: string, capability: string): T => {
  const definition = registry.get(key);
  if (definition === undefined) {
    const keys = [...registry.keys()];
    throw new RetikzGraphError({
      code: RetikzGraphErrorCode.DefinitionNotRegistered,
      message: `${capability} '${key}' is not registered. Available keys: ${availableKeys(registry)}.`,
      details: { capability, key, availableKeys: keys },
    });
  }
  return definition;
};

const selectorIncludes = (selector: string | ReadonlyArray<string> | undefined, key: string): boolean =>
  selector === undefined || (typeof selector === 'string' ? selector === key : selector.includes(key));

const matchesRule = (rule: IRGraphEntityThemeTokenRule, role: string, variant: string): boolean =>
  selectorIncludes(rule.select.role, role) && selectorIncludes(rule.select.variant, variant);

const selectorKeys = (selector: string | ReadonlyArray<string> | undefined): ReadonlyArray<string> =>
  selector === undefined ? [] : typeof selector === 'string' ? [selector] : selector;

const validateRules = (
  rules: ReadonlyArray<IRGraphEntityThemeTokenRule>,
  context: EntityPresentationResolveContext,
): void => {
  for (const rule of rules) {
    for (const role of selectorKeys(rule.select.role)) {
      requiredDefinition(context.entityRoles, role, 'Graph Entity selector role');
    }
    for (const variant of selectorKeys(rule.select.variant)) {
      requiredDefinition(context.entityVariants, variant, 'Graph Entity selector variant');
    }
  }
};

const matchingTokens = (
  rules: ReadonlyArray<IRGraphEntityThemeTokenRule>,
  role: string,
  variant: string,
): IRGraphThemeTokenOverrides =>
  rules.reduce<IRGraphThemeTokenOverrides>(
    (tokens, rule) => (matchesRule(rule, role, variant) ? { ...tokens, ...rule.tokens } : tokens),
    {},
  );

const materializePrimaryColor = (color: string, mode: 'light' | 'dark'): string =>
  color === 'currentColor' ? (mode === ThemeMode.Light ? '#000000' : '#ffffff') : color;

const materializePaint = <TPaint>(paint: TPaint, color: string): TPaint | string =>
  paint === 'currentColor' ? color : paint;

/** 把 Source Entity 与当前位置 registry / Theme 确定为唯一 Node presentation */
export const resolveEntityPresentation = (
  source: IREntity,
  context: EntityPresentationResolveContext,
): CanonicalEntityPresentation => {
  const roleDefinition = requiredDefinition(context.entityRoles, source.role, 'Entity role');
  const variant = source.variant ?? context.inheritedVariant ?? EntityVariant.Default;
  const variantDefinition = requiredDefinition(context.entityVariants, variant, 'Entity variant');
  const graphTheme = resolveGraphTheme(context.theme, context.graphThemeStyles);
  validateRules(graphTheme.tokenRules, context);
  for (const layer of context.tokenLayers ?? []) validateRules(layer.tokenRules ?? [], context);
  const styleRuleTokens = matchingTokens(graphTheme.tokenRules, source.role, variant);
  const localTokens = (context.tokenLayers ?? []).reduce<IRGraphThemeTokenOverrides>((tokens, layer) => {
    const selected = matchingTokens(layer.tokenRules ?? [], source.role, variant);
    return { ...tokens, ...layer.tokens, ...selected };
  }, {});
  const authoredColor = source.color;
  const selectedColor =
    authoredColor ??
    localTokens[GraphThemeToken.EntityColor] ??
    styleRuleTokens[GraphThemeToken.EntityColor] ??
    graphTheme.tokens[GraphThemeToken.EntityColor];
  const color = materializePrimaryColor(selectedColor, context.theme.mode);
  let variantTokens: ReturnType<typeof GraphEntityAppearanceTokenOverridesSchema.parse>;
  try {
    variantTokens = GraphEntityAppearanceTokenOverridesSchema.parse(
      variantDefinition.resolve({ theme: context.theme, color }),
    );
  } catch (cause) {
    throw new RetikzGraphError({
      code: RetikzGraphErrorCode.DefinitionCallbackFailed,
      message: `Entity variant '${variant}' resolution failed.`,
      details: { capability: 'entity-variant', key: variant },
      cause,
    });
  }
  const tokens = { ...graphTheme.tokens, ...variantTokens, ...styleRuleTokens, ...localTokens };
  const {
    namespace: _namespace,
    type: _type,
    role: _role,
    variant: _variant,
    shape,
    minimumSize,
    padding,
    boundary,
    zIndex,
    color: _color,
    textColor,
    fill,
    stroke,
    strokeWidth,
    fillOpacity,
    strokeOpacity,
    opacity,
    ...nodeBase
  } = source;
  void _namespace;
  void _type;
  void _role;
  void _variant;
  void _color;
  const node: IRNode = {
    type: 'node',
    ...nodeBase,
    ...(minimumSize === undefined && roleDefinition.minimumSize === undefined
      ? {}
      : { minimumSize: minimumSize ?? roleDefinition.minimumSize }),
    shape: shape ?? roleDefinition.shape,
    padding: padding ?? roleDefinition.padding,
    boundary: boundary ?? 'shape',
    zIndex: zIndex ?? 0,
    color,
    textColor: textColor ?? materializePaint(tokens[GraphThemeToken.EntityTextForeground], color),
    fill: fill ?? materializePaint(tokens[GraphThemeToken.EntityFill], color),
    stroke: stroke ?? materializePaint(tokens[GraphThemeToken.EntityStroke], color),
    strokeWidth: strokeWidth ?? tokens[GraphThemeToken.EntityStrokeWidth],
    fillOpacity: fillOpacity ?? tokens[GraphThemeToken.EntityFillOpacity],
    strokeOpacity: strokeOpacity ?? tokens[GraphThemeToken.EntityStrokeOpacity],
    opacity: opacity ?? tokens[GraphThemeToken.EntityOpacity],
  };
  return { source, role: source.role, variant, node };
};

/** 把确定的 Entity presentation 下沉为 Core Node */
export const lowerEntityPresentation = (presentation: CanonicalEntityPresentation): IRNode => presentation.node;
