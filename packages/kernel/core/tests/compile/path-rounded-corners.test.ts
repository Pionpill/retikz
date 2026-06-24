/**
 * compile + schema：path `roundedCorners` 几何圆角行为测试（ADR-01）
 * @description `roundedCorners` 把折线内部 line-line 接缝倒成切圆弧（改几何，区别于 lineJoin 仅描边）。
 *   编译实现尚未落地，故行为组（happy / clamp / 交互）当前应失败；schema accept/reject + JSON round-trip
 *   组当前应通过。坐标无法稳妥手算处用「与参考 IR 比对」或「断言命令 kind 序列 + arc 半径」结构化断言。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { PathSchema } from '../../src/schemas/path/path';
import type { GroupPrim, IR, ScenePrimitive } from '../../src';
import type { IRPath } from '../../src/schemas/path/path';
import type { PathPrim } from '../../src/primitive';
import { close } from '../helpers/path-command-factory';

const silent = { onWarn: () => {} };

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim => {
  const p = prims.find((x): x is PathPrim => x.type === 'path');
  if (!p) throw new Error('expected a PathPrim in scene');
  return p;
};

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });
const path = (...steps: Array<unknown>): IR => scene([{ type: 'path', children: steps as never }]);

/** 带 path 级字段（roundedCorners / marks / rotate / scale）的 path IR */
const pathWith = (config: Record<string, unknown>, ...steps: Array<unknown>): IR =>
  scene([{ type: 'path', ...config, children: steps as never }]);

/** 取编译后首个 PathPrim 的 commands 的 kind 序列（结构化断言用） */
const kinds = (ir: IR): Array<string> =>
  findPathPrim(compileToScene(ir, silent).primitives).commands.map(c => c.kind);

// ───────────────────────── Happy path ─────────────────────────

describe('roundedCorners happy：折线 line-line 内拐角倒圆', () => {
  it('三点折线单内拐角 → 命令序列为 move,line,arc,line（接缝插一段半径 r 的 arc，起末保持尖）', () => {
    const ir = pathWith(
      { roundedCorners: 2 },
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
      { type: 'step', kind: 'line', to: [10, 10] },
    );
    const cmds = findPathPrim(compileToScene(ir, silent).primitives).commands;
    // 结构断言：直角拐角处插一段 arc，两侧仍是 line；首点 move、末点 line 尖角
    expect(cmds.map(c => c.kind)).toEqual(['move', 'line', 'arc', 'line']);
    const arcCmd = cmds.find(c => c.kind === 'arc');
    expect(arcCmd).toBeDefined();
    if (arcCmd) expect(arcCmd.radius).toBe(2);
  });

  it('五点折线多内拐角 → 每个内 line-line 接缝各出一段半径 r 的 arc（共 3 个内拐角 → 3 段 arc）', () => {
    const ir = pathWith(
      { roundedCorners: 1 },
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
      { type: 'step', kind: 'line', to: [10, 10] },
      { type: 'step', kind: 'line', to: [20, 10] },
      { type: 'step', kind: 'line', to: [20, 20] },
    );
    const cmds = findPathPrim(compileToScene(ir, silent).primitives).commands;
    const arcs = cmds.filter(c => c.kind === 'arc');
    expect(arcs).toHaveLength(3);
    for (const a of arcs) expect(a.radius).toBe(1);
  });

  it('显式 line 回起点 + cycle → 起点接缝也倒（与隐式 cycle 等价闭合，回归 WARNING-3）', () => {
    // move A→line B→line C→line A→cycle：用户显式画回起点再 cycle，是有效闭合写法；
    // 三角形 3 顶点应全倒（含起点 A 接缝）→ 3 段 arc + close（修前 A 接缝按开放 run 保持尖，只 2 段）。
    const ir = pathWith(
      { roundedCorners: 1 },
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
      { type: 'step', kind: 'line', to: [10, 10] },
      { type: 'step', kind: 'line', to: [0, 0] },
      { type: 'step', kind: 'cycle' },
    );
    const cmds = findPathPrim(compileToScene(ir, silent).primitives).commands;
    expect(cmds.filter(c => c.kind === 'arc')).toHaveLength(3);
    expect(cmds[cmds.length - 1]).toEqual(close());
  });

  it('折线 + cycle 闭合 → 闭合接缝也倒（等价闭合 contour，所有拐角倒圆）', () => {
    const ir = pathWith(
      { roundedCorners: 1 },
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
      { type: 'step', kind: 'line', to: [10, 10] },
      { type: 'step', kind: 'line', to: [0, 10] },
      { type: 'step', kind: 'cycle' },
    );
    const cmds = findPathPrim(compileToScene(ir, silent).primitives).commands;
    // 闭合正方形 4 个拐角全倒 → 4 段 arc；末尾仍 close
    const arcs = cmds.filter(c => c.kind === 'arc');
    expect(arcs).toHaveLength(4);
    expect(cmds[cmds.length - 1]).toEqual(close());
  });
});

// ───────────────────────── 边界 ─────────────────────────

describe('roundedCorners 边界', () => {
  it('roundedCorners=0 → 命令与无该字段逐字一致（全尖角）', () => {
    const sharp = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
      { type: 'step', kind: 'line', to: [10, 10] },
    );
    const zero = pathWith(
      { roundedCorners: 0 },
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
      { type: 'step', kind: 'line', to: [10, 10] },
    );
    expect(findPathPrim(compileToScene(zero, silent).primitives).commands).toEqual(
      findPathPrim(compileToScene(sharp, silent).primitives).commands,
    );
  });

  it('省略 roundedCorners → 尖角（baseline，无 arc 命令）', () => {
    const sharp = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
      { type: 'step', kind: 'line', to: [10, 10] },
    );
    expect(kinds(sharp)).toEqual(['move', 'line', 'line']);
  });

  it('半径过大 → clamp 到相邻段允许的最大可行半径（与较小显式半径编译结果一致）', () => {
    // 段长各 10 → 单拐角可行最大半径 = 5；r=1000 应 clamp 到 5
    const clamped = pathWith(
      { roundedCorners: 1000 },
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
      { type: 'step', kind: 'line', to: [10, 10] },
    );
    const r5 = pathWith(
      { roundedCorners: 5 },
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
      { type: 'step', kind: 'line', to: [10, 10] },
    );
    expect(findPathPrim(compileToScene(clamped, silent).primitives).commands).toEqual(
      findPathPrim(compileToScene(r5, silent).primitives).commands,
    );
  });

  it('仅 2 点单 line（无内拐角）+ roundedCorners → 无 op（命令与尖角一致）', () => {
    const sharp = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
    );
    const rounded = pathWith(
      { roundedCorners: 3 },
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
    );
    expect(findPathPrim(compileToScene(rounded, silent).primitives).commands).toEqual(
      findPathPrim(compileToScene(sharp, silent).primitives).commands,
    );
  });
});

// ───────────────────────── 错误路径（schema） ─────────────────────────

describe('roundedCorners schema 拒绝非法半径', () => {
  const withRounded = (roundedCorners: unknown): unknown => ({
    type: 'path',
    roundedCorners,
    children: [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
      { type: 'step', kind: 'line', to: [10, 10] },
    ],
  });

  it('roundedCorners=-1（负数）被 .nonnegative() 拒绝', () => {
    const parsed = PathSchema.safeParse(withRounded(-1));
    expect(parsed.success).toBe(false);
  });

  it('roundedCorners=NaN 被 .finite() 拒绝', () => {
    expect(PathSchema.safeParse(withRounded(Number.NaN)).success).toBe(false);
  });

  it('roundedCorners=Infinity 被 .finite() 拒绝', () => {
    expect(PathSchema.safeParse(withRounded(Number.POSITIVE_INFINITY)).success).toBe(false);
  });

  it('roundedCorners=0 与合法正数被接受', () => {
    expect(PathSchema.safeParse(withRounded(0)).success).toBe(true);
    expect(PathSchema.safeParse(withRounded(4)).success).toBe(true);
  });
});

// ───────────────────────── 交互 ─────────────────────────

describe('roundedCorners 交互', () => {
  it('接缝一侧为 curve → 该接缝保持尖，同路径其余 line-line 接缝仍倒', () => {
    // move→line→line(内拐角A,应倒)→curve(line↔curve 接缝B,应保持尖)
    const ir = pathWith(
      { roundedCorners: 1 },
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
      { type: 'step', kind: 'line', to: [10, 10] },
      { type: 'step', kind: 'curve', to: [20, 20], control: [15, 10] },
    );
    const cmds = findPathPrim(compileToScene(ir, silent).primitives).commands;
    // 只有 line-line 接缝 A 倒出一段 arc；line↔curve 接缝 B 保持尖（curve 段不被 fillet）
    const arcs = cmds.filter(c => c.kind === 'arc');
    expect(arcs).toHaveLength(1);
    // curve 段仍以 quad/cubic 形式出现（未被 fillet 改写为尖角以外的东西）
    expect(cmds.some(c => c.kind === 'quad' || c.kind === 'cubic')).toBe(true);
  });

  it('含 fold step → fold 相关接缝保持尖角（拍板：fold 不参与），其余 line-line 仍倒', () => {
    // move→line→line(内拐角A,line-line,应倒)→fold(line↔fold 接缝,应保持尖)
    const ir = pathWith(
      { roundedCorners: 1 },
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
      { type: 'step', kind: 'line', to: [10, 10] },
      { type: 'step', kind: 'fold', via: '-|', to: [20, 20] },
    );
    const cmds = findPathPrim(compileToScene(ir, silent).primitives).commands;
    // fold 自身展开为两段直角直线但其接缝不被 fillet：仅 line-line 接缝 A 出 1 段 arc
    const arcs = cmds.filter(c => c.kind === 'arc');
    expect(arcs).toHaveLength(1);
  });

  it('roundedCorners + marks → mark 按倒角后新弧长重定位（倒角与尖角下 mark 落点/产物不同）', () => {
    const steps = [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
      { type: 'step', kind: 'line', to: [10, 10] },
    ];
    const marks: IRPath['marks'] = [{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth' } }];
    const sharp = scene([{ type: 'path', marks, children: steps as never }]);
    const rounded = scene([
      { type: 'path', roundedCorners: 3, marks, children: steps as never },
    ]);
    // mark 沿弧长归一化定位；倒角缩短了路径总弧长并改变中点几何，
    // 故倒角后 mark group 的 transforms（平移/旋转）应与尖角不同。
    const markGroup = (ir: IR): GroupPrim | undefined => {
      const walk = (list: ReadonlyArray<ScenePrimitive>): GroupPrim | undefined => {
        for (const p of list) {
          if (p.type === 'group' && p.transforms && p.transforms.length > 0) return p;
          if (p.type === 'group') {
            const inner = walk(p.children);
            if (inner) return inner;
          }
        }
        return undefined;
      };
      return walk(compileToScene(ir, silent).primitives);
    };
    const gSharp = markGroup(sharp);
    const gRounded = markGroup(rounded);
    expect(gSharp).toBeDefined();
    expect(gRounded).toBeDefined();
    // 倒角后 mark 定位发生变化（弧长重算），两组 transforms 不应逐字相等
    expect(gRounded?.transforms).not.toEqual(gSharp?.transforms);
  });

  it('roundedCorners + path rotate → 先算几何圆角再施加 path 变换（内层 commands = 旋转前的倒角几何）', () => {
    const steps = [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
      { type: 'step', kind: 'line', to: [10, 10] },
    ];
    const roundedNoRot = scene([{ type: 'path', roundedCorners: 2, children: steps as never }]);
    const roundedRot = scene([
      { type: 'path', roundedCorners: 2, rotate: 90, children: steps as never },
    ]);
    // 变换顺序硬契约：几何先倒角（内层 path commands 不被 path transform 污染），
    // 旋转由外层 group 承担 → 旋转版内层 path commands 应与未旋转版逐字一致。
    const findPath = (list: ReadonlyArray<ScenePrimitive>): PathPrim | undefined => {
      for (const p of list) {
        if (p.type === 'path') return p;
        if (p.type === 'group') {
          const inner = findPath(p.children);
          if (inner) return inner;
        }
      }
      return undefined;
    };
    const pNo = findPath(compileToScene(roundedNoRot, silent).primitives);
    const pRot = findPath(compileToScene(roundedRot, silent).primitives);
    expect(pNo).toBeDefined();
    expect(pRot).toBeDefined();
    expect(pRot?.commands).toEqual(pNo?.commands);
    // 旋转产生带 transforms 的外层 group
    const hasTransformGroup = compileToScene(roundedRot, silent).primitives.some(
      p => p.type === 'group' && p.transforms !== undefined && p.transforms.length > 0,
    );
    expect(hasTransformGroup).toBe(true);
  });

  it('roundedCorners + path scale → 几何先倒角再缩放（内层倒角 commands = 缩放前几何）', () => {
    const steps = [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [10, 0] },
      { type: 'step', kind: 'line', to: [10, 10] },
    ];
    const roundedNoScale = scene([{ type: 'path', roundedCorners: 2, children: steps as never }]);
    const roundedScale = scene([
      { type: 'path', roundedCorners: 2, scale: 2, children: steps as never },
    ]);
    const findPath = (list: ReadonlyArray<ScenePrimitive>): PathPrim | undefined => {
      for (const p of list) {
        if (p.type === 'path') return p;
        if (p.type === 'group') {
          const inner = findPath(p.children);
          if (inner) return inner;
        }
      }
      return undefined;
    };
    const pNo = findPath(compileToScene(roundedNoScale, silent).primitives);
    const pScaled = findPath(compileToScene(roundedScale, silent).primitives);
    expect(pNo).toBeDefined();
    expect(pScaled).toBeDefined();
    expect(pScaled?.commands).toEqual(pNo?.commands);
  });
});

// ───────────────────────── JSON round-trip ─────────────────────────

describe('roundedCorners JSON round-trip', () => {
  it('含 roundedCorners 的 IRPath 经 JSON.stringify/parse 往返后 parse 深等于原 parse', () => {
    const original: IRPath = {
      type: 'path',
      roundedCorners: 8,
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 0] },
        { type: 'step', kind: 'line', to: [10, 10] },
      ],
    };
    const parsedOriginal = PathSchema.parse(original);
    const roundTripped = PathSchema.parse(JSON.parse(JSON.stringify(parsedOriginal)));
    expect(roundTripped).toEqual(parsedOriginal);
    expect(roundTripped.roundedCorners).toBe(8);
  });
});
