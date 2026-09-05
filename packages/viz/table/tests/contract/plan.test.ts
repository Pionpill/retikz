import { ArrowDefaultSchema, FontSchema, LabelDefaultSchema, NodeDefaultSchema, PathDefaultSchema } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { TableCellPlanSource } from '../../src';

import {
  TableCellAppearanceTracePath,
  TableCellAppearanceTracePathSchema,
  TableCellContentStyleSchema,
  TableCellPlanSourceKind,
  TableCellPlanSourceSchema,
} from '../../src';

describe('Table Cell plan lineage contract', () => {
  it('accepts only the currently executed source variants', () => {
    const sources: Array<TableCellPlanSource> = [
      TableCellPlanSourceSchema.parse({ kind: TableCellPlanSourceKind.Default }),
      TableCellPlanSourceSchema.parse({ kind: TableCellPlanSourceKind.Structure }),
      TableCellPlanSourceSchema.parse({
        kind: TableCellPlanSourceKind.StyleToken,
        tokenKey: 'cell.content.color',
        tokenSource: 'local',
        tokenPath: '$default/light/cell.content.color',
      }),
      TableCellPlanSourceSchema.parse({ kind: TableCellPlanSourceKind.Encoding, encodingId: 'status-color' }),
      TableCellPlanSourceSchema.parse({ kind: TableCellPlanSourceKind.RootRule, ruleIndex: 0 }),
    ];
    expect(sources).toEqual([
      { kind: 'default' },
      { kind: 'structure' },
      {
        kind: 'styleToken',
        tokenKey: 'cell.content.color',
        tokenSource: 'local',
        tokenPath: '$default/light/cell.content.color',
      },
      { kind: 'encoding', encodingId: 'status-color' },
      { kind: 'rootRule', ruleIndex: 0 },
    ]);
    expect(() => TableCellPlanSourceSchema.parse({ kind: 'rootRule', ruleIndex: -1 })).toThrow(/ruleIndex/i);
    expect(() => TableCellPlanSourceSchema.parse({ kind: 'encoding', encodingId: '' })).toThrow(/encodingId/i);
    expect(() => TableCellPlanSourceSchema.parse({ kind: 'encoding', encodingIndex: 0 })).toThrow();
    expect(() => TableCellPlanSourceSchema.parse({ kind: 'styleToken' })).toThrow(/tokenKey|tokenSource/i);
    expect(() =>
      TableCellPlanSourceSchema.parse({
        kind: 'styleToken',
        tokenKey: 'data.categorical',
        tokenSource: 'foreign',
      }),
    ).toThrow(/tokenKey/i);
    expect(() =>
      TableCellPlanSourceSchema.parse({
        kind: 'styleToken',
        tokenKey: 'cell.content.color',
        tokenSource: 'inherit',
        tokenPath: '$theme/colors/categorical',
      }),
    ).toThrow(/source|path/i);
    expect(() =>
      TableCellPlanSourceSchema.parse({
        kind: 'styleToken',
        tokenKey: 'cell.content.color',
        tokenSource: 'local',
        tokenPath: '$spec/tableThemeTokens/cell.background.fill',
      }),
    ).toThrow(/source|path/i);
    expect(() => TableCellPlanSourceSchema.parse({ kind: 'default', ruleIndex: 0 })).toThrow();
  });

  it('enumerates only canonical appearance winner leaf paths', () => {
    const paths = [
      TableCellAppearanceTracePath.BackgroundFill,
      TableCellAppearanceTracePath.ContentNodeDefaultFontWeight,
      TableCellAppearanceTracePath.ContentPathDefaultDashPattern,
      TableCellAppearanceTracePath.BorderBottom,
    ].map(path => TableCellAppearanceTracePathSchema.parse(path));
    expect(paths).toEqual([
      '/background/fill',
      '/content/defaults/node/style/font/weight',
      '/content/defaults/path/style/dashPattern',
      '/borders/bottom',
    ]);
    expect(() => TableCellAppearanceTracePathSchema.parse('/background')).toThrow();
    expect(() => TableCellAppearanceTracePathSchema.parse('/content')).toThrow();
    expect(() => TableCellAppearanceTracePathSchema.parse('/content/defaults/node/style/font')).toThrow();
    expect(() => TableCellAppearanceTracePathSchema.parse('/content/unknown')).toThrow();
  });

  it('stays exhaustive with the authoritative appearance and Core default schemas', () => {
    const expected = new Set<string>([
      '/background/fill',
      '/background/fillOpacity',
      '/borders/top',
      '/borders/right',
      '/borders/bottom',
      '/borders/left',
    ]);
    const addLeaves = (prefix: string, fields: Array<string>) => {
      fields.forEach(field => {
        if (field === 'font') {
          Object.keys(FontSchema.shape).forEach(fontField => expected.add(`${prefix}/font/${fontField}`));
        } else {
          expected.add(`${prefix}/${field}`);
        }
      });
    };
    addLeaves('/content/style', Object.keys(TableCellContentStyleSchema.shape.style.unwrap().shape));
    expected.add('/content/defaults/reset');
    for (const [channel, schema] of Object.entries({ node: NodeDefaultSchema, path: PathDefaultSchema })) {
      addLeaves(
        `/content/defaults/${channel}`,
        Object.keys(schema.shape).filter(field => field !== 'style' && field !== 'layout'),
      );
      addLeaves(`/content/defaults/${channel}/style`, Object.keys(schema.shape.style.unwrap().shape));
    }
    addLeaves('/content/defaults/node/layout', Object.keys(NodeDefaultSchema.shape.layout.unwrap().shape));
    addLeaves('/content/defaults/label', Object.keys(LabelDefaultSchema.shape));
    addLeaves('/content/defaults/arrow', Object.keys(ArrowDefaultSchema.shape));

    expect(new Set(Object.values(TableCellAppearanceTracePath))).toEqual(expected);
  });
});
