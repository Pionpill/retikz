import { compositeOpaqueColor, ThemeMode } from '@retikz/core';

import type { EntityRoleDefinition, EntityVariantDefinition } from '../../contract';

import { defineEntityRole, defineEntityVariant } from '../../contract';
import { GraphThemeToken } from '../../schemas';
import { EntityRole, EntityVariant } from './constants';

/** terminal role 的内置几何定义 */
export const TerminalEntityRoleDefinition = defineEntityRole({
  role: EntityRole.Terminal,
  shape: { type: 'rectangle', params: { cornerRadius: 1_000_000 } },
  padding: { x: 12, y: 6 },
  minimumSize: { width: 48, height: 24 },
});

/** stage role 的内置几何定义 */
export const StageEntityRoleDefinition = defineEntityRole({
  role: EntityRole.Stage,
  shape: { type: 'rectangle', params: { cornerRadius: 8 } },
  padding: 8,
});

/** decision role 的内置几何定义 */
export const DecisionEntityRoleDefinition = defineEntityRole({
  role: EntityRole.Decision,
  shape: { type: 'diamond', params: { aspectRatio: 1.8 } },
  padding: { x: 3, y: 2 },
});

/** junction role 的内置几何定义 */
export const JunctionEntityRoleDefinition = defineEntityRole({
  role: EntityRole.Junction,
  shape: 'circle',
  padding: 0,
  minimumSize: { width: 8, height: 8 },
});

const tintedColor = (color: string, mode: 'light' | 'dark', weight: number): string =>
  compositeOpaqueColor(color, mode === ThemeMode.Light ? '#ffffff' : '#000000', weight);

/** default variant 的内置外观 recipe */
export const DefaultEntityVariantDefinition = defineEntityVariant({
  variant: EntityVariant.Default,
  resolve: ({ color }) => ({
    [GraphThemeToken.EntityTextForeground]: 'contrast',
    [GraphThemeToken.EntityStroke]: color,
    [GraphThemeToken.EntityFill]: 'none',
  }),
});

/** fill variant 的内置外观 recipe */
export const FillEntityVariantDefinition = defineEntityVariant({
  variant: EntityVariant.Fill,
  resolve: ({ color }) => ({
    [GraphThemeToken.EntityTextForeground]: 'contrast',
    [GraphThemeToken.EntityStroke]: 'none',
    [GraphThemeToken.EntityFill]: color,
  }),
});

/** mixed variant 的内置外观 recipe */
export const MixedEntityVariantDefinition = defineEntityVariant({
  variant: EntityVariant.Mixed,
  resolve: ({ color, theme }) => ({
    [GraphThemeToken.EntityTextForeground]: 'contrast',
    [GraphThemeToken.EntityStroke]: color,
    [GraphThemeToken.EntityFill]: tintedColor(color, theme.mode, 0.15),
  }),
});

/** Graph 内置 Entity role definitions */
export const BUILTIN_ENTITY_ROLE_DEFINITIONS: ReadonlyArray<EntityRoleDefinition> = Object.freeze([
  TerminalEntityRoleDefinition,
  StageEntityRoleDefinition,
  DecisionEntityRoleDefinition,
  JunctionEntityRoleDefinition,
]);

/** Graph 内置 Entity variant definitions */
export const BUILTIN_ENTITY_VARIANT_DEFINITIONS: ReadonlyArray<EntityVariantDefinition> = Object.freeze([
  DefaultEntityVariantDefinition,
  FillEntityVariantDefinition,
  MixedEntityVariantDefinition,
]);
