# ADR-02：StepLabel 样式扩展（textColor / opacity / font + label 继承顺序）

- 状态：Accepted
- 决策日期：2026-05-21
- 关联：[v0 roadmap §Step label 自定义样式提案](../../../plans/v0/roadmap.md#step-label-自定义样式提案) · [v0.2-alpha.2 plan](../../../plans/v0/v0.2-alpha.2.md) · [DESIGN.md §1.2 AI 一等公民](../../../architecture/DESIGN.md) · [本 milestone ADR-01 Scope 样式继承](./01-scope-style-inheritance.md)

## 背景

`StepLabelSchema`（`packages/core/src/ir/path/step.ts`）当前只有 `text` / `position` / `side` 三个字段。渲染时 `compile/path/label.ts` 把 `fill: 'currentColor'` **硬编码**——所有边标注一律跟随主题色（黑 / 白），**无法与所标注的线段同色**。给彩色函数线（sin / cos / tan / sec / csc / cot）配标注时尤其违和：标签全是 currentColor 一片黑，读者得对照线色和位置反推哪个标签属于哪条线。

对照：`NodeLabelSchema`（node 边挂标签）已有 `textColor` / `opacity` / `font` 三字段（alpha.4 ADR-03 + 后续）。StepLabel（path 段标注）缺这套，两类 label 样式能力不对称。

本 ADR 给 StepLabel 补齐样式字段，并定义 label 级的样式继承顺序（消费 [ADR-01](./01-scope-style-inheritance.md) 引入的 scope `labelDefault` 通道 + 宿主 path 的主色 `color` 级联）。

**为什么放 alpha.2**（来源 roadmap 提案）：本质是"label 级样式继承"——只有 ADR-01 的样式继承 plumbing（labelDefault）就位后，StepLabel 的继承顺序链才有挂点；schema 扩展本身机械，难点在继承顺序，与 ADR-01 同源、同窗口出。

**AI 一等公民校验**：三字段全 JSON 可序列化；`textColor` 沿用 NodeLabel 同名（不缩 `color`）；`opacity` 0..1 数值；`font` 复用 `FontSchema`——LLM 已会写 NodeLabel 样式就会写 StepLabel。

## 选项

### A. StepLabel 加 `textColor` / `opacity` / `font`，对齐 NodeLabel（**推荐**）

```ts
// packages/core/src/ir/path/step.ts
export const StepLabelSchema = z.object({
  text: z.string(),
  position: /* 7 keyword | number 0..1，不变 */,
  side: /* above|below|left|right|sloped，不变 */,
  // ✚ 新增（加在末尾，零破坏）
  textColor: z.string().optional()
    .describe("Label text color; falls back to scope labelDefault, then the owning path's resolved master color, then currentColor. To match a colored line set the path color (not stroke)."),
  opacity: z.number().min(0).max(1).optional()
    .describe('Label-only opacity 0..1; multiplied with the owning path opacity (element-internal axis). Scope-level opacity does NOT compound.'),
  font: FontSchema.optional()
    .describe('Label font overrides (family / size / weight / style); missing fields inherit from labelDefault then renderer default.'),
});
```

`compile/path/label.ts` 把硬编码改为回退链：

```ts
// 改前
fill: 'currentColor'
fontSize: LABEL_FONT_SIZE
// 改后（继承顺序见决策细节）
fill: resolveLabelTextColor(label, scopeLabelDefault, hostPathColor)   // → textColor ?? labelDefault.(textColor|color) ?? 宿主 path 已解析 color ?? 'currentColor'
fontSize: label.font?.size ?? scopeLabelDefault.font?.size ?? LABEL_FONT_SIZE
fontFamily: label.font?.family ?? scopeLabelDefault.font?.family ?? <renderer 默认>
// fontWeight / fontStyle 同构
```

### B. 只加 `textColor`，不加 `opacity` / `font`

最小改动解决"标签同色"主诉求。

- 优：改动面更小
- 缺：与 NodeLabel 三字段不对称；`font`（标注用小一号字）、`opacity`（淡化次要标注）是真实需求，分两次开窗反复回填 schema reference + 文档。三字段同源、一次性补成本最低。

### C. 不加字段，让用户用 `<Node>` 当标注

绕开 StepLabel，用独立 Node 表达彩色标注。

- 缺：丢失 StepLabel 的 `position`（沿段归一化定位）/ `side`（法向偏移 / sloped）能力；用户得手算标注位置；与"边标注"语义背离。

## 决策：A

理由：

1. **对称**：StepLabel 与 NodeLabel 样式能力对齐（`textColor` / `opacity` / `font` 同名同义），心智统一、reference 文档结构一致。
2. **零破坏**：三字段加在 schema 末尾、全 optional；不给时回退 `currentColor`，v0.1 既有标注（karl-circle / unit-circle）行为不变。
3. **同窗口**：与 ADR-01 的 labelDefault 继承同源，一次出 ADR、一次改 schema reference，避免分次回填。

## 决策细节

1. **三字段加在 `StepLabelSchema` 末尾**：`text` / `position` / `side` 不动，追加 `textColor?` / `opacity?` / `font?`。
2. **`textColor` 继承顺序**：`label.textColor > scope.labelDefault.(textColor|color) > 宿主 path 已解析主色 color > 'currentColor'`。跟随的是宿主 path 的**主色 `color`**（= TikZ current color），不是 stroke——`<Path color="red">` 标签红，`<Path stroke="red">`（只染线）标签不变色，与 TikZ 一致（修正早稿"跟 stroke"的偏离）。
3. **`font` 回退链**：逐字段 `label.font?.X > scope.labelDefault.font?.X > renderer 默认`（family / size / weight / style 各自独立回退，非整个 font 对象替换）。
4. **`opacity` 语义**：label-only opacity，与**所属 path** 的 opacity **相乘**（step label 只挂 path，无 node 宿主）——这是**元素内**一轴；**跨 scope 不复合**（scope 间 opacity 走覆盖，随 ADR-01 决策细节 9）。注：NodeLabel 现有 opacity 是回退（`lab.opacity ?? node.opacity`）非相乘，两类 label 此点不对称；本 ADR 不动 NodeLabel（已有），如需统一另开。
5. **labelDefault 通道**：scope `labelDefault` 字段由 [ADR-01](./01-scope-style-inheritance.md) 定义（node label 与 step label 共享）；本 ADR 只定义 StepLabel 如何消费它。
6. **ZodSchema reference 同步**：8 个 step variant 的 `'label.*'` 嵌套点路径描述补 3 个新字段（line / step / curve / cubic / bend / arc / circlePath / ellipsePath 的 label 字段）。
7. **`resetStyle=['label']` 不切宿主跟随**：屏障只忽略外层 `labelDefault`（scope 继承轴）,StepLabel 仍跟宿主 path 已解析主色（实例-host 轴非 scope 继承）——label 不成孤岛。详 ADR-01 决策细节 8。

## 待决策点

> 本轮已拍板：继承顺序锁为 `label 显式 > scope.labelDefault > 宿主 path 主色 color > currentColor`（labelDefault 压宿主主色,文档说清）；per-field `'initial'` 取消继承哨兵推迟（见 §不在本 ADR 范围）。

## DSL 表面

```tsx
import { Layout, Path, Step } from '@retikz/react';

// 彩色线 + 同色标注：用主色 color（不是 stroke）→ 线、标注同色（= TikZ color=）
<Path color="crimson">
  <Step kind="move" to={[0, 0]} />
  <Step to={[80, 40]} label={{ text: 'sin' }} />   {/* 标签自动 crimson */}
</Path>

// 只染线不染标注：stroke= 只动描边，标注仍 currentColor（与 TikZ draw= 一致）
<Path stroke="crimson">
  <Step kind="move" to={[0, 0]} />
  <Step to={[80, 40]} label={{ text: 'f(x)' }} />   {/* 标签 currentColor，不跟 */}
</Path>

// 显式 textColor 覆盖
<Path color="crimson">
  <Step kind="move" to={[0, 0]} />
  <Step to={[80, 40]} label={{ text: 'f(x)', textColor: '#333' }} />
</Path>

// font + opacity：小一号、淡化的辅助标注
<Path stroke="teal">
  <Step kind="move" to={[0, 0]} />
  <Step to={[80, 0]} label={{ text: 'baseline', font: { size: 10 }, opacity: 0.6 }} />
</Path>

// scope labelDefault（ADR-01 通道）+ StepLabel 继承：整片标注统一字体
<Scope labelDefault={{ font: { size: 10, family: 'serif' } }}>
  <Path color="navy">
    <Step kind="move" to={[0, 0]} />
    <Step to={[60, 30]} label={{ text: 'cos' }} />   {/* 10 号 serif，色跟 navy */}
  </Path>
</Scope>
```

## 测试设计

`packages/core/tests/ir/step-label.schema.test.ts`（扩）+ `packages/core/tests/compile/path-label-style.test.ts`（新建）覆盖：

- schema：三新字段合法 / opacity 越界拒 / font 复用 FontSchema 校验
- compile：textColor 继承顺序 4 档；font 逐字段回退；opacity 元素内相乘（跨 scope 不复合）；零破坏既有 currentColor 行为

具体见下"实现契约 § 测试象限"。

## 影响

- `packages/core/src/ir/path/step.ts`：`StepLabelSchema` 加 3 字段（8 个含 label 的 step variant 自动获得）
- `packages/core/src/compile/path/label.ts`：fill / font 硬编码改回退链
- `apps/docs/src/contents/core/reference/schema/path/`：8 个 step variant 的 `label.*` 描述补 3 字段
- `apps/docs/src/contents/core/components/draw/step/`（或 label 页）：新字段说明 + 彩色线同色标注示例
- 对外 API：StepLabel 加 3 optional props，**零破坏**

## 不在本 ADR 范围

- **scope `labelDefault` 字段定义** → [ADR-01](./01-scope-style-inheritance.md)（本 ADR 只消费）
- **NodeLabel 样式字段**：已有，不动
- **per-field `'initial'` 取消继承哨兵** → 未来扩展
- **label 背景框 / 描边**（TikZ `label` 的 `fill` / `draw`）→ v0.2 不做

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/core/src/ir/**`（step.ts schema）
- 动 `packages/core/src/compile/**`（label.ts 回退链）
- 跨级取最高 = red

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/path/step.ts` | 新建字段 | `StepLabelSchema.textColor` | `z.string().optional()` | undefined | 标签文字色；回退 labelDefault → 宿主 path 主色 color → currentColor |
| `ir/path/step.ts` | 新建字段 | `StepLabelSchema.opacity` | `z.number().min(0).max(1).optional()` | undefined | 标签独立透明度 0..1；与所属 path opacity 相乘（元素内轴；跨 scope 不复合） |
| `ir/path/step.ts` | 新建字段 | `StepLabelSchema.font` | `FontSchema.optional()` | undefined | 标签字体覆盖；缺字段逐级回退 labelDefault → renderer 默认 |

### 文件 scope

- `packages/core/src/ir/path/step.ts`（修改：StepLabelSchema 加 3 字段）
- `packages/core/src/compile/path/label.ts`（修改：fill / font 回退链 + 消费 scope labelDefault）
- `packages/core/tests/ir/step-label.schema.test.ts`（扩）
- `packages/core/tests/compile/path-label-style.test.ts`（新建）
- `apps/docs/src/contents/core/reference/schema/path/index.{en,zh}.mdx`（修改：8 step variant `label.*` 描述补 3 字段）
- `apps/docs/src/contents/core/components/draw/step/index.{en,zh}.mdx`（修改：新字段说明 + 同色标注示例）
- `apps/docs/src/contents/core/components/draw/step/*.demo.tsx`（新建：彩色线同色标注 demo）

### 测试象限

#### Happy path（≥ 3）

- `step_label_text_color_applies`：`label={{ text:'x', textColor:'red' }}` → TextPrim fill = red
- `step_label_font_size_applies`：`label={{ text:'x', font:{ size:10 } }}` → fontSize = 10
- `step_label_opacity_applies`：`label={{ text:'x', opacity:0.6 }}` → opacity = 0.6
- `step_label_inherits_host_path_color`：`<Path color="crimson">` + label 无 textColor → 标签 fill = crimson（跟宿主 path 主色）

#### 边界（≥ 2）

- `step_label_no_text_color_falls_to_current_color`：label 无 textColor + path 无 color + 无 labelDefault → currentColor（原行为，零破坏）
- `step_label_stroke_only_does_not_follow`：`<Path stroke="crimson">`（只 stroke、无 color）+ label 无 textColor → currentColor（**不**跟 stroke，与 TikZ draw= 一致）
- `step_label_font_partial_fallback`：`font={{ size:10 }}` 无 family → size=10 + family 回退 renderer 默认
- `step_label_opacity_omitted`：无 opacity → 不改变（等价 1 / 继承 path opacity）

#### 错误路径（≥ 2）

- `step_label_opacity_out_of_range_rejected`：`opacity: 1.5` → zod `.max(1)` 校验失败
- `step_label_opacity_negative_rejected`：`opacity: -0.1` → zod `.min(0)` 校验失败
- `step_label_font_invalid_field_rejected`：`font: { size: 'big' }` → FontSchema 校验失败

#### 交互（≥ 2）

- `step_label_explicit_beats_label_default`：`<Scope labelDefault={{textColor:'gray'}}>` + label `textColor='red'` → red
- `step_label_default_beats_host_color`：`<Scope labelDefault={{textColor:'gray'}}>` + `<Path color="crimson">` + label 无 textColor → gray（labelDefault 压宿主主色）
- `step_label_opacity_multiplies_with_path`：path opacity 0.5 + label opacity 0.5 → 标签实际 0.25
- `step_label_zero_break_existing_demos`：karl-circle / unit-circle 既有标注 snapshot 不变（全 currentColor 路径）

### 依赖现有元素

- `packages/core/src/ir/path/step.ts` 的 `StepLabelSchema` —— **修改**：加 3 字段（8 个含 label 的 step variant 自动继承）
- `packages/core/src/ir/font.ts` 的 `FontSchema` —— **引用**：StepLabel.font 复用
- `packages/core/src/ir/node.ts` 的 `NodeLabelSchema` —— **引用**：textColor / opacity / font 命名与语义对齐参照
- `packages/core/src/compile/path/label.ts` 的 label 渲染 + `LABEL_FONT_SIZE` —— **修改**：fill / font 硬编码改回退链
- 本 milestone [ADR-01](./01-scope-style-inheritance.md) 的 `labelDefault` 通道 + `PathSchema.color` 主色 —— **依赖**：StepLabel 继承顺序消费 labelDefault + 宿主 path 已解析主色（ADR-01 先固化二者）
