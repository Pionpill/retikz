import type { ThemeTokenContribution, ThemeTokenDefinition } from '@retikz/core';

import { defineThemeTokenContribution, defineThemeTokenNamespace } from '@retikz/core';

import type { IRTableThemeTokenOverrides } from '../schemas';

import { TableThemeTokenOverridesSchema } from '../schemas';

/** Table owner 的 canonical theme token namespace definition */
export const TableThemeTokenDefinition: ThemeTokenDefinition<'table', IRTableThemeTokenOverrides> =
  defineThemeTokenNamespace<'table', IRTableThemeTokenOverrides>({
    namespace: 'table',
    schema: TableThemeTokenOverridesSchema,
  });

/** 创建脱离输入、经过 Table owner schema 校验的 theme token contribution */
export const defineTableThemeTokens = (
  overrides: IRTableThemeTokenOverrides,
): ThemeTokenContribution<'table', IRTableThemeTokenOverrides> =>
  defineThemeTokenContribution({
    namespace: 'table',
    tokens: TableThemeTokenDefinition.schema.parse(overrides),
  });
