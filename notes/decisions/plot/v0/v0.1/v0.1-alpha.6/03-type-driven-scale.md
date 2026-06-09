# ADR-03：type-driven scale 默认选型 + guide 格式化

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 待办](./roadmap.md) · [plot v0 roadmap 阶段二](../../roadmap.md) · [plot-design §3.4 Scale / §3.5 Coordinate / §3.9 Guide](../../../../../architecture/plot-design.md) · 依赖：[ADR-01 数据模型类型层](./01-data-model.md) · 关联：[ADR-02 可移植契约](./02-data-portability.md)

## 背景

现状：scale **类型必须显式声明**——spec 列 `scales`（每个 `{ type, name, … }`），coordinate 按名绑定（cartesian `x`/`y`、polar `angle`/`radius`，非位置 `encoding.color.scale`）。即便最简单的「数值 x + 数值 y」也得手写两个 linear scale + 绑定。

ADR-01 已产出「用户源字段 → `FieldType`」类型 `Map`。本 ADR 用它**按字段类型派生默认 scale**：channel 没有显式 scale 时，从其 bound 字段的 `FieldType` 推出 scale 类型与缺省 domain/range，让最小 spec 可省 scale 声明。这是「Scales」组件的「选型」半，把 alpha.1 起一直手写的 scale 自动化。

同类库：Vega-Lite / ggplot 都按字段类型给默认 scale（quantitative→linear、temporal→time、nominal→band/ordinal），用户只在需要时覆盖。

## 决策：channel 无显式 scale 时按 FieldType 派生；显式永远优先；类型不兼容 fail-loud

**(1) spec 表面放宽**：coordinate 的 scale 绑定（cartesian `x`/`y`、polar `angle`/`radius`）与非位置 `encoding.color.scale` 从「必填名引用」放宽为**可选**。解析时：

- 该 channel **有**显式 scale（绑定名 + `scales` 里有同名声明）→ 用声明的（**显式永远优先**，现有行为不变、向后兼容）；
- **无**（省略绑定，或绑定名未声明）→ 按 bound 字段的 `FieldType` **派生** scale（类型 + 缺省 domain/range），合成内部名。

**(2) 默认映射（FieldType → scaleType）**：

| FieldType | 位置通道（x/y/angle/radius） | 非位置 color 通道 |
|---|---|---|
| quantitative | `linear` | （连续色 = sequential，**留 alpha.8**） |
| temporal | `time` | （留 alpha.8） |
| nominal / ordinal | `band`（折线/散点退化为 `point` 由 mark 提示，沿用现 `scaleX`） | `ordinal`（分类配色） |
| proportion | `linear`，domain 默认 `[0,1]` | （留 alpha.8） |

本轮 color 派生只覆盖 **nominal/ordinal → ordinal**；quantitative/temporal 的连续色阶随 alpha.8 color gradient 接入。

**(3) 类型 ↔ scale 兼容校验（fail-loud）**：显式声明的 scale 与 bound 字段 `FieldType` 不兼容 → 清晰报错，**不强转**：

| 字段类型 | 兼容 scale |
|---|---|
| quantitative / proportion | linear（位置）、ordinal（不可作位置） |
| temporal | time |
| nominal / ordinal | band / point（位置）、ordinal（颜色） |

如 `nominal` 字段配 `linear`、`temporal` 配 `band` → 抛 `scale "<name>" (linear) incompatible with field "<f>" (nominal)`。

**(4) guide 格式化 by type**：轴 / 刻度格式由 scale 类型（即字段类型）驱动——`time` → 日期格式（现 `timeTicks`）、`band`/`point`/`ordinal` → 类别 tick（现 `categoryTicks`）、`linear` → 数值 tick（现 `scaleTicks`）。type-driven 只是把「选哪套 tick formatter」接到类型上，复用已有刻度逻辑。

理由：

1. **最小 spec 可省 scale**：派生让「数值 x + 数值 y」零 scale 声明即出图，大幅降低手写与 LLM 生成负担。
2. **显式优先 + 向后兼容**：已声明 scale 的 spec 行为逐字不变；派生只在缺省时介入。
3. **fail-loud 不强转**：nominal 配 linear 多半是 spec 错误，强转会出无意义图——早炸早好（对齐 ADR-01/02 fail-loud 基调）。
4. **复用现成刻度**：guide 格式化不新写，只按类型路由到 `timeTicks`/`categoryTicks`/`scaleTicks`。


## DSL 表面

```tsx
// 派生：无 scale 声明、无 coordinate scale 绑定 —— x=temporal→time、y=quantitative→linear，自动
<Plot data={rows} model={[{ name: 'date', type: 'temporal' }, { name: 'value', type: 'quantitative' }]}>
  <LineMark x="date" y="value" />     {/* 轴自动：date 日期格式、value 数值刻度 */}
</Plot>

// 显式优先：声明并绑定的 scale 照旧生效（覆盖派生）
<Plot data={rows} spec={specWithExplicitLinearScale} />

// 不兼容 → fail-loud
// model: value=nominal，却显式绑 linear scale → throw: scale incompatible with field type
```

vanilla 对等：spec 省略 `scales` / coordinate 绑定 → lowering 派生；显式声明走原路径。

## 测试设计

`packages/plot/plot/tests/lower/type-driven-scale.test.ts` 覆盖：

- 各 FieldType → 默认 scale（quantitative→linear、temporal→time、nominal→band、proportion→linear[0,1]）
- 显式 scale 覆盖派生
- 类型不兼容 fail-loud
- color nominal→ordinal 派生；quantitative color 报错（连续色留 alpha.8）
- guide 格式化按类型（time 日期 / band 类别 / linear 数值）

落地测试见实现指针。

## 影响

- **IR**：coordinate 的 scale 绑定字段（`x`/`y`/`angle`/`radius`）+ `encoding.color.scale` 由 required → optional（additive 放宽、非 breaking：已填的照旧）。`scales` 数组可省。
- **lowering**：`expand.ts` scale 解析改为「显式查 `scaleByName` → 命中用；未命中 / 省略 → 按 ADR-01 类型 `Map` 派生」；新增类型↔scale 兼容校验 + 派生函数 `deriveScale(fieldType, role)`。
- **core**：无。
- **文档站**：scale 概念页加「类型驱动默认 / 显式覆盖 / 兼容校验」+ demo（零 scale 声明出图）。
- **对外 API**：coordinate scale 绑定 / color.scale 变可选；最小 spec 更短。

## 不在本 ADR 范围

- **连续色阶（color gradient，quantitative/temporal color）** → alpha.8。
- **新 scale 类型**（log/pow/sqrt/quantize/threshold）→ alpha.7-8。
- **legend**（非位置 scale 的图例）→ alpha.8。
- **measure-driven tick 防重叠 / 旋转** → 文字度量 oracle（plot-design §16，后续）。

> **实现指针**：最终 schema / 类型 / 行为以代码为准；落地集中在 `packages/plot/plot/src/ir/{coordinate,encoding}.ts` 与 `packages/plot/plot/src/lower/{scale,expand}.ts`，测试见 `packages/plot/plot/tests/lower/type-driven-scale.test.ts`。完整施工契约见压缩前蓝图。
> 🔖 本文件压缩前完整施工蓝图 = `git show 8ce95238:notes/decisions/plot/v0/v0.1/v0.1-alpha.6/03-type-driven-scale.md`（封板全文）。
