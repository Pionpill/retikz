# 代码完备审计

## `code-audit`

### 能力域范围

| 能力域        | 主责与协作包                                       | 完备目标               |
| ------------- | -------------------------------------------------- | ---------------------- |
| Drawing       | math / core / render / react / vanilla / tex       | Drawing Complete       |
| Data          | data 及其 plot 等消费边界                          | Data Complete          |
| Visualization | plot / plot-react / plot-vanilla 及 data/core 接口 | Visualization Complete |

Beta 调用方还必须传入阶段：`beta-entry` 或 `beta-exit`。每个能力域独立审计，主 AI负责汇总跨域重复所有权和依赖方向。

### 报告

写入：

```text
notes/reports/develop-completeness-YYYY-MM-DD-<domain>-<beta-entry-or-beta-exit>.md
```

报告必须包含：

```md
# Completeness Report: <domain>

日期：
检测范围：
完备性目标：
基准快照：
阶段：beta-entry | beta-exit
覆盖率声明：

## Gate 结论

PASS | BLOCKED | ESCALATE_ALPHA

## 能力矩阵

| 能力面 | 现状简述 | 内置功能 | 扩展功能 | 整体评价 | 边界结论 | 优化方向 |

## Findings

| ID | 等级 | 能力面 | 问题 | 为什么影响完备性 / 边界 | 建议动作 | 坐实依据 |

## 跨包与公开表面

## 建议排期

## 不建议纳入当前能力域
```

`整体评价` 使用 10 分制双分数，单元格固定为三行：

```text
内置分数/扩展分数
<0-10 整数>/<0-10 整数>
<简短评价>
```

不得改用 5 分制、百分制或把两个分数分别写成 `x/10`。证据只列最关键的 1-2 个路径或文档段落，不把报告写成代码索引。

等级定义：

- **BLOCKING**：错误所有权、平行 IR / registry / pipeline、内置与自定义分叉、端到端断链、公开契约与实现不一致。
- **WARNING**：不阻断当前边界，但影响下一能力轴、迁移质量或扩展体验。
- **INFO**：文档、可诊断性或长期质量建议。
- **ESCALATE_ALPHA**：修复必须净新增公开能力、公开组件、IR 形态、schema 字段或用户可见行为契约；Beta 不得实施。修改、重命名或移除既有契约仍按 Beta breaking 判定。

`beta-entry` 把 findings 转成候选 TODO，但不修改 roadmap 或产品代码；scope 由人工确认。`beta-exit` 只有无 BLOCKING / ESCALATE_ALPHA 才能 PASS。
