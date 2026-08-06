# ADR-08：统一 Layout Inspector 的颜色、纹理与线型语义

- 状态：Superseded
- 日期：2026-07-31
- Level：red
- 范围：Core inspection DTO 与 plane assembly、Render SVG / Canvas inspection theme、Standard Layout artifact 与 inspector、双语文档
- 关联：[alpha.2 roadmap](./roadmap.md) · [ADR-07](./07-layout-inspector.md) · [Kernel ADR-11](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/11-extensible-inspector-content.md) · [Core Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 取代关系

本 ADR 冻结的 spacing artifact、bounds 与 spacing 选项拆分、颜色区分 occurrence、纹理区分 spacing、线型区分几何类别、绘制顺序与共线消重目标继续有效

[Kernel ADR-11](../../../../../../../kernel/_notes/decisions/v0/v0.5/alpha.2/11-extensible-inspector-content.md) 取代本文的 `InspectionPrimitive`、`InspectionTone`、pattern DTO、Render palette 与专用 hatch 执行路径。Standard 改用普通 Core Path、Node、Text 与 pattern paint 表达相同视觉语义，颜色由 `context.appearance` 提供，Render 只执行隔离的普通辅助 Scene

本文其余专用 DTO 与 renderer 设计仅保留为历史记录，不再作为实施真源

## 背景

ADR-07 已建立独立 inspection plane，但当前视觉编码仍把 `neutral`、`accent`、`guide`、`warning` 四种 tone 直接映射为固定颜色。嵌套 Flex、Grid 与 Overlay 因而按 primitive role 重复使用同一组颜色，重叠时无法判断辅助图元属于哪个 layout occurrence。

矩形也只有 `outline | fill`，无法后端等价表达 margin、padding 与 gap。若由 Standard 展开斜线 primitive，纹理密度会散落到 user units，并显著扩大 inspection plane；SVG 与 Canvas 还各自复制了一份颜色表。

Flex 的现有 `flex.gap` 另有语义错误：它把相邻 `slotBounds` 之间的全部空间都当作 gap，实际可能混合 item margin、作者声明的 gap 与 `justifyContent` 分布空间，也没有表达跨 line 的 gap 与 `alignContent` 分布空间。Grid 的 track 起点同样可能把固定 gap 与 content distribution 合并。先把错误区域套上纹理只会放大误导。

Chrome DevTools 的可复用经验是用独立颜色区分多个 persistent overlay，并用 hatch 区分 gap / distributed space。它还会用 dashed / dotted 区分容器和内部结构；retikz 已由 role 与 pattern 承担结构语义，因此统一使用 dashed，避免点线与密集纹理竞争。Figma 的 auto-layout 说明 nested container 各自拥有 padding 与 gap，但它的交互手柄与 selection UI 不属于本轮 runtime-only inspector。

现有 authoring option 还把 content outline 与 padding、slot outline 与 margin、固定 gap 与 distributed free space 分别绑在同一个开关上。这样无法表达 Chrome DevTools 风格的推荐态：显示 content box outline、低层级内部结构线与固定 gap，同时保留“全部”预设对 padding、margin 和 distributed free space 的完整展示。

## 决策

### 1. 三条正交视觉通道

Layout Inspector 固定使用三条互不复用的视觉通道：

| 通道 | 表达内容                        | 规则                                                                            |
| ---- | ------------------------------- | ------------------------------------------------------------------------------- |
| 颜色 | 最终 layout occurrence identity | Core 分配 `colorScope`，Render 从循环 palette 取色                              |
| 纹理 | spacing 语义                    | margin / gap=`forward-diagonal`、padding=`backward-diagonal`，三者无底色        |
| 线型 | 几何类别                        | box、spacing boundary 与内部 line/track/cell=`dashed`、anchor/crosshair=`solid` |

warning 不参与 occurrence palette：`tone: 'warning'` 始终使用独立红色；其它辅助图元使用 `tone: 'scope'`。颜色不再表达 container/content/slot/allocation 等 role，这些差异只由 role、纹理、线型与绘制顺序表达。

### 2. Core 冻结 renderer-neutral pattern 与 color scope

`InspectionToneSchema` 收窄为：

```ts
type InspectionTone = 'scope' | 'warning';
```

新增：

```ts
type InspectionFillPattern = 'solid' | 'forward-diagonal' | 'backward-diagonal' | 'crosshatch';
```

`InspectionRectPrimitiveSchema` 仍以 `kind: 'rect'` 判别几何，但按 `presentation` 严格区分两个变体：

```ts
type InspectionRectPrimitive =
  | {
      kind: 'rect';
      role: string;
      x: number;
      y: number;
      width: number;
      height: number;
      presentation: 'outline';
      tone: InspectionTone;
      lineStyle: InspectionLineStyle;
      opacity?: number;
    }
  | {
      kind: 'rect';
      role: string;
      x: number;
      y: number;
      width: number;
      height: number;
      presentation: 'fill';
      tone: InspectionTone;
      fillPattern: InspectionFillPattern;
      opacity?: number;
    };
```

outline 不接受 `fillPattern`，fill 不接受 `lineStyle`，两种变体均无隐式 presentation 默认值。`forward-diagonal` 在 x 向右、y 向下的屏幕坐标中显示为 `/`，`backward-diagonal` 显示为 `\`；不用正负角度命名，避免后端坐标解释分叉。

`InspectionPlaneEntrySchema` 新增必填的非负安全整数 `colorScope`。Core 先按既有 occurrence 比较规则和最终提交顺序稳定排序 entry，再从 `0` 开始按排序结果分配连续 `colorScope`。分配步骤不额外解析 `sourcePath` 或读取 React / Core Scope 层数，也不允许 composite inspector 自己指定颜色。

`colorScope` 不从 `sourcePath` 的字符串内容或 Scope 深度派生；entry 排序仍原样复用现有 `compareCompileOccurrences()`，该比较器可以按既有契约解析 authored child path。相同最终 entry 集合与顺序得到相同 `colorScope`；新增或移除更早的 entry 可以让后续颜色顺延。palette 循环后的颜色碰撞是显式接受的有限视觉资源，不改变 occurrence locator identity。

### 3. Render 共享一个 theme 与一套 hatch 几何

SVG 与 Canvas 从 Render `shared` owner 读取同一份冻结 theme：

```ts
const InspectionPalette = [
  '#2563eb',
  '#7c3aed',
  '#c026d3',
  '#db2777',
  '#ea580c',
  '#a16207',
  '#16a34a',
  '#0f766e',
  '#0891b2',
] as const;
```

regular color 为 `InspectionPalette[colorScope % InspectionPalette.length]`，warning color 为 `#dc2626`。palette 与 warning 是 Render 内部实现常量，不进入 Core DTO，不开放每个 renderer 各自覆写；浅色、深色与嵌套重叠验证若要求调整，只能同步调整这一真源中的色值。

Render shared 同时提供纯 hatch segment 生成器，SVG 与 Canvas 复用相同结果。canonical hatch pitch 为 12 user units，stroke width 为 1。设 primitive 显式 `opacity` 为 `m`，省略时 `m = 1`：

- outline 与 line 的最终 alpha 为 `m`；
- label 的最终 alpha 固定为 `1`，它没有 opacity 字段；
- `solid` fill 的最终 alpha 为 `0.14 × m`；
- diagonal / crosshatch 的 base fill alpha 固定为 `0`，hatch stroke alpha 为 `0.55 × m`。

overflow warning 必须输出 `tone: 'warning'`、`presentation: 'fill'` 与 `fillPattern: 'solid'`，因此两后端都使用 warning color 和 `0.14 × m`。alpha 在乘法后保持 `[0,1]`，因为 schema 已把 `m` 限制在该范围。

SVG 直接把共享 segment 物化为已经被几何裁到 rect 内的 path segments，不为 patterned rect 输出 base rect；Canvas 对每个 patterned rect 执行 `save → rect/clip → hatch stroke → restore`，再绘制后续 primitive。两者使用相同 segment、颜色和逐通道 alpha，不创建 document-global pattern / clip id，因此同页多个 SVG 不会发生 id 冲突。零面积 rect 不生成 hatch segment，也不产生可见输出，但仍是合法 DTO。

### 4. Standard artifact 记录真实 spacing segment

新增共享 strict schema：

```ts
type LayoutSpacingArtifact = {
  kind: 'gap' | 'distributed';
  axis: 'x' | 'y';
  bounds: LayoutArtifactRect;
};
```

segment 的主轴长度必须为正，另一轴可以为零；所有坐标都是当前 container allocation coordinate。`axis: 'x'` 的主坐标/长度为 `bounds.x/width`，正交坐标/长度为 `bounds.y/height`；`axis: 'y'` 则为 `bounds.y/height` 与 `bounds.x/width`。

Flex 与 Grid artifact 各新增顶层 `spacing` 数组。canonical comparator 固定为：`axis` 按 `x → y`，再按主坐标、正交坐标、`kind` 按 `gap → distributed`，最后保留 compile 生成序号。这个顺序只定义 JSON artifact 与 primitive underlay 的确定性，不改变 paint order。Overlay 没有 gap / distribution，不新增空占位字段。

固定 gap 与额外 between distribution 共处一个物理间隔时，以间隔中心为基准：固定 gap 占据 authored gap 长度的居中段，剩余正长度平均拆为其前后两个 `distributed` segment。这样 row/column reverse 与 wrap-reverse 都使用相同物理口径，不按 traversal 方向选择 gap 靠哪一侧。leading / trailing 只记录 content edge 与首末 outer box / track 之间的正空间；负 free space、重叠或零长度不生成 distributed segment。

Flex compile 在最终 placement 时记录：

- 每条 line 的固定 main-axis gap；
- `justifyContent` 产生的 leading、between 与 trailing 正空间，标为 `distributed`；
- 多 line 的固定 cross-axis gap；
- `alignContent` 产生的 leading、between 与 trailing 正空间，标为 `distributed`；
- `stretch` 吸收到 line cross size 的空间不另记为 distributed segment。

Flex main-axis segment 的正交范围等于所属最终 physical line 的 `[crossStart, crossStart + crossSize]`；cross-axis segment 的正交范围等于 container content 的完整 main band。item 的 outer box 使用最终 `marginBounds`。line 按最终物理 cross position解释，row/column reverse 只改变 item 物理顺序，wrap-reverse 只改变 line 物理顺序；segment 统一从最终矩形按上述中心规则生成。

Grid compile 从最终 track geometry、作者已解析 gap 与 content bounds 记录：

- 相邻 track 间固定 row / column gap；
- track group 的 leading、额外 between 与 trailing 正空间，标为 `distributed`；
- `stretch` 吸收到 track size 的空间不另记为 distributed segment。

Grid column (`axis: 'x'`) spacing 使用完整 content height，Grid row (`axis: 'y'`) spacing 使用完整 content width。row 与 column band 的交叉矩形允许重叠；canonical array 先绘 x 后绘 y，交叉区域按 source-over 稳定叠加，不拆片、不去重。固定 gap 在相邻 track 物理间隔中居中，额外 between distribution 平分到两侧；leading/trailing 来自 content edge 与首末 track edge。没有 track 时不产生 spacing，单 track 只可能产生 leading/trailing distributed。

inspector 只读这些 resolved segment，不读取 authored props、不反推 solver 策略，也不重新运行 solver。artifact schema 拒绝未知 kind、非法 axis、非有限 rect 与非正主轴长度。

### 5. Inspection option 拆分 bounds 与 spacing

Core `BaseLayoutInspectOptions` 新增独立的 box spacing 选择：

```ts
type LayoutInspectSpacingOptions = {
  padding?: boolean;
  margin?: boolean;
};

type BaseLayoutInspectOptions = {
  bounds?: boolean | LayoutInspectBoundsOptions;
  spacing?: boolean | LayoutInspectSpacingOptions;
  overflow?: boolean;
  alignmentGuides?: boolean;
  labels?: boolean;
};
```

`spacing: true | false` 同时开关 padding 与 margin；对象形式按 sparse merge 规则覆盖单项。canonical Core profile 保持 `padding=true、margin=true`，避免 `inspect: true` 静默缩减既有全量诊断；docs 的“推荐”预设显式把两项设为 `false`，“全部”显式设为 `true`。

Flex 与 Grid family-local option 各新增 `distributedSpace?: boolean`。`gaps` 只控制作者声明的固定 gap，`distributedSpace` 只控制 `justifyContent` / `alignContent` / content distribution 产生的正自由空间；两项 canonical 默认均为 `true`，docs 推荐态显式使用 `gaps=true、distributedSpace=false`。

`bounds.content` 与 `bounds.slot` 只控制对应 outline，不再隐式打开 padding 或 margin。React 与 Vanilla 沿用现有 `inspect` 对象透传和 schema 推导，不新增 adapter 私有字段。

`spacing` 是 Core base inspection key：component-local inspect 分流必须把它归入 base options，不得传给 family-local schema。`mergeInspectOptions()` 与 compile orchestration 的 inherited merge 都对 `spacing` 使用与 `bounds` 相同的规则：boolean 替换整组，对象与对象逐字段 sparse merge，boolean 与对象之间由后写值替换。Layout、Scope 与 component-local 三层级联后再统一 resolve；React 与 Vanilla 消费同一条 Core 路径。

### 6. Standard 统一 spacing ring、线型和绘制顺序

padding ring 由 container `allocationBounds - contentBounds` 得到；margin ring 由每个 item 的 `marginBounds - slotBounds` 得到。差集先把 inner rect 与 outer rect 求交：无正面积交集时返回整个 outer rect；交集覆盖 outer 时返回空；其它情况按 top、bottom、left、right 生成最多四个互不重叠的非空 rect。该规则覆盖 oversized / 单边超过 allocation 的 padding，不假设 inner 完全包含于 outer。纹理分片只负责 hatch，不逐片描边；ring 额外以独立 dashed line primitive 描 outer 与裁剪后 inner perimeter。

Flex / Grid 的 `gaps` 只 lowering artifact 中的 `gap` segment，使用与 padding 方向相反的 `forward-diagonal`，并以独立 dashed line primitive 描 segment boundary；`distributedSpace` 只 lowering `distributed` segment 的 dashed perimeter，不输出 fill，使未占用 content 保持透明留白。两者关闭时 artifact 仍保留真实 resolved segment，inspector 不反推或改写 artifact。

每个 occurrence 的 primitive 顺序固定为：

1. padding、margin、gap 的 hatch 与 spacing 的显式 dashed boundary；
2. family structure（Flex line、Grid track/cell/span、Overlay placement）；
3. container/content/slot/allocation/visual box outline；
4. overflow warning；
5. alignment guide 与 Overlay anchor；
6. item / stacking label。

所有 box outline、Flex line、Grid track/cell/span、Overlay placement 与 alignment guide 统一使用 dashed；Overlay crosshair 与 anchor 保持 solid。Standard 不再输出 dotted，但 Core / Render 继续支持 custom inspection primitive 使用 dotted。所有非 warning primitive 均输出 `tone: 'scope'`。

spacing boundary、box outline 与 family structure 共享同一共线归一化规则：已有 rect outline 或更早 line 完整覆盖某段 boundary 时，后续 lowering 不再重画该段；相邻 ring 共享的边界也只输出一次。当 `bounds.content` 与 Flex `lines` 或 Grid `tracks` 同时开启时，family structure 不重复输出与 content outline 共线的外周边界；关闭 content outline 且没有 spacing boundary 复用该段时，`lines` / `tracks` 仍保留完整结构边界。该归一化发生在 Standard lowering，不依赖 SVG / Canvas 覆盖后的偶然外观。

### 7. 推荐、全部与关闭预设

三种 Standard Layout playground 共用同一预设生成器：

- `recommended` 共享层：仅 `bounds.content=true`；`bounds.container / slot / allocation / visual=false`，`spacing.padding / margin=false`，`overflow / alignmentGuides / labels=false`；
- Flex `recommended`：额外 `lines / gaps=true`；`distributedSpace=false`；
- Grid `recommended`：额外 `tracks / gaps=true`；`cells / distributedSpace / spans=false`；
- Overlay `recommended`：不提供 gap，只保留共享的 content outline；`placements / anchors / stacking=false`；
- `all`：总开关开启，所有 detail control 为 `true`；
- `off`：只把总开关设为 `false`，保留 detail 值供重新开启；
- Reset 回到 `recommended` canonical values；用户修改任意单项后 selector 显示“自定义”。

推荐态的最外层 layout outline 因而是 content box，不包含 padding；Flex line 与 Grid track 使用 dashed 结构线，固定 gap 使用 12-user-unit `forward-diagonal`。distributed free space 在全部状态下都不铺背景色；推荐态关闭其边界，全部态用消重后的 dashed perimeter 标示范围。

### 8. 兼容性

本 ADR 修改 Core 公共 inspection DTO 与 Standard 公共 Flex / Grid artifact，属于 `0.x` breaking change：

- custom inspector 把 `neutral | accent | guide` tone 改为 `scope`，fill rect 补 `fillPattern`；
- 手写 `InspectionPlane` entry 补 `colorScope`；正常 `compileToScene()` 调用由 Core 自动分配；
- Flex / Grid artifact consumer 接受新增必填 `spacing`；
- `BaseLayoutInspectOptions` 使用新增 `spacing.padding` / `spacing.margin` 独立控制 box spacing ring；
- Flex / Grid inspector option 使用新增 `distributedSpace` 独立控制自由空间分布，`gaps` 只表示固定 gap；
- SVG / Canvas public render frame API 形状不变。

不保留旧 tone alias、可选 `colorScope` 或缺失 `spacing` 的兼容分支。

## 测试设计

- Core schema：pattern union、tone 收窄、outline / fill 非法组合、`colorScope` 数值边界、box spacing sparse/boolean/default/merge、JSON round-trip 与字段描述
- Core inspection cascade：`spacing` 作为 base key 经过 Layout → Scope → component-local 分流与两条 sparse merge 路径；覆盖 object/object、boolean/object，React / Vanilla component-local authoring 得到相同 resolved spacing
- Core compile：按 final occurrence 顺序连续分配 colorScope；rejected probe 不占号；分配阶段不新增基于 sourcePath 内容或 Scope 深度的颜色规则
- Render shared：palette 取模、warning override、两种 diagonal 方向、crosshatch segment、pattern base alpha=0 与 hatch alpha 公式的确定性
- SVG / Canvas：同一 pattern DTO 使用同一颜色与 segment；pattern 不绘 base fill；solid fill 保留；无 SVG id；Canvas clip / restore；inspection 仍不参与 hit test
- Standard artifact：Flex row/column reverse、margin + gap + `space-between`、wrap/wrap-reverse + cross gap + `alignContent`、负 free space；Grid gap + content distribution、双轴 band 交叉与 canonical 顺序；非法 spacing 拒绝
- Standard inspector：padding / margin / gap / distributed 的独立 option、pattern-only fill、distributed boundary-only、显式 dashed spacing boundary、共线消重、box / internal / anchor line style 与六层绘制顺序
- 集成：nested layout 的相邻 final occurrences 得到不同 colorScope，main Scene、viewBox、resource、hydration 与 hit-test 不变
- docs：中英文 Standard runtime / artifact、Flex/Grid 组件页与 Kernel Core / Render / compile 公开契约一致；三种 playground 的 recommended/all/off、Reset 与自定义状态一致；现有 nested 与三种 playground 在浅色、深色、桌面与 500px 下可辨认

详细行为到证据映射见 ignored `notes/plans/layout-inspection-visual-semantics/TEST_CONTRACT.md`。

## 能力完备性检查

- 所属能力域与能力面：Drawing Complete 的 Primitive / Scene 执行协作面，以及 Standard 通用 Layout artifact / inspector
- 解决的问题：让多个最终 layout occurrence 的辅助层可归属，用后端中立语义准确且可独立配置地表达 margin、padding、gap 与 distributed spacing
- 主责包与协作包：Core 拥有 inspection DTO 与 occurrence colorScope；Render 拥有 palette 与 SVG / Canvas 物化；Standard 拥有 layout spacing artifact 与 role lowering
- 是否可由现有能力组合：现有 rect fill 与 tone 无法表达 pattern / occurrence identity，Flex / Grid artifact 也无法区分固定 gap 与 distributed space，需要扩展当前域
- 是否需要下沉到依赖能力域：需要先扩展 Core inspection DTO；不新增主 Scene primitive、IR 或 renderer-specific字段
- 内部表达链路：Standard solver/placement → typed spacing artifact → inspector primitive → Core plane assembly → Render shared theme → SVG / Canvas
- 外部扩展链路：custom layout 继续在同一 `CompositeDefinition.inspector` 返回公开 primitive；Core 统一校验与赋 colorScope，custom renderer 继续消费同一 InspectionPlane
- define-registry：不新增开放 provider 种类；pattern 是闭合 DTO vocabulary，palette 是 Render 内部有限主题，沿用既有 CompositeDefinition registry 与 renderer capability
- 下游执行 / adapter 等价性：React / Vanilla 继续通过现有 `inspect` 对象等价暴露新增字段；两者从同一次 Core compile 获得相同 plane，SVG / Canvas 共享 resolver 与 hatch geometry
- 不支持边界与诊断：不提供 CSS theme 注入、用户 palette、交互选择、拖拽手柄、pattern registry 或增量 inspection patch；非法 DTO / artifact fail-loud
- 本轮结论：先下沉扩展 Drawing Complete 的 inspection DTO，再由 Standard 当前 Layout 能力消费

## Schema 改动

| 所有者   | 文件                                                                        | 操作                                                                                         |
| -------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Core     | `packages/kernel/core/src/contract/inspection/primitive-schema.ts`          | tone 收窄；新增 fill pattern；rect presentation 严格 union；entry 新增 `colorScope`          |
| Core     | `packages/kernel/core/src/contract/inspection/options-schema.ts`            | 新增 `spacing.padding` / `spacing.margin` sparse authoring、boolean 展开与 canonical resolve |
| Standard | `packages/library/standard/src/composites/shared/layout/artifact-schema.ts` | 新增 spacing segment schema 与类型                                                           |
| Standard | `packages/library/standard/src/composites/shared/layout/inspect-schema.ts`  | Flex / Grid 新增 `distributedSpace` family-local option                                      |
| Standard | `packages/library/standard/src/composites/flex-layout/artifact-schema.ts`   | 新增必填 `spacing` 与跨字段校验                                                              |
| Standard | `packages/library/standard/src/composites/grid-layout/artifact-schema.ts`   | 新增必填 `spacing` 与跨字段校验                                                              |

不修改 Core IR、Standard authoring IR、Scene primitive、React 组件装配或 Vanilla builder 装配；`inspect` 的 schema-derived public type 随上述 option 扩展。

## 文件 scope

允许触碰：

- `packages/kernel/core/src/contract/inspection/**`
- `packages/kernel/core/src/compile/orchestration/inspection.ts`
- `packages/kernel/core/tests/contract/inspection/**`
- `packages/kernel/core/tests/compile/layout-inspection.test.ts`
- `packages/kernel/render/src/shared/**`
- `packages/kernel/render/src/svg/builders/inspection.ts`
- `packages/kernel/render/src/canvas/draw-inspection.ts`
- 受 DTO breaking 影响的 `packages/kernel/{render,react,vanilla}/tests/**` inspection fixtures
- `packages/library/standard/src/composites/shared/layout/**`
- `packages/library/standard/src/composites/{flex-layout,grid-layout,overlay-layout}/**`
- `packages/library/standard/tests/{layout-artifacts,layout-inspection,flex-layout,grid-layout}/**`
- `apps/docs/src/modules/docs/contents/standard/layout/reference/{runtime,contract-artifact}/**`
- `apps/docs/src/modules/docs/contents/standard/layout/{layout-inspection-controls.ts,flex-layout/**,grid-layout/**,overlay-layout/**}`
- `apps/docs/src/modules/docs/components/component-preview/{types.ts,control-panel/PreviewControlPanel.tsx}`
- `apps/docs/tests/component-preview/standard-layout-doc.test.tsx`
- `apps/docs/tests/component-preview/preview-control-panel.test.tsx`
- `apps/docs/src/modules/docs/contents/kernel/reference/runtime/compile/index.{zh,en}.mdx`
- `apps/docs/src/modules/docs/contents/kernel/packages/core/index.{zh,en}.mdx`
- `apps/docs/src/modules/docs/contents/kernel/packages/render/index.{zh,en}.mdx`
- `apps/docs/src/modules/docs/data/changelog/kernel-0-5.ts`
- `apps/docs/src/modules/docs/data/changelog/standard-0-1.ts`
- 本 ADR 与同 milestone roadmap

偏离以上 scope、调整其它 Tier 2 或引入新 package dependency 时必须停止并重新确认。

## 依赖现有元素

- ADR-07 的 `CompositeDefinition.inspector`、InspectionPlane、final occurrence 排序与 static / retained frame
- Core `BaseLayoutInspectOptions` 的 sparse merge 与 canonical resolve
- Standard typed Layout artifact、`marginBounds` / `slotBounds`、container `allocationBounds` / `contentBounds`
- Flex `resolveFlexSpaceDistribution()` 与 Grid final track geometry
- Render 既有 SVG descriptor、Canvas frame transform 与 hit-test 隔离

## 被否决的方案

- 继续用 tone 为 role 上色：nested occurrence 仍无法归属，颜色同时承担两套语义
- 用正交网格表达 gap：会与 Grid track 视觉冲突；使用与 padding 反向的单向 diagonal hatch
- 由 Standard 展开 hatch line primitive：纹理密度和 plane 体积泄漏到上游
- 从 `sourcePath` 或 Scope 深度推导颜色：把 authored 字符串格式或 adapter 树形态变成 renderer 契约
- 只修 Flex 而保留 Grid track 空白推断：Grid content distribution 仍会被错误标为固定 gap
- 为 pattern 新建 registry：闭合的四种 runtime-only presentation 不具备第三方 provider 需求
- 继续让 bounds 同时控制 spacing ring、让 `gaps` 同时控制 fixed gap 与 distributed space：无法形成显示 content outline、内部结构线与固定 gap 的稳定推荐态

## 不在本 ADR 范围

- selection、hover、drag handle、编辑历史、viewport toolbar 或 DevTools 面板
- 用户自定义 palette、CSS theme、pattern definition / registry 或 renderer 回调
- 主 Scene paint / pattern resource、IR 持久化或命中语义
- Plot、Table、Gantt 与其它 Tier 2 inspector
- inspection 增量 patch、跨 compile cache 或屏幕像素恒定 hatch pitch
