---
name: develop-completeness
description: Use when auditing a retikz core capability module against a completeness document or capability-complete target, such as plot Visualization Complete or core Drawing Complete, to produce a capability-gap report focused on internal generality and extension API completeness.
---

# Develop Completeness: 能力完备检测

用于基于模块自己的完备性设计文档，盘点能力是否形成“内部通用表达 + 外部可扩展 API”的闭环。本 skill 只产出报告，不改产品代码、不改 roadmap、不提交。

## 启动前

1. 读取根和就近 `AGENTS.md`。
2. 读取被检测模块的完备性文档，例如 `plot-visualization-complete.md`。
3. 记录：

```bash
git rev-parse HEAD
git status --short
```

4. 涉及 schema / contract / providers / pipeline / compile 时，按 `standard-structure` 分流读取必要 `standard-*` skill。

## 检测方法

按完备性文档列出的每个能力面，分别检查两条线：

1. **内部能力**：模块内部能否表达 / 实现该能力；实现是否通用；抽象是否稳定，是否避免 chart type、adapter、demo 或 renderer 特判。
2. **扩展能力**：是否允许用户或第三方扩展；扩展是否走 schema / contract / provider / registry / pipeline 同一机制；扩展 API 是否友好、可诊断、与内置同路。

不要把“已经内置一个实现”误判为“能力完备”。内置可用但不能扩展、只能 adapter 私造、只能 demo 手写，都应标为缺口或边界。

## 报告写法

写入：

```text
notes/reports/develop-completeness-YYYY-MM-DD-<module>.md
```

该目录被 `.gitignore` 忽略，报告不 stage、不 commit。

报告必须包含一个能力矩阵，同时覆盖内部能力与扩展能力：

```md
## 能力矩阵
| 能力面 | 现状简述 | 内置功能 | 扩展功能 | 整体评价 | 优化方向 |
```

`整体评价` 列必须使用 10 分制双分数：

- 第一行固定写 `内置分数/扩展分数`，例如 `9/7`。
- 第二行开始写简短评价。
- 内置分数衡量模块内置表达 / 实现的通用性和抽象程度。
- 扩展分数衡量自定义能力是否允许扩展、API 是否友好、是否与内置同路。

路径证据要克制：主表格中优先写能力判断，不堆代码路径。每条 finding 的“坐实依据”只列最关键的 1-2 个文件或文档段落；必要时才补行号。不要把报告写成代码索引。

建议结构：

```md
# Completeness Report: <module>

日期：
检测范围：
完备性目标：
基准快照：
版本通道：
覆盖率声明：

## 结论概览
## 能力矩阵
## 关键缺口
| # | 优先级 | 能力面 | 缺口 | 为什么影响完备性 | 建议补齐方式 | 坐实依据 |
## 建议排期
## 不建议纳入当前模块
```

优先级使用：

- **P0**：阻断当前完备目标封口。
- **P1**：不阻断当前封口，但会影响下一条核心能力轴。
- **P2**：文档、体验或长期扩展质量问题。

## 完成标志

- 能力矩阵覆盖完备性文档列出的能力面。
- 每个缺口同时说明内部通用性或扩展 API 哪条线不完备。
- 报告少贴路径，只保留必要坐实依据。
- 审计后 `git status --short` 与基线相比，除 ignored 报告和用户明确要求修改的 skill 外没有产品文件变化。
