# ADR-03：Path 箭头重设计（删 `arrowShape`，加 `arrowDetail` 对象 + 起末分别配置）

- 状态：Proposed
- 决策日期：2026-05-12
- 关联：[v0 roadmap §v0.1.0-alpha.5](../../../plans/v0/roadmap.md) · [v0.1.0-alpha.5 plan TODO-2](../../../plans/v0/v0.1-alpha.5.md) · [DESIGN.md §4.5](../../../architecture/DESIGN.md)

## 背景

当前 `PathSchema` 上箭头相关只有两个扁平字段（`packages/core/src/ir/path/path.ts:26-37`）：

- `arrow: 'none' | '->' | '<-' | '<->'` —— 方向 / 出现位置
- `arrowShape: ArrowShape` —— 形状（normal / open / stealth / diamond / openDiamond / circle / openCircle 共 7 种）

视觉属性**全部锁死等于 path 自身**（`packages/react/src/render/arrowMarkers.tsx`）：

- 颜色：硬编码 `fill="context-stroke"` / `stroke="context-stroke"` —— 强制等于 path stroke
- 大小：硬编码 `markerWidth=6` / `markerHeight=6` + `markerUnits="strokeWidth"` —— 只能按 path strokeWidth 等比缩放
- 透明度：跟随 path `opacity` / `drawOpacity` —— 无独立 override
- 起末两端：**共用一个 `arrowShape`** —— 没法 start 一种形状、end 另一种

对照 TikZ `arrows.meta` library 能力：

| TikZ 选项 | 用途 | retikz 现状 | 本次纳入 |
|---|---|---|---|
| shape | 形状选择 | `arrowShape` 字段 | ✅ 搬进 `arrowDetail.shape` |
| `scale` | 等比缩放 | ❌ | ✅ |
| `length` | 尖长 | ❌（固定 6） | ✅ |
| `width` | 尖宽 | ❌（固定 6） | ✅ |
| `color` | 描边颜色 override | ❌（强制 context-stroke） | ✅ |
| `fill` | 填充色 override | ❌ | ✅ |
| `opacity` | 透明度 override | ❌ | ✅ |
| `lineWidth` | 空心 shape 描边粗细 | ❌（硬编码 1.5） | ✅ |
| 起末异形 / 异色（`>=A, <=B`） | start / end 分别配置 | ❌ | ✅ 通过 `arrowDetail.{ start, end }` |
| `harpoon` / `reversed` / `inset` / `slant` / `bend` / `sep` | 单边倒钩 / 反向 / 内移 / 斜切 / 弯曲 / 多 tip 间距 | ❌ | ⚠️ 不纳入（留 v0.2+ 或长期不做） |

实际用户诉求"线浅色 / 箭头深色"、"半透明箭头"、"箭头放大让密集图可读"、"UML 起末异形"全做不到。

## 选项

### A. `arrowDetail` 单字段对象 + start/end 子对象 merge（**推荐**）

**删除** `arrowShape: ArrowShape`（搬进 `arrowDetail.shape`）。
**保留** `arrow: 'none' | '->' | '<-' | '<->'`（含义不变：控制起末两端是否出箭头 / 哪一端出）。
**新增** `arrowDetail?: ArrowDetailSchema`：

```ts
type ArrowDetailSchema = {
  // 默认值（起末两端共享，没填 start/end 时生效）
  shape?: ArrowShape      // 缺省 'normal'
  scale?: number          // 等比缩放，默认 1；乘到 length/width 上
  length?: number         // 尖端长度（user units），缺省按 shape 内置（≈6×strokeWidth）
  width?: number          // 尖端宽度（user units），同上
  color?: string          // 描边颜色（空心 shape 主用 + 实心 shape stroke 备用）；缺省继承 path stroke
  fill?: string           // 填充色（仅实心 shape 生效）；缺省 = color；空心 shape 上**写了也无效**（silent no-op）
  opacity?: number        // 0..1；缺省继承 path opacity
  lineWidth?: number      // 空心 shape 描边粗细（user units），缺省 1.5

  // 起末分别 override（与上面默认逐字段 merge——缺省字段继承顶层默认）
  start?: ArrowEndDetailSchema    // 仅当 arrow 含起端（'<-' / '<->'）时生效
  end?: ArrowEndDetailSchema      // 仅当 arrow 含末端（'->' / '<->'）时生效
}

// ArrowEndDetailSchema 字段集 = ArrowDetailSchema 减去 start/end 本身（不递归）
```

### B. 扁平字段（不支持起末异形）

加 `arrowColor` / `arrowOpacity` / `arrowScale` / `arrowLength` 等 path-level 扁平字段，起末共用。

- 优点：schema 简单；不引入嵌套对象
- 缺点：**无法表达起末异形 / 异色**（UML 关系图刚需）；字段散落 path 层级；未来加新视觉字段会让 path schema 越发膨胀

### C. 顶层 `arrowStart` / `arrowEnd` 两字段对（无共享默认）

```ts
arrowStart?: { shape, color, ... }
arrowEnd?: { shape, color, ... }
```

- 优点：起末显式独立
- 缺点：常见场景"起末同形"要写两遍重复字段；没有"默认 + override"分层

## 决策：A（`arrowDetail` 对象 + start/end 子对象 merge）

理由：

1. **支持起末异形 / 异色**（UML / 关系图刚需，B 无解）
2. **常见场景写起来短**：起末同形时只写顶层即可，不用写两遍（C 笨）
3. **start/end 与顶层 merge 语义清晰**：缺省字段继承，符合用户直觉
4. **schema 结构稳定**：未来加 `harpoon` / `reversed` 等新字段只在 `arrowDetail` 内部加，path 层级不动

## 决策细节

> 选项 A 主决策之外，4 项字段细节均已拍板。下游 implement 阶段按此执行。

1. **字段名 = `arrowDetail`**：直白、不撞 TikZ "style" 的复杂语义、给 LLM 看含义清楚（优于 `arrowStyle` / `arrowOptions` / `arrows`）
2. **start/end merge 语义 = 逐字段 merge**：`start` / `end` 子对象缺省字段继承顶层默认，已填字段 override 顶层。与 `NodeLabel.font` 继承块级 font 的语义一致，DX 友好。**不**采用"完全替换"语义
3. **`scale` × `length`/`width` 关系：scale 乘到 length/width 之后**：用户给 `length=10, scale=1.5` → 实际渲染长度 15。scale 是"再缩放一次"的纯乘子，与 SVG transform 的 scale 直觉一致
4. **空心箭头不具备 `fill` 属性（写了也无效）**：
   - **实心 shape**（normal / stealth / diamond / circle）：`fill` 主导（覆盖默认填充），`color` 作 stroke 备用
   - **空心 shape**（open / openDiamond / openCircle）：**`fill` 字段完全无效**（不报错，silent no-op）；`color` 主导描边
   - **schema 不强制**（zod 不拒绝空心 shape 上写 fill），由 compile / render 在空心 shape 路径上**直接忽略** `fill` 字段
   - 文档要白纸黑字写清这条 "silent ignore" 规则——避免用户给 `arrowDetail={{ shape: 'open', fill: 'red' }}` 然后困惑"为什么 fill 没生效"

## DSL 表面

```tsx
// 默认 normal 实心箭头，path 继承所有视觉
<Path arrow="->">
  <Step ... />
</Path>

// 起末同形换 shape
<Path arrow="->" arrowDetail={{ shape: 'stealth' }}>
  ...
</Path>

// 起末同形 + 缩放 + 红箭头
<Path arrow="<->" arrowDetail={{ shape: 'stealth', scale: 1.5, color: 'red' }}>
  ...
</Path>

// 起末异形（UML 继承箭头）
<Path arrow="<->" arrowDetail={{
  start: { shape: 'normal' },
  end: { shape: 'stealth' },
}}>
  ...
</Path>

// 起末异色（共享 shape）
<Path arrow="<->" arrowDetail={{
  shape: 'stealth',
  start: { color: 'red' },
  end: { color: 'blue' },
}}>
  ...
</Path>

// 半透明 + 显式 length/width 覆盖默认
<Path arrow="->" arrowDetail={{ length: 12, width: 10, opacity: 0.5 }}>
  ...
</Path>
```

## 测试设计

- **core schema**：`ArrowDetailSchema` 合法 / `start`/`end` union / 字段缺省 merge
- **core compile**：`compile/path.ts` resolve 起末实际视觉规格（merge `start`/`end` → 顶层默认 → 内置默认）
- **react renderer**：
  - 默认（无 `arrowDetail`）走 `context-stroke` 继承（行为不变）
  - `color` override 不走 `context-stroke`
  - `scale` 应用到 `markerWidth/Height`
  - 起末异形产出 2 个不同 marker（marker id 含 detail hash）
  - `lineWidth` 在空心 shape 上生效

## 影响

- **`packages/core/src/ir/path/arrow.ts`**：保留 `ARROW_SHAPES` / `ArrowShape`；新增 `ArrowDetailSchema` + `IRArrowDetail` 派生类型
- **`packages/core/src/ir/path/path.ts`**：删 `arrowShape`、加 `arrowDetail`
- **`packages/core/src/compile/path.ts`**：path 层把 `arrowDetail` resolve 成实际起末视觉规格
- **`packages/react/src/render/arrowMarkers.tsx`**：接受 color / fill / opacity / scale / length / width / lineWidth props；替换 `context-stroke` 硬编码、按尺寸算 `markerWidth/Height`、空心 shape 用 `lineWidth`
- **`packages/react/src/render/renderPrim.tsx`**：path marker id 纳入 detail hash（同 path 不同 detail → 不同 marker id），避免 SVG defs 复用错配
- **`packages/core/src/index.ts`**：公开 API 导出 `ArrowDetailSchema` / `IRArrowDetail`
- **测试**：core schema + compile，react renderer
- **文档双语**：`path.mdx` API 表 + 5 个 ComponentPreview demo
- ⚠️ **BREAKING**：`arrowShape: 'X'` IR 写法不再合法——alpha 期允许直接断（无外部用户）

## 不在本 ADR 范围

- `harpoon` / `harpoon swap`（单边倒钩）—— 留 v0.2+
- `reversed`（反向）—— 留 v0.2+
- `inset`（stealth 倒钩内移）—— 用 length/width 已可绕，留 v0.2+
- `slant` / `bend` / `sep`（多 tip 间距）—— 长期不做（niche）

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/core/src/ir/path/**`（PathSchema 字段加 / 删）
- 动 `packages/core/src/compile/**`（path arrow resolve）
- 动 `packages/core/src/index.ts`（公开 API）
- 跨级取最高 = red

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/src/ir/path/path.ts` | 删 | `PathSchema.arrowShape` | `z.nativeEnum(ARROW_SHAPES).optional()` | — | 删除独立 shape 字段（搬进 `arrowDetail.shape`）|
| `packages/core/src/ir/path/path.ts` | 加 | `PathSchema.arrowDetail` | `ArrowDetailSchema.optional()` | `undefined` | 箭头详细配置对象，含顶层默认 + start/end override |
| `packages/core/src/ir/path/arrow.ts` | 新建 schema | `ArrowDetailSchema` | zod object | — | 顶层默认（shape/scale/length/width/color/fill/opacity/lineWidth）+ start/end 子对象 |
| `packages/core/src/ir/path/arrow.ts` | 新建 schema | `ArrowEndDetailSchema` | zod object | — | start/end 子对象的 schema（不含 start/end 字段自身，不递归） |

### 文件 scope

- `packages/core/src/ir/path/arrow.ts`（修改）
- `packages/core/src/ir/path/path.ts`（修改）
- `packages/core/src/ir/path/index.ts`（barrel 加 export）
- `packages/core/src/index.ts`（公开 API 加 `ArrowDetailSchema` / `IRArrowDetail`）
- `packages/core/src/compile/path.ts`（修改：arrow 视觉规格 resolve）
- `packages/react/src/render/arrowMarkers.tsx`（修改）
- `packages/react/src/render/renderPrim.tsx`（修改：marker id hash）
- `packages/core/tests/compile/path.test.ts`（扩 case）
- `packages/react/tests/render/arrowMarkers.test.tsx`（扩 case）
- `packages/react/tests/render/renderPrim.test.tsx`（按需更新快照）
- `apps/docs/doc/zh|en/components/path.mdx`（API 表 + demos）
- `apps/docs/doc/zh|en/components/path/*.demo.tsx`（5 个新 demo：基础 / 起末异形 / 颜色 override / 缩放 / 半透明）

### 测试象限

#### Happy path（≥ 3）

- `arrow_default_normal_inheritance`：`<Path arrow="->">` 不传 `arrowDetail` → arrow 默认 normal、视觉全继承 path stroke
- `arrow_shape_stealth_uniform`：`arrowDetail={{ shape: 'stealth' }}` → 起末都用 stealth
- `arrow_uniform_scale_color`：`arrowDetail={{ shape: 'stealth', scale: 1.5, color: 'red' }}` → `markerWidth/Height` 乘 1.5、stroke 用 red 而非 `context-stroke`

#### 边界（≥ 2）

- `arrow_none_disables_marker`：`arrow="none"` → renderer 不输出任何 marker
- `arrow_start_only`：`arrow="<-"` + `arrowDetail.end={...}` → end override 不生效（无 end 标记）
- `arrow_empty_arrowDetail`：`arrowDetail={}` → 等同未传 `arrowDetail`

#### 错误路径（≥ 2）

- `arrow_unknown_shape_rejected`：`arrowDetail={{ shape: 'unknown' }}` → zod 校验失败
- `arrow_negative_scale_rejected`：`arrowDetail={{ scale: -1 }}` → zod 校验失败
- `arrow_opacity_above_1_rejected`：`arrowDetail={{ opacity: 1.5 }}` → zod 校验失败

#### 交互（≥ 2）

- `arrow_start_end_diff_shape`：`arrowDetail={{ start: { shape: 'normal' }, end: { shape: 'stealth' } }}` → 起末用不同 marker（marker id 不同 hash）
- `arrow_start_end_merge_with_top`：`arrowDetail={{ shape: 'stealth', start: { color: 'red' } }}` → start.shape 继承 'stealth'（不重写顶层）、start.color 用 'red'
- `arrow_hollow_shape_lineWidth`：`arrowDetail={{ shape: 'open', lineWidth: 2 }}` → 空心 marker 描边按 2 渲染
- `arrow_hollow_shape_fill_silently_ignored`：`arrowDetail={{ shape: 'open', fill: 'red' }}` → schema 不拒绝；renderer 输出的 marker SVG **不含红色填充**（fill 字段被忽略，描边走 color 缺省继承 path stroke）
- `arrow_solid_shape_scale_multiplies_length`：`arrowDetail={{ shape: 'normal', length: 10, scale: 1.5 }}` → 实际 markerWidth 按 length × scale = 15 渲染

### 依赖现有元素

- `packages/core/src/ir/path/arrow.ts` 的 `ARROW_SHAPES` / `ArrowShape` —— 引用：作为 `arrowDetail.shape` 类型来源
- `packages/core/src/ir/path/path.ts` 的 `PathSchema` —— **修改**：删 `arrowShape` / 加 `arrowDetail`
- `packages/react/src/render/arrowMarkers.tsx` 的 `MARKERS` 常量 / `ArrowMarker` 组件 —— **修改**：接收新 props
- `packages/react/src/render/renderPrim.tsx` 的 marker id 生成逻辑 —— **修改**：纳入 detail hash
- `packages/core/src/compile/path.ts` 的 `emitPathPrimitive` —— **修改**：在 path-level resolve `arrowDetail`
