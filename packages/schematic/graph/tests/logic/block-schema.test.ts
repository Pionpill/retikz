import type { IRNode } from '@retikz/core';
import { createSurface } from '@retikz/standard/presentation';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

const textChild = (text: string): IRNode => ({ type: 'node', position: [0, 0], text });

describe('Block 系列 Source schema', () => {
  it('保持空的 Block 稀疏，同时接受完整的 Core Scope 曲面', () => {
    const block = Graph.createBlock({
      id: 'service',
      localNamespace: true,
      transforms: [{ kind: 'translate', x: 12, y: 8 }],
      zIndex: 2,
      boundingShape: 'rectangle',
      meta: { domain: 'billing' },
      defaults: {
        node: {
          style: { fill: '#eef2ff' },
        },
        reset: ['path'],
      },
    });

    expect(block).toEqual({
      namespace: 'graph',
      type: 'block',
      id: 'service',
      localNamespace: true,
      transforms: [{ kind: 'translate', x: 12, y: 8 }],
      zIndex: 2,
      boundingShape: 'rectangle',
      meta: { domain: 'billing' },
      defaults: {
        node: {
          style: { fill: '#eef2ff' },
        },
        reset: ['path'],
      },
    });
    expect(block).not.toHaveProperty('gap');
    expect(block).not.toHaveProperty('padding');
    expect(block).not.toHaveProperty('background');
    expect(block).not.toHaveProperty('border');
    expect(block).not.toHaveProperty('cornerRadius');
    expect(block).not.toHaveProperty('overflow');
    expect(block).not.toHaveProperty('width');
    expect(block).not.toHaveProperty('minWidth');
  });

  it('接受任意排序的子级，而不对其角色进行分类', () => {
    const node = textChild('core');
    const group = Graph.createGroup({ children: [textChild('group')] });
    const section = Graph.createBlockSection({ children: [textChild('section')] });

    expect(Graph.createBlock({ children: [node, group, section] })).toEqual({
      namespace: 'graph',
      type: 'block',
      children: [node, group, section],
    });
  });

  it('将 Header、Section 和 Row 创建为独立的 Graph 复合组件', () => {
    expect(
      Graph.createBlockHeader({
        icon: textChild('icon'),
        title: { text: 'Service' },
        description: { text: 'Public API' },
        trail: textChild('stable'),
      }),
    ).toEqual({
      namespace: 'graph',
      type: 'blockHeader',
      icon: textChild('icon'),
      title: { text: 'Service' },
      description: { text: 'Public API' },
      trail: textChild('stable'),
    });

    expect(
      Graph.BlockHeaderSchema.parse({
        namespace: 'graph',
        type: 'blockHeader',
        title: 'Service',
        trail: textChild('stable'),
      }),
    ).toEqual({
      namespace: 'graph',
      type: 'blockHeader',
      title: 'Service',
      trail: textChild('stable'),
    });
    expect(
      Graph.BlockHeaderSchema.safeParse({
        namespace: 'graph',
        type: 'blockHeader',
        title: 'Service',
        trailing: textChild('legacy'),
      }).success,
    ).toBe(false);

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
          textChild('name'),
          createSurface({ namespace: 'standard', type: 'surface', child: textChild('surface') }),
          textChild('string'),
        ],
      }),
    ).toEqual({
      namespace: 'graph',
      type: 'blockRow',
      id: 'name',
      children: [
        textChild('name'),
        createSurface({ namespace: 'standard', type: 'surface', child: textChild('surface') }),
        textChild('string'),
      ],
    });
  });

  it('保持 Row 文本内容稀疏并拒绝第二个内容源', () => {
    expect(Graph.BlockRowSchema.parse({ namespace: 'graph', type: 'blockRow', content: 'name' })).toEqual({
      namespace: 'graph',
      type: 'blockRow',
      position: [0, 0],
      content: 'name',
    });
    expect(Graph.BlockRowSchema.parse({ namespace: 'graph', type: 'blockRow', content: ['name', 'string'] })).toEqual({
      namespace: 'graph',
      type: 'blockRow',
      position: [0, 0],
      content: ['name', 'string'],
    });
    expect(Graph.BlockRowSchema.parse({ namespace: 'graph', type: 'blockRow', content: [] })).toEqual({
      namespace: 'graph',
      type: 'blockRow',
      position: [0, 0],
      content: [],
    });
    expect(
      Graph.BlockRowSchema.safeParse({
        namespace: 'graph',
        type: 'blockRow',
        content: 'name',
        children: [textChild('name')],
      }).success,
    ).toBe(false);
  });

  it('在 JSON 往返过程中保持样式化的 Row 文本项稀疏', () => {
    const content = [
      'name',
      {
        text: 'string',
        textColor: '#64748b',
        font: { size: 14, weight: 'bold' as const },
        opacity: 0.6,
      },
    ];
    const row = Graph.createBlockRow({ content });

    expect(row).toEqual({
      namespace: 'graph',
      type: 'blockRow',
      content,
    });
    expect(Graph.BlockRowSchema.parse(JSON.parse(JSON.stringify(row)))).toEqual({ ...row, position: [0, 0] });
    expect(Graph.createBlockRow({ content: { text: 'single', align: 'end' } })).toEqual({
      namespace: 'graph',
      type: 'blockRow',
      content: { text: 'single', align: 'end' },
    });
  });

  it('拒绝 Row 文本对象中的 Core Node shell 字段', () => {
    expect(
      Graph.BlockRowSchema.safeParse({
        namespace: 'graph',
        type: 'blockRow',
        content: { text: 'name', fill: '#ffffff' },
      }).success,
    ).toBe(false);
  });

  it('接受 Header 和 Section 文本的字符串简写', () => {
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

  it('保持 Header 文本方向稀疏，同时接受两种支持的布局', () => {
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

  it('保持 Header 文本间距稀疏，同时重用封闭的 Flex 主分布值', () => {
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

  it('允许空 Section 和 Row，同时保持 Row 子项直接', () => {
    expect(Graph.BlockSectionSchema.parse({ namespace: 'graph', type: 'blockSection' })).toEqual({
      namespace: 'graph',
      type: 'blockSection',
      position: [0, 0],
    });
    expect(Graph.BlockRowSchema.parse({ namespace: 'graph', type: 'blockRow', children: [] })).toEqual({
      namespace: 'graph',
      type: 'blockRow',
      position: [0, 0],
      children: [],
    });
    expect(
      Graph.BlockRowSchema.parse({
        namespace: 'graph',
        type: 'blockRow',
        children: [textChild('value')],
      }),
    ).toMatchObject({ children: [textChild('value')] });
    expect(
      Graph.BlockRowSchema.safeParse({
        namespace: 'graph',
        type: 'blockRow',
        children: [{ child: textChild('value'), grow: 2 }],
      }).success,
    ).toBe(false);
    expect(Graph.GraphType).not.toHaveProperty('BlockCell');
  });

  it('接受外部宽度约束并保留显式零值', () => {
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

  it('拒绝被取代的固定语法和未知的 Block 系列字段', () => {
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
  });

  it('往返 JSON 安全的 Source 事实并实现 Scope 头寸默认值', () => {
    const sources = [
      Graph.createBlock({ children: [textChild('content')] }),
      Graph.createBlockHeader({ title: { text: 'Header' } }),
      Graph.createBlockSection({ title: { text: 'Section' }, children: [] }),
      Graph.createBlockRow({ children: [textChild('value')] }),
    ];
    const schemas = [Graph.BlockSchema, Graph.BlockHeaderSchema, Graph.BlockSectionSchema, Graph.BlockRowSchema];

    sources.forEach((source, index) => {
      expect(schemas[index]?.parse(JSON.parse(JSON.stringify(source)))).toEqual(
        source.type === 'blockHeader' ? source : { ...source, position: [0, 0] },
      );
    });
  });
});
