# `@retikz/vanilla` 命令式 builder API 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 `@retikz/vanilla` 加一套命令式 builder（`figure`/`node`/`draw`/`coordinate`/`scope` + `Figure`），让无框架用户像 React 一样用具名图元 + 自定义 shape 构图，产出同一份 IR 再走现有 renderer。

**Architecture:** builder 函数是**纯函数**——`node`/`draw`/`coordinate`/`scope` 直接构造 core 已有的 `IRChild` 对象（way 经 `parseWay`），`figure` 把它们装配成 `Figure`（持 `.ir` + `.mount`/`.toSvgString`/`.toCanvas` + fluent 糖）。单一数据源是 **core IR 类型 + `compileToScene` 的 zod schema**：所有 `*Config` 用 `Omit<IRx, …>` 从 core IR 类型派生，core 加字段自动流入，零手维护第二份字段清单。`Figure` 的渲染方法把 `this.ir`（IR，非 Figure）交给底层 `mountSvg`/`renderToSvgString`；标准 `mountSvg(el, figure)` 经 symbol brand 守卫 delegate 回 `figure.mount`，一层间接、无递归。

**Tech Stack:** TypeScript · `@retikz/core`（IR 类型 / `parseWay` / `DrawWay` / `compileToScene` / `CompileOptions`）· `@retikz/svg`（`buildSvgDocument`）· `@retikz/canvas`（`renderToCanvas`）· Vitest（node + jsdom 双环境）。

**关联：** [ADR-04](../decisions/core/v0/v0.3/v0.3-alpha.1/04-vanilla-imperative-builder.md)。

---

## 文件结构

新建（`@retikz/vanilla`）：

- `packages/vanilla/src/builder/types.ts` — 全部 `*Config` + `Way` + `Child`，派生自 core IR 类型。
- `packages/vanilla/src/builder/isFigure.ts` — `FIGURE_BRAND` symbol + `isFigure()` 守卫（叶子模块，零内部 import，断 mountSvg↔Figure 运行时环）。
- `packages/vanilla/src/builder/node.ts` — `node()` 重载 → `IRNode`。
- `packages/vanilla/src/builder/draw.ts` — `draw()` → `IRPath`（way 走 `parseWay`）。
- `packages/vanilla/src/builder/coordinate.ts` — `coordinate()` → `IRCoordinate`。
- `packages/vanilla/src/builder/scope.ts` — `scope()` 重载 + `ScopeBuilder` → `IRScope`。
- `packages/vanilla/src/builder/figure.ts` — `figure()` 重载（薄壳，装配 `Figure`）。
- `packages/vanilla/src/Figure.ts` — `Figure` 类型 + `createFigure()` 工厂（`.ir` / `.mount` / `.toSvgString` / `.toCanvas` / fluent）。

修改：

- `packages/vanilla/src/types.ts` — `CommonOptions` 扩成 `{ idPrefix?, width?, height? } & CompileOptions`；`RenderInput` 扩成 `Scene | IR | Figure`。
- `packages/vanilla/src/toScene.ts` — 透传全套 `CompileOptions`（不再只挑 `measureText`）。
- `packages/vanilla/src/mountSvg.ts` — 入参接受 `Figure`（delegate）；给底层 IR/Scene 路径加 `width`/`height` 写回根 `<svg>`。
- `packages/vanilla/src/renderToSvgString.ts` — 入参接受 `Figure`（delegate）；加 `width`/`height` 注入 `<svg>` 串。
- `packages/vanilla/src/index.ts` — 导出新 API。

测试：`tests/builder-node.test.ts` · `builder-draw.test.ts` · `builder-coordinate.test.ts` · `builder-scope.test.ts` · `builder-figure.test.ts` · `builder-render.test.ts`（jsdom）· `builder-canvas.test.ts`（jsdom）。

**测试命令（每个 task 用）：** `pnpm --filter @retikz/vanilla exec vitest run <文件相对路径>`
**类型检查：** `pnpm --filter @retikz/vanilla exec tsc --noEmit`
**lint：** `pnpm --filter @retikz/vanilla lint`

---

## Task 1: `node()` + builder 共享类型

**Files:**
- Create: `packages/vanilla/src/builder/types.ts`
- Create: `packages/vanilla/src/builder/node.ts`
- Test: `packages/vanilla/tests/builder-node.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// packages/vanilla/tests/builder-node.test.ts
import { describe, expect, it } from 'vitest';
import { node } from '../src/builder/node';

describe('@retikz/vanilla node()', () => {
  it('node-to-ir：node(id, config) → 正确 IRNode（字段映射）', () => {
    const n = node('a', { position: [0, 0], shape: 'circle', text: 'A', fill: '#f00' });
    expect(n).toEqual({
      type: 'node',
      id: 'a',
      position: [0, 0],
      shape: 'circle',
      text: 'A',
      fill: '#f00',
    });
  });

  it('node-overload：node(config) 匿名（无 id）、node(id, config) 具名', () => {
    const anon = node({ position: [60, 0], text: '匿名' });
    expect(anon).toEqual({ type: 'node', position: [60, 0], text: '匿名' });
    expect('id' in anon).toBe(false);

    const named = node('b', { position: [120, 0], text: 'B' });
    expect(named.id).toBe('b');
  });

  it('node-overload-no-config：node(id) / node() 仅 id / 全空也合法', () => {
    expect(node('c')).toEqual({ type: 'node', id: 'c' });
    expect(node()).toEqual({ type: 'node' });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @retikz/vanilla exec vitest run tests/builder-node.test.ts`
Expected: FAIL（`Cannot find module '../src/builder/node'`）。

- [ ] **Step 3: 写共享类型**

```ts
// packages/vanilla/src/builder/types.ts
import type {
  CompileOptions,
  IRChild,
  IRCoordinate,
  IRNode,
  IRPath,
  IRScope,
  IRViewBox,
  WayDSL,
} from '@retikz/core';

/** builder 函数返回的 IR 子节点（node / draw / coordinate / scope 的产物） */
export type Child = IRChild;

/** node 的 config：从 IRNode 派生，剔除判别符 type 与提为 positional 的 id */
export type NodeConfig = Omit<IRNode, 'type' | 'id'>;

/** draw 的 config：从 IRPath 派生，剔除 type 与由 way 生成的 children（steps） */
export type DrawConfig = Omit<IRPath, 'type' | 'children'>;

/** coordinate 的 config：从 IRCoordinate 派生，剔除 type 与 positional 的 id（剩 position 必填） */
export type CoordinateConfig = Omit<IRCoordinate, 'type' | 'id'>;

/** scope 的 config：从 IRScope 派生，剔除 type 与单列的 children（含 transforms 等全部样式默认） */
export type ScopeConfig = Omit<IRScope, 'type' | 'children'>;

/** draw 的 way：直接复用 core 的 way DSL 全集（id 串 / 坐标 / Cycle / 折角 / 相对 / 曲线 / 弧 …） */
export type Way = WayDSL;

/**
 * figure 的 config
 * @description `viewBox` → IR.viewBox（内容坐标系）；`width`/`height` → 根 `<svg>` 显示尺寸（adapter 职责）；
 *   `idPrefix` → SVG 资源 id 前缀；其余（measureText / shapes / arrows / patterns / pathGenerators /
 *   padding / precision / nodeDistance / onWarn）派生自 core `CompileOptions`、原样喂 compileToScene。
 */
export type FigureConfig = {
  width?: number;
  height?: number;
  viewBox?: IRViewBox;
  idPrefix?: string;
} & CompileOptions;
```

- [ ] **Step 4: 实现 `node()`**

```ts
// packages/vanilla/src/builder/node.ts
import type { Child, NodeConfig } from './types';

/**
 * 构造一个 node IR 子节点
 * @description `node(config)` 匿名；`node(id, config)` 具名（id 提为首 positional，可选）。
 *   纯构造已存在的 IRNode（`{ type:'node', id?, ...config }`），字段不自列、由 core schema 在 compile 期校验。
 */
export function node(config?: NodeConfig): Child;
export function node(id: string, config?: NodeConfig): Child;
export function node(arg1?: string | NodeConfig, arg2?: NodeConfig): Child {
  if (typeof arg1 === 'string') {
    return { type: 'node', id: arg1, ...arg2 };
  }
  return { type: 'node', ...arg1 };
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm --filter @retikz/vanilla exec vitest run tests/builder-node.test.ts`
Expected: PASS（3 个 case 全绿）。

- [ ] **Step 6: 类型检查**

Run: `pnpm --filter @retikz/vanilla exec tsc --noEmit`
Expected: 无错误。

- [ ] **Step 7: 提交**

> ⚠️ 执行到提交步骤前向用户当次确认（per-action commit 约定）。

```bash
git add packages/vanilla/src/builder/types.ts packages/vanilla/src/builder/node.ts packages/vanilla/tests/builder-node.test.ts
git commit -m ":sparkles: vanilla builder node() + 共享 config 类型"
```

---

## Task 2: `draw()`

**Files:**
- Create: `packages/vanilla/src/builder/draw.ts`
- Test: `packages/vanilla/tests/builder-draw.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// packages/vanilla/tests/builder-draw.test.ts
import { describe, expect, it } from 'vitest';
import { DrawWay, parseWay } from '@retikz/core';
import { draw } from '../src/builder/draw';

describe('@retikz/vanilla draw()', () => {
  it('draw-way-reuses-core：draw(way) 的 steps 与 core parseWay 逐字一致', () => {
    const p = draw(['a', 'b'], { arrow: '->' });
    expect(p.type).toBe('path');
    expect(p.arrow).toBe('->');
    expect(p.children).toEqual(parseWay(['a', 'b']));
  });

  it('draw-coords：way 接坐标点', () => {
    const p = draw([[0, 0], [50, 50]], { dashPattern: [4, 2] });
    expect(p.children).toEqual(parseWay([[0, 0], [50, 50]]));
    expect(p.dashPattern).toEqual([4, 2]);
  });

  it('way-full-set：Cycle / 折角 / 相对 / 曲线算子全集与 core parseWay 一致', () => {
    const way = [
      [0, 0] as [number, number],
      DrawWay.Hv,
      [40, 0] as [number, number],
      { position: [10, 10] as [number, number], type: DrawWay.Relative },
      { curve: [20, 30] as [number, number] },
      [60, 60] as [number, number],
      DrawWay.Cycle,
    ];
    const p = draw(way);
    expect(p.children).toEqual(parseWay(way));
  });

  it('draw-no-config：draw(way) 无 config 也合法', () => {
    const p = draw(['a', 'b']);
    expect(p).toEqual({ type: 'path', children: parseWay(['a', 'b']) });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @retikz/vanilla exec vitest run tests/builder-draw.test.ts`
Expected: FAIL（`Cannot find module '../src/builder/draw'`）。

- [ ] **Step 3: 实现 `draw()`**

```ts
// packages/vanilla/src/builder/draw.ts
import { parseWay } from '@retikz/core';
import type { Child, DrawConfig, Way } from './types';

/**
 * 构造一个 path IR 子节点
 * @description `way` 经 core `parseWay` 解析成 IRStep 序列（与 React `<Draw way>` 同一解析、同一全集，零漂移）；
 *   `config` 是 path 级样式（arrow / stroke / dashPattern / fill …），原样并入。
 */
export const draw = (way: Way, config?: DrawConfig): Child => ({
  type: 'path',
  children: parseWay(way),
  ...config,
});
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @retikz/vanilla exec vitest run tests/builder-draw.test.ts`
Expected: PASS（4 个 case 全绿）。

- [ ] **Step 5: 提交**

```bash
git add packages/vanilla/src/builder/draw.ts packages/vanilla/tests/builder-draw.test.ts
git commit -m ":sparkles: vanilla builder draw()（way 走 core parseWay 全集）"
```

---

## Task 3: `coordinate()`

**Files:**
- Create: `packages/vanilla/src/builder/coordinate.ts`
- Test: `packages/vanilla/tests/builder-coordinate.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// packages/vanilla/tests/builder-coordinate.test.ts
import { describe, expect, it } from 'vitest';
import { coordinate } from '../src/builder/coordinate';

describe('@retikz/vanilla coordinate()', () => {
  it('coordinate-to-ir：coordinate(id, { position }) → 正确 IRCoordinate', () => {
    const c = coordinate('mid', { position: [60, 40] });
    expect(c).toEqual({ type: 'coordinate', id: 'mid', position: [60, 40] });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @retikz/vanilla exec vitest run tests/builder-coordinate.test.ts`
Expected: FAIL（`Cannot find module '../src/builder/coordinate'`）。

- [ ] **Step 3: 实现 `coordinate()`**

```ts
// packages/vanilla/src/builder/coordinate.ts
import type { Child, CoordinateConfig } from './types';

/**
 * 构造一个 coordinate IR 子节点（具名点占位，不绘制）
 * @description `id` 必要（coordinate 存在意义就是被引用），提为首 positional；`position` 在 config 必填
 *   （类型层 `CoordinateConfig` 派生自 `IRCoordinate` 故 position 非可选），缺失在编译期由 schema 报错。
 */
export const coordinate = (id: string, config: CoordinateConfig): Child => ({
  type: 'coordinate',
  id,
  ...config,
});
```

> 注：`coordinate-needs-position`（缺 position 报错）的错误路径覆盖放在 Task 6 的 render 测试里走 `compileToScene` 校验，这里类型层已强制 `config: CoordinateConfig` 必含 position。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @retikz/vanilla exec vitest run tests/builder-coordinate.test.ts`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/vanilla/src/builder/coordinate.ts packages/vanilla/tests/builder-coordinate.test.ts
git commit -m ":sparkles: vanilla builder coordinate()"
```

---

## Task 4: `scope()` + `ScopeBuilder`

**Files:**
- Create: `packages/vanilla/src/builder/scope.ts`
- Test: `packages/vanilla/tests/builder-scope.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// packages/vanilla/tests/builder-scope.test.ts
import { describe, expect, it } from 'vitest';
import { node } from '../src/builder/node';
import { scope } from '../src/builder/scope';

describe('@retikz/vanilla scope()', () => {
  it('scope-children：scope(config, children[]) → IRScope，children 原样', () => {
    const s = scope({ transforms: [{ kind: 'translate', x: 40, y: 20 }] }, [
      node('c', { position: [0, 80], text: 'C' }),
    ]);
    expect(s).toEqual({
      type: 'scope',
      transforms: [{ kind: 'translate', x: 40, y: 20 }],
      children: [{ type: 'node', id: 'c', position: [0, 80], text: 'C' }],
    });
  });

  it('scope-transforms-order：transforms 逐字保序，无 xshift/yshift 顶层字段', () => {
    const t1 = { kind: 'translate', x: 10, y: 0 } as const;
    const t2 = { kind: 'rotate', angle: 30 } as const;
    const s = scope({ transforms: [t1, t2] }, []);
    expect(s.type).toBe('scope');
    if (s.type !== 'scope') throw new Error('unreachable');
    expect(s.transforms).toEqual([t1, t2]); // 数组顺序 = 应用顺序
    expect('xshift' in s).toBe(false);
    expect('yshift' in s).toBe(false);
  });

  it('scope-builder：scope(config, build) 回调式收集 children，等价数组式', () => {
    const viaArray = scope({ transforms: [{ kind: 'translate', x: 40, y: 0 }] }, [
      node('c', { position: [0, 0], text: 'C' }),
    ]);
    const viaBuild = scope({ transforms: [{ kind: 'translate', x: 40, y: 0 }] }, (s) =>
      s.node('c', { position: [0, 0], text: 'C' }),
    );
    expect(viaBuild).toEqual(viaArray);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @retikz/vanilla exec vitest run tests/builder-scope.test.ts`
Expected: FAIL（`Cannot find module '../src/builder/scope'`）。

- [ ] **Step 3: 实现 `scope()` + `ScopeBuilder`**

```ts
// packages/vanilla/src/builder/scope.ts
import { coordinate } from './coordinate';
import { draw } from './draw';
import { node } from './node';
import type { Child, CoordinateConfig, DrawConfig, NodeConfig, ScopeConfig, Way } from './types';

/**
 * scope 的 fluent 收集器
 * @description `scope(config, build)` 把它交给回调；`.node/.draw/.coordinate/.scope` 把子节点推进内部数组、
 *   链式返回 this。与 hyperscript 数组形态产同一份 children。
 */
export type ScopeBuilder = {
  node: (...args: Parameters<typeof node>) => ScopeBuilder;
  draw: (way: Way, config?: DrawConfig) => ScopeBuilder;
  coordinate: (id: string, config: CoordinateConfig) => ScopeBuilder;
  scope: (config: ScopeConfig, build: (s: ScopeBuilder) => void) => ScopeBuilder;
};

const createScopeBuilder = (sink: Child[]): ScopeBuilder => {
  const self: ScopeBuilder = {
    node(...args: [NodeConfig?] | [string, NodeConfig?]) {
      sink.push(node(...(args as Parameters<typeof node>)));
      return self;
    },
    draw(way, config) {
      sink.push(draw(way, config));
      return self;
    },
    coordinate(id, config) {
      sink.push(coordinate(id, config));
      return self;
    },
    scope(config, build) {
      sink.push(scope(config, build));
      return self;
    },
  };
  return self;
};

/**
 * 构造一个 scope IR 子节点（分组容器 + 样式默认 + transforms）
 * @description `config` 与 core `IRScope` / React `<Scope>` 顶层逐字一致——只透传 `transforms`（IRTransform[]，
 *   合并顺序 = 数组顺序，首元素最内层）+ 样式默认，**不自造 xshift/yshift 糖**。children 两形态：数组
 *   （hyperscript）或回调（fluent，经 ScopeBuilder 收集）。
 */
export function scope(config: ScopeConfig, children: Child[]): Child;
export function scope(config: ScopeConfig, build: (s: ScopeBuilder) => void): Child;
export function scope(config: ScopeConfig, arg: Child[] | ((s: ScopeBuilder) => void)): Child {
  let children: Child[];
  if (typeof arg === 'function') {
    children = [];
    arg(createScopeBuilder(children));
  } else {
    children = arg;
  }
  return { type: 'scope', ...config, children };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @retikz/vanilla exec vitest run tests/builder-scope.test.ts`
Expected: PASS（3 个 case 全绿）。

- [ ] **Step 5: 类型检查**

Run: `pnpm --filter @retikz/vanilla exec tsc --noEmit`
Expected: 无错误。

- [ ] **Step 6: 提交**

```bash
git add packages/vanilla/src/builder/scope.ts packages/vanilla/tests/builder-scope.test.ts
git commit -m ":sparkles: vanilla builder scope() + ScopeBuilder（只透传 transforms）"
```

---

## Task 5: `Figure` 工厂 + `figure()`（纯 IR + fluent）

**Files:**
- Create: `packages/vanilla/src/builder/isFigure.ts`
- Create: `packages/vanilla/src/Figure.ts`
- Create: `packages/vanilla/src/builder/figure.ts`
- Test: `packages/vanilla/tests/builder-figure.test.ts`

- [ ] **Step 1: 写失败测试（只验 `.ir` 装配 + hyperscript≡fluent，不碰 DOM）**

```ts
// packages/vanilla/tests/builder-figure.test.ts
import { describe, expect, it } from 'vitest';
import { coordinate } from '../src/builder/coordinate';
import { draw } from '../src/builder/draw';
import { figure } from '../src/builder/figure';
import { node } from '../src/builder/node';

describe('@retikz/vanilla figure() — IR 装配', () => {
  it('figure-ir：hyperscript 把 children 装进 { version:1, type:scene }', () => {
    const fig = figure({ width: 400, height: 300 }, [
      node('a', { position: [0, 0], text: 'A' }),
      draw(['a', 'b'], { arrow: '->' }),
    ]);
    expect(fig.ir.version).toBe(1);
    expect(fig.ir.type).toBe('scene');
    expect(fig.ir.children).toEqual([
      node('a', { position: [0, 0], text: 'A' }),
      draw(['a', 'b'], { arrow: '->' }),
    ]);
  });

  it('figure-viewbox：config.viewBox → IR.viewBox；width/height 不进 IR', () => {
    const fig = figure({ width: 400, height: 300, viewBox: { x: 0, y: 0, width: 100, height: 80 } });
    expect(fig.ir.viewBox).toEqual({ x: 0, y: 0, width: 100, height: 80 });
    expect('width' in fig.ir).toBe(false);
    expect('height' in fig.ir).toBe(false);
  });

  it('hyperscript-eq-fluent：同图两路 ir 相等', () => {
    const hyper = figure({ width: 400, height: 300 }, [
      node('a', { position: [0, 0], text: 'A' }),
      draw(['a', 'b'], { arrow: '->' }),
      coordinate('mid', { position: [60, 40] }),
    ]);
    const fluent = figure({ width: 400, height: 300 })
      .node('a', { position: [0, 0], text: 'A' })
      .draw(['a', 'b'], { arrow: '->' })
      .coordinate('mid', { position: [60, 40] });
    expect(fluent.ir).toEqual(hyper.ir);
  });

  it('figure-no-config：figure() 全空 → 空 scene', () => {
    expect(figure().ir).toEqual({ version: 1, type: 'scene', children: [] });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @retikz/vanilla exec vitest run tests/builder-figure.test.ts`
Expected: FAIL（`Cannot find module '../src/builder/figure'`）。

- [ ] **Step 3: 写 `isFigure` 守卫（叶子模块）**

```ts
// packages/vanilla/src/builder/isFigure.ts
import type { Figure } from '../Figure';

/** Figure 品牌标记（Symbol.for 跨包/重复 import 仍同一）；标准 mountSvg/renderToSvgString 用它区分 Figure 与 IR/Scene */
export const FIGURE_BRAND: unique symbol = Symbol.for('retikz.vanilla.figure');

/** 运行时判断一个值是不是 Figure（带 brand）；纯结构检查、零内部 import → 不与 mountSvg/Figure 形成运行时环 */
export const isFigure = (value: unknown): value is Figure =>
  typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[FIGURE_BRAND] === true;
```

- [ ] **Step 4: 写 `Figure` 工厂**

```ts
// packages/vanilla/src/Figure.ts
import type { IR } from '@retikz/core';
import { coordinate } from './builder/coordinate';
import { draw } from './builder/draw';
import { FIGURE_BRAND } from './builder/isFigure';
import { node } from './builder/node';
import { scope } from './builder/scope';
import type { Child, CoordinateConfig, DrawConfig, FigureConfig, NodeConfig, ScopeConfig, Way } from './builder/types';
import type { ScopeBuilder } from './builder/scope';
import { mountSvg } from './mountSvg';
import { renderToSvgString } from './renderToSvgString';
import type { MountOptions, RenderToStringOptions, VanillaView } from './types';

/**
 * 命令式 builder 的装配产物 —— 唯一返回类型
 * @description hyperscript（`figure(config, children)`）与 fluent（`figure(config).node(...)`）都产它、可混用、`.ir` 一致。
 *   `.mount`/`.toSvgString`/`.toCanvas` 把 `this.ir`（IR，非 Figure）交底层 renderer；fluent 方法往内部 children 追加、链式返回 this。
 */
export type Figure = {
  readonly [FIGURE_BRAND]: true;
  readonly ir: IR;
  mount: (container: Element, options?: MountOptions) => VanillaView;
  toSvgString: (options?: RenderToStringOptions) => string;
  // toCanvas 在 Task 7 接上；此处先声明，Task 7 实现
  node: (...args: Parameters<typeof node>) => Figure;
  draw: (way: Way, config?: DrawConfig) => Figure;
  coordinate: (id: string, config: CoordinateConfig) => Figure;
  scope: (config: ScopeConfig, build: (s: ScopeBuilder) => void) => Figure;
};

/** figure() 的内部入口：装配 Figure（持 config + children，方法闭包其上） */
export const createFigure = (config: FigureConfig, children: Child[]): Figure => {
  /** call-site options 覆盖 figure 存的 config（call-site wins）；Task 6 扩成全套 compile opts + width/height */
  const renderOptions = (callSite?: MountOptions): MountOptions => ({
    idPrefix: config.idPrefix,
    measureText: config.measureText,
    ...callSite,
  });

  const fig: Figure = {
    [FIGURE_BRAND]: true,
    get ir(): IR {
      return {
        version: 1,
        type: 'scene',
        children,
        ...(config.viewBox ? { viewBox: config.viewBox } : {}),
      };
    },
    mount(container, options) {
      return mountSvg(container, fig.ir, renderOptions(options));
    },
    toSvgString(options) {
      return renderToSvgString(fig.ir, renderOptions(options));
    },
    node(...args) {
      children.push(node(...args));
      return fig;
    },
    draw(way, drawConfig) {
      children.push(draw(way, drawConfig));
      return fig;
    },
    coordinate(id, coordConfig) {
      children.push(coordinate(id, coordConfig));
      return fig;
    },
    scope(scopeConfig, build) {
      children.push(scope(scopeConfig, build));
      return fig;
    },
  };
  return fig;
};
```

> 注：`mount`/`toSvgString` 传给底层的是 `fig.ir`（IR），底层 Figure-守卫只对真 Figure 触发，故无递归。`toCanvas` 与 `width`/`height` 透传在 Task 6/7 接上——本 task 的测试只验 `.ir` 与 fluent，不触发渲染。

- [ ] **Step 5: 写 `figure()` 重载薄壳**

```ts
// packages/vanilla/src/builder/figure.ts
import { createFigure, type Figure } from '../Figure';
import type { Child, FigureConfig } from './types';

/**
 * 命令式 builder 入口
 * @description `figure(config?)` 起 fluent（空 children，链式追加）；`figure(config, children)` 起 hyperscript。
 *   两路都返回同一 `Figure` 类型、`.ir` 一致、可混用。
 */
export function figure(config?: FigureConfig): Figure;
export function figure(config: FigureConfig, children: Child[]): Figure;
export function figure(config: FigureConfig = {}, children: Child[] = []): Figure {
  return createFigure(config, children);
}
```

- [ ] **Step 6: 跑测试确认通过**

Run: `pnpm --filter @retikz/vanilla exec vitest run tests/builder-figure.test.ts`
Expected: PASS（4 个 case 全绿）。

- [ ] **Step 7: 类型检查**

Run: `pnpm --filter @retikz/vanilla exec tsc --noEmit`
Expected: 无错误。

- [ ] **Step 8: 提交**

```bash
git add packages/vanilla/src/builder/isFigure.ts packages/vanilla/src/Figure.ts packages/vanilla/src/builder/figure.ts packages/vanilla/tests/builder-figure.test.ts
git commit -m ":sparkles: vanilla builder figure() + Figure 工厂（IR 装配 + fluent）"
```

---

## Task 6: 底层渲染管线扩容（全套 CompileOptions + width/height + 接受 Figure）

**Files:**
- Modify: `packages/vanilla/src/types.ts`
- Modify: `packages/vanilla/src/toScene.ts`
- Modify: `packages/vanilla/src/mountSvg.ts`
- Modify: `packages/vanilla/src/renderToSvgString.ts`
- Modify: `packages/vanilla/src/Figure.ts:renderOptions`
- Test: `packages/vanilla/tests/builder-render.test.ts`

- [ ] **Step 1: 写失败测试（jsdom：尺寸输出 / options 优先级 / 接受 Figure / 自定义 shape / 错误路径）**

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { ShapeDefinition } from '@retikz/core';
import { figure } from '../src/builder/figure';
import { node } from '../src/builder/node';
import { coordinate } from '../src/builder/coordinate';
import { mountSvg, renderToSvgString } from '../src';

/** 最小自定义 shape：正六边形（外接半径=内容半宽），仅供透传测试 */
const hexagon: ShapeDefinition = {
  anchors: () => ({}),
  geometry: ({ center, halfWidth, halfHeight }) => {
    const r = Math.max(halfWidth, halfHeight);
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i;
      return `${center.x + r * Math.cos(a)},${center.y + r * Math.sin(a)}`;
    });
    return { kind: 'polygon', points: pts.join(' ') };
  },
};

describe('@retikz/vanilla builder ↔ render 管线', () => {
  it('width-height-emitted：figure({width,height}) 的 toSvgString/mount 根 <svg> 带 width/height', () => {
    const fig = figure({ width: 400, height: 300 }, [node('a', { position: [0, 0], text: 'A' })]);
    const str = fig.toSvgString();
    expect(str).toMatch(/<svg[^>]*\bwidth="400"/);
    expect(str).toMatch(/<svg[^>]*\bheight="300"/);

    const c = document.createElement('div');
    const view = fig.mount(c);
    expect(view.root.getAttribute('width')).toBe('400');
    expect(view.root.getAttribute('height')).toBe('300');
  });

  it('width-height-omitted：未给时只有 viewBox、无 width/height（不回归）', () => {
    const str = figure({}, [node('a', { position: [0, 0], text: 'A' })]).toSvgString();
    expect(str).toMatch(/viewBox=/);
    expect(str).not.toMatch(/<svg[^>]*\bwidth=/);
  });

  it('options-call-wins：figure({idPrefix:a}).toSvgString({idPrefix:b}) 用 b', () => {
    const fig = figure({ idPrefix: 'aaa' }, [
      node('a', {
        position: [0, 0],
        shape: 'rectangle',
        minimumWidth: 40,
        minimumHeight: 20,
        fill: { type: 'linearGradient', stops: [{ offset: 0, color: '#f00' }, { offset: 1, color: '#00f' }] },
      }),
    ]);
    const out = fig.toSvgString({ idPrefix: 'bbb' });
    expect(out).toContain('retikz-paint-bbb-');
    expect(out).not.toContain('retikz-paint-aaa-');
  });

  it('figure-feeds-standalone：mountSvg/renderToSvgString 直接接受 Figure', () => {
    const fig = figure({ width: 120, height: 90 }, [node('a', { position: [0, 0], text: 'A' })]);
    const c = document.createElement('div');
    const view = mountSvg(c, fig);
    expect(c.querySelector('svg')).toBe(view.root);
    expect(view.root.getAttribute('width')).toBe('120');
    expect(renderToSvgString(fig)).toMatch(/<svg/);
  });

  it('figure-hyperscript-mount：figure(opts, [...]).mount 挂出 SVG DOM', () => {
    const c = document.createElement('div');
    figure({ width: 200, height: 150 }, [
      node('a', { position: [0, 0], text: 'A' }),
      node('b', { position: [80, 0], text: 'B' }),
      draw(['a', 'b'], { arrow: '->' }),
    ]).mount(c);
    expect(c.querySelector('svg')).not.toBeNull();
    expect(c.querySelector('text, rect, g, path')).not.toBeNull();
  });

  it('custom-shape-passthrough：figure({shapes}) 注入自定义 shape，节点用它渲染', () => {
    const str = figure({ width: 100, height: 100, shapes: { hexagon } }, [
      node('a', { position: [0, 0], shape: 'hexagon', minimumWidth: 40, minimumHeight: 40, fill: '#0a0' }),
    ]).toSvgString();
    // hexagon geometry 产 polygon → 输出含 <polygon
    expect(str).toContain('<polygon');
  });

  it('invalid-config-throws：坏 config 字段 → compileToScene schema 报错、不静默', () => {
    const bad = figure({}, [node('a', { position: [0, 0], shape: 123 as unknown as string })]);
    expect(() => bad.toSvgString()).toThrow();
  });

  it('coordinate-needs-position：coordinate 缺 position（绕过类型）→ 编译期报错', () => {
    const fig = figure({}, [
      node('a', { position: [0, 0], text: 'A' }),
      coordinate('m', {} as never),
      draw(['a', 'm']),
    ]);
    expect(() => fig.toSvgString()).toThrow();
  });
});
```

需在文件顶部补 `import { draw } from '../src/builder/draw';`（上面用到）。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @retikz/vanilla exec vitest run tests/builder-render.test.ts`
Expected: FAIL（`width-height-emitted` 等失败：底层未写 width/height、未接 Figure；`custom-shape-passthrough` 失败：toScene 未透传 shapes）。

- [ ] **Step 3: 扩 `types.ts`（CommonOptions 全套 compile opts + width/height；RenderInput 接受 Figure）**

```ts
// packages/vanilla/src/types.ts
import type { CompileOptions, IR, Scene } from '@retikz/core';
import type { Figure } from './Figure';

/** mountSvg / renderToSvgString 的入参：已编译 `Scene`、待编译 `IR`，或命令式 builder 的 `Figure` */
export type RenderInput = Scene | IR | Figure;

/**
 * 两个入口共享的选项
 * @description `idPrefix`：SVG 资源 id 前缀，确定性（SSR↔客户端一致），缺省 `'r'`。`width`/`height`：写回根
 *   `<svg>` 的显示尺寸（adapter 职责，`@retikz/svg` 只产 viewBox）；缺省不写、由 CSS/容器定。其余继承 core
 *   `CompileOptions`（`measureText` / `shapes` / `arrows` / `patterns` / `pathGenerators` / `padding` /
 *   `precision` / `nodeDistance` / `onWarn`）——收 `ir` 时透传给 `compileToScene`，收 `scene` 时忽略。
 */
export type CommonOptions = {
  idPrefix?: string;
  width?: number;
  height?: number;
} & CompileOptions;

export type RenderToStringOptions = CommonOptions;
export type MountOptions = CommonOptions;

/** `mountSvg` 返回的句柄：`root` 元素 identity 跨 `update` 稳定、永不失效 */
export type VanillaView = {
  /** 挂载出的根 `<svg>`；跨 `update` 同一元素（不被替换） */
  readonly root: SVGSVGElement;
  /** 整图重渲染（原地复用 `root`，清子节点 + 重设 root attrs + 重物化），不承诺局部 patch */
  update: (next: RenderInput) => void;
  /** 卸载：移除 `root`、置 view 失效（再调 `update` 抛、`dispose` noop） */
  dispose: () => void;
};
```

- [ ] **Step 4: 改 `toScene.ts`（透传全套 CompileOptions，剥掉 render-only 键）**

```ts
// packages/vanilla/src/toScene.ts
import { type CompileOptions, type Scene, compileToScene } from '@retikz/core';
import type { CommonOptions, RenderInput } from './types';

/**
 * 入参归一成 `Scene`
 * @description 已是 `Scene`（有 `primitives`）直接用；否则当 `IR` 经 `compileToScene` 编译。剥掉 render-only 键
 *   （`idPrefix`/`width`/`height`），其余即 core `CompileOptions` 原样透传（`measureText` 缺省时 core 回退
 *   `fallbackMeasurer`，Node 下确定可跑）。注：调用方须先把 `Figure` 解成 `ir`，此处不认 Figure。
 */
export const toScene = (input: Exclude<RenderInput, { readonly ir: unknown }> | Scene, options: CommonOptions): Scene => {
  if ('primitives' in input) return input;
  const { idPrefix: _idPrefix, width: _width, height: _height, ...compile }: CommonOptions = options;
  const compileOptions: CompileOptions = compile;
  return compileToScene(input, compileOptions);
};
```

> 说明：`toScene` 只处理 `IR | Scene`；`Figure` 由 `mountSvg`/`renderToSvgString` 在更外层 delegate 掉，绝不会到这。`RenderInput` 现含 `Figure`，故签名用 `Exclude<…>` 排除带 `ir` 的 Figure 形态保持类型精确（运行时入口已守卫）。

- [ ] **Step 5: 改 `mountSvg.ts`（接受 Figure delegate + 写 width/height）**

```ts
// packages/vanilla/src/mountSvg.ts
import { buildSvgDocument } from '@retikz/svg';
import { isFigure } from './builder/isFigure';
import { applyAttrs, svgNodeToDom } from './svgNodeToDom';
import { toScene } from './toScene';
import type { MountOptions, RenderInput, VanillaView } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** 默认资源 id 前缀（确定性）；多实例同页须经 `options.idPrefix` 显式区分 */
const DEFAULT_ID_PREFIX = 'r';

/**
 * 把 IR / Scene / Figure 挂成真实 SVG DOM（无框架浏览器 runtime）
 * @description 收 `Figure` 时 delegate 给 `figure.mount`（Figure 自持 config，call-site options 覆盖）。收
 *   IR/Scene 时：`toScene` → `buildSvgDocument` → 物化进**稳定复用**的 root `<svg>`；`width`/`height` 若给则
 *   写回根（`@retikz/svg` 只产 viewBox，显示尺寸是 adapter 本分）。`update` 原地重渲染、root identity 跨 update
 *   不变。DOM 仅在调用时惰性触碰，`import` 本模块不碰 DOM——守 SSR 导入安全。
 */
export const mountSvg = (container: Element, input: RenderInput, options: MountOptions = {}): VanillaView => {
  if (isFigure(input)) return input.mount(container, options);
  if (typeof Element === 'undefined' || !(container instanceof Element)) {
    throw new Error('mountSvg: container must be a DOM Element.');
  }
  const idPrefix = options.idPrefix ?? DEFAULT_ID_PREFIX;
  const root = document.createElementNS(SVG_NS, 'svg');

  const renderInto = (next: RenderInput): void => {
    if (isFigure(next)) {
      throw new Error('mountSvg: view.update does not accept a Figure; pass figure.ir instead.');
    }
    const doc = buildSvgDocument(toScene(next, options), { idPrefix });
    // 清空 root（子节点 + 自身 attrs），再写新 doc → root 元素复用、引用不失效
    while (root.firstChild) root.removeChild(root.firstChild);
    for (const attr of [...root.attributes]) root.removeAttribute(attr.name);
    applyAttrs(root, doc);
    if (options.width !== undefined) root.setAttribute('width', String(options.width));
    if (options.height !== undefined) root.setAttribute('height', String(options.height));
    for (const child of doc.children ?? []) {
      root.appendChild(typeof child === 'string' ? document.createTextNode(child) : svgNodeToDom(child));
    }
  };

  renderInto(input);
  container.appendChild(root);

  let disposed = false;
  return {
    root,
    update(next) {
      if (disposed) throw new Error('mountSvg: view already disposed.');
      renderInto(next);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.remove();
    },
  };
};
```

- [ ] **Step 6: 改 `renderToSvgString.ts`（接受 Figure delegate + 注入 width/height）**

```ts
// packages/vanilla/src/renderToSvgString.ts
import { renderToSvgString as buildSvgString } from '@retikz/svg';
import { isFigure } from './builder/isFigure';
import { toScene } from './toScene';
import type { RenderInput, RenderToStringOptions } from './types';

/** 默认资源 id 前缀（确定性）；多实例同页须经 `options.idPrefix` 显式区分 */
const DEFAULT_ID_PREFIX = 'r';

/** 把 `width`/`height` 注入到开头的 `<svg` 标签（@retikz/svg 只产 viewBox） */
const injectSize = (svg: string, width?: number, height?: number): string => {
  if (width === undefined && height === undefined) return svg;
  const attrs = [width !== undefined ? ` width="${width}"` : '', height !== undefined ? ` height="${height}"` : ''].join('');
  return svg.replace(/^<svg/, `<svg${attrs}`);
};

/**
 * 把 IR / Scene / Figure 渲染成 SVG 字符串（SSR / 构建期）
 * @description 收 `Figure` 时 delegate 给 `figure.toSvgString`。收 IR/Scene 时薄包 `@retikz/svg`：`toScene`
 *   （ir 缺省走 core fallback measurer、确定性）→ 序列化 → 若给 `width`/`height` 注入根 `<svg>`。零 DOM。
 */
export const renderToSvgString = (input: RenderInput, options: RenderToStringOptions = {}): string => {
  if (isFigure(input)) return input.toSvgString(options);
  const svg = buildSvgString(toScene(input, options), { idPrefix: options.idPrefix ?? DEFAULT_ID_PREFIX });
  return injectSize(svg, options.width, options.height);
};
```

- [ ] **Step 7: 升级 `Figure.ts` 的 `renderOptions`（透传全套 compile opts + width/height，call-site wins）**

把 Task 5 的 `renderOptions` 替换为：

```ts
  /** call-site options 覆盖 figure 存的 config（call-site wins）：viewBox 已并进 ir，其余全透传 */
  const renderOptions = (callSite?: MountOptions): MountOptions => {
    const { viewBox: _viewBox, ...stored } = config;
    return { ...stored, ...callSite };
  };
```

（`config` 即 `FigureConfig`，去掉 `viewBox`（已进 `ir`）后剩 `width`/`height`/`idPrefix` + 全套 `CompileOptions`，结构上即 `MountOptions`。）

- [ ] **Step 8: 跑测试确认通过**

Run: `pnpm --filter @retikz/vanilla exec vitest run tests/builder-render.test.ts`
Expected: PASS（8 个 case 全绿）。

- [ ] **Step 9: 类型检查 + 全包测试不回归**

Run: `pnpm --filter @retikz/vanilla exec tsc --noEmit`
Run: `pnpm --filter @retikz/vanilla test:run`
Expected: tsc 无错误；含此前 12 个 runtime/render 测试在内全绿。

- [ ] **Step 10: 提交**

```bash
git add packages/vanilla/src/types.ts packages/vanilla/src/toScene.ts packages/vanilla/src/mountSvg.ts packages/vanilla/src/renderToSvgString.ts packages/vanilla/src/Figure.ts packages/vanilla/tests/builder-render.test.ts
git commit -m ":sparkles: vanilla 渲染管线接受 Figure + 写回 width/height + 透传 CompileOptions"
```

---

## Task 7: `Figure.toCanvas`

**Files:**
- Modify: `packages/vanilla/src/Figure.ts`
- Test: `packages/vanilla/tests/builder-canvas.test.ts`

- [ ] **Step 1: 写失败测试（jsdom + 手搓 fake 2d context，避开 jsdom 无 canvas 实现）**

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { figure } from '../src/builder/figure';
import { node } from '../src/builder/node';

/** 录制型 fake 2d context：只验 Figure.toCanvas 把编译好的 Scene 喂进 canvas renderer（不验像素） */
const makeFakeCanvas = (width = 200, height = 150): HTMLCanvasElement => {
  const calls: string[] = [];
  const ctx = new Proxy(
    { canvas: null as unknown, fillStyle: '#000', strokeStyle: '#000' },
    {
      get(target, prop) {
        if (prop in target) return (target as Record<string, unknown>)[prop];
        return (...args: unknown[]) => {
          calls.push(String(prop));
          void args;
        };
      },
      set(target, prop, value) {
        (target as Record<string, unknown>)[prop] = value;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  const canvas = {
    width,
    height,
    getContext: (kind: string) => (kind === '2d' ? ctx : null),
    __calls: calls,
  } as unknown as HTMLCanvasElement;
  return canvas;
};

describe('@retikz/vanilla Figure.toCanvas', () => {
  it('to-canvas-renders：编译 ir → Scene 并喂给 canvas renderer（setTransform 被调）', () => {
    const canvas = makeFakeCanvas();
    const fig = figure({ width: 200, height: 150 }, [
      node('a', { position: [0, 0], shape: 'rectangle', minimumWidth: 40, minimumHeight: 20, fill: '#0a0' }),
    ]);
    expect(() => fig.toCanvas(canvas)).not.toThrow();
    const calls = (canvas as unknown as { __calls: string[] }).__calls;
    expect(calls).toContain('setTransform');
  });

  it('to-canvas-no-context-throws：getContext 返回 null → 可诊断 throw', () => {
    const canvas = { width: 10, height: 10, getContext: () => null } as unknown as HTMLCanvasElement;
    const fig = figure({}, [node('a', { position: [0, 0], text: 'A' })]);
    expect(() => fig.toCanvas(canvas)).toThrow(/context/i);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @retikz/vanilla exec vitest run tests/builder-canvas.test.ts`
Expected: FAIL（`fig.toCanvas is not a function`）。

- [ ] **Step 3: 给 `Figure` 加 `toCanvas`**

在 `Figure.ts` 顶部补 import：

```ts
import { renderToCanvas } from '@retikz/canvas';
import type { RenderOptions } from '@retikz/canvas';
import { toScene } from './toScene';
```

在 `Figure` 类型里 `toSvgString` 之后补一行：

```ts
  toCanvas: (canvas: HTMLCanvasElement, options?: RenderOptions) => void;
```

在 `createFigure` 的 `fig` 对象里 `toSvgString` 之后补方法：

```ts
    toCanvas(canvas, options) {
      // figure 的 compile 选项（shapes/measureText…）走 toScene；canvas RenderOptions 是独立一套，原样透传
      const { viewBox: _viewBox, idPrefix: _idPrefix, width: _width, height: _height, ...compile } = config;
      const scene = toScene(fig.ir, { ...compile });
      renderToCanvas(canvas, scene, options ?? {});
    },
```

> 注：`renderToCanvas` 收 `Scene` 非 IR，故先 `toScene(fig.ir, compile)` 编译；`compile` 仅含 `CompileOptions`（已剥 render-only 键）。canvas 显示尺寸由 `canvas.width/height` 决定，与 svg 的 `width/height` 无关，故不传。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @retikz/vanilla exec vitest run tests/builder-canvas.test.ts`
Expected: PASS（2 个 case 全绿）。

- [ ] **Step 5: 类型检查**

Run: `pnpm --filter @retikz/vanilla exec tsc --noEmit`
Expected: 无错误。

- [ ] **Step 6: 提交**

```bash
git add packages/vanilla/src/Figure.ts packages/vanilla/tests/builder-canvas.test.ts
git commit -m ":sparkles: vanilla Figure.toCanvas（复用 @retikz/canvas renderToCanvas）"
```

---

## Task 8: 公开导出 + 全量绿

**Files:**
- Modify: `packages/vanilla/src/index.ts`

- [ ] **Step 1: 写失败测试（公开 API 表面）**

在 `packages/vanilla/tests/builder-figure.test.ts` 末尾追加一个 describe：

```ts
describe('@retikz/vanilla 公开导出', () => {
  it('public-exports：figure/node/draw/coordinate/scope 从包根导出', async () => {
    const api = await import('../src');
    expect(typeof api.figure).toBe('function');
    expect(typeof api.node).toBe('function');
    expect(typeof api.draw).toBe('function');
    expect(typeof api.coordinate).toBe('function');
    expect(typeof api.scope).toBe('function');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @retikz/vanilla exec vitest run tests/builder-figure.test.ts`
Expected: FAIL（`api.figure is not a function` —— 包根尚未导出）。

- [ ] **Step 3: 扩 `index.ts` 导出新 API**

```ts
// packages/vanilla/src/index.ts
/**
 * @retikz/vanilla 公开 API —— framework-free runtime / SSR 入口 + 命令式 builder
 *
 * 无框架 / SSR 的 runtime 门面：组合 `@retikz/svg`（descriptor / 字符串）与 `@retikz/canvas`（后置），
 * 不自维护第二套 Scene→输出内核。`renderToSvgString` 走 SSR（零 DOM）；`mountSvg` 走浏览器 DOM 挂载。
 * `figure`/`node`/`draw`/`coordinate`/`scope` 是命令式 builder：用具名图元 + 自定义 shape 构图、产同一份 IR。
 * 模块顶层不触碰任何 DOM 全局——`import` 在纯 Node 下安全。
 */
export { renderToSvgString } from './renderToSvgString';
export { mountSvg } from './mountSvg';
export { figure } from './builder/figure';
export { node } from './builder/node';
export { draw } from './builder/draw';
export { coordinate } from './builder/coordinate';
export { scope } from './builder/scope';
export type { Figure } from './Figure';
export type { ScopeBuilder } from './builder/scope';
export type {
  Child,
  NodeConfig,
  DrawConfig,
  CoordinateConfig,
  ScopeConfig,
  FigureConfig,
  Way,
} from './builder/types';
export type { RenderInput, CommonOptions, MountOptions, RenderToStringOptions, VanillaView } from './types';
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm --filter @retikz/vanilla exec vitest run tests/builder-figure.test.ts`
Expected: PASS。

- [ ] **Step 5: 全包绿（test / lint / build / typecheck）**

Run: `pnpm --filter @retikz/vanilla test:run`
Run: `pnpm --filter @retikz/vanilla lint`
Run: `pnpm --filter @retikz/vanilla exec tsc --noEmit`
Run: `pnpm --filter @retikz/vanilla build`
Expected: 全绿；lint 零 error；tsc 无错误；build 产物正常（含新 builder 入口）。

> 若 lint 报 `method-signature-style` / `no-unnecessary-condition` / `no-unnecessary-type-assertion`（vanilla 包历史踩过），按既有风格修：方法用 function-property（`name: (args) => ret`）声明、删多余断言、`!== undefined` 而非 `!== null`。

- [ ] **Step 6: 提交**

```bash
git add packages/vanilla/src/index.ts packages/vanilla/tests/builder-figure.test.ts
git commit -m ":sparkles: vanilla 导出命令式 builder 公开 API"
```

---

## Self-Review（计划作者已核对，执行者无需重跑）

- **Spec 覆盖**：ADR-04 签名集（figure/node/draw/coordinate/scope 全重载）→ Task 1–5；`Figure`（.ir/.mount/.toSvgString/.toCanvas + fluent）→ Task 5–8；尺寸输出节 → Task 6；options 优先级 → Task 5（renderOptions）+ Task 6（升级）；way 全集 → Task 2；scope 只透传 transforms → Task 4；文本测量承 ADR-03（缺省 fallback）→ toScene 透传 measureText（Task 6）。13 个测试象限 case 全落到 Task 1/2/4/6/7（node-to-ir、draw-way-reuses-core、figure-hyperscript-mount、node-overload、hyperscript-eq-fluent、scope-transforms-order、width-height-emitted、invalid-config-throws、coordinate-needs-position、custom-shape-passthrough、figure-feeds-standalone、way-full-set、options-call-wins）。
- **类型一致**：`renderOptions`（Task 5 定义、Task 6 升级，同名）；`createFigure`/`figure`/`isFigure`/`FIGURE_BRAND` 跨 task 同名；`toScene` 签名变更只在 Task 6、其调用方（mountSvg/renderToSvgString）同 task 一并改。
- **无 placeholder**：每个改码步骤都给完整代码。

## 不在本计划（独立 spec/plan）

- **docs 站点 ComponentPreview 加 "vanilla" 代码视图**（React/IR 同级第三个 toggle，展示等价 vanilla builder 代码）——属文档站特性、依赖本包落地后再做；按 ADR-04「alpha.3+」与 demo-first 约定，单开一份 plan。完成本计划后须跟进，勿跳过。
