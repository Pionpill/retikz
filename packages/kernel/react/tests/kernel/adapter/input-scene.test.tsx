import type { IRScene, IRPath } from '@retikz/core';
import { SceneSchema } from '@retikz/core';
import { normalizeScene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { Node, Path, Scope, Step } from '../../../src';
import { createInputScene } from '../../../src/components/container/layout';
import { Draw, EdgeLabel } from '../../../src/components/sugar';
import { compileTestResult } from '../../helpers/compilation';

describe('React JSX Input 场景', () => {
  it('只在省略 kind 时按实际步骤顺序补上起点和直线', () => {
    const input = createInputScene(
      <>
        <Path>
          <>
            <Step to="A" />
          </>
          <Step to="B" />
        </Path>
        <Path>
          <Step kind="line" to="A" />
          <Step to="B" />
        </Path>
      </>,
    );
    expect(normalizeScene(input).ir.children).toMatchObject([
      {
        children: [
          { kind: 'move', to: { id: 'A' } },
          { kind: 'line', to: { id: 'B' } },
        ],
      },
      {
        children: [
          { kind: 'line', to: { id: 'A' } },
          { kind: 'line', to: { id: 'B' } },
        ],
      },
    ]);
  });

  it('JSX 子步骤和 way 两种写法归一为相同的路径', () => {
    const steps = createInputScene(
      <Path>
        <Step to={[0, 0]} />
        <Step to={[100, 0]} />
      </Path>,
    );
    const shorthand = createInputScene(
      <Path
        way={[
          [0, 0],
          [100, 0],
        ]}
      />,
    );
    expect(normalizeScene(shorthand).ir).toEqual(normalizeScene(steps).ir);
  });
  it.each(['->', '<-', '<->'] as const)('Path 与 Draw 的 %s 简写统一由 Vanilla 转换', arrow => {
    const endpoints = arrow === '->' ? { end: {} } : arrow === '<-' ? { start: {} } : { start: {}, end: {} };
    const fromPath = normalizeScene(
      createInputScene(
        <Path arrow={arrow}>
          <Step kind="move" to={[0, 0]} />
          <Step kind="line" to={[100, 0]} />
        </Path>,
      ),
    ).ir;
    const fromDraw = normalizeScene(
      createInputScene(
        <Draw
          arrow={arrow}
          way={[
            [0, 0],
            [100, 0],
          ]}
        />,
      ),
    ).ir;
    const explicit = normalizeScene(
      createInputScene(
        <Draw
          arrow={endpoints}
          way={[
            [0, 0],
            [100, 0],
          ]}
        />,
      ),
    ).ir;
    expect(fromPath).toEqual(explicit);
    expect(fromDraw).toEqual(explicit);
    expect(compileTestResult(fromDraw).scene).toEqual(compileTestResult(explicit).scene);
  });
  it('JSX 节点的多行标签归一后符合 IR schema', () => {
    const text = ['first', { text: 'second', fill: '#ff0000' }];
    const label = { text, textAlign: 'end' as const, lineHeight: 24, maxTextWidth: 30, opacity: 0.5 };
    const input = createInputScene(<Node label={label} />);
    const ir = normalizeScene(input).ir;
    expect(ir.children[0]).toMatchObject({ label });
    expect(SceneSchema.parse(ir).children[0]).toMatchObject({ label });
  });
  it('JSX 节点归一后保留别名', () => {
    const input = createInputScene(<Node id="primary" aliasIds={['alternate']} position={[0, 0]} text="A" />);
    const ir = normalizeScene(input).ir;

    expect(ir.children[0]).toMatchObject({ id: 'primary', aliasIds: ['alternate'] });
  });

  it('将 Kernel JSX 收集为 Vanilla Input，并由 Vanilla 解析字符串 target', () => {
    const input = createInputScene(
      <>
        <Node id="source" position={[0, 0]} />
        <Path id="edge">
          <Step kind="move" to="source.center" />
          <Step kind="line" to="target.bottom" />
        </Path>
      </>,
    );

    expect(input.children).toMatchObject([{ type: 'node' }, { type: 'path' }]);
    expect(normalizeScene(input).ir.children).toMatchObject([
      { type: 'node', id: 'source' },
      {
        type: 'path',
        id: 'edge',
        children: [
          { type: 'step', kind: 'move', to: { id: 'source', anchor: 'center' } },
          { type: 'step', kind: 'line', to: { id: 'target', anchor: 'bottom' } },
        ],
      },
    ]);
  });

  it('将 Draw 的 way 原样交给 Vanilla Path normalizer', () => {
    const input = createInputScene(<Draw way={['source', 'target']} style={{ stroke: '#2563eb' }} />);

    expect(normalizeScene(input).ir.children).toEqual([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'source' } },
          { type: 'step', kind: 'line', to: { id: 'target' } },
        ],
        style: { stroke: '#2563eb' },
      },
    ]);
  });

  it('把 Path 的 arrowPlacement 原样交给 Vanilla 并生成端点重叠 IR', () => {
    const props = {
      arrow: { end: { endpointOverlap: 0.5 } },
    };
    const input = createInputScene(
      <Path {...props}>
        <Step kind="move" to={[0, 0]} />
        <Step kind="line" to={[20, 0]} />
      </Path>,
    );

    expect(normalizeScene(input).ir.children).toMatchObject([
      {
        type: 'path',
        arrow: { end: { endpointOverlap: 0.5 } },
      },
    ]);
  });

  it('保留 Path 与 Scope 的作者元数据，不写入 IR', () => {
    const scopeAuthoring = Object.freeze({ scope: true });
    const pathAuthoring = Object.freeze({ path: true });
    const input = createInputScene(
      <Scope authoring={scopeAuthoring}>
        <Path authoring={pathAuthoring}>
          <Step kind="move" to={[0, 0]} />
          <Step kind="line" to={[10, 0]} />
        </Path>
      </Scope>,
    );

    expect(input.children).toMatchObject([
      {
        type: 'scope',
        authoring: scopeAuthoring,
        children: [{ type: 'path', authoring: pathAuthoring }],
      },
    ]);
  });

  it('将 EdgeLabel interrupt 布尔值透传为经 Core schema 验证的 Vanilla IR', () => {
    const input = createInputScene(
      <Path>
        <Step kind="move" to={[0, 0]} />
        <Step kind="line" to={[10, 0]}>
          <EdgeLabel interrupt>force</EdgeLabel>
        </Step>
        <Step kind="line" to={[20, 0]}>
          <EdgeLabel interrupt={false}>continuous</EdgeLabel>
        </Step>
      </Path>,
    );

    expect(SceneSchema.parse(normalizeScene(input).ir).children).toMatchObject([
      {
        type: 'path',
        children: [
          { kind: 'move' },
          { kind: 'line', label: { text: 'force', interrupt: true } },
          { kind: 'line', label: { text: 'continuous', interrupt: false } },
        ],
      },
    ]);
  });

  it('React EdgeLabel、Vanilla Input 与直接 JSON 编译为同一断线路径 Scene', () => {
    const direct: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          id: 'edge',
          label: { text: 'host', sloped: true },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0], label: { text: 'step', sloped: true } },
          ],
          style: { stroke: '#13579b' },
        },
      ],
    };
    const reactInput = createInputScene(
      <Path id="edge" label={{ text: 'host', sloped: true }} style={{ stroke: '#13579b' }}>
        <Step kind="move" to={[0, 0]} />
        <Step kind="line" to={[100, 0]}>
          <EdgeLabel sloped>step</EdgeLabel>
        </Step>
      </Path>,
    );
    const measureText = () => ({ width: 20, height: 10 });
    const jsonScene = compileTestResult(direct, { measureText }).scene;
    const vanillaScene = compileTestResult(normalizeScene({ type: 'scene', children: direct.children }).ir, {
      measureText,
    }).scene;
    const reactScene = compileTestResult(normalizeScene(reactInput).ir, { measureText }).scene;

    expect(vanillaScene).toEqual(jsonScene);
    expect(reactScene).toEqual(jsonScene);
  });
});

it('JSX 作用域归一后保留包络形状和子节点', () => {
  const input = createInputScene(
    <Scope id="group" boundingShape="circle">
      <Node position={[0, 0]} />
    </Scope>,
  );
  const ir = normalizeScene(input).ir;

  expect(ir.children[0]).toMatchObject({
    id: 'group',
    boundingShape: 'circle',
    children: [{ type: 'node', position: [0, 0] }],
  });
});

it('React 与 Vanilla 保留独立端点箭头和任意位置标记', () => {
  const arrow = { end: { shape: 'circle', endpointOverlap: 0.5 } };
  const marks: NonNullable<IRPath['marks']> = [{ pos: 0, rotate: 45, scale: 2, shape: 'dot', params: { radius: 3 } }];
  const jsx = normalizeScene(
    createInputScene(
      <Draw
        way={[
          [0, 0],
          [100, 0],
        ]}
        arrow={arrow}
        marks={marks}
      />,
    ),
  ).ir;
  const vanilla = normalizeScene({
    type: 'scene',
    children: [
      {
        type: 'path',
        way: [
          [0, 0],
          [100, 0],
        ],
        arrow,
        marks,
      },
    ],
  }).ir;
  expect(jsx).toEqual(vanilla);
  expect(jsx.children[0]).toMatchObject({ arrow, marks });
});
