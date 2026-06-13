# ADR-01：`@retikz/svg` 以 framework-neutral descriptor 为核心,字符串与 React 各做薄序列化层

- 状态：Accepted（已实现）
- 决策日期：2026-05-29
- 关联：[v0.3 roadmap §SVG 包拆分范围 / §待决策 1·2](../roadmap.md) · [v0 roadmap](../../roadmap.md) · [core-design.md §5 / §6](../../../../../architecture/core-design.md) · [tikz-gap-analysis](../../../../../analysis/tikz-gap-analysis.md)

> **打包变更（[ADR-05](./05-renderer-repackage.md)）**：`@retikz/svg` 已并入 `@retikz/render`、以子路径 **`@retikz/render/svg`** 发布；下文 `@retikz/svg` ≡ `@retikz/render/svg`、`packages/svg/` ≡ `render/src/svg/`，**渲染设计与决策不变**。
>
> **范围**：定义 `@retikz/svg`（零 React 运行时的 Scene→SVG 渲染核心），**同时把 `@retikz/react` 原有 SVG 渲染层下沉到此包**，react 改为消费 `SvgNode` descriptor。

## 背景 / 约束

塑造方案的硬约束：

- v0.2 已打好 renderer-agnostic 的 Scene 契约、Paint / clip 资源表、`MarkerPrimitive`、`compileToScene` 纯函数边界——renderer 出关条件具备。
- 原 react SVG 渲染（`renderPrim` / `paintDefs` / `clipDefs` / `arrowMarkers` + arrow spec 收集 / dedup / hash）与 React 死绑，但逻辑本身几乎无 React 专属成分——几何在 core compile 期已算完，react 这层只在「摆属性」。唯一真绑 React 的是用 `useId()` 派生 id 前缀防多实例 `url(#id)` 撞。
- **水合（alpha.3）要求 SSR 端与客户端产出完全一致的 id** → id 前缀必须确定性、caller 可控,不能是随机 `useId()` 黑盒。拆包时须把这个缝留对。

## 决策：descriptor 为核心,字符串 / React 各做薄层

`@retikz/svg` 核心产物是一棵 **framework-neutral 的 `SvgNode` 描述树**；「Scene → SVG 怎么对应」只写一遍、落在 builder（`buildSvgDocument(scene, { idPrefix }) → SvgNode`）；字符串（`renderToSvgString`）与 React 各自只是薄消费者。

**核心约定（字面即决策）：descriptor 的 key 一律用属性的 SVG 真实拼写**——呈现属性 kebab（`stroke-width`），结构属性用规范拼写（`viewBox` / `refX`，裸 SVG 本就 camelCase）。于是各路序列化各取所需：

- **字符串 / Vanilla / SSR**：逐字吐 `key="value"`,零名字转换；
- **Vue / Svelte / Solid（未来）**：同样逐字（也用 SVG 真名）；
- **React**：**唯一**需要映射的消费者——只把呈现属性的 kebab 转 camelCase（`stroke-width`→`strokeWidth`），`viewBox` / `refX` 不动。映射集有限可枚举。

于是 react 退化成 `compileToScene → buildSvgDocument({idPrefix}) → SvgNode→ReactElement` 三步薄绑定；字符串路天然服务 SSR / Vanilla；descriptor 为水合（`data-*`）与多框架留口。`SvgNode` / `SvgAttrs` 是 `@retikz/svg` **公开但非持久化**的 renderer descriptor 类型（受 semver 约束、第三方 adapter 可消费），不是 IR、不写盘、不进 core。

**id 前缀做成注入缝**：把原 `Layout` 里的 `useId()` 黑盒外提成 `buildSvgDocument(scene, { idPrefix })` 参数——SSR 与客户端传同一前缀，id 逐字一致；纯 React 用户缺省回退剥冒号的 `useId()`，无感、无 breaking。**这条直接纳入本 ADR 契约**，避免 alpha.3 因 `useId()` 黑盒无法对齐而返工。

### 边界:纯映射、无状态、不持有框架能力

1. **无状态、无智能**——svg 包是一组纯函数：不做 memo / cache / diff / 生命周期 / 响应式。何时重渲染、如何 memo、响应式更新、水合绑定全归框架适配层。包内的 arrow dedup / hash、`var()` 的 attr↔style 分流、多行 text 的 `dy` 计算都是**确定性纯换算**（IR→svg 的必要环节），是「长什么样」不是「怎么活」。
2. **不限制 React**——绑定层产出 100% 正常的 React element 树（`createElement`）：reconciliation / `key` / `React.memo` / 并发 / Suspense / context 全照常；`SvgNode` 只是中间数据、不进 React diff 语义。真撞瓶颈,react 可绕过 `SvgNode` 树、直接消费粒度化纯映射函数自行 `createElement`，契约不变。
3. **逐图元的框架级附加（ref / handler / 动画目标）走稳定 id 关联**，与水合（alpha.3）同一套机制；本版不引入。

> 一句话：svg 包负责「长什么样」，框架适配层负责「怎么活」。

### 被否决的选项

- **B：只吐 `renderToSvgString`（字符串）** —— React 拿不到细粒度元素，只能整块 `dangerouslySetInnerHTML`（丢 diff / 难水合）或自己重写一套 Scene→React,与 roadmap「React 不复制渲染逻辑」直接冲突。
- **C：descriptor + `SvgNode→ReactElement` helper 一起从 svg 包出** —— svg 包就沾上 React（哪怕 optional peer）,不再是「零 React 运行时」的纯 SVG 包,与包边界有张力。

选 A 的核心理由：只有它同时满足「React 不再拥有 SVG 渲染核心 / 不复制逻辑」+「`@retikz/svg` 零 React 运行时依赖」两条硬约束；字符串路在 v0.3 当下就要工作（SSR / Vanilla 已交付），让 descriptor 用 SVG 真名等于同时免费服务字符串（现在）+ React（唯一映射）+ 未来多框架；id 前缀注入缝是水合前置。

## 不在本 ADR 范围

- Canvas renderer 与 canvas 包（[ADR-02](./02-canvas-renderer-and-react-canvas-mode.md)）；`@retikz/vanilla` 包本体 / `mountSvg` / SSR 入口（[ADR-03](./03-vanilla-runtime-and-dependency-graph.md)）。
- 水合 / `data-retikz-id` 填值 / handler 绑定（alpha.3）；本 ADR 只留结构口（索引签名留口、不填值）与确定性 idPrefix 缝。**给 alpha.3 的两条约束**：① 绑定走**根级事件委托**（容器挂常数个 listener + `closest('[data-retikz-id]')` 反查 + id→handler 注册表），不逐图元 `addEventListener`，杜绝大图 O(N) 绑定；② **非冒泡事件**（`pointerenter` / `mouseenter` / `pointerleave` / `focus` / `blur`）根委托收不到，需仿 React 用会冒泡的 `pointerover` / `pointerout` + `relatedTarget` 边界**合成** enter/leave，或局部绑定兜底。
- React `renderer="canvas"` 模式（ADR-02）；Vue / Svelte / Solid 的实际适配器（本 ADR 只保证 descriptor 命名对它们友好——遍历 `SvgNode` → `h(tag, attrs, children)`，因用 SVG 真名无需名字映射；守的红线：禁止 React-ism（camelCase / `key` 字段 / React style 对象）漏进 `SvgNode`）。
- descriptor → 局部 DOM patch / progressive 渲染（v0.4+）。

---

> **实现指针**：level `red`（新建包公开 API 表面；同时动 react render / kernel）、非 breaking（react 用户 API 不变，svg 包纯新增；React `Layout` 新增可选 `idPrefix?` additive）。真源以代码为准——`SvgNode` / `SvgAttrs`（`render/src/svg/types.ts`）、`buildSvgDocument` / `renderToSvgString` / arrow 收集 + dedup + hash（`render/src/svg/`）、`path-d-builder` / `transform-builder` / `viewBox`（已下沉 `render/src/svg/`）；react 侧 `svgToReact`（`react/src/render/svgToReact.ts`，kebab→camelCase 映射）+ `Layout` 的 `idPrefix`（`react/src/kernel/Layout.tsx`）。`csstype` 走 catalog（纯类型）。用户侧示例见文档站。测试在 `render/tests/`（build / serialize / document）+ react `tests/`（字符串↔React parity 守 ADR 核心风险）。完整施工契约（Schema 定位 / 文件 scope / 测试象限 10 case / 依赖现有元素）见本文件 git 历史。

> 🔖 封板压缩 commit `05ed13c2`；压缩前完整施工蓝图 = `git show 05ed13c2^:notes/decisions/core/v0/v0.3/alpha.1/01-svg-descriptor-contract.md`。
