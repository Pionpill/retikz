# retikz 内部文档地图

面向项目内部协作，不面向终端用户。用户文档放在 `apps/docs/`。

## 子目录

| 目录 | 装什么 | 生命周期 | 命名 |
|---|---|---|---|
| [`architecture/`](./architecture) | 长期架构文档；少改、不带日期 | 永久。重大架构调整时更新原文，不另起临时副本 | 主题名，如 `core-design.md` |
| [`decisions/`](./decisions) | 路线、执行追踪、ADR 决策记录 | roadmap 可更新；ADR 永久保留，Accepted 后不改历史 | 见下文 decisions 规则 |
| [`analysis/`](./analysis) | 一次性研究 / 对比 / gap 分析 | 长期保留作历史参考，但不再更新 | `YYYY-MM-DD-kebab-case-标题.md` |

## decisions 规则

`decisions/` 合并原 `adr/` 与 `plans/`，按库 / 包能力域组织：

```text
notes/decisions/
└── core/
    ├── _template.md
    └── v0/
        ├── roadmap.md
        ├── v0.1/
        │   ├── roadmap.md
        │   └── v0.1-beta.1/
        │       ├── roadmap.md
        │       ├── 01-xxx.md
        │       └── 02-xxx.md
        └── v0.2/
            ├── roadmap.md
            └── v0.2-alpha.9/
                ├── roadmap.md
                ├── 01-xxx.md
                └── 02-xxx.md
```

- 一级能力域：`core/` 承载 `@retikz/core` 以及强依赖 core 的 `@retikz/react`、SVG / Canvas adapter、文档运行时等决策；未来 `plot/` 承载 `@retikz/plot` 及其强相关内容。
- `v0/roadmap.md`：major 总路线。
- `v0/v0.1/roadmap.md`：minor 总路线。
- `v0/v0.1/<milestone>/roadmap.md`：milestone 路线 / TODO / 验收记录，替代旧的独立 plan 文件。
- `v0/v0.1/<milestone>/<NN>-<slug>.md`：该 milestone 下的 ADR；文件名不用 `adr-` 前缀。
- PATCH 版本不开目录；patch 仅修 bug，不写 roadmap / ADR，除非它推翻了既有决策。

## roadmap 与 ADR 的生命周期

- **roadmap** 记录"接下来要做什么"：路线、TODO、实施步骤、验收记录。它可更新，完成后可精简；纯执行过程若长期信息已沉淀到 changelog / docs / ADR，可删除。
- **ADR** 记录"为什么这么做"：架构、接口、字段语义、公开行为等单点决策。ADR 永久保留；状态变为 `Accepted` 后不改历史内容。若后续推翻，新增 ADR 并在旧文标 `Superseded by <milestone> ADR-NN`。
- 有歧义时先写 milestone `roadmap.md`；当某个方案需要成为长期契约，再拆出 `NN-*.md` ADR。

## 当前文档

### architecture/

- [`core-design.md`](./architecture/core-design.md)：retikz 总架构设计，包含分层模型、IR、Scene、AI 友好原则、跨平台策略。

### decisions/

- [`core/v0/roadmap.md`](./decisions/core/v0/roadmap.md)：core v0 总路线。
- [`core/v0/v0.1/roadmap.md`](./decisions/core/v0/v0.1/roadmap.md)：core v0.1 路线与 milestone 索引。
- [`core/v0/v0.2/roadmap.md`](./decisions/core/v0/v0.2/roadmap.md)：core v0.2 路线与已完成 alpha / beta 跟踪。
- ADR 模板：[`core/_template.md`](./decisions/core/_template.md)。

### analysis/

- [`tikz-gap-analysis.md`](./analysis/tikz-gap-analysis.md)：当前 Node / Path 能力对比 TikZ 的缺失项与优先级。

## 写文档前先选生命周期

1. 是长期架构总图？写进 `architecture/`。
2. 是一次性研究 / 对比，写完不再改？写进 `analysis/`。
3. 是版本路线、实施步骤、TODO？写进对应 `decisions/<domain>/<major>/<minor>/<milestone>/roadmap.md`。
4. 是需要长期保留的单点决策？写进对应 milestone 目录下的 `<NN>-<slug>.md`。

## superpowers/

`superpowers/` 目录下的 specs / plans 是 superpowers skill 的工作流产物，生命周期由 skill 自己管理，不要混进上面的体系。
