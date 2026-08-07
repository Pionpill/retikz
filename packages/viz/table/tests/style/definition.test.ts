import type { ThemeTokenDefinition } from '@retikz/core';

import { resolveThemeTokenRegistry } from '@retikz/core';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IRTableThemeTokenOverrides, TableThemeTokenMap } from '../../src';

import {
  defineTableThemeTokens,
  TableThemeTokenDefinition,
  TableThemeTokenKeySchema,
  TableThemeTokenMapSchema,
  TableThemeTokenOverridesSchema,
} from '../../src';

const completeTokens = {
  'cell.background.fill': '#ffffff',
  'cell.background.fillOpacity': 1,
  'cell.content.color': '#111111',
  'cell.content.font.family': 'sans-serif',
  'cell.content.font.weight': 400,
  'columnHeader.background.fill': '#f5f5f5',
  'columnHeader.background.fillOpacity': 1,
  'columnHeader.content.color': '#222222',
  'columnHeader.content.font.family': 'sans-serif',
  'columnHeader.content.font.weight': 600,
  'table.border.top': null,
  'table.border.right': null,
  'table.border.bottom': null,
  'table.border.left': null,
  'table.border.horizontal': { kind: 'line', stroke: '#dddddd', width: 1 },
  'table.border.vertical': null,
  'columnHeader.border.bottom': { kind: 'line', stroke: '#cccccc', width: 1 },
  'data.categorical': ['#ff0000', '#ff0000'],
  'data.sequential': ['#ffffff', '#000000'],
} as const;

describe('Table theme token definition', () => {
  it('exports one frozen table namespace definition and a JSON-safe contribution helper', () => {
    expect(TableThemeTokenDefinition.namespace).toBe('table');
    expect(Object.isFrozen(TableThemeTokenDefinition)).toBe(true);
    expect(TableThemeTokenDefinition.schema).toBe(TableThemeTokenOverridesSchema);

    const source = { 'cell.content.color': '#334155' };
    const contribution = defineTableThemeTokens(source);
    expect(contribution).toEqual({ namespace: 'table', tokens: source });
    expect(contribution.tokens).not.toBe(source);
    expect(Object.isFrozen(contribution)).toBe(true);
    expect(Object.isFrozen(contribution.tokens)).toBe(true);
    expectTypeOf(contribution.tokens).toEqualTypeOf<IRTableThemeTokenOverrides>();
  });

  it('validates strict token values and permits repeated categorical colors', () => {
    const parsed = TableThemeTokenMapSchema.parse(completeTokens);
    expectTypeOf(parsed).toEqualTypeOf<TableThemeTokenMap>();
    expect(TableThemeTokenKeySchema.options).toHaveLength(19);
    expect(TableThemeTokenOverridesSchema.parse({ 'data.categorical': ['#fff', '#fff'] })).toEqual({
      'data.categorical': ['#fff', '#fff'],
    });
    expect(() => TableThemeTokenOverridesSchema.parse({ unknown: '#fff' })).toThrow(/unknown.*table.*token/i);
    expect(() => TableThemeTokenOverridesSchema.parse({ 'data.categorical': [] })).toThrow(/non-empty/i);
    expect(() => TableThemeTokenOverridesSchema.parse({ 'cell.content.color': undefined })).toThrow();
  });

  it('uses definition identity for registry deduplication and rejects another table definition', () => {
    expect(resolveThemeTokenRegistry([TableThemeTokenDefinition, TableThemeTokenDefinition]).get('table')).toBe(
      TableThemeTokenDefinition,
    );

    const conflicting = Object.freeze({
      namespace: 'table',
      schema: TableThemeTokenOverridesSchema,
    }) as ThemeTokenDefinition<'table', IRTableThemeTokenOverrides>;

    expect(() => resolveThemeTokenRegistry([TableThemeTokenDefinition, conflicting])).toThrow(/table.*conflict/i);
  });
});
