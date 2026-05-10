# ADR 索引

> retikz 架构决策档案。**永久保留 + 全局单调编号**——被新版决策覆盖时只标 `Superseded by ADR-NNNN`，不删。
>
> 起新 ADR：`cp _template.md v<MAJOR>/v<MAJOR>.<MINOR>-<channel>.<N>/<NNNN>-<slug>.md`，编号见下表"下一个未用编号"。

## 目录约定

```
notes/adr/
├── _template.md                   ← 模板，cp 出新 ADR 时用
├── README.md                      ← 本文（索引，最新 milestone 在最上）
├── v0/                            ← MAJOR 版本目录
│   ├── v0.1-alpha.4/              ← 二级：版本通道节点
│   │   ├── 0001-...md
│   │   ├── 0002-...md
│   │   └── 0003-...md
│   ├── v0.1-alpha.5/              ← 后续 milestone
│   │   └── 0004-...md
│   └── v0.1/                      ← 稳定版（无 channel 后缀）
└── v1/                            ← 下个 MAJOR
```

PATCH 不开目录——patch 仅修 bug、不写 ADR。

## 状态规范

| 状态 | 含义 |
|---|---|
| Proposed | 起草中，未实施 |
| Accepted | 决策已落地，与当前代码一致 |
| Rejected | 经讨论否决；保留以避免重复立项 |
| Deprecated | 不再适用但未被替代；当前代码可能仍含旧行为 |
| Superseded by ADR-NNNN | 被新 ADR 覆盖；查 NNNN 看新决策 |

## 编号下一档

> 起新 ADR 前看这里拿编号。

**下一个未用编号：ADR-0004**

---

## v0.1.0-alpha.4（已发 npm，2026-05-10）

> 主题：节点关系层（at 相对定位 / Coordinate 占位 / Node label）

| ADR | 标题 | 状态 |
|---|---|---|
| [ADR-0003](v0/v0.1-alpha.4/0003-node-label.md) | Node `label` 边挂标签 | Accepted |
| [ADR-0002](v0/v0.1-alpha.4/0002-coordinate-placeholder.md) | `<Coordinate>` 占位节点的 IR 表达 | Accepted |
| [ADR-0001](v0/v0.1-alpha.4/0001-node-at-positioning.md) | Node `at` 节点间相对定位 | Accepted |

---

> 历史 alpha.0 / alpha.1 / alpha.2 / alpha.3 的 ADR 当时未保留（旧约定"alpha.X 完工后清空 adr/ 目录"）；从 alpha.4 起转为永久保留 + 全局单调编号。已发布的旧版本决策线索可查 git 历史和 changelog。
