# @retikz/react 实现方案

> 本文档说明 retikz 的 **React 适配层**（`@retikz/react`）的具体设计与实施。
>
> - 架构层面（IR 居中、AI 优先、Scene 抽象、跨平台 adapter 模式等）见 [`DESIGN.md`](./DESIGN.md)
> - core 包（IR / Scene / 几何 / 解析器）的实现方案见 [`CORE-REFACTOR.md`](./CORE-REFACTOR.md)
> - 本文档**只**回答"@retikz/react 包内部怎么组织、各组件怎么实现、按什么顺序落地"
>
> 文档分两类内容：
> - **拍板项**：本次重写前必须决定的 React DSL 设计
> - **实施清单**：可以直接动手的步骤

---

## 0. 与 core 包的关系

`@retikz/react` 完全消费 `@retikz/core` 提供的能力：

| 来自 core | 用途 |
|---|---|
| IR 类型（`z.infer` 派生） | Kernel 组件的 props 类型**直接复用**，避免漂移 |
| `compileToScene(ir, options)` | 渲染前把 IR 转 Scene |
| `parseWay(way)` | `<Draw>` 内部调用 |
| 字体度量接口 | adapter 注入浏览器实现 |
| 几何工具 | 传递性依赖（adapter 一般不直接用） |

`@retikz/react` 自己提供：

- **Kernel 组件**：JSX DSL 表面（`<Tikz>` `<Path>` `<Step>` `<Node>` `<Anchor>` `<Scope>` `<Label>`）
- **Sugar 组件**：`<Draw>`
- **渲染管道**：Scene → React.Element（SVG）
- **浏览器 text measurer**：基于 `canvas.measureText`
- **类型逃生舱**：`useNodeRef()` 等 hooks

### 关键约束

**Kernel/Sugar 组件不直接渲染 SVG**——它们只在 render 阶段构造 IR；构造完成后由顶层 `<Tikz>` 调 `compileToScene` 得 Scene，再由 `renderPrim` 翻译为 React 元素。这条链路保持"组件 = DSL 表面、渲染 = 单独管道"的清晰分离。

---

## 1. 包结构与目录

```
packages/react/
├── src/
│   ├── kernel/
│   │   ├── Tikz.tsx              # 顶层容器，建立 IR builder context + 触发渲染管道
│   │   ├── Path.tsx
│   │   ├── Step.tsx
│   │   ├── Node.tsx
│   │   ├── Anchor.tsx            # 待决策：是否独立组件
│   │   ├── Scope.tsx
│   │   ├── Label.tsx
│   │   └── _builder.ts           # children 扫描 / IR 构造上下文
│   │
│   ├── sugar/
│   │   └── Draw.tsx              # 调 core/parseWay，展开为 <Step> 子树
│   │
│   ├── render/
│   │   ├── renderPrim.tsx        # ScenePrimitive → React 元素
│   │   ├── browser-measurer.ts   # canvas.measureText 实现 TextMeasurer 接口
│   │   └── viewBox.ts            # viewBox 字符串格式化
│   │
│   ├── hooks/
│   │   └── useNodeRef.ts         # 返回类型安全的 NodeRef
│   │
│   └── index.ts                  # 公开 API
│
├── tests/
│   ├── kernel/
│   ├── sugar/
│   ├── render/
│   └── e2e/                      # JSX → SVG 端到端
│
├── package.json                  # peerDep: react ≥ 18; dep: @retikz/core
└── tsconfig.json
```

### 模块依赖规则

```
render  ←─ kernel  ←─ sugar
   ↑          ↑
   └── core ──┘
```

- 任何模块都可以 import `@retikz/core`
- `sugar` 依赖 `kernel`（Sugar 展开为 Kernel）
- `render` 不依赖 `kernel`/`sugar`（renderer 只认 Scene，不认 React DSL）
- `hooks` 是叶子模块，不依赖 src 内其他

---

## 2. Kernel 组件设计（启动重写前必须拍板的项）

> 以下是每个**待决策项**的当前候选 + 推荐倾向。重写启动前必须把这一节走一遍并填入决定。

### 2.1 待拍板：折角语法

```tsx
// 候选 A
<Step kind="step" to="B" via="-|" />

// 候选 B
<Step kind="step" to="B" first="x" />
```

| | A. via | B. first |
|---|---|---|
| 直观性 | ✅ 符号即图形 | ❌ 需读文档 |
| TikZ 兼容 | ✅ 完全一致 | ❌ 偏离 |
| LLM 友好 | ✅（TikZ 训练数据多） | ⚠️（自创词汇） |
| 类型表达 | string union | string union |

**倾向：A（via）**。理由：与已决策的 "text DSL 采用 TikZ 原生语法" 一致；符号自带视觉。

待决：`-|-` `|-|` 两种复合形态在新版**不再支持**——这种"双折"必须拆成两个 `<Step>`。需要在文档明确，避免用户期望落空。

### 2.2 待拍板：Target 表达方式

```tsx
// A. 字符串为主
<Step to="A" />
<Step to="A.north" />              // 用 . 分割 anchor

// B. 结构化对象
<Step to={{ node: 'A', anchor: 'north' }} />

// C. ref 对象
const a = useNodeRef();
<Step to={a} />

// D. union 同时支持 A + C
```

**倾向：D（A + C 同时支持）**。
- 字符串 = 主路径，简洁、可序列化、AI 友好
- ref = 类型安全逃生舱（`useNodeRef()` 返回 `{ id: string, brand }`，TS 上能保证拼写不出错）
- 不引入对象形态（B），避免三种写法

`A.north` 形式（字符串内嵌 anchor）需要 parser 拆分，可在 IR 落地阶段统一处理（要么在 builder 里拆，要么在 Scene 编译器里拆——见 §3.5 拍板）。

### 2.3 待拍板：Anchor 表达

```tsx
// A. 嵌入 Target 字符串
<Step to="A.north" />

// B. 单独 prop
<Step to="A" anchor="north" />

// C. 独立组件
<Anchor of="A" at="north">
  <Step to="..." />
</Anchor>
```

**倾向：A + B 同时支持**。A 紧凑（TikZ 风格），B 类型友好（IDE 补全 anchor 名）。两者底层统一规范化为 IR 中的 `{ node, anchor }`。

不做 C：anchor 是节点的引用方式，不是独立实体，不应做组件。

### 2.4 待拍板：Step 命名

候选：`Step` / `Move` / `Edge` / `Op`

**倾向：`Step`**。中性、不与图论 edge 冲突、适合作为"路径上一个动作"的统称。

### 2.5 待拍板：组件 → IR 写入机制

```tsx
// A. children 扫描：父组件在 render 阶段读 React.Children，转为 IR
<Path>
  <Step kind="line" to="A" />
</Path>

// B. builder context：子组件 useEffect 中调用 ctx.addStep(...)
// C. 薄壳：每个 Kernel 组件在 render 时 return null，把自己的 props 注册到 builder
```

**倾向：A（children 扫描）**。理由：
- 同步、无副作用、容易测试
- IR 在 render 阶段就完整可用（无需等 effect）
- 错误（如 `<Step>` 出现在非 `<Path>` 内）能在 render 时立即报
- React 18+ 的 strict mode / 并发渲染下行为可预期

代价：组件树必须遵守严格嵌套规则（`<Step>` 必须是 `<Path>` 直接子节点，不能跨包裹）。这个限制可以接受，TikZ 自身也是这种结构。

### 2.6 已决策（来自 DESIGN.md）

- **单 `<Step>` 组件**统一所有路径动作，`kind` 区分
- **`kind` 默认 `'line'`**

---

## 3. 各组件实现要点

### 3.1 `<Tikz>`：顶层容器

职责：
- 建立 IR builder context（让子组件能写入 IR）
- render 阶段读完所有 children 后得到完整 IR
- 调 `compileToScene(ir, { measureText: browserMeasurer })`
- 把 Scene 交给 renderer，输出 `<svg>` 元素

```tsx
export const Tikz: FC<TikzProps> = ({ children, width, height, ...rest }) => {
  const ir = useBuildIR(children);  // children 扫描得 IR
  const scene = useMemo(
    () => compileToScene(ir, { measureText: browserMeasurer }),
    [ir]
  );
  return (
    <svg viewBox={fmtViewBox(scene.viewBox)} width={width} height={height} {...rest}>
      {scene.primitives.map((p, i) => renderPrim(p, i))}
    </svg>
  );
};
```

也接受 `<Tikz ir={...}>` 形式直接喂 IR（跳过 JSX DSL，给 AI / 持久化 / 编辑器场景用）：

```tsx
export const Tikz: FC<TikzProps> = (props) => {
  const ir = 'ir' in props ? props.ir : useBuildIR(props.children);
  // ...同上
};
```

### 3.2 `<Path>` `<Step>` `<Node>` `<Scope>` `<Label>`

这些组件**本体不渲染任何 React 元素**，只是 DSL 表面。在 children 扫描机制下，它们的 props 会被父组件读出来组成 IR 节点。

实现简化为：

```tsx
// kernel/Step.tsx
import type { StepNode } from '@retikz/core';

export type StepProps = Omit<StepNode, 'type'>;

// Step 组件本体可以是个标记组件，render 阶段 return null（实际不会被 render，因为父组件直接读 props）
export const Step: FC<StepProps> = () => null;
Step.displayName = '@retikz/Step';
```

children 扫描时通过 `displayName` / `type` 引用判断节点种类。

### 3.3 `<Anchor>`

视 §2.3 拍板结果决定：
- 若决策为 A+B（字符串嵌入 + 独立 prop），不需要 `<Anchor>` 组件，删除该文件
- 若未来需要"作用域级 anchor 默认值"或"anchor 修饰其他子组件"，再恢复

### 3.4 `_builder.ts`：children 扫描

```ts
// kernel/_builder.ts
export function readChildrenToIR(children: ReactNode): IRNode[] {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return null;
    const type = child.type as any;
    switch (type.displayName) {
      case '@retikz/Node': return { type: 'node', ...child.props };
      case '@retikz/Path': return {
        type: 'path',
        ...child.props,
        children: readChildrenToIR(child.props.children),
      };
      case '@retikz/Step': return { type: 'step', ...child.props };
      // ...
    }
    throw new Error(`Unknown retikz component: ${type.displayName ?? type}`);
  })?.filter(Boolean) ?? [];
}
```

实际实现要：
- 通过 zod 校验每个产出的 IR 节点（开发模式下立即报错）
- 处理嵌套（Scope 改默认值、Path 的 Step 子组件、Node 的 Label 子组件）
- 给出有用的错误信息（"`<Step>` must be a direct child of `<Path>`"）

---

## 4. Sugar 层

### 4.1 `<Draw>` 组件

```tsx
// sugar/Draw.tsx
import { parseWay } from '@retikz/core';
import { Path } from '../kernel/Path';
import { Step } from '../kernel/Step';

export const Draw: FC<DrawProps> = ({ way, ...rest }) => {
  const steps = useMemo(() => parseWay(way), [way]);
  return (
    <Path {...rest}>
      {steps.map((s, i) => <Step key={i} {...s} />)}
    </Path>
  );
};
```

`<Draw>` 是纯 React 包装；语义全部在 core 的 `parseWay` 里。这保证了其他框架（Vue/Svelte）将来想做 sugar 时直接复用 parser 即可。

### 4.2 等价性保证

`<Draw>` 必须**完全等价于**手写的 `<Path><Step/>...</Path>` 树——这是 DESIGN.md "Sugar 不引入新能力" 硬规则的落地。

测试方式：

```ts
test('<Draw> 与等价 <Path><Step/>...</Path> 产出相同 IR', () => {
  const fromSugar = renderToIR(
    <Draw way={['A', { via: '-|' }, 'B']} arrow="->" />
  );
  const fromKernel = renderToIR(
    <Path arrow="->">
      <Step kind="move" to="A" />
      <Step kind="step" via="-|" to="B" />
    </Path>
  );
  expect(fromSugar).toEqual(fromKernel);
});
```

每加一种 `way` item 类型，必须配套写一条等价性测试。

---

## 5. 渲染管道

### 5.1 `renderPrim`

```tsx
// render/renderPrim.tsx
import type { ScenePrimitive } from '@retikz/core';

export function renderPrim(p: ScenePrimitive, key: Key): ReactElement {
  switch (p.type) {
    case 'rect':
      return <rect key={key} x={p.x} y={p.y} width={p.width} height={p.height}
                    fill={p.fill} stroke={p.stroke} strokeWidth={p.strokeWidth}
                    rx={p.cornerRadius} ry={p.cornerRadius} opacity={p.opacity} />;
    case 'circle':
      return <circle key={key} cx={p.cx} cy={p.cy} r={p.r} {...} />;
    case 'ellipse':
      return <ellipse key={key} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} {...} />;
    case 'path':
      return <path key={key} d={p.d} {...} />;
    case 'text':
      return <text key={key} x={p.x} y={p.y}
                    textAnchor={mapAlign(p.align)}
                    dominantBaseline={mapBaseline(p.baseline)}
                    fontSize={p.fontSize} fontFamily={p.fontFamily} fill={p.fill}>
              {p.content}
            </text>;
    case 'group':
      return <g key={key} transform={p.transform}>
              {p.children.map(renderPrim)}
            </g>;
  }
}
```

约束：
- **不读 IR，只读 Scene**——这保证了 renderer 不会偷偷做布局
- **不超过约 100 行**——超过说明 Scene 抽象不够下沉，回 core 补
- **不引入新依赖**——SVG 都是原生标签

### 5.2 浏览器 text measurer

```ts
// render/browser-measurer.ts
import type { TextMeasurer } from '@retikz/core';

const canvas = typeof document !== 'undefined'
  ? document.createElement('canvas')
  : null;
const ctx = canvas?.getContext('2d');

export const browserMeasurer: TextMeasurer = (text, font) => {
  if (!ctx) {
    // SSR 路径，应不被命中（@retikz/ssr 自己注入 measurer）
    return { width: text.length * font.size * 0.55, height: font.size * 1.2 };
  }
  ctx.font = `${font.style ?? 'normal'} ${font.weight ?? 'normal'} ${font.size}px ${font.family ?? 'sans-serif'}`;
  const metrics = ctx.measureText(text);
  return {
    width: metrics.width,
    height: font.size * 1.2,
    ascent: metrics.actualBoundingBoxAscent,
    descent: metrics.actualBoundingBoxDescent,
  };
};
```

注意：浏览器 measurer 在 SSR 路径下不可用——`@retikz/ssr` 会自己注入 fontkit / opentype.js 实现。这条边界保持清晰：**"react adapter 只管浏览器"**。

---

## 6. 测试策略

### 6.1 Kernel JSX → IR

每个 Kernel 组件至少一条测试，确认 JSX 能产出预期 IR。

```ts
test('<Path><Step kind="move" to="A"/></Path> → IR', () => {
  const ir = renderToIR(<Path><Step kind="move" to="A" /></Path>);
  expect(ir).toMatchObject({
    type: 'path',
    children: [{ type: 'step', kind: 'move', to: 'A' }],
  });
});
```

### 6.2 Sugar = Kernel 等价

§4.2 已述。每种 way item 一条等价性测试。

### 6.3 端到端：JSX → SVG

```ts
test('<Tikz> 渲染输出预期 SVG', () => {
  const { container } = render(
    <Tikz width={100} height={100}>
      <Node id="A" position={[10, 10]}>Hello</Node>
    </Tikz>
  );
  expect(container.querySelector('svg')).toBeInTheDocument();
  expect(container.querySelector('text')?.textContent).toBe('Hello');
});
```

### 6.4 Snapshot

固定 fixture IR 跑一遍 React render，对照 SVG snapshot。检测无意 regression。

### 6.5 错误路径

- `<Step>` 不在 `<Path>` 内 → 抛清晰错误
- 重复 `id` → 抛错（也可放 core 的 IR 校验里）
- 未定义的 anchor 名 → 抛错

---

## 7. 迁移步骤（按顺序执行）

### 阶段 A：脚手架
- [ ] 起 `packages/react/` 包，peerDep `react ≥ 18`，dep `@retikz/core`
- [ ] tsconfig + build 配置（vite/tsup 选一个）
- [ ] CI 加 react 包的 lint/test/build

### 阶段 B：渲染管道（先于组件，便于测试）
- [ ] `render/renderPrim.tsx`：覆盖所有 ScenePrimitive 类型
- [ ] `render/browser-measurer.ts`
- [ ] **里程碑**：手写一份 Scene 字面量 → 渲染出预期 SVG

### 阶段 C：Kernel 组件
- [ ] **先把 §2 的待拍板项全部拍板**
- [ ] `kernel/_builder.ts`：children 扫描机制
- [ ] `kernel/Tikz.tsx` `Path.tsx` `Step.tsx` `Node.tsx` `Scope.tsx` `Label.tsx`
- [ ] `hooks/useNodeRef.ts`
- [ ] 集成测试：Kernel JSX → IR

### 阶段 D：Sugar
- [ ] `sugar/Draw.tsx`
- [ ] 等价性测试套件（每加一种 way item 都要加一条）

### 阶段 E：端到端 + 文档
- [ ] e2e 测试：JSX → SVG 全链路
- [ ] Snapshot 测试
- [ ] 错误路径测试
- [ ] 文档站接入新 API

---

## 8. 重写期间的硬规则

按重要性排序：

1. **不准 import core 内部子路径**——只用 `@retikz/core` 公开 API。绕过公开 API 会让 core 重构时连带 react 包受伤
2. **每个 Kernel 组件提交时必须有 "JSX → IR" 测试**——绿了才合并
3. **每个 Sugar parser 改动必须配套等价性测试**——守住 "Sugar 不引入新能力"
4. **`renderPrim` 不准读 IR**——它的输入只能是 Scene
5. **`renderPrim` 行数封顶**——超过 100 行先回 core 看是不是 Scene 抽象不够
6. **不准在 `render/` 内 import `kernel/`**——renderer 不依赖 DSL
7. **任何 `react` 之外的运行时依赖加入 react 包都要在 PR 里写明理由**

---

## 9. 完成定义（DoD）

`@retikz/react` v0.1.0 满足以下条件可以发版：

- [ ] §2 所有待拍板项已决定并文档化
- [ ] §1 模块结构落地完成
- [ ] Kernel 组件全部实现，每个有"JSX → IR" 测试
- [ ] `<Draw>` 实现，`way` 数组所有支持的 item 类型都有等价性测试
- [ ] `renderPrim` 覆盖所有 ScenePrimitive 类型
- [ ] 浏览器 measurer 落地，并被 `<Tikz>` 默认注入
- [ ] e2e 测试覆盖：纯坐标 path / 跨节点 path / 折角 / 相对位移 / cycle / 多段 path
- [ ] CI 包含 lint / test / build / type-check
- [ ] 文档站至少 5 个对照示例（Kernel JSX / Sugar / IR JSON 三栏对照）

---

*本文档配合 [`DESIGN.md`](./DESIGN.md) 和 [`CORE-REFACTOR.md`](./CORE-REFACTOR.md) 使用。架构疑问查 DESIGN.md，core 实施疑问查 CORE-REFACTOR.md，react 适配实施疑问查本文档。*
