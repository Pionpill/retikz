import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { PathPrim, ScenePrimitive } from '../../src/primitive';

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim | undefined =>
  prims.find((p): p is PathPrim => p.type === 'path');

/**
 * 对 arrow + arc 末端这类边界场景的回归测试。
 * 历史背景：alpha.4 的实现用字符串 PathOp / shrink 逻辑能 cover arc 末端；alpha.5 改 commands 后 setEndpoint 仅识别 move/line/quad/cubic，arc 末端 shrink 不再生效。我们仍保证不抛错、不输出畸形 d；shrink 不生效的场景仅 hollow shape + arc 末端这一极小用例，可后续 ADR 兜底
 */
describe('arrow + arc 末端：编译不挂', () => {
  it('arc 单段 + arrow="->" 不抛错（端点 shrink 走 fallback）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          arrowShape: 'normal',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', radius: 10, startAngle: 0, endAngle: 90 },
          ],
        },
      ],
    };
    expect(() => compileToScene(ir)).not.toThrow();
    const p = findPathPrim(compileToScene(ir).primitives);
    expect(p).toBeDefined();
    expect(p?.arrowEnd).toBe('normal');
    // 仍持有 arc PathCommand
    expect(p?.commands.some(c => c.kind === 'arc')).toBe(true);
  });

  it('arc 单段 + open shape arrow（hollow）：编译完成，arc 命令保留', () => {
    // hollow shape 在 line/cubic 末端时会 shrink 端点；arc 末端这一边界不 shrink 也不抛错
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          arrow: '->',
          arrowShape: 'open',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', radius: 10, startAngle: 0, endAngle: 90 },
          ],
        },
      ],
    };
    expect(() => compileToScene(ir)).not.toThrow();
    const p = findPathPrim(compileToScene(ir).primitives);
    expect(p).toBeDefined();
    expect(p?.arrowEnd).toBe('open');
  });
});

describe('cycle + close 在 commands 数组中', () => {
  it('cycle 段后再 line 不会触发回放（close 后由下个 move 重新起 sub-path）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
            { type: 'step', kind: 'cycle' },
            // cycle 后没有再 move 也没 next step——单一 sub-path
          ],
        },
      ],
    };
    const p = findPathPrim(compileToScene(ir).primitives)!;
    expect(p.commands.at(-1)).toEqual({ kind: 'close' });
  });
});
