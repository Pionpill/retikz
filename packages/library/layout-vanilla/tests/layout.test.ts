import {
  createGridLayout,
  flexLayoutDefinition,
  flexLayoutProvider,
  gridLayoutDefinition,
  gridLayoutProvider,
  GridLayoutSchema,
  LayoutItemKind,
  overlayLayoutDefinition,
  overlayLayoutProvider,
} from '@retikz/layout';
import {
  flexLayout,
  flexLayoutInputEmbedAdapter,
  gridLayout,
  gridLayoutInputEmbedAdapter,
  layoutInputEmbedAdapters,
  overlayLayout,
  overlayLayoutInputEmbedAdapter,
} from '@retikz/layout-vanilla';
import { normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

const nestedGrid = createGridLayout({ columns: [{ kind: 'fixed', value: 10 }] });

describe('Layout Vanilla 系列', () => {
  it('仅将显式能力作为根并发布稳定的精确键提供者', () => {
    const normalized = normalizeScene(
      scene({
        children: [flexLayout({}), gridLayout({ columns: [{ kind: 'fixed', value: 10 }] }), overlayLayout({})],
      }),
      { adapters: layoutInputEmbedAdapters },
    );

    expect(normalized.contributions).toEqual([
      { roots: [flexLayoutProvider.key], providers: [flexLayoutProvider] },
      { roots: [gridLayoutProvider.key], providers: [gridLayoutProvider] },
      { roots: [overlayLayoutProvider.key], providers: [overlayLayoutProvider] },
    ]);
    expect(flexLayoutProvider.makeDefinition([])).toBe(flexLayoutDefinition);
    expect(gridLayoutProvider.makeDefinition([])).toBe(gridLayoutDefinition);
    expect(overlayLayoutProvider.makeDefinition([])).toBe(overlayLayoutDefinition);
  });

  it('构建精确的嵌入规范并规范化系列定义一次', () => {
    const input = scene({
      children: [
        flexLayout({
          gap: { column: 4, row: 8 },
          children: [{ kind: LayoutItemKind.Flex, key: 'nested', child: nestedGrid }],
        }),
        gridLayout({ columns: [{ kind: 'fixed', value: 10 }] }),
        overlayLayout({}),
      ],
    });
    const normalized = normalizeScene(input, { adapters: layoutInputEmbedAdapters });

    expect(input.children.map(child => ('kind' in child ? child.kind : undefined))).toEqual([
      'layout.flexLayout',
      'layout.gridLayout',
      'layout.overlayLayout',
    ]);
    expect(normalized.ir.children.map(child => child.type)).toEqual(['flexLayout', 'gridLayout', 'overlayLayout']);
    expect(normalized.ir.children[0]).toMatchObject({ gap: { column: 4, row: 8 } });
    expect(normalized.contributions.flatMap(contribution => contribution.providers)).toEqual([
      flexLayoutProvider,
      gridLayoutProvider,
      overlayLayoutProvider,
    ]);
  });

  it('将省略的项目键保留在 Source IR 之外', () => {
    const normalized = normalizeScene(
      scene({
        children: [
          flexLayout({
            children: [{ kind: LayoutItemKind.Flex, child: { type: 'node', position: [0, 0] } }],
          }),
        ],
      }),
      { adapters: layoutInputEmbedAdapters },
    );

    const item = (normalized.ir.children[0] as { children: Array<Record<string, unknown>> }).children[0];

    expect(item).not.toHaveProperty('key');
  });

  it('按容器顺序导出浅冻结系列适配器数组', () => {
    expect(layoutInputEmbedAdapters).toEqual([
      flexLayoutInputEmbedAdapter,
      gridLayoutInputEmbedAdapter,
      overlayLayoutInputEmbedAdapter,
    ]);
    expect(Object.isFrozen(layoutInputEmbedAdapters)).toBe(true);
    expect(Object.isFrozen(flexLayoutInputEmbedAdapter)).toBe(false);
  });

  it('拒绝 Source schema 边界处的外部 Vanilla 嵌入有效负载', () => {
    const embed = flexLayout({});

    expect(() =>
      GridLayoutSchema.parse({
        namespace: 'layout',
        type: 'gridLayout',
        columns: [{ kind: 'fixed', value: 10 }],
        children: [
          {
            kind: LayoutItemKind.Grid,
            key: 'invalid',
            child: embed,
          },
        ],
      }),
    ).toThrow();
  });

  it('标准化 SVG SSR 的嵌套规范布局，没有 DOM 状态', () => {
    const input = scene({
      children: [
        flexLayout({
          children: [
            {
              kind: LayoutItemKind.Flex,
              key: 'grid',
              child: nestedGrid,
            },
          ],
        }),
      ],
    });
    const normalized = normalizeScene(input, {
      adapters: layoutInputEmbedAdapters,
    });

    expect(normalized.ir.children[0]).toMatchObject({
      namespace: 'layout',
      type: 'flexLayout',
      children: [
        {
          kind: 'flex',
          key: 'grid',
          child: { namespace: 'layout', type: 'gridLayout' },
        },
      ],
    });
    expect(normalized.contributions.flatMap(contribution => contribution.providers)).toEqual([flexLayoutProvider]);
    expect(
      renderToSvgString(input, {
        adapters: layoutInputEmbedAdapters,
        compile: { composites: [gridLayoutDefinition] },
      }),
    ).toMatch(/^<svg/);
  });

  it('通过输入项转发嵌套的 Layout 依赖项，无需 React 参与', () => {
    const nestedGridEmbed = gridLayout({ columns: [{ kind: 'fixed', value: 10 }] });
    const input = scene({
      children: [
        flexLayout({
          children: [
            {
              kind: LayoutItemKind.Flex,
              key: 'grid',
              child: nestedGridEmbed,
            },
          ],
        }),
      ],
    });

    const normalized = normalizeScene(input, { adapters: layoutInputEmbedAdapters });

    expect(normalized.ir.children[0]).toMatchObject({
      namespace: 'layout',
      type: 'flexLayout',
      children: [{ kind: LayoutItemKind.Flex, key: 'grid', child: { namespace: 'layout', type: 'gridLayout' } }],
    });
    expect(normalized.contributions[0]).toEqual({
      roots: [flexLayoutProvider.key, gridLayoutProvider.key],
      providers: [flexLayoutProvider, gridLayoutProvider],
    });
  });
});
