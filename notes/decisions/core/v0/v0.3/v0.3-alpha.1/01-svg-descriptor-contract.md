# ADR-01：`@retikz/svg` 以 framework-neutral descriptor 为核心,字符串与 React 各做薄序列化层

- 状态：Proposed
- 决策日期：2026-05-29
- 关联：[v0.3 roadmap §SVG 包拆分范围 / §待决策 1·2](../roadmap.md) · [v0 roadmap](../../roadmap.md) · [core-design.md §5 / §6](../../../../../architecture/core-design.md) · [tikz-gap-analysis](../../../../../analysis/tikz-gap-analysis.md)

> **备注**：本 ADR 不止定义 `@retikz/svg` 包,**同时包含对 `@retikz/react` 渲染层的替换**——把 react 现有 SVG 渲染核心(`packages/react/src/render/**`)下沉到 `@retikz/svg`,react 改为消费 `SvgNode` descriptor。该替换的 scope 见"影响"与"实现契约 § 文件 scope"。

## 背景

v0.2 已经把 renderer-agnostic 的 Scene 契约、Paint / clip 资源表、`MarkerPrimitive`、`compileToScene` 纯函数边界打好。v0.3 的第一步是 **renderer 边界出关**:把现在长在 `@retikz/react` 里的 SVG 渲染核心抽成独立 `@retikz/svg` 包,让同一份 Scene 能同时喂给 SVG / Canvas / Vanilla / React 多条 renderer 路径(见 roadmap §定位)。

问题在于:现在 `packages/react/src/render/` 里把"Scene → SVG"的全部逻辑和 React 死绑在一起。`renderPrim.tsx` 直接返回 `ReactElement`(`<rect>` / `<path>` / `<g>`...),`paintDefs.tsx` / `clipDefs.tsx` / `arrowMarkers.tsx` 同样产 React 元素,连 arrow spec 的收集 / dedup / hash(`Layout.tsx` 74–171 行)也混在组件里。这套逻辑本身几乎没有 React 专属成分——几何早在 core compile 期算完,React 这层只是在"摆属性"。唯一真正绑 React 的是 `Layout` 用 `useId()` 派生 id 前缀防多实例 `url(#id)` 撞。

`@retikz/svg` 抽出来之后,**这个包对外吐什么形态**是绕不开的第一道决策(roadmap 待决策 #1):

- 若只吐 SVG 字符串,React 要么 `dangerouslySetInnerHTML` 整块塞(丢细粒度更新、水合难绑 handler),要么自己**再写一套** Scene→React 映射——直接违背 roadmap "React 不再拥有 SVG 渲染核心、不复制渲染逻辑" 的硬目标。
- 若吐 React 元素,就不是"纯 SVG 包"了,SSR / Vanilla / 未来 Vue 全得绕。

同时 roadmap 把水合(alpha.4)列为 v0.3 重点,而水合要求 SSR 端与客户端产出**完全一致的 id**——这反过来约束了 id 前缀必须确定性、caller 可控,不能是随机 `useId()` 黑盒。本 ADR 需要在拆包的同时把这个缝留对。

## 选项

### A. descriptor 为核心,字符串 / React 各做薄层（**推荐**）

`@retikz/svg` 的核心产物是一棵 **framework-neutral 的 `SvgNode` 描述树**;"Scene → SVG 怎么对应"的逻辑只写一遍,落在 builder 里。字符串和 React 各自只是一层很薄的消费者。

```ts
import type { SvgPropertiesHyphen, PropertiesHyphen } from 'csstype';

/** SVG 专有结构 / 几何属性,csstype 不含,手工维护(用 SVG 真实拼写) */
type SvgStructuralAttrs = {
  x?: number; y?: number; width?: number | string; height?: number | string;
  cx?: number; cy?: number; rx?: number; ry?: number; r?: number;
  d?: string; transform?: string; viewBox?: string; points?: string;
  // defs 用(裸 SVG 本就是 camelCase): refX / refY / markerWidth / markerHeight /
  //   markerUnits / orient / gradientUnits / gradientTransform / patternUnits /
  //   patternContentUnits / patternTransform / preserveAspectRatio / offset / href ...
  [k: `data-${string}`]: string | number | undefined; // 水合挂点留口
};

/** 属性键 = 该属性的 SVG 真实拼写(呈现属性 kebab,结构属性规范拼写) */
type SvgAttrs = Partial<SvgPropertiesHyphen> & SvgStructuralAttrs;

type SvgNode = {
  tag: string;                       // 'rect' | 'path' | 'g' | 'defs' | 'marker' | ...
  attrs: SvgAttrs;
  style?: PropertiesHyphen;          // 仅给含 var() 的值(沿用现 renderPrim 的 attr/style 分流)
  children?: (SvgNode | string)[];   // string 给 tspan 文本
};

// 顶层总装:整棵 <svg><defs/>...</svg>;id 前缀由 caller 注入
buildSvgDocument(scene, { idPrefix }): SvgNode;
// SSR / 构建期直接产字符串(逐字序列化 SvgNode,零名字转换)
renderToSvgString(scene, { idPrefix }): string;
```

**核心约定:descriptor 的 key 一律用属性的 SVG 真实拼写。** 呈现属性是 kebab(`stroke-width`),结构属性用其规范拼写(`viewBox`、`refX`——裸 SVG 本就是 camelCase)。于是各路序列化各取所需:

- **字符串 / Vanilla / SSR**:逐字吐 `key="value"`,**零名字转换**(本就是 SVG 真名)。
- **Vue / Svelte / Solid(未来)**:同样逐字(它们也用 SVG 真名,含 `viewBox` 这类 camelCase)。
- **React**:**唯一**需要映射的消费者——只把呈现属性的 kebab 转 camelCase(`stroke-width`→`strokeWidth`);`viewBox` / `refX` 这些已与 React 拼写一致,不动。映射集 = 那批呈现属性,有限可枚举。

解决了什么:Scene→SVG 逻辑单一数据源、不重复;React 退化成 `compileToScene → buildSvgDocument({idPrefix}) → SvgNode→ReactElement` 三步薄绑定;字符串路天然服务 SSR/Vanilla;descriptor 结构上为水合(`data-*`)与未来多框架留好口。代价:多一层 `SvgNode` 中间类型要维护,前期成本略高;`csstype` 进 `@retikz/svg` 直接依赖(纯类型、~0 运行时体积)。

### B. 只吐 `renderToSvgString`（字符串）

`@retikz/svg` 只暴露 `renderToSvgString(scene) => string`。SSR / Vanilla 最直接,包最纯。代价:React 拿不到细粒度元素,只能整块 `dangerouslySetInnerHTML`(丢 diff / 难水合),或自己重写一套 Scene→React——与 roadmap "React 不复制渲染逻辑" 直接冲突。

### C. descriptor + React helper 一起从 svg 包出

在 A 基础上,`@retikz/svg` 连 `SvgNode→ReactElement` 的 helper 一起导出,React 包直接用、最省事。代价:`@retikz/svg` 就带上 React(哪怕 optional peer),不再是"零 React 运行时"的纯 SVG 包,与 roadmap 包边界(svg 不负责 JSX / React 只保留必要绑定层)有张力。

## 决策：选 A

理由：

1. **只有 A 同时满足 roadmap 的两条硬约束**——"React 不再拥有 SVG 渲染核心 / 不复制渲染逻辑" + "`@retikz/svg` 零 React 运行时依赖"。B 逼 React 重写逻辑,C 让 svg 沾 React,都破其一。
2. **字符串路径在 v0.3 当下就必须工作**(SSR / Vanilla 是 alpha.3 交付),而它本就需要 SVG 真名 kebab;让 descriptor 用真名等于同时服务字符串(现在)与 React(唯一映射)与未来多框架(免费),不是为 Vue 提前买单,收益当下兑现。
3. **id 前缀做成注入缝**是水合(alpha.4)的前置条件:SSR 与客户端必须产相同 id,前缀必须确定性、caller 可控;A 的 `buildSvgDocument(scene, { idPrefix })` 正好把现在 `Layout` 里的 `useId()` 黑盒外提成参数。

### 边界:纯映射、无状态、不持有框架能力

本 ADR 把 `@retikz/svg` 的职责钉死成"Scene → svg 描述"一件事,显式立三条不可越界的约束(回应"不要智能 / 不要限制框架"):

1. **无状态、无智能。** svg 包是一组纯函数:不做 memo / cache / diff / 生命周期 / 响应式,不持有任何运行时状态。"何时重渲染、如何 memo、响应式更新、水合绑定" 全归框架适配层(React 的 `useMemo` / Vue 的 `computed` 等)。包内出现的 arrow dedup / hash、`var()` 的 attr↔style 分流、多行 text 的 `dy` 计算,都是**确定性纯换算**(IR→svg 的必要环节),不是缓存或启发式——它们是"长什么样"的一部分,不是"怎么活"。
2. **不限制 React。** React 绑定层产出的是 100% 正常的 React element 树(`createElement`):reconciliation / `key` / `React.memo` / 并发特性 / Suspense / context 全部照常可用。`SvgNode` 只是中间数据,与"从 JSON 渲染 React 树"无异,**不进入 React 的 diff 语义**。唯一代价是每次渲染多一趟 `SvgNode` 中间分配(图形规模下可忽略);真撞瓶颈,React 可**绕过 `SvgNode` 树、直接消费 svg 包导出的粒度化纯映射函数**自行 `createElement`,`SvgNode` 契约不变。对比:若选字符串方案(B),React 只能 `dangerouslySetInnerHTML` 整块塞——那才会废掉 diff;A 正是为不限制 React 而选。
3. **逐图元的框架级附加(ref / handler / 动画目标)走稳定 id 关联**,与水合(alpha.4)同一套机制。本版不引入(现状也无逐图元 handler,无退化);alpha.4 落 stable id 时,React / Vue / Vanilla 共用同一关联面。

> 一句话:svg 包负责"长什么样",框架适配层负责"怎么活"。

## 待决策点

> 选项已选,选项内部仍有的小决策。列细一点,下游实现不用猜。

- **attrs 强弱类型**：倾向 `Partial<SvgPropertiesHyphen> & SvgStructuralAttrs`(csstype 提供呈现属性强类型 + 手工小结构表);若结构表维护烦,退化为 `Record<string, string | number | undefined>`,强类型只靠 builder 读 Scene 那端(Scene 本就 zod 强类型)守。
- **React 映射表来源**：呈现属性 kebab→camelCase 倾向**手工小表**(retikz 实际只用 ~30 个属性,零依赖),不引 `property-information`;若漏项风险高再换库。
- **`buildSvgFragment` 是否单出**：倾向除 `buildSvgDocument`(含 `<svg>` wrapper)外,另出只产 primitives 子树的 `buildSvgFragment`,给 Vanilla `mountSvg` 往已有容器塞用。
- **`style` 序列化**：含 `var(` 的值走 `style`(SVG attribute 不解析 CSS var,沿用现 `renderPrim` 逻辑);字符串路把 `PropertiesHyphen` 拼成 `"fill:...;stroke:..."`,React 路转 camelCase 对象。
- **`SvgNode.tag` 类型**：倾向窄联合(列 retikz 实际产出的标签)而非裸 `string`,让 builder 笔误编译期暴露。
- **`data-retikz-id` 何时填**：本版只留结构口(索引签名),**不填值**;等 alpha.4 水合让 builder 从 Scene primitive 读稳定 id 写入。**这个口的目的是支撑根级事件委托**(在容器 `<svg>` 挂每种事件 1 个 listener,事件冒泡后 `event.target.closest('[data-retikz-id]')` 反查图元、用 id 去 runtime 注册表取 handler),**而非逐图元 `addEventListener`**——监听器数量为常数级、与图元数无关,避免大图 O(N) 绑定。这跟 React 自身的根委托同模型。委托器与注册表在 runtime 层(`@retikz/vanilla` / `@retikz/react`),svg 包只负责吐 `data-retikz-id`,不持有事件能力。
- **React 是否强制走 `SvgNode` 树**：默认走(单一数据源最强,且遍历树时仍可逐节点加 `key` / 包 `memo` 边界,不限制 React)。仅当未来某 React 专属需求确实无法靠"遍历树时附加"满足,才额外导出粒度化语义映射函数作逃生口,**不改 `SvgNode` 契约**。在那之前不预先导出(YAGNI)。
- **粒度化纯映射函数的导出边界**：若导出逃生口,只导出无状态纯函数(如 `primToNode` / 各属性换算),不导出任何带框架依赖或状态的东西,守住"无智能"约束。

## DSL 表面

```ts
// @retikz/svg —— 纯函数,零框架运行时
import { buildSvgDocument, renderToSvgString } from '@retikz/svg';

const doc: SvgNode = buildSvgDocument(scene, { idPrefix: 'd1' }); // 中性描述树
const svg: string = renderToSvgString(scene, { idPrefix: 'd1' }); // SSR / 构建期产字符串
// => '<svg viewBox="0 0 10 10"><defs>...</defs><rect x="0" stroke-width="2" .../></svg>'
```

```tsx
// @retikz/react —— 内部仅: compileToScene → buildSvgDocument({idPrefix}) → SvgNode→ReactElement
// 纯 React 用户无感(idPrefix 缺省 = useId())
<Layout>
  <Node name="a" />
</Layout>

// SSR→客户端水合:两端传同一 idPrefix,id 逐字一致
// server: renderToSvgString(scene, { idPrefix: 'fig-1' })
<Layout idPrefix="fig-1">
  <Node name="a" />
</Layout>
```

## 测试设计

> 模板默认路径是 `packages/core/tests/`,本 ADR 是新建 `@retikz/svg` 包、不动 core,故测试落 `packages/svg/tests/`(适配说明见"文件 scope")。

`packages/svg/tests/build.test.ts` / `serialize.test.ts` / `document.test.ts` 覆盖:

- primitive → `SvgNode`(rect / ellipse / path / text / group)
- 资源 → defs `SvgNode`(gradient / pattern / image / clip / arrow marker)
- arrow spec 收集 / dedup / hash
- `SvgNode` → 字符串序列化(逐字、kebab、style 拼接)
- `idPrefix` 注入与确定性
- 字符串路与(react 侧)映射路的属性等价性

具体 case 拆分见下面"实现契约 § 测试象限"。

## 影响

- **新增 `@retikz/svg` 包**进 pnpm workspace。`packages/svg/package.json` 的 `dependencies` 必须含 **`@retikz/core: workspace:*`**(builder 引用 `ScenePrimitive` / `SceneResource` / `ArrowEndSpec` 等核心契约,见"依赖的现有元素")与 **`csstype: catalog:`**(纯类型)。`@retikz/react` `package.json` 加 `@retikz/svg: workspace:*` 依赖。
- **`csstype` 需先登记 pnpm catalog**:当前 `pnpm-workspace.yaml` 的 `catalog:` 没有 `csstype`,按仓库规则(所有依赖走 catalog)实现前先加 `csstype: ^3.2.3`(对齐当前 `@types/react` 传递安装的 3.2.3),再在 `packages/svg/package.json` 写 `csstype: catalog:`。
- **`packages/react/src/render/**` 大改**:`renderPrim` / `paintDefs` / `clipDefs` / `arrowMarkers` / `markerPrim` 的核心逻辑下沉到 `@retikz/svg` 的 builder(返回 `SvgNode`);React 侧只留 `SvgNode→ReactElement` 映射 + `useId` 绑定。`path-d-builder` / `transform-builder` / `viewBox` / `browser-measurer` 中与 React 无关的下沉到 svg(`browser-measurer` 用到 DOM,留 react 或另议)。
- **`Layout.tsx` 改**:`collectArrowSpecs` / `stableSpecKey` / `hashKey` 移到 `@retikz/svg`;渲染体改为调 `buildSvgDocument(scene, { idPrefix })`,`idPrefix` 由剥过冒号的 `useId()` 提供。
- **公开 API**:新增 `@retikz/svg` 的 `renderToSvgString` / `buildSvgDocument`(+ 候选 `buildSvgFragment`)/ `SvgNode` 类型。`@retikz/react` 的 `Layout` **新增可选 `idPrefix?: string`**:缺省回退剥冒号的 `useId()`(现有纯 React 用户无感、无 breaking);需要 SSR→客户端水合一致时,服务端 `renderToSvgString(scene, { idPrefix })` 与客户端 `<Layout idPrefix>` 传同一前缀,id 即逐字一致。**这条直接纳入本 ADR 契约**,避免 alpha.4 因 `useId()` 黑盒无法对齐而返工(对应背景段"id 必须确定性、caller 可控")。
- **文档站**:`@retikz/svg` 作为"扩展 retikz"内容,后续应进 `reference/extending`(见仓库文档分组约定),非本 ADR 强制。
- **拓展性(其他框架接入成本极低)**:Vue / Svelte / Solid 适配器 = 遍历 `SvgNode` → `h(tag, attrs, children)` / 模板 / markup。因 attrs 用 SVG 真名,**无需名字映射**(React 是唯一要 kebab→camelCase 的异类);响应式、`idPrefix`、水合各由适配器自理,**非 svg 包职责**。守的红线:禁止 React-ism(camelCase / `key` 字段 / React style 对象)漏进 `SvgNode`,"SVG 真名"规则即防漏闸。本 ADR 不写这些适配器(见"不在本 ADR 范围"),只保证 descriptor 形状对它们友好。
- **无 breaking**:React 用户 API 不变;`@retikz/svg` 是纯新增。(0.x 不写迁移说明,破坏性变更是常态——本 ADR 恰好无破坏。)

## 不在本 ADR 范围

- Canvas renderer 与 `@retikz/canvas` 包(roadmap alpha.7)。
- `@retikz/vanilla` 包本体 / `mountSvg` / SSR 入口封装(alpha.3);本 ADR 只保证 `@retikz/svg` 能产字符串,不做 vanilla 包。
- 水合 / `data-retikz-id` 填值 / handler 绑定(alpha.4);本 ADR 只留结构口与确定性 idPrefix 缝。**给 alpha.4 的两条约束(记此防跑偏)**:① 绑定走**根级事件委托**(容器挂常数个 listener + `closest('[data-retikz-id]')` 反查 + id→handler 注册表),不逐图元 `addEventListener`,杜绝大图 O(N) 绑定;② **非冒泡事件**(`pointerenter` / `mouseenter` / `pointerleave` / `focus` / `blur`,roadmap 水合示例用到 `pointerenter`)根委托收不到,需仿 React 用会冒泡的 `pointerover` / `pointerout` + `relatedTarget` 边界**合成** enter/leave,或对这几个事件局部绑定兜底。
- React `renderer="canvas"` 模式(alpha.6)。
- Vue / Svelte / Solid 的实际适配器;本 ADR 只保证 descriptor 命名对它们友好。
- descriptor → 局部 DOM patch / progressive 渲染(v0.4+)。

---

## 实现契约（必填）

> 下游 implement / test / document / wrapup 严格按此执行,偏离需开新 ADR 或本 ADR 加条重审。

### Level

`red`

判级规则:新建 `packages/svg/src/index.ts` 命中 red 规则 `packages/*/src/index.ts`(新公开 API 表面);同时动 `packages/react/src/{kernel,render}/**`(yellow)。跨级取最高 → **red**。注意:red 由新包公开 API 触发,**非** core IR 改动——本 ADR 不动 `packages/core`。

### Schema 改动

无 **IR / core schema** 改动:本 ADR 不新增 / 不修改任何 `packages/core/src/ir/**` 字段或 zod schema。

但需厘清 `SvgNode` / `SvgAttrs` 的定位(纠正"内部类型"的误述):它们是 **`@retikz/svg` 的公开但非持久化(non-persisted)renderer descriptor 类型**——

- **公开**:A 方案要求第三方 framework adapter(Vue / Svelte / Solid)能消费它,故必须 `export`,且**受 semver 约束**(改 `SvgNode` 形状 = `@retikz/svg` 的公开 API 变更)。
- **非持久化、不入 core**:它**不是 IR**,不写盘、不进 JSON、不进 `@retikz/core`;是 compile 之后的渲染中间产物。所以"无 IR schema 改动"成立,但不能说它是内部类型。

> 与"公开 API"段一致:`SvgNode` 列为 `@retikz/svg` 公开导出。

### 文件 scope

配置:

- `pnpm-workspace.yaml`（改:`catalog:` 加 `csstype: ^3.2.3`)

新建(`@retikz/svg`):

- `packages/svg/package.json`（`dependencies`: `@retikz/core: workspace:*` + `csstype: catalog:`)
- `packages/svg/src/index.ts`
- `packages/svg/src/types.ts`（`SvgNode` / `SvgAttrs` / `SvgStructuralAttrs`）
- `packages/svg/src/build/prim.ts`（`buildPrim`,从 react `renderPrim.tsx` 下沉)
- `packages/svg/src/build/markerPrim.ts`（`buildMarkerPrim`)
- `packages/svg/src/build/paintDefs.ts`（`buildPaintDef`)
- `packages/svg/src/build/clipDefs.ts`（`buildClipDef`)
- `packages/svg/src/build/arrowMarkers.ts`（`buildArrowMarker`)
- `packages/svg/src/build/arrowCollect.ts`（`collectArrowSpecs` / `stableSpecKey` / `hashKey` 下沉)
- `packages/svg/src/build/document.ts`（`buildSvgDocument` / 候选 `buildSvgFragment`)
- `packages/svg/src/serialize/toString.ts`（`renderToSvgString` / `SvgNode`→string)
- `packages/svg/src/path-d-builder.ts` / `transform-builder.ts` / `viewBox.ts`（从 react 下沉)
- `packages/svg/tests/build.test.ts` / `serialize.test.ts` / `document.test.ts`

修改 / 删除(`@retikz/react`):

- `packages/react/src/render/renderPrim.tsx`（改:消费 `@retikz/svg` builder,只留 `SvgNode→ReactElement` 映射)
- `packages/react/src/render/svgToReact.tsx`（新建:`SvgNode`→`ReactElement` + 呈现属性 kebab→camelCase 映射表)
- `packages/react/src/render/{paintDefs,clipDefs,arrowMarkers,markerPrim}.tsx`（删:逻辑已下沉)
- `packages/react/src/render/{path-d-builder,transform-builder,viewBox}.ts`（删 / 改为 re-export svg)
- `packages/react/src/kernel/Layout.tsx`（改:加可选 prop `idPrefix?: string`;渲染体调 `buildSvgDocument(scene, { idPrefix: props.idPrefix ?? rawId剥冒号 })`;移走 arrow 收集逻辑)
- `packages/react/package.json`（加 `@retikz/svg: workspace:*` 依赖)
- `packages/react/tests/string-react-parity.test.tsx`（新建:跨包 parity 必测,见"测试象限")

偏离白名单需在本段加条目并自注解,或开新 ADR。

### 测试象限

10 个 case(全必测),四象限分布。除 `string-react-parity` 落 `packages/react/tests/`(跨包)外,其余落 `packages/svg/tests/`:

**Happy path（≥ 3）**：

- `prim-rect-to-node`：rect primitive(fill / strokeWidth / cornerRadius)→ `SvgNode { tag:'rect', attrs:{ 'stroke-width', rx, ry, fill } }`,属性名为 kebab / SVG 真名。
- `prim-text-multiline`：3 行 text + `baseline:'middle'` → `<text>` 含 3 个 `<tspan>` 子节点,首行 `dy` = `-(n-1)/2 × lineHeight`(沿用现 `renderPrim` 算法)。
- `prim-group-transform-clip`：group(transforms + clipRef)→ `{ tag:'g', attrs:{ transform, 'clip-path':'url(#...)' }, children:[...] }`。

**边界（≥ 2）**：

- `empty-scene`：无 primitive、无 resource 的 scene → `buildSvgDocument` 产 `<svg>` 且**不含 `<defs>`**(对齐现 `hasDefs` 逻辑)。
- `paint-var-to-style`：`fill = 'var(--brand)'` → 值落 `node.style.fill`、**不**落 `attrs.fill`(SVG attribute 不解析 var,沿用 attr/style 分流)。

**错误路径（≥ 2）**：

- `pattern-missing-tile`：pattern 资源缺 `tile`(compile bug)→ 产空 `<pattern id>` 兜底,不抛(对齐现 `paintDefs` 行为)。
- `group-undefined-child`：group.children 含 `undefined` 槽位 → `collectArrowSpecs` / builder noop 跳过,不抛(对齐现 `visit` 防御)。

**交互（≥ 2）**：

- `arrow-start-end-dedup`：path 同时带 `arrowStart` / `arrowEnd` 且两端 spec 相同 → marker defs 按 `stableSpecKey` hash dedup 成 1 个,`marker-start` / `marker-end` 引同 id。
- `idprefix-determinism`：同 scene + 同 `idPrefix` → 产出 id 逐字节相同(水合前置);不同 `idPrefix` → 所有资源 id 无交集(多实例隔离)。
- **`string-react-parity`(必测,守 ADR 核心风险)**：同一 scene 经"字符串序列化"与"React 映射"两路产出语义等价——逐项断言 kebab attr ↔ camelCase 互映无丢、`style`(含 `var()`)两路一致、`url(#id)` 与 defs(paint / clip / marker)引用 id 一致、`marker-start` / `marker-end` 指向相同。**这是"Scene→SVG 单一数据源、React 只做薄映射"的回归闸,不漂才证明两路没各自实现。** 因需同时跑 `@retikz/svg` builder/序列化与 React 映射,落 `packages/react/tests/`(或跨包测试),不放 `packages/svg/tests/`。

### 依赖的现有元素

- `ScenePrimitive` / `SceneResource` / `PaintResource` / `ClipShape` / `ArrowEndSpec` / `MarkerPrimitive` / `ResolvedPatternTile` / `IRPaintSpec`(`@retikz/core`)—— 仅引用(builder 读 Scene)。
- `buildPathD`（`packages/react/src/render/path-d-builder.ts`)、`buildTransform`（`transform-builder.ts`）、`formatViewBox`（`viewBox.ts`）—— 移动到 `@retikz/svg`(本就 renderer-neutral)。
- `renderPrim` / `PaintDefs` / `ClipDefs` / `ArrowMarker` / `renderMarkerPrim`（`packages/react/src/render/**`）—— 重构:逻辑下沉为 `SvgNode` builder,React 版变薄绑定。
- `collectArrowSpecs` / `stableSpecKey` / `hashKey`（`packages/react/src/kernel/Layout.tsx`）—— 移动到 `@retikz/svg`(纯函数)。
- `useId`（React)—— 仅在 `@retikz/react` 侧作为 `idPrefix` 来源,**不**进 `@retikz/svg`。
- `csstype`（已是 `@types/react` 传递依赖,装在 3.2.3)—— 提升为 `@retikz/svg` 直接依赖,取 `SvgPropertiesHyphen` / `PropertiesHyphen`(纯类型)。**需先在 `pnpm-workspace.yaml` `catalog:` 登记 `csstype: ^3.2.3`,再以 `csstype: catalog:` 引**(见"影响 / 文件 scope")。
- `@retikz/core`（`packages/core`)—— `@retikz/svg` 的运行时依赖,`package.json` 声明 `@retikz/core: workspace:*`(builder 引用其导出的 Scene / 资源 / arrow 类型)。
