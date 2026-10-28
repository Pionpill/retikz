import type { BoundaryDefinition, ClipDefinition, IRScene, ScenePrimitive, ShapeDefinition } from '@retikz/core';
import { defineBoundary, defineClip, defineShape } from '@retikz/core';
import { localToWorld, worldToLocal } from '@retikz/math';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import { Layout, Node, Path, Step } from '../../../src/kernel';

/**
 * <Layout shapes={...}> 自定义 shape 注入透传
 * @description React 把 shapes prop 透传给 compileToScene 的 CompileOptions.shapes；
 *   IR 里 <Node shape="..."> 仍只写字符串名，定义在此注入。无参形状用 `z.strictObject({})`
 */
const radialShape = (): ShapeDefinition =>
  defineShape({
    name: 'hexagon',
    paramsSchema: strictObject({}),
    computeCircumscribedGeometry: (hw, hh) => {
      const r = Math.hypot(hw, hh);
      return { halfWidth: r, halfHeight: r };
    },
    computeBoundaryPoint: (rect, toward) => {
      const [lx, ly] = worldToLocal(rect, toward);
      const len = Math.hypot(lx, ly) || 1;
      const r = rect.width / 2;

      return localToWorld(rect, [(lx / len) * r, (ly / len) * r]);
    },
    resolveAnchor: (rect, name) => (name === 'center' ? [rect.x, rect.y] : undefined),
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

const fixedBoundary = (): BoundaryDefinition =>
  defineBoundary({
    name: 'pin',
    paramsSchema: strictObject({}),
    computeBoundaryPoint: rect => [rect.x + 7, rect.y],
  });

const customClip = (): ClipDefinition =>
  defineClip({
    kind: 'customClip',
    schema: strictObject({ kind: literal('customClip'), params: strictObject({}) }),

    lower: () => {
      return {
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [20, 0] },
          { kind: 'line', to: [20, 20] },
          { kind: 'close' },
        ],
        fillRule: 'nonzero',
      };
    },
  });

const clippedIr: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'scope',
      clip: { kind: 'customClip', params: {} },
      children: [{ type: 'node', position: [0, 0], text: 'A' }],
    },
  ],
};

describe('<Layout shapes> 自定义 shape 注入', () => {
  it('注入 shapes 后 <Node shape="hexagon"> 渲染出自定义 emit（ellipse）', () => {
    const svg = renderToStaticMarkup(
      <Layout width={100} height={100} extensions={{ shapes: [radialShape()] }}>
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
    ).toThrow(/Unknown provider 'hexagon'/);
  });
});

describe('<Layout 边界> 自定义边界直通', () => {
  it('将边界提供者传递给 compileToScene', () => {
    expect(() =>
      renderToStaticMarkup(
        <Layout width={120} height={80} extensions={{ boundaries: [fixedBoundary()] }}>
          <Node id="A" position={[0, 0]} boundary="pin" layout={{ minimumSize: 40 }} />
          <Path>
            <Step kind="move" to={[100, 0]} />
            <Step kind="line" to="A" />
          </Path>
        </Layout>,
      ),
    ).not.toThrow();
  });

  it('当引用的边界提供者未注册时抛出', () => {
    expect(() =>
      renderToStaticMarkup(
        <Layout width={120} height={80}>
          <Node id="A" position={[0, 0]} boundary="pin" layout={{ minimumSize: 40 }} />
          <Path>
            <Step kind="move" to={[100, 0]} />
            <Step kind="line" to="A" />
          </Path>
        </Layout>,
      ),
    ).toThrow(/Unknown connection surface provider 'pin'/);
  });
});

describe('<Layout 裁剪> 完整的裁剪定义直通', () => {
  it('将一个完整的裁剪注册表转发给静态 Vanilla 处理和 SSR', () => {
    const svg = renderToStaticMarkup(
      <Layout ir={clippedIr} extensions={{ clips: [customClip()] }} runtime={{ mode: 'static' }} />,
    );

    expect(svg).toContain('<clipPath');
  });
});
