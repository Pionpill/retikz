# ADR 索引

> retikz 架构决策档案。**永久保留 + 按 milestone 重置 2 位数编号**——目录已经做了版本分组，编号无需全局唯一。被新版决策覆盖时只标 `Superseded by <milestone> ADR-NN`，不删。
>
> 起新 ADR：`cp _template.md v<MAJOR>/v<MAJOR>.<MINOR>-<channel>.<N>/<NN>-<slug>.md`，编号见下表"编号下一档"。

## 目录约定

```
notes/adr/
├── _template.md                   ← 模板，cp 出新 ADR 时用
├── README.md                      ← 本文（索引，最新 milestone 在最上）
├── v0/                            ← MAJOR 版本目录
│   ├── v0.1-alpha.4/              ← 二级：版本通道节点
│   │   ├── 01-...md
│   │   ├── 02-...md
│   │   └── 03-...md
│   ├── v0.1-alpha.5/              ← 后续 milestone（编号从 01 重新起）
│   │   └── 01-...md
│   └── v0.1/                      ← 稳定版（无 channel 后缀）
└── v1/                            ← 下个 MAJOR
```

PATCH 不开目录——patch 仅修 bug、不写 ADR。

跨 milestone 引用要带前缀消歧：`alpha.4 ADR-01`、`alpha.5 ADR-02`。

## 状态规范

| 状态 | 含义 |
|---|---|
| Proposed | 起草中，未实施 |
| Accepted | 决策已落地，与当前代码一致 |
| Rejected | 经讨论否决；保留以避免重复立项 |
| Deprecated | 不再适用但未被替代；当前代码可能仍含旧行为 |
| Superseded by `<milestone>` ADR-NN | 被新 ADR 覆盖；查对应 ADR 看新决策 |

## 编号下一档

> 起新 ADR 前看这里拿编号。每个 milestone 独立计数，从 `01` 起。

| Milestone | 已用 | 下一个未用 |
|---|---|---|
| `v0.1-alpha.4` | 01-03（已完成） | — |
| `v0.1-alpha.5` | 01-04 | 05 |
| `v0.2-alpha.1` | 01-04（已完成） | — |
| `v0.2-alpha.2` | 01-02（已完成） | — |
| `v0.2-alpha.3` | 01（已完成） | — |
| `v0.2-alpha.4` | 01 | 02 |

---

## v0.2.0-alpha.4（进行中）

> 主题：**compile IR 顺序回归（A）+ emit 层增强（B）**——A 修复 alpha.1 重写 compile 管线后 path 顺序退化（是 B 与 alpha.5 sugar 的硬前置）；B 加显式 `zIndex` + 带文本 Node 包 `<g>` + Node label `rotate`。原 alpha.4（A）与 alpha.5（B）2026-05-23 合并；ADR-01 为 A，B 的 emit 增强 ADR 续编 02+。

| ADR | 标题 | 状态 |
|---|---|---|
| [ADR-01](v0/v0.2-alpha.4/01-ir-order-regression.md) | compile 输出 IR 顺序回归（占位槽回填恢复 transform-free frame 的声明序）（A 部分） | Proposed |

---

## v0.2.0-alpha.3（已完成）

> 主题：ShapeRegistry——NodeShape 枚举开放为字符串 + ShapeDefinition 运行时注入面

| ADR | 标题 | 状态 |
|---|---|---|
| [ADR-01](v0/v0.2-alpha.3/01-shape-registry.md) | Shape Registry（NodeShape 开放为字符串 + ShapeDefinition 注入面 + 内置 4 shape 改造为注册项） | Accepted |

---

## v0.2.0-alpha.2（已完成）

> 主题：样式继承——扁平 every-X 默认 + 主色 color 级联 + StepLabel 样式扩展

| ADR | 标题 | 状态 |
|---|---|---|
| [ADR-02](v0/v0.2-alpha.2/02-step-label-style.md) | StepLabel 样式扩展（textColor / opacity / font + label 继承顺序） | Accepted |
| [ADR-01](v0/v0.2-alpha.2/01-scope-style-inheritance.md) | Scope 样式继承（扁平 every-X 默认 + 主色 color + resetStyle 屏障） | Accepted |

---

## v0.2.0-alpha.1（已完成）

> 主题：`<Scope>` IR 容器 + 局部 transform + 跨 scope namespace / anchor / 相对定位解析

| ADR | 标题 | 状态 |
|---|---|---|
| [ADR-04](v0/v0.2-alpha.1/04-relative-position-in-scope.md) | scope 下相对定位（Polar / At / Offset）语义 | Accepted |
| [ADR-03](v0/v0.2-alpha.1/03-scope-id-bounding-box.md) | `scope.id` 注册 synthetic bounding-box 进父 namespace frame | Accepted |
| [ADR-02](v0/v0.2-alpha.1/02-node-index-anchor-resolution.md) | nodeIndex / anchor 跨 scope 解析语义 | Accepted |
| [ADR-01](v0/v0.2-alpha.1/01-scope-ir-and-compile.md) | `<Scope>` IR 容器 + compile 下沉到 GroupPrim | Accepted |

---

## v0.1.0-alpha.5（进行中）

> 主题：alpha 收尾破坏性扩张（PathPrim 结构化 / StepLabel position 扩充 / arrow 重设计 / 任意 offset 相对定位）

| ADR | 标题 | 状态 |
|---|---|---|
| [ADR-04](v0/v0.1-alpha.5/04-position-offset.md) | `Node.position` / `Coordinate.position` 加 `OffsetPosition` | Proposed |
| [ADR-03](v0/v0.1-alpha.5/03-path-arrow-detail.md) | Path 箭头重设计（删 `arrowShape`，加 `arrowDetail` + 起末分别配置） | Proposed |
| [ADR-02](v0/v0.1-alpha.5/02-step-label-position-t.md) | `StepLabel.position` 扩充（7 keyword + 任意 t 数值 + 多 kind 参数化） | Proposed |
| [ADR-01](v0/v0.1-alpha.5/01-scene-primitive-structured.md) | Scene `PathPrim` + `GroupPrim` 结构化（去 SVG 字符串） | Proposed |

---

## v0.1.0-alpha.4（已发 npm，2026-05-10）

> 主题：节点关系层（at 相对定位 / Coordinate 占位 / Node label）

| ADR | 标题 | 状态 |
|---|---|---|
| [ADR-03](v0/v0.1-alpha.4/03-node-label.md) | Node `label` 边挂标签 | Accepted |
| [ADR-02](v0/v0.1-alpha.4/02-coordinate-placeholder.md) | `<Coordinate>` 占位节点的 IR 表达 | Accepted |
| [ADR-01](v0/v0.1-alpha.4/01-node-at-positioning.md) | Node `at` 节点间相对定位 | Accepted |

---

> 历史 alpha.0 / alpha.1 / alpha.2 / alpha.3 的 ADR 当时未保留（旧约定"alpha.X 完工后清空 adr/ 目录"）；从 alpha.4 起转为永久保留。alpha.4 用过的 4 位数全局编号（`0001-0003`）在 2026-05-12 改为按 milestone 重置的 2 位数编号（`01-03`）。已发布的旧版本决策线索可查 git 历史和 changelog。
