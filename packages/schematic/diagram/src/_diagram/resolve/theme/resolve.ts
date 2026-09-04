import type { ResolvedTheme } from '@retikz/core';

import { resolveBoxSpacing } from '@retikz/core';

import type { DiagramThemeStyleDefinition } from '../../contract';
import type { IRDiagramTheme } from '../../schemas';
import type { EffectiveDiagramTextAppearance, EffectiveDiagramTheme, EffectiveDiagramThemeFrame } from './types';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import { getDefaultDiagramTheme } from '../../providers';
import { DiagramThemeSchema } from '../../schemas';

const mergeFrame = (
  base: EffectiveDiagramThemeFrame,
  overrides: IRDiagramTheme['frame'],
): EffectiveDiagramThemeFrame => {
  if (overrides === undefined) return base;
  const { padding, ...fields } = overrides;
  return {
    ...base,
    ...fields,
    ...(padding === undefined ? {} : { padding: resolveBoxSpacing(padding, 0) }),
  };
};

const mergeTextAppearance = (
  base: EffectiveDiagramTextAppearance,
  overrides: NonNullable<IRDiagramTheme['presentation']>['title'],
): EffectiveDiagramTextAppearance => {
  if (overrides === undefined) return base;
  return {
    ...base,
    ...overrides,
    font: { ...base.font, ...overrides.font },
  };
};

const mergeDiagramTheme = (base: EffectiveDiagramTheme, overrides: IRDiagramTheme): EffectiveDiagramTheme => ({
  frame: mergeFrame(base.frame, overrides.frame),
  presentation: {
    title: mergeTextAppearance(base.presentation.title, overrides.presentation?.title),
    description: mergeTextAppearance(base.presentation.description, overrides.presentation?.description),
  },
});

/** 按当前位置 Core Theme 解析完整 Diagram Theme */
export const resolveDiagramTheme = (
  theme: ResolvedTheme,
  styles: ReadonlyMap<string, DiagramThemeStyleDefinition>,
  inline?: IRDiagramTheme,
): EffectiveDiagramTheme => {
  let resolved = getDefaultDiagramTheme(theme);
  if (theme.style !== undefined) {
    const definition = styles.get(theme.style);
    if (definition === undefined) {
      throw new RetikzDiagramError({
        code: RetikzDiagramErrorCode.DefinitionNotRegistered,
        message: `Diagram theme style '${theme.style}' is not registered.`,
        details: {
          capability: 'diagram-theme-style',
          key: theme.style,
          availableKeys: [...styles.keys()],
        },
      });
    }
    try {
      resolved = mergeDiagramTheme(resolved, DiagramThemeSchema.parse(definition.resolve(theme)));
    } catch (cause) {
      throw new RetikzDiagramError({
        code: RetikzDiagramErrorCode.DefinitionCallbackFailed,
        message: `Diagram theme style '${theme.style}' resolution failed.`,
        details: { capability: 'diagram-theme-style', key: theme.style },
        cause,
      });
    }
  }
  return inline === undefined ? resolved : mergeDiagramTheme(resolved, inline);
};
