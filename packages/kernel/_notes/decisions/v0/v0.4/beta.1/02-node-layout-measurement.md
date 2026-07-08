# ADR-02: Node layout measurement surface

- 状态：Accepted
- 决策日期：2026-07-07
- 关联：[beta.1 roadmap](./roadmap.md) / [v0.4 roadmap](../roadmap.md) / [alpha.5 ADR-01](../alpha.5/01-tex-package-and-node-math.md) / [alpha.5 ADR-03](../alpha.5/03-inline-math-runs.md) / [compile structure ADR](./01-compile-structure-convention.md)

## 背景

TeX 文本内容不同于普通文本。普通文本可以通过宿主 `measureText` 直接度量，而 TeX 需要先经 `@retikz/tex` 调 MathJax 生成 SVG，再从 SVG `viewBox` 和 glyph path 中得到 `width` / `height` / `depth`。这些信息已经在 compile 阶段用于 node 内容布局、shape circumscribe、label 布局和最终 Scene primitive emit。

当前问题是：这组测量结果主要停留在 core 内部 `NodeLayout`。纯文本节点最终会把整体 `measuredWidth` / `measuredHeight` 写入 `TextPrim`；但一旦内容包含 TeX 混排，Scene 输出会变成 `TextPrim` 与 glyph `PathPrim` 的组合，调用方很难从 renderer 之前稳定拿到“某个 Node 的 content 宽高”。

直接暴露内部 `NodeLayout` 不合适。它包含 `shapeDef`、registry 引用、provider payload 等 compile 内部对象，也会把后续重构锁死在当前文件结构上。测量能力应该暴露为稳定、纯数据、renderer-agnostic 的 compile 观测结果。

## 决策：新增 compile 期 node layout 测量观测面

在 core `compileToScene` 增加一个同步回调选项 `onNodeLayout`。每个真实 IR node 完成布局后，compile 通过专门的 DTO 投影函数计算测量对象，再调用回调。DTO 只包含公开可解释的纯数据，不直接复用或暴露内部 `NodeLayout`。

```ts
export type CompiledNodeLayout = {
  kind: 'node';
  id?: string;
  /** compile 诊断定位符，不保证跨 IR 改写或版本稳定。 */
  irPath: string;
  content: {
    /** 内容盒中心点，已应用当前 scope transform。 */
    center: [number, number];
    /** 内容盒在 node 自身排版轴上的尺寸，用于 shape circumscribe，不含 ancestor scope transform。 */
    size: {
      width: number;
      height: number;
    };
    /** 内容盒四角经过当前 scope transform 后得到的全局 AABB。 */
    bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    /** 旋转角，单位与内部 Rect 一致为弧度。 */
    rotate: number;
  };
  text: {
    hasInlineTex: boolean;
    lineCount: number;
  };
};

export type CompileLayoutObserver = (layout: CompiledNodeLayout) => void;

export type CompileHostOptions = {
  onNodeLayout?: CompileLayoutObserver;
};
```

契约：

- `content.size.width` / `content.size.height` 等于 compile 内部用于 shape circumscribe 的正文内容块尺寸，不包含 padding、margin、node label 或 shadow；该尺寸已包含 node 自身 `scale` 影响，但不包含 ancestor scope transform。
- `content.center` 与 `content.bounds` 已应用当前 scope transform；旋转或非均匀缩放时，调用方应使用 `content.bounds` 获取全局轴对齐尺寸。
- `rect` 表示 node 视觉外框的 compile 布局结果，字段语义与内部 `Rect` 一致；需要全局轴对齐命中区时，调用方优先使用 `content.bounds` 或后续单独设计的 geometry/hydration API，不从 `rect.width` / `rect.height` 反推旋转后的 AABB。
- observer DTO 使用 compile 内部 double 精度；`CompileOptions.precision` 仍只约束最终 Scene 输出。
- 只回调真实 IR node；coordinate 和 scope bbox synthetic layout 不触发。
- 回调同步执行，不影响 `compileToScene` 的返回值；回调抛错时向外抛出，不吞异常。
- 含 TeX 内容时，结果以实际注入的 `lowerTex` 为准；字符串 `$...$` 在未注入 `lowerTex` 时按普通文本字面测量且不发 warning；显式 `{ tex }` run 缺失 `lowerTex` 时跳过该 run 并发出 `TEX_LOWERER_MISSING`；`lowerTex` 返回 `null` 时跳过失败公式宽度并发出 `TEX_INVALID`。
- 不向 Scene primitive 增加字段，不新增 renderer primitive，不改变 IR schema。
- React 不直接透传用户回调给 core，避免在 render 阶段触发副作用；React `<Layout>` 提供批量 `onNodeLayouts` prop，在 commit 后通过 effect 通知本次 compile 产出的布局数组。Vanilla 的 `CommonOptions & CompileOptions` 自动继承 core 同步 observer。

理由：

1. 测量发生在 compile 阶段最准确：普通文本、TeX glyph、lineHeight、scale、padding、shape circumscribe 都已经在同一套路径中解析完。
2. 纯数据 DTO 比内部 `NodeLayout` 更稳定，避免暴露 provider 函数、registry 引用和后续重构细节。
3. 回调模型不改变 Scene 契约，也不要求 renderer 反向推断混排 glyph 的整体尺寸。
4. 与现有 `onWarn`、`measureText`、`lowerTex` 一样属于 compile host option；React 因 render 阶段副作用约束使用 effect 后的批量通知包装。

## DSL / API 表面

Core：

```ts
const layouts = new Map<string, CompiledNodeLayout>();

const scene = compileToScene(ir, {
  measureText,
  lowerTex,
  onNodeLayout: layout => {
    if (layout.id !== undefined) layouts.set(layout.id, layout);
  },
});
```

React：

```tsx
<Layout
  lowerTex={lowerTex}
  onNodeLayouts={layouts => {
    const formula = layouts.find(layout => layout.id === 'formula');
    if (formula !== undefined) console.log(formula.content.size.width, formula.content.size.height);
  }}
>
  <Node id="formula" text="Area $A=\\pi r^2$" />
</Layout>
```

Vanilla：

```ts
const scene = toScene(ir, {
  lowerTex,
  onNodeLayout: layout => {
    measurements.push(layout);
  },
});
```

## 测试设计

`packages/kernel/core/tests/compile/node-layout-measurement.test.ts` 覆盖 `compileToScene` 的核心契约；React / Vanilla 只测透传类型或最小行为。

具体 case 拆分见“实现契约 / 测试象限”。

## 影响

- core 新增 `CompiledNodeLayout` / `CompileLayoutObserver` 类型，以及 `CompileOptions.onNodeLayout`。
- compile orchestration 在 node 布局完成后，把内部 `NodeLayout` 与当前 scope transform 投影为纯数据 DTO 并触发回调。
- React `LayoutProps` 增加 `onNodeLayouts` prop；内部用 core `onNodeLayout` 收集数组，再在 effect 阶段通知用户回调。
- Vanilla 因 options 已交叉 `CompileOptions`，通常只需要更新 JSDoc 和类型文档。
- 文档站需要在 compile options / TeX 测量相关说明中补充示例。

## 不在本 ADR 范围

- 不实现增量 compile、layout cache 或性能优化。
- 不暴露内部 `NodeLayout`、provider definition、shape params 校验结果、margin 或 registry。
- 不为每个 Scene primitive 增加 source layout 字段。
- 不处理 path label、node label、scope bbox 的独立 measurement 回调；后续若需要，可另开 ADR 设计更通用的 layout observer。
- 不改变 TeX 的 MathJax 降级策略、缓存策略或错误语义。

---

## 实现契约（必填）

### Level

`red`

本 ADR 修改 `packages/kernel/core/src/compile/**` 与 public `CompileOptions`，属于 compile 公开契约变更。

### Schema 改动

无。IR schema、Scene primitive schema、Zod describe 均不变。

### 文件 scope

本 ADR 实现允许触碰的文件白名单：

- `packages/kernel/core/src/compile/types.ts`
- `packages/kernel/core/src/compile/index.ts`
- `packages/kernel/core/src/compile/orchestration/context.ts`
- `packages/kernel/core/src/compile/orchestration/types.ts`
- `packages/kernel/core/src/compile/orchestration/traversal.ts`
- `packages/kernel/core/src/compile/node/types.ts`
- `packages/kernel/core/src/compile/node/layout-metrics.ts`（新建，若实现需要）
- `packages/kernel/core/src/compile/node/index.ts`
- `packages/kernel/core/tests/compile/node-layout-measurement.test.ts`（新建）
- `packages/kernel/react/src/kernel/Layout.tsx`
- `packages/kernel/vanilla/src/types.ts`
- `apps/docs/src/contents/kernel/**` 中与 compile options / TeX 测量说明直接相关的页面

偏离白名单的改动需要回到本 ADR 增补 scope，或另开 ADR。

### 测试象限

**Happy path（≥ 3）**：

- `plain node measurement`：普通单行文本触发一次 `onNodeLayout`，`content.size` 与内部用于 `TextPrim.measuredWidth/measuredHeight` 的值一致。
- `tex mixed measurement`：注入 stub `lowerTex` 后，`A $x$ B` 的 `content.size.width` 等于普通 run 与 TeX run 宽度累加后的行宽。
- `multi-line measurement`：多行文本回调中的 `content.size.width` 取最大行宽，`content.size.height` 等于行高累计。
- `react effect notification`：`<Layout onNodeLayouts>` 在 commit 后收到本次 compile 的批量结果，用户回调不在 render 阶段触发。

**边界（≥ 2）**：

- `anonymous node`：无 `id` 的 node 仍触发回调，并携带可诊断 `irPath`；测试只验证存在和能定位，不锁死完整字符串。
- `scaled scoped node`：node scale 后 `content.size` 体现自身缩放；ancestor scope scale 后 `content.bounds` 体现全局 AABB。
- `rotated scoped node`：ancestor scope rotate 后 `content.center` 与 `content.bounds` 由内容盒四角投影得到，不直接读取 `NodeLayout.contentCenter`。
- `empty text node`：无文本或空字符串时仍触发回调，内容尺寸按当前 compile 规则为 0 或空行高度，测试锁定现有行为。

**错误路径（≥ 2）**：

- `string tex without lowerTex`：字符串 `$...$` 且未注入 `lowerTex` 时，回调按普通文本尺寸测量，不发 tex warning。
- `explicit math run without lowerTex`：显式 `{ tex }` run 且未注入 `lowerTex` 时，回调跳过公式宽度，并继续发出 `TEX_LOWERER_MISSING`。
- `invalid tex`：`lowerTex` 返回 `null` 时，回调不包含失败公式宽度，并继续发出 `TEX_INVALID` warning。
- `observer throws`：`onNodeLayout` 抛错时 `compileToScene` 向外抛出，不返回部分 Scene。

**交互（≥ 2）**：

- `padding and shape`：`content.size` 不包含 padding，`rect.width/height` 包含 padding 与 shape circumscribe。
- `node label excluded`：node label 不进入 `content.size`，但不影响已有 layout bounds 计算。
- `asymmetric padding with content center`：非对称 padding 会影响 visual rect 与 content center 的关系，DTO 仍报告真实内容盒中心。
- `precision isolation`：设置 `precision` 只影响 Scene 输出，不改变 observer DTO 的 double 精度测量结果。

### 依赖的现有元素

- `CompileOptions`（`packages/kernel/core/src/compile/types.ts`）：扩展 host option。
- `NodeLayout`（`packages/kernel/core/src/compile/node/types.ts`）：作为内部数据源，不公开暴露。
- `layoutNode` / `applyTransformChain` / `emitNodePrimitives`：复用现有 compile 顺序，通过专用 DTO 投影函数计算全局 center / bounds。
- `LowerTex` / `LoweredTex`：TeX 尺寸来源保持不变。
- React `LayoutProps`：增加 effect 后批量通知 prop。
- Vanilla `CommonOptions & CompileOptions`：继承 core 新 option。
