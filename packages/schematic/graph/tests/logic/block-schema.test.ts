import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

const textChild = (text: string) => ({ type: 'node' as const, position: [0, 0] as const, text });

describe('Block-family Source schemas', () => {
  it('keeps an empty Block sparse while accepting the complete Core Scope surface', () => {
    const block = Graph.createBlock({
      id: 'service',
      localNamespace: true,
      transforms: [{ kind: 'translate', x: 12, y: 8 }],
      nodeDefault: { fill: '#eef2ff' },
      resetStyle: ['path'],
      zIndex: 2,
      boundingShape: 'rectangle',
      meta: { domain: 'billing' },
    });

    expect(block).toEqual({
      namespace: 'graph',
      type: 'block',
      id: 'service',
      localNamespace: true,
      transforms: [{ kind: 'translate', x: 12, y: 8 }],
      nodeDefault: { fill: '#eef2ff' },
      resetStyle: ['path'],
      zIndex: 2,
      boundingShape: 'rectangle',
      meta: { domain: 'billing' },
    });
    expect(block).not.toHaveProperty('gap');
    expect(block).not.toHaveProperty('padding');
    expect(block).not.toHaveProperty('background');
    expect(block).not.toHaveProperty('border');
    expect(block).not.toHaveProperty('cornerRadius');
    expect(block).not.toHaveProperty('overflow');
  });

  it('accepts arbitrary ordered children without classifying their roles', () => {
    const node = textChild('core');
    const group = Graph.createGroup({ children: [textChild('group')] });
    const section = Graph.createBlockSection({ children: [textChild('section')] });

    expect(Graph.createBlock({ children: [node, group, section] })).toEqual({
      namespace: 'graph',
      type: 'block',
      children: [node, group, section],
    });
  });

  it('creates Header, Section and Row as independent Graph composites', () => {
    expect(
      Graph.createBlockHeader({
        icon: textChild('icon'),
        title: { text: 'Service' },
        description: { text: 'Public API' },
        trailing: textChild('stable'),
      }),
    ).toEqual({
      namespace: 'graph',
      type: 'blockHeader',
      icon: textChild('icon'),
      title: { text: 'Service' },
      description: { text: 'Public API' },
      trailing: textChild('stable'),
    });

    expect(
      Graph.createBlockSection({
        id: 'fields',
        localNamespace: false,
        title: { text: 'Fields' },
        children: [textChild('name')],
      }),
    ).toEqual({
      namespace: 'graph',
      type: 'blockSection',
      id: 'fields',
      localNamespace: false,
      title: { text: 'Fields' },
      children: [textChild('name')],
    });

    expect(
      Graph.createBlockRow({
        id: 'name',
        children: [
          { key: 'field', child: textChild('name'), grow: 1 },
          { key: 'type', child: textChild('string'), alignSelf: 'end' },
        ],
      }),
    ).toEqual({
      namespace: 'graph',
      type: 'blockRow',
      id: 'name',
      children: [
        {
          key: 'field',
          child: textChild('name'),
          grow: 1,
        },
        {
          key: 'type',
          child: textChild('string'),
          alignSelf: 'end',
        },
      ],
    });
  });

  it('accepts string shorthand for Header and Section text', () => {
    expect(
      Graph.createBlockHeader({
        title: 'Service',
        description: 'Public API',
      }),
    ).toEqual({
      namespace: 'graph',
      type: 'blockHeader',
      title: 'Service',
      description: 'Public API',
    });
    expect(Graph.createBlockSection({ title: 'Fields' })).toEqual({
      namespace: 'graph',
      type: 'blockSection',
      title: 'Fields',
    });
  });

  it('keeps Header text direction sparse while accepting both supported layouts', () => {
    expect(Graph.createBlockHeader({ title: { text: 'Default' } })).toEqual({
      namespace: 'graph',
      type: 'blockHeader',
      title: { text: 'Default' },
    });
    expect(Graph.createBlockHeader({ title: { text: 'Horizontal' }, direction: 'horizontal' })).toEqual({
      namespace: 'graph',
      type: 'blockHeader',
      title: { text: 'Horizontal' },
      direction: 'horizontal',
    });
    expect(Graph.createBlockHeader({ title: { text: 'Vertical' }, direction: 'vertical' })).toEqual({
      namespace: 'graph',
      type: 'blockHeader',
      title: { text: 'Vertical' },
      direction: 'vertical',
    });
    expect(
      Graph.BlockHeaderSchema.safeParse({
        namespace: 'graph',
        type: 'blockHeader',
        title: { text: 'Invalid' },
        direction: 'diagonal',
      }).success,
    ).toBe(false);
  });

  it('keeps Header text spacing sparse while reusing the closed Flex main-distribution values', () => {
    expect(Graph.createBlockHeader({ title: { text: 'Default' } })).toEqual({
      namespace: 'graph',
      type: 'blockHeader',
      title: { text: 'Default' },
    });
    for (const justifyContent of ['start', 'center', 'end', 'space-between', 'space-around', 'space-evenly'] as const) {
      expect(
        Graph.createBlockHeader({
          title: { text: 'Title' },
          description: { text: 'Description' },
          itemGap: 0,
          justifyContent,
        }),
      ).toMatchObject({ itemGap: 0, justifyContent });
    }
    expect(
      Graph.BlockHeaderSchema.safeParse({
        namespace: 'graph',
        type: 'blockHeader',
        title: { text: 'Invalid gap' },
        itemGap: -1,
      }).success,
    ).toBe(false);
    expect(
      Graph.BlockHeaderSchema.safeParse({
        namespace: 'graph',
        type: 'blockHeader',
        title: { text: 'Invalid distribution' },
        justifyContent: 'stretch',
      }).success,
    ).toBe(false);
  });

  it('allows empty Section and Row while keeping Cell local to Row', () => {
    expect(Graph.BlockSectionSchema.parse({ namespace: 'graph', type: 'blockSection' })).toEqual({
      namespace: 'graph',
      type: 'blockSection',
    });
    expect(Graph.BlockRowSchema.parse({ namespace: 'graph', type: 'blockRow', children: [] })).toEqual({
      namespace: 'graph',
      type: 'blockRow',
      children: [],
    });
    expect(Graph.BlockCellSchema.parse({ key: 'cell', child: textChild('value'), basis: 24 })).toEqual({
      key: 'cell',
      child: textChild('value'),
      basis: 24,
    });
    expect(Graph.BlockCellSchema.parse({ key: 'default', child: textChild('value') })).toEqual({
      key: 'default',
      child: textChild('value'),
    });
    expect(Graph.BlockCellSchema.parse({ child: textChild('value') })).toEqual({
      child: textChild('value'),
    });
    expect(
      Graph.BlockCellSchema.parse({
        key: 'explicit',
        child: textChild('value'),
        basis: 'content',
        grow: 0,
        shrink: 0,
      }),
    ).toEqual({
      key: 'explicit',
      child: textChild('value'),
      basis: 'content',
      grow: 0,
      shrink: 0,
    });
    expect(Graph.GraphType).not.toHaveProperty('BlockCell');
  });

  it('accepts outer width constraints and preserves explicit zero values', () => {
    expect(
      Graph.BlockSchema.parse({
        namespace: 'graph',
        type: 'block',
        width: 180,
        minWidth: 0,
        gap: 0,
        padding: 0,
        cornerRadius: 0,
      }),
    ).toMatchObject({ width: 180, minWidth: 0, gap: 0, padding: 0, cornerRadius: 0 });

    expect(Graph.BlockSchema.safeParse({ namespace: 'graph', type: 'block', width: 120, minWidth: 180 }).success).toBe(
      false,
    );
  });

  it('reuses Flex item validation and rejects duplicate or invalid Cell contracts', () => {
    const invalidRange = Graph.BlockCellSchema.safeParse({
      key: 'cell',
      child: textChild('value'),
      min: 20,
      max: 10,
    });
    expect(invalidRange.success).toBe(false);
    if (!invalidRange.success) expect(invalidRange.error.issues[0]?.path).toEqual(['max']);

    expect(
      Graph.BlockRowSchema.safeParse({
        namespace: 'graph',
        type: 'blockRow',
        children: [
          { key: 'duplicate', child: textChild('one') },
          { key: 'duplicate', child: textChild('two') },
        ],
      }).success,
    ).toBe(false);
  });

  it('rejects the superseded fixed grammar and unknown Block-family fields', () => {
    expect(
      Graph.BlockSchema.safeParse({
        namespace: 'graph',
        type: 'block',
        header: { title: { text: 'Legacy' } },
      }).success,
    ).toBe(false);
    expect(
      Graph.BlockSectionSchema.safeParse({
        namespace: 'graph',
        type: 'blockSection',
        rows: [],
      }).success,
    ).toBe(false);
    expect(
      Graph.BlockRowSchema.safeParse({
        namespace: 'graph',
        type: 'blockRow',
        cells: [],
      }).success,
    ).toBe(false);

    expect(
      Graph.BlockHeaderSchema.safeParse({
        namespace: 'graph',
        type: 'blockHeader',
        title: { text: 'Header' },
        unknown: true,
      }).success,
    ).toBe(false);
    expect(Graph.BlockCellSchema.safeParse({ key: 'cell', child: textChild('value'), unknown: true }).success).toBe(
      false,
    );
  });

  it('round-trips only sparse JSON-safe Source facts', () => {
    const sources = [
      Graph.createBlock({ children: [textChild('content')] }),
      Graph.createBlockHeader({ title: { text: 'Header' } }),
      Graph.createBlockSection({ title: { text: 'Section' }, children: [] }),
      Graph.createBlockRow({ children: [{ key: 'cell', child: textChild('value') }] }),
    ];
    const schemas = [Graph.BlockSchema, Graph.BlockHeaderSchema, Graph.BlockSectionSchema, Graph.BlockRowSchema];

    sources.forEach((source, index) => {
      expect(schemas[index]?.parse(JSON.parse(JSON.stringify(source)))).toEqual(source);
    });
  });
});
