import { ArrowDefaultSchema, FontSchema, LabelDefaultSchema, NodeDefaultSchema, PathDefaultSchema } from '@retikz/core';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { TableCellAppearanceTracePathValue, TableCellPlanSource } from '../../src';

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
      TableCellPlanSourceSchema.parse({ kind: TableCellPlanSourceKind.RootRule, ruleIndex: 0 }),
    ];

    expectTypeOf(sources).toEqualTypeOf<Array<TableCellPlanSource>>();
    expect(sources).toEqual([{ kind: 'default' }, { kind: 'structure' }, { kind: 'rootRule', ruleIndex: 0 }]);
    expect(() => TableCellPlanSourceSchema.parse({ kind: 'rootRule', ruleIndex: -1 })).toThrow(/ruleIndex/i);
    expect(() => TableCellPlanSourceSchema.parse({ kind: 'encoding', encodingIndex: 0 })).toThrow();
    expect(() => TableCellPlanSourceSchema.parse({ kind: 'styleToken' })).toThrow();
    expect(() => TableCellPlanSourceSchema.parse({ kind: 'default', ruleIndex: 0 })).toThrow();
  });

  it('enumerates only canonical appearance winner leaf paths', () => {
    const paths = [
      TableCellAppearanceTracePath.BackgroundFill,
      TableCellAppearanceTracePath.ContentNodeDefaultFontWeight,
      TableCellAppearanceTracePath.ContentPathDefaultDashPattern,
      TableCellAppearanceTracePath.BorderBottom,
    ].map(path => TableCellAppearanceTracePathSchema.parse(path));

    expectTypeOf(paths[0]).toEqualTypeOf<TableCellAppearanceTracePathValue>();
    expect(paths).toEqual([
      '/background/fill',
      '/content/nodeDefault/font/weight',
      '/content/pathDefault/dashPattern',
      '/borders/bottom',
    ]);
    expect(() => TableCellAppearanceTracePathSchema.parse('/background')).toThrow();
    expect(() => TableCellAppearanceTracePathSchema.parse('/content')).toThrow();
    expect(() => TableCellAppearanceTracePathSchema.parse('/content/nodeDefault/font')).toThrow();
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
    const defaultSchemas = {
      nodeDefault: NodeDefaultSchema,
      pathDefault: PathDefaultSchema,
      labelDefault: LabelDefaultSchema,
      arrowDefault: ArrowDefaultSchema,
    } as const;
    Object.keys(TableCellContentStyleSchema.shape).forEach(contentField => {
      if (!(contentField in defaultSchemas)) {
        expected.add(`/content/${contentField}`);
        return;
      }
      const defaultSchema = defaultSchemas[contentField as keyof typeof defaultSchemas];
      Object.keys(defaultSchema.shape).forEach(field => {
        if (field === 'font' && (contentField === 'nodeDefault' || contentField === 'labelDefault')) {
          Object.keys(FontSchema.shape).forEach(fontField => {
            expected.add(`/content/${contentField}/font/${fontField}`);
          });
        } else {
          expected.add(`/content/${contentField}/${field}`);
        }
      });
    });

    expect(new Set(Object.values(TableCellAppearanceTracePath))).toEqual(expected);
  });
});
