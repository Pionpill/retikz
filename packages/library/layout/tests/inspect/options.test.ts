import { compileInspectionToScene, createInspectorRegistry, defineInspector } from '@retikz/inspect';
import { describe, expect, it, vi } from 'vitest';
import { toJSONSchema } from 'zod';

import { createFlexLayout, FlexLayoutDefinition, LayoutItemKind } from '../../src';
import {
  createLayoutInspectionSelection,
  FLEX_LAYOUT_INSPECT_PRESETS,
  FLEX_LAYOUT_INSPECTOR,
  FLEX_LAYOUT_INSPECTOR_KEY,
  FlexLayoutInspectOptionsSchema,
  GRID_LAYOUT_INSPECT_PRESETS,
  GRID_LAYOUT_INSPECTOR,
  GRID_LAYOUT_INSPECTOR_KEY,
  GridLayoutInspectOptionsSchema,
  OVERLAY_LAYOUT_INSPECT_PRESETS,
  OVERLAY_LAYOUT_INSPECTOR,
  OverlayLayoutInspectOptionsSchema,
} from '../../src/inspect';

describe('Layout 检查选项', () => {
  it('通过 JSON schema 导出共享和系列默认值', () => {
    expect(toJSONSchema(FlexLayoutInspectOptionsSchema)).toMatchObject({
      properties: { labels: { default: false }, bounds: { default: true }, lines: { default: true } },
    });
  });

  it('通过实际选择管线保留嵌套的继承选项', () => {
    const inspect = vi.fn(FLEX_LAYOUT_INSPECTOR.inspect);
    compileInspectionToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'scope',
            children: [
              createFlexLayout({
                children: [
                  { kind: LayoutItemKind.Flex, key: 'item', child: { type: 'node', id: 'item', position: [0, 0] } },
                ],
              }),
            ],
          },
        ],
      },
      {
        registry: createInspectorRegistry([defineInspector({ ...FLEX_LAYOUT_INSPECTOR, inspect })]),
        compileOptions: { composites: [FlexLayoutDefinition] },
        selection: {
          rules: [
            {
              kind: 'request',
              inspector: FLEX_LAYOUT_INSPECTOR_KEY,
              target: { kind: 'scene' },
              options: { labels: true, bounds: { visual: true, content: false } },
            },
            {
              kind: 'request',
              inspector: FLEX_LAYOUT_INSPECTOR_KEY,
              target: { kind: 'subtree', sourcePath: 'children[0].scope' },
              options: { bounds: { slot: false } },
            },
            {
              kind: 'request',
              inspector: FLEX_LAYOUT_INSPECTOR_KEY,
              target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].scope.children[0]' } },
              options: {},
            },
          ],
        },
      },
    );

    expect(inspect).toHaveBeenCalledOnce();
    expect(inspect.mock.calls[0]?.[1].options).toMatchObject({
      labels: true,
      bounds: { visual: true, content: false, slot: false, container: true },
    });
  });

  it('在稀疏和 undefined 的覆盖中保留父字段，而不更改任何源', () => {
    const inherited = {
      labels: true,
      bounds: { visual: true, content: false },
      spacing: { margin: false },
      gaps: false,
    };
    const local = { labels: undefined, bounds: { visual: undefined, slot: false }, spacing: { padding: false } };
    const merged = FLEX_LAYOUT_INSPECTOR.mergeOptionsInput?.(inherited, local);

    expect(merged).toEqual({
      labels: true,
      bounds: { visual: true, content: false, slot: false },
      spacing: { margin: false, padding: false },
      gaps: false,
    });
    expect(FLEX_LAYOUT_INSPECTOR.resolveOptions(FLEX_LAYOUT_INSPECTOR.optionsSchema.parse(merged ?? {}))).toMatchObject(
      {
        labels: true,
        gaps: false,
        bounds: { visual: true, content: false, slot: false },
      },
    );
    expect(inherited.bounds).toEqual({ visual: true, content: false });
    expect(local.bounds).toEqual({ visual: undefined, slot: false });
  });

  it('替换布尔组并使用所属模块默认值解析 undefined 的嵌套字段', () => {
    const merged = FLEX_LAYOUT_INSPECTOR.mergeOptionsInput?.(
      { bounds: { visual: true }, spacing: { margin: true } },
      { bounds: false, spacing: false },
    );

    expect(FLEX_LAYOUT_INSPECTOR.resolveOptions(FLEX_LAYOUT_INSPECTOR.optionsSchema.parse(merged ?? {}))).toMatchObject(
      {
        bounds: { container: false, content: false, slot: false, allocation: false, visual: false },
        spacing: { padding: false, margin: false },
      },
    );
    expect(
      FLEX_LAYOUT_INSPECTOR.resolveOptions(
        FLEX_LAYOUT_INSPECTOR.optionsSchema.parse({ bounds: { content: undefined }, spacing: { margin: undefined } }),
      ),
    ).toMatchObject({
      bounds: { content: true },
      spacing: { margin: true },
    });
  });

  it('公开具有共享和系列默认值的所描述的严格 schema', () => {
    const schemas = [FlexLayoutInspectOptionsSchema, GridLayoutInspectOptionsSchema, OverlayLayoutInspectOptionsSchema];

    expect(schemas.map(schema => schema.parse({}))).toEqual([
      expect.objectContaining({ labels: false, lines: true, gaps: true }),
      expect.objectContaining({ labels: false, tracks: true, cells: false }),
      expect.objectContaining({ labels: false, placements: true, stacking: false }),
    ]);
    expect(schemas.every(schema => typeof schema.description === 'string' && schema.description.length > 0)).toBe(true);
    expect(() => FlexLayoutInspectOptionsSchema.parse({ tracks: true })).toThrow();
    expect(() => GridLayoutInspectOptionsSchema.parse({ lines: true })).toThrow();
  });

  it('将解析的共享和系列默认值扩展为回调选项', () => {
    expect(FLEX_LAYOUT_INSPECTOR.resolveOptions(FLEX_LAYOUT_INSPECTOR.optionsSchema.parse({}))).toEqual({
      bounds: { container: true, content: true, slot: true, allocation: true, visual: false },
      spacing: { padding: true, margin: true },
      overflow: true,
      alignmentGuides: true,
      labels: false,
      lines: true,
      gaps: true,
      distributedSpace: true,
    });
    expect(GRID_LAYOUT_INSPECTOR.resolveOptions(GRID_LAYOUT_INSPECTOR.optionsSchema.parse({}))).toMatchObject({
      tracks: true,
      cells: false,
      gaps: true,
      spans: true,
    });
    expect(OVERLAY_LAYOUT_INSPECTOR.resolveOptions(OVERLAY_LAYOUT_INSPECTOR.optionsSchema.parse({}))).toMatchObject({
      placements: true,
      anchors: true,
      stacking: false,
    });

    const options = FLEX_LAYOUT_INSPECTOR.resolveOptions(
      FLEX_LAYOUT_INSPECTOR.optionsSchema.parse({ spacing: { padding: false }, labels: true }),
    );

    expect(options.spacing.padding).toBe(false);
    expect(options.labels).toBe(true);
  });

  it('为每个布局系列提供推荐、全部和关闭预设', () => {
    expect(
      FLEX_LAYOUT_INSPECTOR.resolveOptions(
        FLEX_LAYOUT_INSPECTOR.optionsSchema.parse(FLEX_LAYOUT_INSPECT_PRESETS.Recommended),
      ),
    ).toMatchObject({
      bounds: { content: true, container: false, slot: false, allocation: false, visual: false },
      spacing: { padding: false, margin: false },
      overflow: false,
      alignmentGuides: false,
      labels: false,
      lines: true,
      gaps: true,
      distributedSpace: false,
    });
    expect(
      GRID_LAYOUT_INSPECTOR.resolveOptions(
        GRID_LAYOUT_INSPECTOR.optionsSchema.parse(GRID_LAYOUT_INSPECT_PRESETS.Recommended),
      ),
    ).toMatchObject({
      tracks: true,
      cells: false,
      gaps: true,
      distributedSpace: false,
      spans: false,
    });
    expect(
      OVERLAY_LAYOUT_INSPECTOR.resolveOptions(
        OVERLAY_LAYOUT_INSPECTOR.optionsSchema.parse(OVERLAY_LAYOUT_INSPECT_PRESETS.Recommended),
      ),
    ).toMatchObject({
      placements: false,
      anchors: false,
      stacking: false,
    });
    expect(
      FLEX_LAYOUT_INSPECTOR.resolveOptions(FLEX_LAYOUT_INSPECTOR.optionsSchema.parse(FLEX_LAYOUT_INSPECT_PRESETS.All)),
    ).toEqual({
      bounds: { container: true, content: true, slot: true, allocation: true, visual: true },
      spacing: { padding: true, margin: true },
      overflow: true,
      alignmentGuides: true,
      labels: true,
      lines: true,
      gaps: true,
      distributedSpace: true,
    });
    expect(GRID_LAYOUT_INSPECT_PRESETS.All).toMatchObject({ tracks: true, cells: true, spans: true });
    expect(OVERLAY_LAYOUT_INSPECT_PRESETS.All).toMatchObject({ placements: true, anchors: true, stacking: true });
    expect(FLEX_LAYOUT_INSPECT_PRESETS.Off).toBe(false);
    expect(GRID_LAYOUT_INSPECT_PRESETS.Off).toBe(false);
    expect(OVERLAY_LAYOUT_INSPECT_PRESETS.Off).toBe(false);
    expect(Object.isFrozen(FLEX_LAYOUT_INSPECT_PRESETS)).toBe(true);
  });

  it('在共享选择帮助器中接受特定于系列的稀疏选项', () => {
    const selection = createLayoutInspectionSelection({
      inspector: GRID_LAYOUT_INSPECTOR_KEY,
      target: { kind: 'scene' },
      options: { tracks: true, spans: false },
    });

    expect(selection.rules[0]).toMatchObject({ options: { tracks: true, spans: false } });
  });
});
