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

## 不在本 ADR 范围

- 不实现增量 compile、layout cache 或性能优化。
- 不暴露内部 `NodeLayout`、provider definition、shape params 校验结果、margin 或 registry。
- 不为每个 Scene primitive 增加 source layout 字段。
- 不处理 path label、node label、scope bbox 的独立 measurement 回调；后续若需要，可另开 ADR 设计更通用的 layout observer。
- 不改变 TeX 的 MathJax 降级策略、缓存策略或错误语义。

---

> **实现指针**：实现提交为 `f89e1b8b16f5feb20d9f4b966a4039766fb08ce1`；核心回归位于 `packages/kernel/core/tests/compile/node-layout-measurement.test.ts` 与 `packages/kernel/react/tests/kernel/Layout-node-layouts.test.tsx`。最终 schema / 行为以代码为准。
>
> 🔖 完整施工蓝图：`git show f89e1b8b16f5feb20d9f4b966a4039766fb08ce1:packages/kernel/_notes/decisions/v0/v0.4/beta.1/02-node-layout-measurement.md`。
