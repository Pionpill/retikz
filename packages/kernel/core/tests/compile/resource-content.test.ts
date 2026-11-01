import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import {
  assembleCompileOutputs,
  createSharedCompileContext,
  compileToScene,
  defineMark,
  definePath,
  definePattern,
  PathSchema,
  visitSceneContent,
} from '../../src';
import type { TextPrimitive, Scene, GroupPrimitive, ScenePrimitive, IRScene } from '../../src';
import { createClipRegistry, createPaintRegistry, importSceneResources } from '../../src/compile/resource';
import { BUILTIN_SHAPES } from '../../src/providers/shape';

describe('资源内容复用基础图元', () => {
  it('自定义 Pattern 保留已度量文本和基础图元样式', () => {
    const text: TextPrimitive = {
      type: 'text',
      x: 0,
      y: 0,
      lines: [{ text: 'A' }],
      fontSize: 8,
      lineHeight: 8,
      measuredWidth: 5,
      measuredHeight: 8,
      align: 'start',
      baseline: 'top',
      fill: 'red',
    };
    const pattern = definePattern({ name: 'textTile', emit: () => [text] });
    const result = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [{ type: 'node', position: [0, 0], style: { fill: { kind: 'pattern', shape: 'textTile' } } }],
      },
      { patterns: [pattern] },
    );
    const resource = result.scene.resources?.find(item => item.kind === 'paint' && 'tile' in item);
    expect(resource?.tile.motif).toEqual([text]);
    expect(resource?.tile.motif[0]).not.toBe(text);
  });
});

describe('Scene 资源依赖关闭', () => {
  const patternScene: IRScene = {
    type: 'scene',
    version: 1,
    children: ['first', 'second'].map(shape => ({
      type: 'node',
      position: [0, 0],
      style: { fill: { kind: 'pattern', shape } },
    })),
  };
  const rectangle: ScenePrimitive = { type: 'rect', x: 0, y: 0, width: 1, height: 1 };

  it('Shape 只能透传本次输入的绘制资源，不能借用其他节点的资源', () => {
    const base = BUILTIN_SHAPES.get('rectangle')!;
    const valid = {
      ...base,
      name: 'passthrough',
      emit: (_rect: Parameters<typeof base.emit>[0], style: Parameters<typeof base.emit>[1]) => [
        { ...rectangle, fill: style.fill },
      ],
    };
    const input: IRScene = {
      ...patternScene,
      children: [
        { type: 'node', shape: 'passthrough', position: [0, 0], style: { fill: { kind: 'pattern', shape: 'first' } } },
      ],
    };
    const patterns = [definePattern({ name: 'first', emit: () => [rectangle] })];
    const result = compileToScene(input, { shapes: [valid], patterns }).scene;
    expect(() => visitSceneContent(result)).not.toThrow();
    expect(result.resources).toHaveLength(1);
    expect(() =>
      compileToScene(
        { ...input, children: [...input.children, { type: 'node', shape: 'foreign', position: [2, 0] }] },
        {
          patterns,
          shapes: [
            valid,
            { ...base, name: 'foreign', emit: () => [{ ...rectangle, fill: { kind: 'resourceRef', id: 'paint-1' } }] },
          ],
        },
      ),
    ).toThrow(/not supplied/);
  });

  it('Mark 透传输入绘制资源并拒绝自行声明资源', () => {
    const input: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
          marks: [{ pos: 0.5, shape: 'custom', fill: { kind: 'pattern', shape: 'first' } }],
        },
      ],
    };
    const patterns = [definePattern({ name: 'first', emit: () => [rectangle] })];
    const result = compileToScene(input, {
      patterns,
      marks: [defineMark({ name: 'custom', emit: context => [{ ...rectangle, fill: context.fill }] })],
    }).scene;
    expect(result.resources).toHaveLength(1);
    expect(() => visitSceneContent(result)).not.toThrow();
    expect(() =>
      compileToScene(input, {
        patterns,
        marks: [defineMark({ name: 'custom', emit: () => Object.assign([rectangle], { resources: [] }) })],
      }),
    ).toThrow(/cannot declare resources/);
    expect(() =>
      compileToScene(input, {
        patterns,
        marks: [
          defineMark({ name: 'custom', emit: () => [{ ...rectangle, fill: { kind: 'resourceRef', id: 'foreign' } }] }),
        ],
      }),
    ).toThrow(/not supplied/);
  });

  it('Path 可透传 Core 描边服务生成的资源，但不能输出资源声明', () => {
    const input: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'path',
          kind: 'custom',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    const patterns = [definePattern({ name: 'first', emit: () => [rectangle] })];
    const path = definePath({
      name: 'custom',
      schema: PathSchema.extend({ kind: literal('custom') }),
      compile: context =>
        context.emitStroke({ ...context.path, style: { stroke: { kind: 'pattern', shape: 'first' } } }),
    });
    const result = compileToScene(input, { patterns, paths: [path] }).scene;
    expect(result.resources).toHaveLength(1);
    expect(() => visitSceneContent(result)).not.toThrow();
    expect(() =>
      compileToScene(input, {
        paths: [{ ...path, compile: () => ({ primitives: [rectangle], boundsPoints: [], resources: [] }) }],
      }),
    ).toThrow(/cannot declare resources/);
    expect(() =>
      compileToScene(input, {
        paths: [
          {
            ...path,
            compile: () => ({
              primitives: [{ ...rectangle, fill: { kind: 'resourceRef', id: 'foreign' } }],
              boundsPoints: [],
            }),
          },
        ],
      }),
    ).toThrow(/not supplied/);
  });

  it('在 Pattern 输出时拒绝手写引用，不等待后续资源注册', () => {
    let secondCalled = false;
    expect(() =>
      compileToScene(patternScene, {
        patterns: [
          definePattern({
            name: 'first',
            emit: () => [{ ...rectangle, fill: { kind: 'resourceRef', id: 'paint-2' } }],
          }),
          definePattern({
            name: 'second',
            emit: () => {
              secondCalled = true;
              return [rectangle];
            },
          }),
        ],
      }),
    ).toThrow(/Pattern 'first'.*fill.*paint-2.*not supplied/);
    expect(secondCalled).toBe(false);
  });

  it('拒绝嵌套图元的裁剪和资源引用', () => {
    const primitives: Array<ScenePrimitive> = [
      { type: 'group', clipRef: 'clip-1', children: [] },
      { type: 'group', children: [{ ...rectangle, fill: { kind: 'resourceRef', id: 'foreign' } }] },
      {
        type: 'path',
        commands: [],
        arrowEnd: {
          shape: 'nested',
          baseSize: 1,
          refX: 0,
          markerWidth: 1,
          markerHeight: 1,
          marker: [{ ...rectangle, stroke: { kind: 'resourceRef', id: 'foreign' } }],
        },
      },
    ];
    for (const primitive of primitives) {
      expect(() =>
        compileToScene(patternScene, {
          patterns: [definePattern({ name: 'first', emit: () => [primitive] })],
        }),
      ).toThrow(/Pattern 'first'.*(clipRef|not supplied)/);
    }
  });

  it('拒绝返回值及图元携带资源声明', () => {
    const outputs = [{ tileSize: 10, motif: [rectangle], resources: [] }, [{ ...rectangle, resources: [] }]];
    for (const output of outputs) {
      expect(() =>
        compileToScene(patternScene, {
          patterns: [definePattern({ name: 'first', emit: () => output })],
        }),
      ).toThrow(/cannot declare resources/);
    }
  });

  it('元数据中的同名字段不属于渲染资源', () => {
    const meta = { resources: [], clipRef: 'user-value', example: { kind: 'resourceRef', id: 'user-value' } };
    const scene = compileToScene(
      { ...patternScene, children: patternScene.children.slice(0, 1) },
      {
        patterns: [definePattern({ name: 'first', emit: () => [{ ...rectangle, meta }] })],
      },
    ).scene;
    const resource = scene.resources?.find(item => item.kind === 'paint' && 'tile' in item);
    expect(resource?.tile.motif[0].meta).toEqual(meta);
  });

  it('重复导入保留宿主及嵌套箭头的资源引用', () => {
    const resources: NonNullable<Scene['resources']> = [
      {
        kind: 'paint',
        id: 'first',
        spec: { kind: 'pattern', shape: 'custom' },
        tile: { size: 10, motif: [{ ...rectangle, fill: 'red' }] },
      },
      {
        kind: 'paint',
        id: 'second',
        spec: { kind: 'pattern', shape: 'custom' },
        tile: { size: 10, motif: [{ ...rectangle, fill: 'blue' }] },
      },
    ];
    const paint = createPaintRegistry(value => value);
    const clip = createClipRegistry(value => value);
    const windowId = clip.registerPath({ fillRule: 'nonzero', commands: [] });
    resources.push(...clip.getResources());
    importSceneResources(resources, paint, clip);
    importSceneResources(resources, paint, clip);
    expect(paint.getResources()).toHaveLength(2);
    expect(clip.getResources()).toHaveLength(1);
    const source: GroupPrimitive = {
      type: 'group',
      clipRef: windowId,
      children: [
        {
          type: 'path',
          commands: [],
          fill: { kind: 'resourceRef', id: 'first' },
          arrowEnd: {
            shape: 'test',
            baseSize: 10,
            refX: 0,
            markerWidth: 10,
            markerHeight: 10,
            marker: [{ ...rectangle, fill: { kind: 'resourceRef', id: 'second' } }],
          },
        },
      ],
    };
    const host = source;
    expect(host).toMatchObject({
      clipRef: windowId,
      children: [{ fill: { id: 'first' }, arrowEnd: { marker: [{ fill: { id: 'second' } }] } }],
    });
    expect(() =>
      visitSceneContent({ primitives: [host], resources: [...paint.getResources(), ...clip.getResources()] }),
    ).not.toThrow();
    expect(source.clipRef).toBe(windowId);
    expect(resources[0].id).toBe('first');
  });
  it('相同声明采用不同 Pattern 输出时资源独立，合并保留图元和资源引用', () => {
    const input: IRScene = { ...patternScene, children: patternScene.children.slice(0, 1) };
    const compile = (fill: string) =>
      compileToScene(input, {
        patterns: [definePattern({ name: 'first', emit: () => [{ ...rectangle, fill }] })],
      }).scene;
    const red = compile('red');
    const blue = compile('blue');
    const repeated = compile('red');
    expect(red.resources![0].id).toBe(repeated.resources![0].id);
    expect(red.resources![0].id).not.toBe(blue.resources![0].id);

    const shared = createSharedCompileContext();
    const outputs = [red, blue, repeated].map(scene => ({
      primitives: scene.primitives,
      resources: scene.resources!,
      bounds: [],
    }));
    const merged = assembleCompileOutputs(outputs, shared);
    expect(merged.resources).toHaveLength(2);
    expect(merged.primitives[0]).toBe(red.primitives[0]);
    expect(merged.primitives[1]).toBe(blue.primitives[0]);
    expect(merged.primitives[2]).toBe(repeated.primitives[0]);
    expect(() => visitSceneContent(merged)).not.toThrow();
    const reversed = assembleCompileOutputs([...outputs].reverse(), shared);
    expect(new Set(reversed.resources.map(resource => resource.id))).toEqual(
      new Set(merged.resources.map(resource => resource.id)),
    );
  });
  it('拒绝丢失和错误类型的资源引用及其使用路径', () => {
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 10, height: 10 },
      primitives: [{ type: 'rect', x: 0, y: 0, width: 1, height: 1, fill: { kind: 'resourceRef', id: 'missing' } }],
    };
    expect(() => visitSceneContent(scene)).toThrow(/primitives\[0\].fill.*missing/);
    scene.resources = [{ kind: 'clip', id: 'missing', path: { fillRule: 'nonzero', commands: [] } }];
    expect(() => visitSceneContent(scene)).toThrow(/expected paint resource/);
  });
  it('拒绝循环模式依赖性和循环组对象', () => {
    const primitive = {
      type: 'rect' as const,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      fill: { kind: 'resourceRef' as const, id: 'tile' },
    };
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 10, height: 10 },
      primitives: [primitive],
      resources: [
        { kind: 'paint', id: 'tile', spec: { kind: 'pattern', shape: 'dots' }, tile: { size: 10, motif: [primitive] } },
      ],
    };
    expect(() => visitSceneContent(scene)).toThrow(/cyclic/);
    const group: GroupPrimitive = { type: 'group', children: [] };
    group.children.push(group);
    expect(() => visitSceneContent({ primitives: [group] })).toThrow(/cyclic/);
  });
  it('访问每个宿主的共享内容，而不将重用视为循环', () => {
    const content = { type: 'rect' as const, id: 'local', x: 0, y: 0, width: 1, height: 1 };
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 10, height: 10 },
      primitives: ['A', 'B'].map(id => ({
        type: 'path',
        id,
        commands: [],
        arrowEnd: { shape: 'test', baseSize: 10, refX: 10, markerWidth: 10, markerHeight: 10, marker: [content] },
      })),
    };
    const owners: Array<string | undefined> = [];
    const scenePaths: Array<string> = [];
    visitSceneContent(scene, (_, site) => {
      if (site.isResourceContent) {
        owners.push(site.hostId);
        scenePaths.push(site.scenePath);
      }
    });
    expect(owners).toEqual(['A', 'B']);
    expect(scenePaths).toEqual(['primitives[0].arrowEnd.marker[0]', 'primitives[1].arrowEnd.marker[0]']);
    expect(content.id).toBe('local');
  });
});
