# ADR-03：type-driven scale 默认选型 + guide 格式化

- 状态：Accepted
- 决策日期：2026-06-07
- 关联：[plot v0.1-alpha.6 待办](./roadmap.md) · [plot v0 roadmap 阶段二](../../roadmap.md) · [plot-design §3.4 Scale / §3.5 Coordinate / §3.9 Guide](../../../../../architecture/plot-design.md) · 依赖：[ADR-01 数据模型类型层](./01-data-model.md) · 关联：[ADR-02 可移植契约](./02-data-portability.md)

## 背景

现状：scale **类型必须显式声明**——spec 列 `scales`（每个 `{ type, name, … }`），coordinate 按名绑定（cartesian `x`/`y`、polar `angle`/`radius`，非位置 `encoding.color.scale`）。即便最简单的「数值 x + 数值 y」也得手写两个 linear scale + 绑定。

数据模型提供「用户源字段 → `DataFieldTypeValue`」类型映射。本 ADR 用它**按字段类型派生默认 scale**：channel 没有显式 scale 时，从绑定字段的 `continuous` / `categorical` / `temporal` 类型推出 scale 类型与缺省 domain/range，让最小 spec 可省 scale 声明。

同类库通常按字段测量类型给默认 scale，用户只在需要时显式覆盖。

## 决策：channel 无显式 scale 时按字段类型派生；显式永远优先；类型不兼容 fail-loud

**(1) spec 表面放宽**：coordinate 的 scale 绑定（cartesian `x`/`y`、polar `angle`/`radius`）与非位置 `encoding.color.scale` 从「必填名引用」放宽为**可选**。解析时：

- 该 channel **有**显式 scale（绑定名 + `scales` 里有同名声明）→ 使用声明的 scale，并校验字段类型兼容性；
- **无**显式 scale → 按绑定字段的 `DataFieldTypeValue` 派生 scale（类型 + 缺省 domain/range），并使用内部稳定 identity。

**(2) 默认映射（字段类型 → scale type）**：

| 字段类型      | 位置通道                                         | 非位置视觉通道                                     |
| ------------- | ------------------------------------------------ | -------------------------------------------------- |
| `continuous`  | 默认 `linear`，可显式选择兼容的连续 scale family | color 默认 `sequential`；size / opacity 走各自定义 |
| `temporal`    | 默认 `time`                                      | color 默认 `sequential`                            |
| `categorical` | interval 常用 `band`，点位语义可使用 `point`     | color / shape 默认离散映射                         |

**(3) 类型 ↔ scale 兼容校验（fail-loud）**：显式声明的 scale 与 bound 字段 `FieldType` 不兼容 → 清晰报错，**不强转**：

| 字段类型      | 典型兼容 scale family                                 |
| ------------- | ----------------------------------------------------- |
| `continuous`  | 连续位置 scale、连续或离散化颜色 scale                |
| `temporal`    | `time` 位置 scale、连续颜色 scale                     |
| `categorical` | `band` / `point` 位置 scale、`ordinal` 离散输出 scale |

类型与 scale family 不兼容时必须 fail-loud，不通过隐式强转生成看似有效但语义错误的图。

**(4) guide 格式化 by type**：轴 / 刻度格式由解析后的 scale 与字段类型驱动——temporal 使用时间 tick，categorical 使用类别 tick，continuous 使用数值 tick。显式 guide format 只改变展示，不反向改变字段类型或 scale。

理由：

1. **最小 spec 可省 scale**：派生让「数值 x + 数值 y」零 scale 声明即出图，大幅降低手写与 LLM 生成负担。
2. **显式优先 + 向后兼容**：已声明 scale 的 spec 行为逐字不变；派生只在缺省时介入。
3. **fail-loud 不强转**：字段类型与 scale 不兼容通常表示 spec 错误，静默强转会产生无意义图。
4. **guide 与 scale 同源**：guide 只消费已经解析的 scale 与字段类型，不维护平行推断。

## 长期边界

- 具体 scale definition / registry，由 alpha.12 的 scale registry 决策承接。
- legend、tick layout 与 theme 由后续 guide / theme ADR 承接。
- 数据字段类型及推断实现的最终所有权属于 `@retikz/data`；Plot 只消费类型结果做 scale / guide 选择。
