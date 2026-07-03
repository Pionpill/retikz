# retikz 内部文档地图

面向项目内部协作，不面向终端用户。用户文档放在 `apps/docs/`。

## 当前结构

| 目录 | 内容 | 生命周期 |
| --- | --- | --- |
| [`architecture/`](./architecture) | 全仓长期架构真源。只放跨包原则、IR / Scene / schema 等底层契约。 | 永久；重大架构调整直接更新原文。 |
| [`reports/`](./reports) | 只读审计、阶段性 review 报告。 | 本地临时产物；被 `.gitignore` 忽略，不提交。 |

包或发布组专属文档已经下沉到对应目录：

| 目录 | 内容 |
| --- | --- |
| [`../packages/kernel/_notes/`](../packages/kernel/_notes) | kernel 发布组（`@retikz/math/core/render/react/vanilla/tex`）的 roadmap、ADR、分析。 |
| [`../packages/viz/_notes/`](../packages/viz/_notes) | `@retikz/plot` 发布组的架构、roadmap、ADR、分析。 |
| [`../apps/eval/_notes/`](../apps/eval/_notes) | eval 应用的评测设计、语料与 runner 方案。 |

## 写到哪里

1. 跨包长期架构原则：写进 `notes/architecture/`。
2. kernel 发布组的版本路线、ADR、执行记录：写进 `packages/kernel/_notes/decisions/`。
3. plot 发布组的版本路线、ADR、执行记录：写进 `packages/viz/_notes/decisions/`。
4. 单包一次性分析：写进该包或发布组的 `_notes/analysis/`。
5. 全仓审计报告：写进 `notes/reports/`；这是本地临时目录，不提交。

判断标准：文档的主要维护者是谁，就放到谁的目录下；只有会约束多个包的长期原则才留在根 `notes`。

## 当前入口

### 全仓架构

- [`core-design.md`](./architecture/core-design.md)：retikz 总架构设计，包含分层模型、IR、Scene、AI 友好原则、跨平台策略。
- [`schema-design.md`](./architecture/schema-design.md)：schema / LLM 契约相关设计。

### kernel 发布组

- [`kernel notes`](../packages/kernel/_notes/README.md)：kernel 发布组内部文档入口。
- [`kernel v0 roadmap`](../packages/kernel/_notes/decisions/v0/roadmap.md)：kernel v0 总路线。
- [`kernel ADR template`](../packages/kernel/_notes/decisions/_template.md)：kernel ADR 模板。
- [`core compare analysis`](../packages/kernel/_notes/analysis/core-compare-analysis.md)：core 底座横向对比。

### plot 发布组

- [`plot notes`](../packages/viz/_notes/README.md)：plot 发布组内部文档入口。
- [`plot-design.md`](../packages/viz/_notes/architecture/plot-design.md)：`@retikz/plot` 架构设计。
- [`plot v0 roadmap`](../packages/viz/_notes/decisions/v0/roadmap.md)：plot v0 总路线。
- [`plot v0.1 roadmap`](../packages/viz/_notes/decisions/v0/v0.1/roadmap.md)：plot v0.1 路线与 milestone 索引。
- [`plot compare analysis`](../packages/viz/_notes/analysis/plot-compare-analysis.md)：plot 横向对比。
- [`plot rendering performance`](../packages/viz/_notes/analysis/plot-rendering-performance.md)：plot 渲染性能分析。

## 打包约束

包内 `_notes/` 是仓库协作资料，不进入 npm 包。发布包继续依赖各自 `package.json` 的 `files` 白名单，只发布 `dist/**/*`、`README.md`、`LICENSE` 和 `package.json`。
