import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { CircleDefinition, CircleSchema, createCircle, lowerCircle } from '../../../src/shape';
import {
  EllipseSchema,
  RectangleSchema,
  PolygonSchema,
  StarSchema,
  ArcSchema,
  SectorSchema,
  createEllipse,
  createRectangle,
  createPolygon,
  createStar,
  createArc,
  createSector,
  lowerEllipse,
  lowerRectangle,
  lowerPolygon,
  lowerStar,
  lowerArc,
  lowerSector,
} from '../../../src/shape';

describe('Standard 形状系列', () => {
  it('仅将矩形角半径应用于矩形步骤', () => {
    const path = lowerRectangle(createRectangle({ center: [0, 0], width: 40, height: 20, cornerRadius: 4 }));
    expect(path).not.toHaveProperty('cornerRadius');
    expect(path.children.at(-1)).toMatchObject({ kind: 'rectangle', cornerRadius: 4 });
  });
  it('保留参考椭圆中心并导出矩形角', () => {
    expect(lowerEllipse(createEllipse({ center: { id: 'origin' }, diameterX: 40, diameterY: 20 })).children).toEqual([
      { type: 'step', kind: 'move', to: { id: 'origin' } },
      { type: 'step', kind: 'ellipsePath', radius: { x: 20, y: 10 } },
    ]);
    expect(lowerRectangle(createRectangle({ center: [10, 20], width: 8, height: 6 })).children.at(-1)).toMatchObject({
      from: [6, 17],
      to: [14, 23],
    });
  });

  it('将多边形和星形方向烘焙一次', () => {
    const polygon = lowerPolygon(createPolygon({ center: [0, 0], radius: 10, sides: 4, rotate: 0 }));

    expect(polygon).not.toHaveProperty('rotate');
    expect(polygon.children[0]).toMatchObject({ to: [10, 0] });
    expect(polygon.children.at(-1)).toMatchObject({ kind: 'cycle' });

    const star = lowerStar(createStar({ center: [0, 0], outerRadius: 10, points: 5, rotate: 0 }));

    expect(star.children).toHaveLength(11);
    expect(star).not.toHaveProperty('rotate');
  });

  it('在圆弧上贴圆弧标签，并反转内圈绕线', () => {
    const arc = lowerArc(
      createArc({ center: [0, 0], radius: 10, startAngle: 30, sweepAngle: -90, label: { text: 'arc' } }),
    );

    expect(arc).not.toHaveProperty('label');
    expect(arc.children[1]).toMatchObject({ kind: 'arc', startAngle: 30, endAngle: -60, label: { text: 'arc' } });

    const ring = lowerSector(
      createSector({
        center: [0, 0],
        radius: 20,
        innerRadius: 10,
        startAngle: 0,
        endAngle: 90,
        label: { text: 'outer' },
      }),
    );

    expect(ring.children[1]).toMatchObject({ kind: 'arc', startAngle: 0, endAngle: 90, label: { text: 'outer' } });
    expect(ring.children[3]).toMatchObject({ kind: 'arc', startAngle: 90, endAngle: 0 });
    expect(ring.children[3]).not.toHaveProperty('label');
    expect(ring.children[4]).toMatchObject({ kind: 'line', to: [20, 0] });
    expect(
      lowerSector(createSector({ center: { id: 'origin' }, radius: 20, innerRadius: 0, startAngle: 0, endAngle: 90 }))
        .children[1],
    ).toMatchObject({ kind: 'circlePath', closed: 'sector' });
  });

  it.each([
    [EllipseSchema, 'ellipse', { center: [0, 0], radius: { x: -1, y: 2 } }],
    [RectangleSchema, 'rectangle', { center: 'origin', width: 2, height: 3 }],
    [PolygonSchema, 'polygon', { center: [0, 0], sides: 2.5, radius: 10 }],
    [StarSchema, 'star', { center: [0, 0], outerRadius: 10, innerRadius: 11, points: 5 }],
    [ArcSchema, 'arc', { center: [0, 0], radius: 10, startAngle: 0 }],
    [
      SectorSchema,
      'sector',
      { center: [0, 0], radius: { x: 10, y: 10 }, innerRadius: { x: 0, y: 5 }, startAngle: 0, endAngle: 90 },
    ],
    [SectorSchema, 'sector', { center: { id: 'origin' }, radius: 10, innerRadius: 5, startAngle: 0, endAngle: 90 }],
  ])('拒绝无效的 %s 几何图形', (schema, type, input) => {
    expect(schema.safeParse({ namespace: 'standard', type, ...input }).success).toBe(false);
  });
});

describe('圆形复合组件', () => {
  it('保留语义 JSON 并下沉为具有编写身份的普通路径', () => {
    const circle = createCircle({ id: 'circle', center: [10, 20], radius: 30, meta: { source: 'author' } });

    expect(JSON.parse(JSON.stringify(circle))).toEqual(circle);
    expect(circle).toMatchObject({ namespace: 'standard', type: 'circle', radius: 30 });
    expect(lowerCircle(circle)).toEqual({
      type: 'path',
      id: 'circle',
      meta: { source: 'author' },
      children: [
        { type: 'step', kind: 'move', to: [10, 20] },
        { type: 'step', kind: 'circlePath', radius: 30 },
      ],
    });
  });

  it('通过与手写 Core 步骤相同的路径几何进行编译', () => {
    const circle = createCircle({ center: [10, 20], radius: 30, style: { fill: 'red' } });
    const scene = { type: 'scene' as const, version: 1 as const, children: [circle] };
    const actual = compileToScene(scene, { composites: [CircleDefinition] });
    const expected = compileToScene({ type: 'scene', version: 1, children: [lowerCircle(circle)] });

    expect(actual.scene).toEqual(expected.scene);
  });

  it('在不更改编写源的情况下解决直径和盒配合', () => {
    const diameter = createCircle({ center: [0, 0], diameter: 20 });

    expect(lowerCircle(diameter).children[1]).toMatchObject({ kind: 'circlePath', radius: 10 });
    expect(diameter).not.toHaveProperty('radius');
    expect(
      lowerCircle(createCircle({ box: { x: 0, y: 0, width: 80, height: 40 }, fit: 'cover' })).children[1],
    ).toMatchObject({ radius: 40 });
  });

  it.each([
    { center: [0, 0], radius: 20, diameter: 40 },
    { center: [0, 0], radius: -1 },
    { center: [0, 0], radius: 20, fit: 'cover' },
    { center: [0, 0], radius: 20, startAngle: 0 },
    { center: [0, 0], radius: 20, startAngle: 0, endAngle: 90, sweepAngle: 90 },
    { center: [0, 0], radius: 20, closed: 'sector' },
    { box: { x: 0, y: 0, width: 40, height: 20 }, inset: 10 },
  ])('拒绝无效的外部几何图形 %j', geometry => {
    expect(CircleSchema.safeParse({ namespace: 'standard', type: 'circle', ...geometry }).success).toBe(false);
  });

  it('保留显式零半径和带符号扫描', () => {
    expect(lowerCircle(createCircle({ center: [0, 0], radius: 0 })).children[1]).toMatchObject({ radius: 0 });
    expect(
      lowerCircle(createCircle({ center: [0, 0], radius: 20, startAngle: 90, sweepAngle: -180 })).children[1],
    ).toMatchObject({ startAngle: 90, endAngle: -90, closed: 'chord' });
  });
});
