import type { ScenePrimitive, ShapeDefinition } from '@retikz/core';

import { defineShape, localToWorld, worldToLocal } from '@retikz/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { Layout } from '../../src/kernel/Layout';
import { Node } from '../../src/kernel/Node';

/**
 * <Layout shapes={...}> 自定义 shape 注入透传
 * @description React 把 shapes prop 透传给 compileToScene 的 CompileOptions.shapes；
 *   IR 里 <Node shape="..."> 仍只写字符串名，定义在此注入。无参形状用 `z.strictObject({})`。
 */
const radialShape = (): ShapeDefinition =>
  defineShape({
    name: 'hexagon',
    paramsSchema: z.strictObject({}),
    circumscribe: (hw, hh) => {
      const r = Math.hypot(hw, hh);
      return { halfWidth: r, halfHeight: r };
    },
    boundaryPoint: (rect, toward) => {
      const [lx, ly] = worldToLocal(rect, toward);
      const len = Math.hypot(lx, ly) || 1;
      const r = rect.width / 2;
      return localToWorld(rect, [(lx / len) * r, (ly / len) * r]);
    },
    anchor: (rect, name) => (name === 'center' ? [rect.x, rect.y] : undefined),
    *emit(rect, style): Iterable<ScenePrimitive> {
      yield {
        type: 'ellipse',
        cx: rect.x,
        cy: rect.y,
        rx: rect.width / 2,
        ry: rect.height / 2,
        fill: style.fill ?? 'transparent',
        stroke: style.stroke ?? 'currentColor',
        strokeWidth: style.strokeWidth ?? 1,
      };
    },
  });

describe('<Layout shapes> 自定义 shape 注入', () => {
  it('注入 shapes 后 <Node shape="hexagon"> 渲染出自定义 emit（ellipse）', () => {
    const svg = renderToStaticMarkup(
      <Layout width={100} height={100} shapes={[radialShape()]}>
        <Node id="A" shape="hexagon" position={[0, 0]} text="hex" />
      </Layout>,
    );
    expect(svg).toContain('<ellipse');
  });

  it('未注入对应 shape 时编译期 throw Unknown shape', () => {
    expect(() =>
      renderToStaticMarkup(
        <Layout width={100} height={100}>
          <Node id="A" shape="hexagon" position={[0, 0]} text="hex" />
        </Layout>,
      ),
    ).toThrow(/Unknown shape 'hexagon'/);
  });
});
