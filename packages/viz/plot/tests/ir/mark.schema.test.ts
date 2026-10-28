import { describe, expect, it } from 'vitest';

import { IntervalBoundsSchema, MarkSchema } from '../../src/schemas/mark';

const gradientPaint = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#38bdf8' },
    { offset: 1, color: '#0f172a' },
  ],
};

describe('MarkSchema (contract)', () => {
  it('点方向契约可 JSON round-trip，非法方向声明被拒绝', () => {
    const mark = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { orientation: { kind: 'coordinate', role: 'x', align: 'normal' } },
    };
    const parsed = MarkSchema.parse(mark);
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    for (const orientation of [
      { kind: 'coordinate', role: '', align: 'normal' },
      { kind: 'coordinate', role: 'x' },
      { kind: 'screen', role: 'x' },
    ]) {
      expect(MarkSchema.safeParse({ ...mark, orientation }).success).toBe(false);
    }
  });
  // Happy path
  it('标记点有效', () => {
    const m = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记顺序有效的路径', () => {
    const m = {
      type: 'path',
      id: 'trend',
      encodings: { order: 'month', position: { x: { field: 'month' }, y: { field: 'revenue' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  // 边界
  it('标记路径省略顺序有效', () => {
    const m = { type: 'path', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记 id 可省略', () => {
    const withId = {
      type: 'point',
      id: 'p',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: 'max-radius' },
    };
    const noId = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(withId)).toEqual({ ...withId, contributeToDomain: true });
    expect(MarkSchema.parse(noId)).toEqual({ ...noId, contributeToDomain: true });
  });

  it('标记默认颜色组是 json 安全且非空白', () => {
    const mark = {
      type: 'point',
      defaultColorGroup: 'observations',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(mark)))).toEqual({ ...mark, contributeToDomain: true });
    expect(() =>
      MarkSchema.parse({
        ...mark,
        defaultColorGroup: '   ',
      }),
    ).toThrow();
  });

  // 错误路径
  it('标记接受图层 zindex', () => {
    const mark = {
      type: 'point',
      layer: { zIndex: 120 },
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(mark)).toEqual({ ...mark, contributeToDomain: true });
  });

  it('标记层拒绝分数 zindex 和未知字段', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'point',
        layer: { zIndex: 1.5 },
        encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        properties: { autoPadding: 'max-radius' },
      }),
    ).toThrow();
    expect(() =>
      MarkSchema.parse({
        type: 'point',
        layer: { zIndex: 1, order: 2 },
        encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        properties: { autoPadding: 'max-radius' },
      }),
    ).toThrow();
  });

  it('标记未知类型被拒绝', () => {
    expect(() => MarkSchema.parse({ type: 'bar', kind: 'data' })).toThrow();
  });

  it('标记缺失类型被拒绝', () => {
    expect(() => MarkSchema.parse({ kind: 'data' })).toThrow();
  });

  // 交互：两 mark 各自 encoding 互不依赖
  it('标记不同的编码有效', () => {
    const path = { type: 'path', encodings: { position: { x: { field: 'a' }, y: { field: 'b' } } } };
    const point = {
      type: 'point',
      encodings: { position: { y: { value: 0 }, x: { field: 'c' } } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(path)).toEqual({ ...path, contributeToDomain: true });
    expect(MarkSchema.parse(point)).toEqual({ ...point, contributeToDomain: true });
  });

  // contract：interval(bar)
  it('标记间隔有效', () => {
    const m = { type: 'interval', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记 id 有效的区间', () => {
    const m = { type: 'interval', id: 'bars', encodings: { position: { x: { field: 'm' }, y: { field: 'r' } } } };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('interval 标记省略编码时交由几何解析处理', () => {
    expect(() => MarkSchema.parse({ type: 'interval' })).not.toThrow();
  });

  // contract：relation（series / bounds）
  it('标记区间系列闪避有效', () => {
    const m = {
      type: 'interval',
      encodings: {
        series: 'product',
        bounds: { x: { group: 'product' } },
        position: { x: { field: 'm' }, y: { field: 'r' } },
      },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'band' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记区间堆叠有效', () => {
    const m = {
      type: 'interval',
      encodings: {
        series: 'product',
        bounds: { y: { from: { field: 'lo' }, to: { field: 'hi' } } },
        position: { x: { field: 'm' }, y: { field: 'r' } },
      },
      properties: { connection: 'coordinate', bounds: { y: { kind: 'extent' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记间隔边界不良被拒绝', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        encodings: { position: { x: { field: 'm' }, y: { field: 'r' } } },
        properties: { connection: 'coordinate', bounds: { x: { kind: 'pile' } } },
      }),
    ).toThrow();
  });

  it('标记间隔边界，空白角色被拒绝', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        encodings: { color: 'group' },
        properties: { connection: 'coordinate', bounds: { '   ': { kind: 'full' } } },
      }),
    ).toThrow();
  });

  it('标记间隔边界在角色键验证后拒绝未知的嵌套字段', () => {
    expect(IntervalBoundsSchema.safeParse({ custom: { kind: 'full', extra: true } }).success).toBe(false);
  });

  // contract：histogram 连续 x 区间柱（extent bound）
  it('标记区间范围直方图有效', () => {
    const m = {
      type: 'interval',
      encodings: {
        bounds: { x: { from: { field: 'binStart' }, to: { field: 'binEnd' } } },
        position: { x: { field: 'binStart' }, y: { field: 'binCount' } },
      },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('将间隔范围标记为空，以免被拒绝', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        encodings: {
          bounds: { x: { from: { field: '' }, to: { field: 'binEnd' } } },
          position: { x: { field: 'm' }, y: { field: 'r' } },
        },
        properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' } } },
      }),
    ).toThrow();
  });

  it('标记路径系列有效', () => {
    const m = {
      type: 'path',
      encodings: { series: 'city', order: 't', position: { x: { field: 't' }, y: { field: 'v' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  // contract：sector(pie / donut) → interval (extent×full)
  it('标记扇区有效', () => {
    const m = {
      type: 'interval',
      encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, color: 'label' },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记扇区自定义绑定字段有效', () => {
    const m = {
      type: 'interval',
      encodings: { bounds: { x: { from: { field: 'lo' }, to: { field: 'hi' } } }, color: 'label' },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记 id 有效的扇区', () => {
    const m = {
      type: 'interval',
      id: 'pie',
      encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, color: 'label' },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记扇区联合判别', () => {
    const parsed = MarkSchema.parse({
      type: 'interval',
      encodings: { bounds: { x: { from: { field: 'lo' }, to: { field: 'hi' } } }, color: '#333' },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    });

    expect(parsed.type).toBe('interval');
    expect(parsed.encodings?.bounds).toMatchObject({ x: { from: { field: 'lo' } } });
  });

  it('标记扇区 json 往返', () => {
    const m = {
      type: 'interval',
      encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, color: 'label' },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual({
      ...m,
      contributeToDomain: true,
    });
  });

  it('标志扇区拉常数有效', () => {
    const m = {
      type: 'interval',
      encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, color: 'label' },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } }, pull: 12 },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记扇区拉字段 json 往返', () => {
    const m = {
      type: 'interval',
      encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, pull: 'offset', color: 'label' },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual({
      ...m,
      contributeToDomain: true,
    });
  });

  it('标记扇区拉负拒绝', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, color: 'label' },
        properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } }, pull: -1 },
      }),
    ).toThrow();
  });

  it('标记扇区省略编码是左到几何解析结果', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } } },
        properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
      }),
    ).not.toThrow();
  });

  it('标记扇区拼写错误类型被拒绝', () => {
    expect(() => MarkSchema.parse({ type: 'sektor', encodings: { color: 'label' } })).toThrow();
  });

  it('标记扇区空起始字段被拒绝', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        encodings: { bounds: { x: { from: { field: '' }, to: { field: 'y1' } } }, color: 'label' },
        properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
      }),
    ).toThrow();
  });

  // 错误路径：baseline 必须有限（.finite 防 Infinity 破坏 JSON round-trip）

  // contract：path 加 closed（雷达多边形）
  it('接受 Path 标记的 closed 配置', () => {
    const m = {
      type: 'path',
      encodings: { position: { x: { field: 'dim' }, y: { field: 'value' } } },
      properties: { connection: 'coordinate', closed: true },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('Path 标记可省略 closed', () => {
    const m = { type: 'path', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } };
    const parsed = MarkSchema.parse(m);

    expect(parsed).not.toHaveProperty('closed');
  });

  it('拒绝 Path 标记中类型错误的 closed', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'path',
        encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        properties: { connection: 'coordinate', closed: 'yes' },
      }),
    ).toThrow();
  });

  it('标记路径封闭的 json 往返', () => {
    const m = {
      type: 'path',
      encodings: { order: 'dim', position: { x: { field: 'dim' }, y: { field: 'value' } } },
      properties: { connection: 'coordinate', closed: true },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual({
      ...m,
      contributeToDomain: true,
    });
  });

  it('标记路径连接空值有效', () => {
    const m = {
      type: 'path',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { connection: 'coordinate', connectNulls: true },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('缺值连接对象补齐默认虚线，拒绝非描边属性和非法值', () => {
    const mark = { type: 'path', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } };
    const parsed = MarkSchema.parse({ ...mark, properties: { connectNulls: {} } });

    expect(parsed).toMatchObject({ properties: { connectNulls: { dashPattern: [6, 4] } } });
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);

    for (const connectNulls of [{ fill: 'red' }, { strokeOpacity: 2 }, { strokeWidth: -1 }, { dashPattern: [] }]) {
      expect(() => MarkSchema.parse({ ...mark, properties: { connectNulls } })).toThrow();
    }
  });

  it('标记路径闭合循环有效', () => {
    const m = {
      type: 'path',
      encodings: { position: { x: { field: 'dim' }, y: { field: 'value' } } },
      properties: { connection: 'coordinate', closure: { kind: 'cycle' } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记路径闭合基线有效', () => {
    const m = {
      type: 'path',
      encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
      properties: { connection: 'coordinate', closure: { kind: 'baseline', baseline: 5 } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记路径闭合堆叠有效', () => {
    const m = {
      type: 'path',
      encodings: { closure: { baseline: 'y0' }, position: { x: { field: 'month' }, y: { field: 'y1' } } },
      properties: { connection: 'coordinate', closure: { kind: 'stack' } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记路径闭合堆叠空基线字段被拒绝', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'path',
        encodings: { closure: { baseline: '' }, position: { x: { field: 'month' }, y: { field: 'y1' } } },
        properties: { connection: 'coordinate', closure: { kind: 'stack' } },
      }),
    ).toThrow();
  });

  it('标记路径闭合基线 nan 被拒绝', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'path',
        encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
        properties: { connection: 'coordinate', closure: { kind: 'baseline', baseline: Number.NaN } },
      }),
    ).toThrow();
  });

  // contract：size 通道仅 PointMark
  it('尺寸字段有效的标记点', () => {
    const m = {
      type: 'point',
      encodings: { size: 'pop', position: { x: { field: 'lng' }, y: { field: 'lat' } } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('尺寸值有效的标记点', () => {
    const m = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: 'max-radius', size: 6 },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记间隔拒绝未知位置角色大小', () => {
    const parsed = MarkSchema.safeParse({
      type: 'interval',
      encodings: { position: { x: { field: 'c' }, y: { field: 'v' }, size: { field: 'p' } } },
    });

    expect(parsed.success).toBe(false);
  });

  // contract：opacity 通道仅 PointMark
  it('不透明度有效的标记点', () => {
    const m = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } }, opacity: { overall: 'd' } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记间隔拒绝未知位置角色不透明度', () => {
    const parsed = MarkSchema.safeParse({
      type: 'interval',
      encodings: { position: { x: { field: 'c' }, y: { field: 'v' }, opacity: { field: 'd' } } },
    });

    expect(parsed.success).toBe(false);
  });

  // contract：shape 通道仅 PointMark
  it('形状有效的标记点', () => {
    const m = {
      type: 'point',
      encodings: { shape: 'cat', position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('常量节点样式的标记点有效', () => {
    const m = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: {
        autoPadding: 'max-radius',
        fill: '#f8fafc',
        stroke: '#0f172a',
        strokeWidth: 1.5,
        rotate: 45,
        padding: 2,
        minimumSize: { default: 14, width: 16, height: 12 },
        scale: { default: 1, x: 1.2 },
        zIndex: 3,
        opacity: { fill: 0.7, stroke: 0.9, overall: 0.8 },
      },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('Point 标记接受描边通道', () => {
    const m = {
      type: 'point',
      encodings: {
        position: { x: { field: 'x' }, y: { field: 'y' } },
        stroke: 'region',
        strokeWidth: 'density',
        opacity: { overall: 'density' },
      },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('Point 标记接受绘制资源填充和描边', () => {
    const m = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: 'max-radius', fill: gradientPaint, stroke: gradientPaint },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记间隔，节点样式通道有效', () => {
    const m = {
      type: 'interval',
      encodings: {
        strokeWidth: 'density',
        position: { x: { field: 'c' }, y: { field: 'v' } },
        opacity: { fill: 'fillAlpha' },
      },
      properties: { connection: 'coordinate', opacity: { overall: 0.8 } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记区间拒绝未知位置角色形状', () => {
    const parsed = MarkSchema.safeParse({
      type: 'interval',
      encodings: { position: { x: { field: 'c' }, y: { field: 'v' }, shape: { field: 'cat' } } },
    });

    expect(parsed.success).toBe(false);
  });

  // contract：rect(heatmap) → interval (band×band)
  it('将颜色标记为有效的矩形', () => {
    const m = {
      type: 'interval',
      encodings: {
        color: { field: 'value', scale: 'heat' },
        position: { x: { field: 'rowKey' }, y: { field: 'colKey' } },
      },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记没有颜色的矩形有效', () => {
    // 缺 color → 纯网格（值映射可选）；x / y 必填性 + band 约束下放 lowering，schema 仅解析通过
    const m = {
      type: 'interval',
      encodings: { position: { x: { field: 'day' }, y: { field: 'hour' } } },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('将 id 有效的矩形标记为有效', () => {
    const m = {
      type: 'interval',
      id: 'heat',
      encodings: { position: { x: { field: 'r' }, y: { field: 'c' } } },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('rect 标记省略编码时交由几何解析处理', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        properties: { connection: 'coordinate', bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
      }),
    ).not.toThrow();
  });

  it('标记拒绝的拼写错误类型', () => {
    expect(() =>
      MarkSchema.parse({ type: 'rekt', encodings: { position: { x: { field: 'r' }, y: { field: 'c' } } } }),
    ).toThrow();
  });

  it('标记直联判别', () => {
    const parsed = MarkSchema.parse({
      type: 'interval',
      encodings: { position: { x: { field: 'r' }, y: { field: 'c' } } },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    });

    expect(parsed.type).toBe('interval');
  });

  it('标记矩形拒绝未知位置角色大小', () => {
    const parsed = MarkSchema.safeParse({
      type: 'interval',
      encodings: { position: { x: { field: 'r' }, y: { field: 'c' }, size: { field: 'p' } } },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    });

    expect(parsed.success).toBe(false);
  });

  it('标记矩形 json 往返', () => {
    const m = {
      type: 'interval',
      id: 'heat',
      encodings: { color: { field: 'v', scale: 'heat' }, position: { x: { field: 'r' }, y: { field: 'c' } } },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual({
      ...m,
      contributeToDomain: true,
    });
  });

  it('拒绝不支持的内置标记判别字段', () => {
    expect(MarkSchema.safeParse({ type: 'reference', properties: { position: { y: { value: 70 } } } }).success).toBe(
      false,
    );
  });

  // contract：text → point (encoding.text) + 位置 mark label
  it('标记文本联合判别', () => {
    const parsed = MarkSchema.parse({
      type: 'point',
      encodings: { text: 'label', position: { x: { field: 'px' }, y: { field: 'py' } } },
      properties: { autoPadding: 'max-radius' },
    });

    expect(parsed.type).toBe('point');
  });

  it('标记文本 dx dy 有效', () => {
    const m = {
      type: 'point',
      encodings: { text: 'lbl', position: { x: { field: 'px' }, y: { field: 'py' } } },
      properties: { autoPadding: 'max-radius', dx: 4, dy: -8 },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记文本通道均被拒绝', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'point',
        encodings: { text: { field: 'a', value: 'x' }, position: { x: { field: 'px' }, y: { field: 'py' } } },
        properties: { autoPadding: 'max-radius' },
      }),
    ).toThrow();
  });

  it('标记拒绝的文本拼写错误类型', () => {
    expect(() =>
      MarkSchema.parse({ type: 'txt', encodings: { text: 'a', position: { x: { field: 'px' }, y: { field: 'py' } } } }),
    ).toThrow();
  });

  it('标记文本 json 往返', () => {
    const m = {
      type: 'point',
      id: 't',
      encodings: { text: 'label', position: { x: { field: 'px' }, y: { field: 'py' } } },
      properties: { autoPadding: 'max-radius', dx: 2, dy: 3, color: '#333', displayFormat: ',.0f' },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual({
      ...m,
      contributeToDomain: true,
    });
  });

  it('标记间隔标签有效', () => {
    const m = {
      type: 'interval',
      encodings: { label: { text: 'revenue' }, position: { x: { field: 'month' }, y: { field: 'revenue' } } },
      properties: {
        connection: 'coordinate',
        label: { displayFormat: ',.0f', position: 'top', distance: 6, pin: true },
      },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记路径宿主几何标签有效', () => {
    const m = {
      type: 'path',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: {
        connection: 'coordinate',
        label: { text: 'trend', position: 'midway', side: 'top', sloped: true },
      },
    };

    expect(MarkSchema.parse(m)).toEqual({
      ...m,
      contributeToDomain: true,
      properties: { ...m.properties, label: { ...m.properties.label, side: 'top' } },
    });
  });

  it('标记标签核心样式字段有效', () => {
    const m = {
      type: 'interval',
      encodings: { label: { text: 'revenue' }, position: { x: { field: 'month' }, y: { field: 'revenue' } } },
      properties: {
        connection: 'coordinate',
        label: {
          textColor: '#334155',
          opacity: 0.75,
          font: { family: 'serif', size: 12, weight: 'bold', style: 'italic' },
          rotate: 'tangent',
          keepUpright: true,
          pin: { stroke: '#64748b', strokeWidth: 1.5, dashPattern: [2, 2] },
        },
      },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记具有核心路径样式通道的路径有效', () => {
    const m = {
      type: 'path',
      encodings: {
        cornerRadius: 'corner',
        position: { x: { field: 'x' }, y: { field: 'y' } },
        strokeWidth: 'weight',
      },
      properties: { connection: 'coordinate', lineCap: 'round', lineJoin: 'bevel', opacity: { overall: 0.9 } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('Path 标记接受绘制资源填充和描边', () => {
    const m = {
      type: 'path',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { connection: 'coordinate', fill: gradientPaint, stroke: gradientPaint },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('interval 标记接受绘制资源填充和描边', () => {
    const m = {
      type: 'interval',
      encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
      properties: { connection: 'coordinate', fill: gradientPaint, stroke: gradientPaint },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记样式颜色拒绝仅包含空格的字符串', () => {
    expect(
      MarkSchema.safeParse({
        type: 'point',
        encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        properties: { autoPadding: 'max-radius', color: '   ' },
      }).success,
    ).toBe(false);
    expect(
      MarkSchema.safeParse({
        type: 'path',
        encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        properties: { connection: 'coordinate', fill: '   ' },
      }).success,
    ).toBe(false);
    expect(
      MarkSchema.safeParse({
        type: 'interval',
        encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        properties: { connection: 'coordinate', label: { text: 'label', pin: { stroke: '   ' } } },
      }).success,
    ).toBe(false);
  });

  it('标记点标签数字位置有效', () => {
    const m = {
      type: 'point',
      encodings: { position: { x: { field: 'px' }, y: { field: 'py' } } },
      properties: { autoPadding: 'max-radius', label: { text: 'x', position: 30 } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记标签内容既不拒绝', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        encodings: { position: { x: { field: 'm' }, y: { field: 'r' } } },
        properties: { connection: 'coordinate', label: { text: {} } },
      }),
    ).toThrow();
  });

  it('标记路径拒绝仅节点标签 pin', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'path',
        encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        properties: { connection: 'coordinate', label: { text: 'trend', pin: true } },
      }),
    ).toThrow();
  });

  it('mark_point_accepts_local_transform', () => {
    const m = {
      type: 'point',
      transforms: [{ operation: { kind: 'sort', params: { field: 'score', order: 'descending' } } }],
      encodings: { position: { x: { field: 'x' }, y: { field: 'score' } } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('标记路径接受本地变换', () => {
    const m = {
      type: 'path',
      transforms: [
        {
          operation: {
            kind: 'summarize',
            params: {
              groupBy: ['series'],
              metrics: [{ kind: 'sum', field: 'value', as: 'total' }],
            },
          },
        },
      ],
      encodings: { order: 'series', position: { x: { field: 'series' }, y: { field: 'total' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });
});

describe('Polar interpolation mark contract', () => {
  it.each(['path', 'interval'] as const)('rejects unknown %s interpolation', type => {
    const encoding = { x: { field: 'x' }, y: { field: 'y' } };

    expect(() => MarkSchema.parse({ type, interpolation: 'spline', encoding })).toThrow();
  });
});
