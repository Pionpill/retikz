# @retikz/core 重构方案

> 本文档说明 retikz 重写时 `@retikz/core` 包的**具体设计与实施步骤**。
>
> - 架构与原则层面（AI 友好优先、IR 居中、Scene 抽象、Canvas 原生路径、跨平台 adapter 模式等）见 [`DESIGN.md`](./DESIGN.md)
> - React 适配层（Kernel / Sugar 组件、JSX DSL、SVG 渲染管道）的实现方案见 [`REACT-ADAPTER.md`](./REACT-ADAPTER.md)
> - 本文档**只**回答"core 包内部怎么组织、各模块怎么实现、按什么顺序落地"
>
> 文档分两类内容：
> - **拍板项**：本次重写前必须决定的具体设计
> - **实施清单**：可以直接动手的步骤
>
> ## ⚠ 关键约束
>
> `@retikz/core` **零 React 依赖、零 DOM 依赖、纯 TypeScript**。
> 任何 React 组件、JSX、hooks、`document` 等内容**全部**属于 `@retikz/react`，不在本文档范围。

---

## 0. 与参考实现的关系

当前 `packages/core/src/` 是上一版（一年前）写的参考实现。重写时**不受其约束**，但部分模块可参考。

| 模块 | 处理方式 | 备注 |
|---|---|---|
| `model/equation/line.ts` | 借鉴 → 进新 core | 二维直线方程、交点、距离等纯几何，逻辑没问题，按新风格重写 |
| `model/geometry/point/` | 借鉴 → 进新 core | 笛卡尔/极坐标转换，新版按 zod schema 重组 |
| `utils/math.ts`、`utils/css.ts` | 借鉴 → 进新 core | 精度处理、CSS 长度解析，可直接搬 |
| `utils/style/stroke.ts` | 借鉴 → 进新 core | strokeType 枚举与转换表，重写时清理 13 层三元 |
| `model/component/node.ts` | 部分借鉴 → 进新 core | NodeModel 的 listener 系统不要；几何方法（getCrossPoint、getOuterPoint）可借鉴 |
| `components/draw/segment/useConvertWay.ts` | 重做 → 进新 core | 旧版在 useMemo 里做副作用；新版作为 Scene 编译器内部纯函数 |
| `hooks/context/` | 重做 → **进 @retikz/react** | 旧版的 useNodes/useScope/usePath/useCalculate 是 React Context，不属于 core |
| `components/` 全部 | 推倒重做 → **进 @retikz/react** | 旧版组件直接驱动 SVG 输出；新版组件只描述 IR，且本来就是 React 组件 |
| `container/Surface.tsx` | 删（旧 viewBox 逻辑有 bug）；新职责进 @retikz/react | |
| `container/Group.tsx` | 删 | 单层 SVG `<g>` 包装，新结构里不需要单独抽 |

整体迁移哲学：
- **几何 / 数学 / 解析这种"纯函数模块"** → 重写后进新 core
- **任何 React 组件 / hook / 生命周期 / SVG 输出** → 进 @retikz/react（见 [`REACT-ADAPTER.md`](./REACT-ADAPTER.md)）

---

## 1. 包结构与目录

```
packages/core/
├── src/
│   ├── ir/                       # IR 定义（zod schema 单一来源）
│   │   ├── schema.ts             # 主 schema（Scene、Node、Path、Step、...）
│   │   ├── types.ts              # z.infer 派生 TS 类型 + 公开导出
│   │   ├── meta.ts               # meta 扩展点 schema（domain 包用）
│   │   ├── version.ts            # 版本号 + migrate(ir) 注册表
│   │   └── json-schema.ts        # zod → JSON Schema 导出（build 时落盘）
│   │
│   ├── scene/                    # IR → Scene 编译器
│   │   ├── compile.ts            # compileToScene(ir, options): Scene
│   │   ├── primitives.ts         # ScenePrimitive 类型 + 工厂函数
│   │   ├── layout/               # 节点位置 / anchor / 路径分段
│   │   │   ├── node.ts
│   │   │   ├── path.ts
│   │   │   └── anchor.ts
│   │   └── text-metrics.ts       # 字体度量接口 + 默认 fallback
│   │
│   ├── parsers/                  # 纯函数解析器（被 adapter 内的 sugar 复用）
│   │   ├── parseWay.ts           # way 数组 DSL → IR step 节点数组
│   │   └── (未来: parseTikz.ts)  # v3.x 加 TikZ 文本 DSL parser
│   │
│   ├── geometry/                 # 纯函数几何（无任何依赖）
│   │   ├── line.ts               # 直线方程、交点、距离、角度
│   │   ├── point.ts              # 笛卡尔 / 极坐标
│   │   ├── rect.ts               # 矩形几何（顶点、中点、三等分点）
│   │   ├── path.ts               # 路径分段、向量
│   │   └── precision.ts          # 数值精度调整
│   │
│   ├── utils/                    # 通用工具
│   │   ├── css.ts                # CSS 长度（px/em/rem/%）解析
│   │   ├── compare.ts            # 深/浅相等
│   │   └── string.ts
│   │
│   └── index.ts                  # 公开 API
│
├── tests/                        # 测试目录与 src/ 镜像
│   ├── ir/
│   ├── scene/
│   ├── parsers/
│   └── geometry/
│
├── package.json                  # 零 peerDep；deps: zod, zod-to-json-schema
└── tsconfig.json
```

### 模块依赖规则（不准违反）

```
geometry  ←─ scene
              ↑
              ir
              ↑
           parsers
```

- `geometry`、`utils`：零依赖
- `ir`：仅依赖 `zod`
- `scene`：依赖 `ir` + `geometry` + `utils`
- `parsers`：依赖 `ir`（输出 IR 节点）
- **任何模块都不准 `import 'react'` / `import 'react-dom'`**（CI 检查）
- **任何模块都不准依赖 DOM API**（`document`、`canvas`、`window`）——浏览器特化能力由 adapter 注入
- `geometry` 不准 import 任何 `src/` 内其他模块（保持纯几何）

---

## 2. IR 实现细节

### 2.1 zod schema 起点

```ts
// src/ir/schema.ts
import { z } from 'zod';

export const Position = z.tuple([z.number(), z.number()])
  .describe('笛卡尔坐标 [x, y]');

export const TargetSchema = z.union([
  Position,
  z.string().describe('节点 id 引用'),
  z.object({
    node: z.string(),
    anchor: z.string().optional(),
  }).describe('带 anchor 的节点引用'),
]);

export const StepSchema = z.discriminatedUnion('kind', [
  z.object({ type: z.literal('step'), kind: z.literal('move'), to: TargetSchema }),
  z.object({ type: z.literal('step'), kind: z.literal('line').default('line'), to: TargetSchema }),
  // ... 其他 kind
]).describe('路径动作');

export const NodeSchema = z.object({
  type: z.literal('node'),
  id: z.string().optional(),
  position: Position,
  // ... 其他属性
  children: z.array(z.lazy(() => IRNodeSchema)).optional(),
  meta: MetaSchema.optional(),
}).describe('节点');

export const PathSchema = z.object({ /* ... */ });

export const IRNodeSchema = z.discriminatedUnion('type', [
  NodeSchema,
  PathSchema,
  StepSchema,
  // ...
]);

export const SceneIR = z.object({
  version: z.literal(1),
  type: z.literal('scene'),
  children: z.array(IRNodeSchema),
});
```

### 2.2 类型导出

```ts
// src/ir/types.ts
import type { z } from 'zod';
import { SceneIR, IRNodeSchema, NodeSchema, PathSchema, StepSchema } from './schema';

export type IR = z.infer<typeof SceneIR>;
export type IRNode = z.infer<typeof IRNodeSchema>;
export type IRNodeOf<K extends string> = Extract<IRNode, { type: K }>;
// ... 等
```

### 2.3 JSON Schema 导出

build 阶段执行：

```ts
// scripts/build-json-schema.ts
import { zodToJsonSchema } from 'zod-to-json-schema';
import { SceneIR } from '../src/ir/schema';
import * as fs from 'node:fs';

const jsonSchema = zodToJsonSchema(SceneIR, 'retikz-ir');
fs.writeFileSync('dist/schema.json', JSON.stringify(jsonSchema, null, 2));
```

`dist/schema.json` 作为公开产物，给 LLM、跨语言客户端、第三方编辑器使用。

### 2.4 版本与迁移

```ts
// src/ir/version.ts
export const CURRENT_VERSION = 1;

type Migration = (ir: any) => any;
const migrations: Record<number, Migration> = {
  // 1: ir => ir,  // v1 → v2 时填
};

export function migrate(ir: any): IR {
  let current = ir;
  while (current.version < CURRENT_VERSION) {
    current = migrations[current.version](current);
    current.version += 1;
  }
  return SceneIR.parse(current);
}
```

启动重写时只有 v1，不需要写迁移函数；但**架构必须就位**，避免日后改 schema 时无处下手。

---

## 3. Kernel / Sugar 组件不在 core

Kernel 组件（`<Path>` `<Step>` `<Node>` 等）和 Sugar 组件（`<Draw>`）都是 React 组件，属于 [`@retikz/react`](./REACT-ADAPTER.md)。本文档不展开。

但 core 需要确保：

- **IR schema（§2）必须先于组件设计完成**——组件 props 类型直接复用 `z.infer<typeof XxxSchema>`
- **Step 的 `kind` 等枚举值定义在 IR schema 中**，组件层只是 UI 表达
- **`parseWay` 等 sugar 解析器是纯函数，住在 core 的 `parsers/` 目录**（见 §4）

→ React 适配层的具体设计、待拍板项（折角语法、Target 表达、anchor 表达、Step 命名、组件 → IR 写入机制）见 [`REACT-ADAPTER.md`](./REACT-ADAPTER.md) §2。

---

## 4. parseWay 与未来文本 DSL 解析器

`parseWay` 是 Sugar 的语义核心——它把 way 数组 DSL 翻译成 IR step 节点序列。**作为纯函数住在 core 的 `parsers/`**，被 React adapter 的 `<Draw>` 组件调用，未来 Vue / Svelte adapter 也复用同一个实现。

### 4.1 way 数组规范

```ts
// src/parsers/parseWay.ts
import type { Position, IRStepNode } from '../ir';

export type WayItem =
  | string                            // 节点引用 'A' / 'A.north'
  | Position                          // 坐标 [x, y]
  | { via: '-|' | '|-' }              // 折角
  | { rel: Position; move?: boolean } // 相对位移 ++ / +
  | { curve: { out?: number; in?: number; looseness?: number } }
  | 'close';                          // 回到起点

export type WayDSL = WayItem[];
```

注意 way 数组**只描述路径动作序列**，不带样式（样式从外层容器继承）。

### 4.2 parseWay 签名

```ts
// 输出 IR step 节点数组（不是 React 组件 props！）
export function parseWay(way: WayDSL): IRStepNode[] {
  const result: IRStepNode[] = [];
  for (let i = 0; i < way.length; i++) {
    const item = way[i];
    if (i === 0) {
      // 第一个必须是位置（节点 / 坐标），转为 Move
      result.push({ type: 'step', kind: 'move', to: normalizeTarget(item) });
    } else {
      // ... 后续按类型转 line / step / rel / close
    }
  }
  return result;
}
```

### 4.3 等价性合同

`parseWay` 必须满足：**对任意合法 `WayDSL`，其输出 IR 节点序列等同于用户手工写出的 Kernel JSX 经 children 扫描后产出的 IR**。

这是 DESIGN.md "Sugar 不引入新能力" 硬规则的形式化。每加一种 `WayItem` 类型，core 内必须配套：

1. parseWay 内的处理分支
2. 单测：`parseWay([...]) → IRStepNode[]` 输出形状
3. 跨包契约测试（在 react adapter 中跑）：sugar 与 Kernel 等价

### 4.4 未来：TikZ text DSL parser

v3.x 时新增 `parsers/parseTikz.ts`，输入 TikZ 源码字符串，输出完整的 IR（不止是 step 序列）。同样住 core，因为其他框架 adapter 同样需要。

---

## 5. Scene 编译器

### 5.1 数据流

```
IR (zod-validated)
  ↓ walk
解析每个 Node：算最终 position，注册到 nodeIndex
  ↓
解析每个 Path：
  - 遍历 Step
  - 解析 Target（查 nodeIndex 拿坐标）
  - 处理折角 / 相对位移 / cycle
  - 算 anchor 边缘交点（用 geometry/rect.ts 的 getCrossPoint）
  - 算箭头位置
  ↓
为每个图元产 ScenePrimitive
  ↓
Scene { primitives, viewBox }
```

### 5.2 ScenePrimitive 形态

```ts
// src/scene/primitives.ts
export type ScenePrimitive =
  | { type: 'rect'; x: number; y: number; width: number; height: number;
      fill?: string; stroke?: string; strokeWidth?: number; strokeDasharray?: string;
      cornerRadius?: number; opacity?: number; }
  | { type: 'circle'; cx: number; cy: number; r: number; /* ... */ }
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number; /* ... */ }
  | { type: 'path'; d: string; /* ... */ }
  | { type: 'text'; x: number; y: number; content: string;
      fontSize: number; fontFamily?: string; fontWeight?: string;
      align: 'start' | 'middle' | 'end';
      baseline: 'top' | 'middle' | 'bottom' | 'alphabetic';
      measuredWidth: number; measuredHeight: number;       // 关键：必带
      fill?: string; }
  | { type: 'group'; transform?: string; children: ScenePrimitive[]; };
```

### 5.3 文本测量接口

```ts
// src/scene/text-metrics.ts
export type FontSpec = {
  family?: string;
  size: number;
  weight?: string | number;
  style?: 'normal' | 'italic';
};

export type TextMeasurer = (text: string, font: FontSpec) => {
  width: number;
  height: number;
  ascent?: number;
  descent?: number;
};

// 默认 fallback：根据字符数 × 字号估算（不准但保证可运行）
export const fallbackMeasurer: TextMeasurer = (text, font) => ({
  width: text.length * font.size * 0.55,
  height: font.size * 1.2,
});

// 使用时由调用方注入；compileToScene 接收第二参
export function compileToScene(
  ir: IR,
  options?: { measureText?: TextMeasurer }
): Scene { /* ... */ }
```

各 adapter 提供自己的 measurer：
- `@retikz/react`：浏览器内可选用 canvas measureText
- `@retikz/ssr`：Node 环境可注入 opentype.js / fontkit
- `@retikz/canvas`：直接用 `ctx.measureText`

### 5.4 性能与缓存

- `compileToScene` 是纯函数 → 在 React adapter 里 `useMemo(() => compileToScene(ir), [ir])`
- IR 用 Object.freeze + 浅相等检测复用——上层用户改一个节点，可以走 immer 或手工 immutable update，保持引用稳定
- 不在 core 内做任何 cache（cache 是 adapter 关注点）

---

## 6. React Adapter（不在 core，简要说明）

`@retikz/react` 是与 core 同步起步的姊妹包，但完全独立——见 [`REACT-ADAPTER.md`](./REACT-ADAPTER.md)。

core 这一侧只承诺：

- 公开 `compileToScene(ir, options)` API 供 adapter 调用
- 公开 `parseWay(way)` 供 adapter 的 sugar 组件调用
- 公开 IR 类型 / Scene 类型 / TextMeasurer 接口供 adapter 复用
- **CI 校验**：`require('@retikz/core')` 在零 React 环境（Node 中不安装 react）必须能加载——这是隔离正确的硬证明

---

## 7. 测试策略

### 7.1 几何模块（最高优先级）

`src/geometry/*` 全部纯函数，必须写**全分支 + property-based 测试**。

推荐工具：vitest + fast-check。

```ts
import { test } from 'vitest';
import fc from 'fast-check';
import { Line } from '../src/geometry/line';

test('两点确定直线，点在直线上恒成立', () => {
  fc.assert(fc.property(
    fc.tuple(fc.float(), fc.float()),
    fc.tuple(fc.float(), fc.float()),
    (p1, p2) => {
      const line = Line.fromPoints(p1, p2);
      expect(line.isPointOn(p1)).toBe(true);
      expect(line.isPointOn(p2)).toBe(true);
    }
  ));
});
```

### 7.2 IR schema

```ts
// 已知好样例必须通过
test('合法 IR 通过校验', () => {
  expect(() => SceneIR.parse(validIR)).not.toThrow();
});

// 已知坏样例必须报错
test('缺失 type 字段被拒', () => {
  expect(() => SceneIR.parse({ children: [{}] })).toThrow();
});

// JSON Schema 导出与已知好样例匹配
test('JSON Schema 接受合法 IR', () => {
  const jsonSchema = zodToJsonSchema(SceneIR);
  const ajv = new Ajv();
  expect(ajv.validate(jsonSchema, validIR)).toBe(true);
});
```

### 7.3 parseWay 单测

```ts
test('parseWay 处理跨节点折角', () => {
  expect(parseWay(['A', { via: '-|' }, 'B'])).toEqual([
    { type: 'step', kind: 'move', to: 'A' },
    { type: 'step', kind: 'step', via: '-|', to: 'B' },
  ]);
});
```

每加一种 `WayItem` 类型加一条单测。"Sugar 与 Kernel 等价" 的端到端契约测试在 react adapter 那边跑（见 [REACT-ADAPTER.md](./REACT-ADAPTER.md) §6.2），core 这边只测 parseWay 的输出形状。

### 7.4 Scene 编译器

- **快照测试**：fixture IR → Scene snapshot
- **一致性测试**：相同 IR 跑两次 → 完全相同（确认是纯函数）
- **回归测试**：每个 bug 修复都加一个 fixture

### 7.5 跨包契约

```ts
// 关键 CI 检查：core 不依赖 React
test('@retikz/core 在零 React 环境可加载', () => {
  // 在 CI 中 npm install --omit=peer 后跑 require('@retikz/core')
});
```

React adapter 的组件 / 集成测试在 [`REACT-ADAPTER.md`](./REACT-ADAPTER.md) §6 中描述。

---

## 8. 迁移步骤（按顺序执行）

### 阶段 0：清场
- [ ] 决定老 `packages/core/src/` 是删除还是搬到 `packages/legacy-core/` 留作参考
- [ ] 把可借鉴的几何/数学模块挑出来另存

### 阶段 1：地基（IR + 几何）
- [ ] 起 zod schema：`src/ir/schema.ts`、`types.ts`、`json-schema.ts`、`version.ts`、`meta.ts`
- [ ] 实现 `src/geometry/`：line / point / rect / path / precision，**配套全单测**
- [ ] 实现 `src/utils/css.ts` 等小工具
- [ ] CI：core 零 React 依赖检查

### 阶段 2：Scene 编译器
- [ ] `src/scene/primitives.ts`：ScenePrimitive 类型定义
- [ ] `src/scene/text-metrics.ts`：度量接口 + fallback
- [ ] `src/scene/layout/node.ts`：Node 位置 / 边界 / anchor 计算
- [ ] `src/scene/layout/path.ts`：Path 段处理（折角、相对位移、cycle）
- [ ] `src/scene/compile.ts`：主入口
- [ ] **里程碑**：一个 IR `{ scene, [node A, node B, path A→B] }` 能编译出正确 Scene

### 阶段 3：parsers
- [ ] `src/parsers/parseWay.ts` + 单测（每种 WayItem 一条）
- [ ] 公开导出 `parseWay`、`WayDSL`、`WayItem` 类型

### 阶段 4：core 公开 API 整理
- [ ] `src/index.ts`：决定哪些导出（IR 类型、`compileToScene`、`parseWay`、`TextMeasurer` 接口、几何工具、版本相关函数）
- [ ] 写最小用例：脱离 React 直接构造 IR + 编译 Scene 的 "hello world"，证明 core 自洽
- [ ] CI 通过 zero-React 加载检查

→ 此时 `@retikz/core` v0.1.0 candidate 就绪。**core 的工作到此结束**。

### 阶段 5：起步 React Adapter
切换到 [`REACT-ADAPTER.md`](./REACT-ADAPTER.md) 的迁移步骤继续——Kernel 组件、Sugar `<Draw>`、`renderPrim`、浏览器 measurer、端到端测试都在那边。

### 阶段 6（在 react adapter 完成后）：替换 docs 与发版
- [ ] `apps/docs` 改用新 API，更新示例
- [ ] 文档站结构调整：IR 文档（core）/ Kernel 文档（react）/ Sugar 文档（react）/ Scene 文档（core）
- [ ] 发 0.1.0-rc.1，用一段时间收反馈

---

## 9. 重写期间的硬规则

按重要性排序：

1. **core 内任何文件都不准 `import 'react'` / `import 'react-dom'`**——CI 失败立即修；React 内容全部属于 [`@retikz/react`](./REACT-ADAPTER.md)
2. **core 内任何文件都不准依赖 DOM API**（`document` / `window` / `canvas`）——浏览器特化能力由 adapter 通过依赖注入提供
3. **`compileToScene` 必须保持纯函数**——不准用 `Math.random()` / `Date.now()` / module-level mutable state
4. **每个 parsers/ 函数改动必须配套单测**——守住"Sugar 不引入新能力"的语义层
5. **IR schema 字段必须全部带 `.describe(...)`**——为 LLM 输出质量负责
6. **任何运行时依赖加入 core 都要在 PR 里写明理由**——core 必须保持轻量；当前预期只有 zod、zod-to-json-schema
7. **不准引入 babel/SWC 插件**（DESIGN.md 已约束）

---

## 10. 完成定义（DoD）

`@retikz/core` v0.1.0 满足以下条件可以发版（不依赖 react adapter 完成度）：

- [ ] §1 模块结构落地完成（ir / scene / parsers / geometry / utils）
- [ ] geometry 单测覆盖 ≥ 90%
- [ ] IR schema 单测覆盖核心节点类型 100%
- [ ] IR 所有字段带 `.describe(...)`
- [ ] Scene 编译器能正确处理：纯坐标 path / 跨节点 path / 折角 / 相对位移 / cycle / 多段连续 path
- [ ] `parseWay` 覆盖所有定义的 `WayItem` 类型，每个一条单测
- [ ] `compileToScene` 在零依赖（无 React、无 DOM）环境跑通"hello world" IR
- [ ] CI 包含"core 零 React 依赖"检查（Node `--omit=peer` 加载）
- [ ] CI 包含 JSON Schema 导出与样例校验
- [ ] 公开 API 文档化（脱离 React 也能用 core）

整个 retikz 0.1.0 发版需要 react adapter 也完成，见 [`REACT-ADAPTER.md`](./REACT-ADAPTER.md) §9。

---

*本文档配合 [`DESIGN.md`](./DESIGN.md) 和 [`REACT-ADAPTER.md`](./REACT-ADAPTER.md) 使用。架构疑问查 DESIGN.md，core 实施疑问查本文档，react 适配实施疑问查 REACT-ADAPTER.md。重写完成后保留本文档作为 core 包演进史的参考。*
