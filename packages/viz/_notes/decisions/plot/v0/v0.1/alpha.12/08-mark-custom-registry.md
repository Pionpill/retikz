# ADR-08：开放自定义 mark

状态：Accepted
发布：`@retikz/plot` `0.1.0-alpha.12`

## 背景

coordinate、scale、transform 都已经朝 runtime definition / registry 方向收敛，但 mark 仍缺少公开自定义入口。没有自定义 mark 时，用户只能等内置 mark 覆盖所有数据几何，这会把长尾需求推回内置分支。

本 ADR 补齐 mark 与 coordinate / scale / transform 的扩展对等：IR 可以携带自定义 mark operation，运行时通过 `markDefinitions` 下沉。

## 决策

Plot IR 增加 custom mark passthrough，`PlotSpec.marks` 接收 `MarkOperation`。内置 mark 继续走静态 union；未知 mark type 通过 custom schema 保留 JSON-serializable 配置。

新增 / 收敛 mark runtime definition：

- `MarkDefinition`
- `defineMark`
- `options.markDefinitions`

lowering 不再在所有阶段假设 mark 一定是内置 union 成员。`pipeline/expand/`、`interaction/locate.ts` 等对 mark 的读取改为类型无关访问：共享 encoding 的 x/y 仍参与 scale 推断；真正下沉时由 registry 找到 definition 并调用其 lower 逻辑。

自定义 mark 的 runtime 逻辑不进入 IR。IR 只保存 `{ type, ...config }`。

## 实现状态

该 ADR 已在 2026-06-19 落地。自定义 mark 可经 spec 入口 + `markDefinitions` 使用。

与蓝图相比的 staged 项：

- 自定义 bounds 仍留后续。
- 通用 `<Mark>` React 组件未在本轮提供。

## 实现指针

最终行为以代码为准，主要落在：

- `packages/viz/plot/src/contract/mark.ts`
- `packages/viz/plot/src/providers/mark/**`
- `packages/viz/plot/src/schemas/mark/**`
- `packages/viz/plot/src/pipeline/expand/`
- `packages/viz/plot/src/features/interaction/locate.ts`

验证覆盖：

- `packages/viz/plot/tests/lower/mark-registry.test.ts`
- `packages/viz/plot/tests/lower/mark-value-resolver.test.ts`
- custom mark / locator / scale 推断相关测试

## 影响

mark 扩展点与其它 runtime extension contract 对齐。内置与自定义 mark 共享注册、字段读取、scale 推断、locator parity 的基础机制，避免形成“内置白名单 + 外部补丁”的二等路径。

## 不在本 ADR 范围

- 抽象 mark 模型的破坏性重命名；由 ADR-03 / ADR-04 描述。
- React 通用 `<Mark>` 声明组件。
- 新 renderer primitive 或 core 渲染能力。

> 🔖 本文件压缩前完整施工蓝图 = `git show 20392fb1f39f0383e9d8f8a29f31850da99b8825:_notes/decisions/graph/v0/v0.1/alpha.12/08-mark-custom-registry.md`（封板全文）。
