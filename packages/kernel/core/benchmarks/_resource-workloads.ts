import { literal, number, strictObject } from 'zod';

import { createRound } from '../src/compile/scene';
import type { ClipDefinition, PathCommand, ScenePrimitive } from '../src/contract';
import { defineClip, definePattern } from '../src/contract';
import { resolveClipRegistry, resolvePatternRegistry } from '../src/providers';
import { resolveClip, resolvePaint } from '../src/resolve';
import type { ClipResolution, InputPaintResolution } from '../src/resolve';

/** 统一使用默认两位小数精度 */
export const resourceRound = createRound(2);

/** 资源登记场景；等值对象独立解析，保留真实定义回调 */
export type ResourceMode = 'unique' | 'same-instance' | 'equal-object' | 'import';

/** 构造固定复杂度的绘制输入，计数器只观察 provider 执行 */
export const createPaintWorkload = (count: number, pattern: boolean, mode: ResourceMode) => {
  let providerCalls = 0;
  const motif: Array<ScenePrimitive> = Array.from({ length: 8 }, (_, index) => ({
    type: 'path',
    commands: [
      { kind: 'move', to: [0, index] },
      { kind: 'line', to: [8, index] },
    ],
    stroke: '#123456',
    strokeWidth: 1,
  }));
  const definition = definePattern({
    name: 'bench-lines',
    emit: () => {
      providerCalls++;
      return motif;
    },
  });
  const context = { patternRegistry: resolvePatternRegistry([definition]), round: resourceRound };
  const resolve = (index: number): InputPaintResolution | undefined =>
    resolvePaint(
      pattern
        ? { kind: 'pattern', shape: 'bench-lines', size: 16 + index }
        : {
            kind: 'linearGradient',
            angle: index,
            stops: [
              { offset: 0, color: '#123456' },
              { offset: 1, color: '#abcdef' },
            ],
          },
      context,
    );
  const first = resolve(0);
  const inputs = Array.from({ length: count }, (_, index) =>
    mode === 'same-instance' ? first : resolve(mode === 'equal-object' ? 0 : index),
  );
  return {
    inputs,
    calls: () => providerCalls,
    resetCalls: () => {
      providerCalls = 0;
    },
  };
};

/** 构造矩形或固定三十二段的裁剪路径，输入解析不计时 */
export const createClipWorkload = (count: number, complex: boolean, mode: ResourceMode) => {
  let providerCalls = 0;
  const pathDefinition = defineClip({
    kind: 'bench-path',
    schema: strictObject({ kind: literal('bench-path'), params: strictObject({ x: number() }) }),
    lower: shape => {
      const commands: Array<PathCommand> = [{ kind: 'move', to: [shape.params.x, 0] }];
      for (let index = 1; index <= 32; index++) {
        commands.push({ kind: 'line', to: [shape.params.x + index, index % 2] });
      }
      commands.push({ kind: 'close' });
      return { commands, fillRule: 'nonzero' };
    },
  });
  const definitions = resolveClipRegistry([pathDefinition]);
  const original = definitions.get(complex ? 'bench-path' : 'rect')!;
  const counted: ClipDefinition = {
    ...original,
    lower: (shape, context) => {
      providerCalls++;
      return original.lower(shape, context);
    },
  };
  const clipRegistry = new Map(definitions);
  clipRegistry.set(counted.kind, counted);
  const resolve = (index: number): ClipResolution =>
    resolveClip(
      complex
        ? { kind: 'bench-path', params: { x: index } }
        : { kind: 'rect', params: { x: index, y: 0, width: 10, height: 10 } },
      { clipRegistry },
    );
  const first = resolve(0);
  const inputs = Array.from({ length: count }, (_, index) =>
    mode === 'same-instance' ? first : resolve(mode === 'equal-object' ? 0 : index),
  );
  return {
    inputs,
    calls: () => providerCalls,
    resetCalls: () => {
      providerCalls = 0;
    },
  };
};
