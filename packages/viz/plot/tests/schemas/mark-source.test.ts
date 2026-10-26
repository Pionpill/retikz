import { describe, expect, it } from 'vitest';
import { treeifyError } from 'zod';

import { ChannelSchema, MarkSchema, PointMarkSchema, PositionEncodingSchema } from '../../src';

describe('标记 Source 字段编码和固定属性', () => {
  it('保留字段字符串并通过 JSON 显式缩放绑定', () => {
    const input = {
      type: 'point',
      encodings: {
        position: { x: { field: 'height' }, y: { field: 'weight' } },
        color: { field: 'region', scale: 'regionColor' },
        size: 'population',
      },
      properties: { stroke: '#0f172a', strokeWidth: 2, opacity: { overall: 0.85 } },
      transforms: [],
    };
    const parsed = PointMarkSchema.parse(input);
    expect(parsed).toEqual({
      ...input,
      contributeToDomain: true,
      properties: { ...input.properties, autoPadding: 'max-radius' },
    });
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('接受字段名称或显式字段和比例对', () => {
    expect(ChannelSchema.parse('region')).toBe('region');
    expect(ChannelSchema.parse({ field: 'region', scale: 'palette' })).toEqual({
      field: 'region',
      scale: 'palette',
    });
  });

  it.each([
    '',
    '   ',
    { field: 'region' },
    { field: 'region', scale: '' },
    { value: 'red' },
    { field: 'region', scale: 'palette', value: 'red' },
  ])('拒绝非现场或不完整的外部通道输入 %j', input => {
    expect(ChannelSchema.safeParse(input).success).toBe(false);
  });

  it('将坐标角色限制为 x/y/z 并拒绝缩放位置输入', () => {
    expect(PositionEncodingSchema.safeParse({ longitude: { field: 'lon' }, latitude: { field: 'lat' } }).success).toBe(
      false,
    );
    expect(PositionEncodingSchema.safeParse({ ' ': 'value' }).success).toBe(false);
    const result = PositionEncodingSchema.safeParse({ x: { field: 'height', scale: 'x' } });
    expect(result.success).toBe(false);
    if (!result.success) expect(treeifyError(result.error).properties).toHaveProperty('x');
  });

  it('保留两个编写源，因此解析结果可以应用编码优先级', () => {
    const input = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } }, color: 'group', opacity: { overall: 'alpha' } },
      properties: { color: 'red', opacity: { overall: 0.9, fill: 0.4, stroke: 0.7 } },
    };
    expect(PointMarkSchema.parse(input)).toEqual({
      ...input,
      contributeToDomain: true,
      properties: { ...input.properties, autoPadding: 'max-radius' },
    });
  });

  it('接受混合固定和编码注释位置，无需绑定包装器', () => {
    const input = {
      type: 'point',
      encodings: { color: 'group', position: { x: { edge: 'end' }, y: { field: 'mean' } } },
      properties: { size: 4 },
      transforms: [],
      contributeToDomain: false,
    };
    const parsed = MarkSchema.parse(input);
    expect(parsed).toMatchObject(input);
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('保持变换省略与显式空链的区别', () => {
    const input = {
      type: 'point',
      encodings: { position: { x: { value: 1 }, y: { value: 2 } } },
      properties: {},
      contributeToDomain: false,
    };
    expect(MarkSchema.parse(input)).not.toHaveProperty('transforms');
    expect(MarkSchema.parse({ ...input, transforms: [] })).toHaveProperty('transforms', []);
  });

  it('将路径几何属性与系列和顺序角色分开', () => {
    const input = {
      type: 'path',
      encodings: {
        position: { x: { field: 'time' }, y: { field: 'value' } },
        series: 'group',
        order: 'time',
        strokeWidth: 'width',
      },
      properties: { connection: 'coordinate', curve: 'linear', strokeWidth: 2 },
    };
    expect(MarkSchema.parse(input)).toEqual({ ...input, contributeToDomain: true });
  });

  it('将区间构造模式放置在属性中，并将端点放置在编码中', () => {
    const input = {
      type: 'interval',
      encodings: {
        position: { x: { field: 'category' } },
        bounds: { y: { from: { field: 'low' }, to: { field: 'high' } } },
      },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'band' }, y: { kind: 'extent' } }, fill: 'blue' },
    };
    expect(MarkSchema.parse(input)).toEqual({ ...input, contributeToDomain: true });
  });

  it('使用独立于标记构造的关系几何判别字段', () => {
    const input = {
      type: 'relation',
      properties: {
        source: { anchorId: { template: 'a' } },
        target: { anchorId: { template: 'b' } },
        geometry: { kind: 'path' },
      },
    };
    expect(MarkSchema.parse(input)).toEqual({
      ...input,
      contributeToDomain: true,
      properties: { ...input.properties, autoPadding: false },
    });
  });

  it.each([
    { type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } },
    { type: 'point', color: { kind: 'constant', value: 'red' }, encoding: {} },
    { type: 'point', position: { x: { field: 'x' }, y: { value: 2 } }, contributeToDomain: false },
    {
      type: 'point',
      encodings: { position: { x: { value: 1 }, y: { value: 2 } } },
      properties: {},
      transform: [],
      contributeToDomain: false,
    },
    {
      type: 'relation',
      kind: 'ribbon',
      source: { anchorId: { template: 'a' } },
      target: { anchorId: { template: 'b' } },
      ribbon: { width: 2 },
    },
  ])('拒绝过时的外部标记结构 %j', input => {
    expect(MarkSchema.safeParse(input).success).toBe(false);
  });

  it('验证扩展绑定形状，而不会默默地丢弃格式错误的输入', () => {
    const result = PointMarkSchema.safeParse({
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } }, custom: { value: 2 } },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some(issue => issue.path[0] === 'encodings')).toBe(true);
  });

  it('保留扩展字段绑定以进行注册表验证', () => {
    const input = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } }, custom: 'value' },
    };
    expect(PointMarkSchema.parse(input)).toEqual({ ...input, contributeToDomain: true });
  });

  it('将有序标签内容与其固定宿主配置分开', () => {
    const input = {
      type: 'point',
      encodings: {
        position: { x: { field: 'x' }, y: { field: 'y' } },
        label: [{ text: 'name' }, { text: 'value' }],
      },
      properties: { label: [{ text: 'fixed', placement: 'outside' }, { displayFormat: '.2f' }] },
    };
    expect(PointMarkSchema.parse(input)).toMatchObject(input);
  });

  it.each([
    { properties: { color: { kind: 'constant', value: 'red' } } },
    { properties: { position: { x: { field: 'x' } } } },
    { encodings: { opacity: { unsupported: 'alpha' } } },
    { encodings: { color: { field: 'group' } } },
    { encodings: { channels: { custom: 'value' } } },
  ])('拒绝过时的包装器或未声明的嵌套目标 %j', fragment => {
    expect(PointMarkSchema.safeParse({ type: 'point', ...fragment }).success).toBe(false);
  });

  it('对关系投影进行编码，而不将字段名称放入固定目标中', () => {
    const input = {
      type: 'relation',
      encodings: {
        source: { position: { x: { field: 'fromX' }, y: { field: 'fromY' } } },
        target: { position: { x: { field: 'toX' }, y: { field: 'toY' } } },
        geometry: { width: 'flow' },
      },
      properties: { geometry: { kind: 'ribbon' } },
    };
    expect(MarkSchema.parse(input)).toMatchObject(input);
  });

  it.each([
    { kind: 'path', route: [{ kind: 'line' }], routing: { kind: 'line' } },
    { kind: 'path', route: [{ kind: 'line' }], via: [{ id: 'c' }] },
    { kind: 'ribbon' },
    { kind: 'ribbon', width: 2, options: { interpolation: 'linear' } },
  ])('保留关系几何验证 %j', geometry => {
    expect(
      MarkSchema.safeParse({
        type: 'relation',
        properties: { source: { anchorId: { template: 'a' } }, target: { anchorId: { template: 'b' } }, geometry },
      }).success,
    ).toBe(false);
  });

  it('拒绝非投影位置的参考上的端点字形', () => {
    expect(
      MarkSchema.safeParse({
        type: 'relation',
        properties: {
          source: { anchorId: { template: 'a' } },
          target: { anchorId: { template: 'b' } },
          geometry: { kind: 'path' },
          endpoints: { source: { size: 3 } },
        },
      }).success,
    ).toBe(false);
  });

  it('接受具有直接常量属性的投影端点字形', () => {
    const input = {
      type: 'relation',
      encodings: {
        source: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        target: { position: { x: { field: 'u' }, y: { field: 'v' } } },
      },
      properties: { endpoints: { source: { size: 3, fill: 'red' } }, geometry: { kind: 'path' } },
    };
    expect(MarkSchema.parse(input)).toMatchObject(input);
  });
});

describe('Core 图形样式输入契约', () => {
  it.each(['point', 'path', 'interval'])('保留 %s 到 JSON 的上下文绘制和标量不透明度', type => {
    const parsed = MarkSchema.parse({
      type,
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: {
        fill: 0,
        stroke: 1,
        opacity: 0.6,
        dashOffset: -3,
        lineCap: 'square',
        lineJoin: 'bevel',
      },
    });
    expect(parsed.properties).toMatchObject({
      fill: 0,
      stroke: 1,
      opacity: 0.6,
      dashOffset: -3,
      lineCap: 'square',
      lineJoin: 'bevel',
    });
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });
  it.each([
    { strokeWidth: -1 },
    { opacity: { overall: 0.5, extra: 0.2 } },
    { fill: -0.1 },
    { stroke: 1.1 },
    { opacity: 1.1 },
    { opacity: { fill: -0.1 } },
    { dashOffset: Infinity },
    { lineCap: 'triangle' },
    { lineJoin: 'smooth' },
  ])('拒绝无效的外部图形样式 %j', properties => {
    for (const type of ['point', 'path', 'interval']) {
      expect(
        MarkSchema.safeParse({ type, encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } }, properties })
          .success,
      ).toBe(false);
    }
  });
});
