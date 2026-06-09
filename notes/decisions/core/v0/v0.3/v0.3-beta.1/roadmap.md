# v0.3.0-beta.1 实施待办：封版前体验加固

> 写于 2026-06-09。beta.1 是 v0.3 进入 rc 前的体验加固窗口：只接修复、 parity、文档 / demo、工程清理、可选导出入口与 public API 收口；不开新功能 ADR，不新增 IR 形态或公开字段集。
>
> 关联：[`v0.3 总计划`](../roadmap.md) · [`flow-beta` SKILL](../../../../../../.agents/skills/flow-beta/SKILL.md)

## 背景与定位

v0.3 的主功能线已经在 alpha.1～alpha.5 落地：renderer 架构出关、Tier 2 支撑、水合、shape 参数化泛化、时间轴动画。beta.1 不再扩展核心模型，重点处理封版前会影响用户判断与发布观感的项目：

- SVG / Canvas 两条 renderer 的行为与 demo 对齐。
- 无框架 / SSR / Canvas 导出入口的边界明确。
- 文档站代码视图与当前能力同步。
- 包描述、开发者文档和构建工具链清掉过时信息。

本轮明确不处理 changelog 全量润色；changelog 后续由人工统一优化。

## 进度看板

| # | 标题 | level | 工作量 | 状态 | 备注 |
|---|---|---|---|---|---|
| 1 | 新增 `stealth` 空心箭头，并合并 SVG↔Canvas parity demo / test | visible | 中 | ✅ 完成 | 已补 `openStealth` 内置箭头、core/render/react 回归测试与 Arrow 页面 SVG / Canvas 对照 demo。 |
| 2 | 补 Canvas 动画触发桥 | visible | 中-大 | ✅ 完成 | Canvas 已接入 `{ onEvent }` hydration bridge 与 `visible` 视口触发；React / vanilla 入口复用同一组 render hydration helper。 |
| 3 | 增加可选 Node Canvas / `@napi-rs/canvas` 服务端导出入口 | visible | 中-大 | ✅ 完成 | 已新增 `@retikz/render/canvas-node` 子路径、可选 peer 依赖与 Node 图片 buffer 导出测试 / 文档。 |
| 4 | 提升文档站 ComponentPreview 的 vanilla 代码视图 | visible | 中 | ✅ 完成 | vanilla codegen 已补 `arc` / `circlePath` / `ellipsePath` 常见 way；不可等价 step 退回 raw IR，避免伪造 builder 代码。 |
| 5 | 修复“官方只提供 React adapter”等过时文档与包描述 | visible | 小 | ✅ 完成 | 已刷新 core/render/react/vanilla 包描述与 about / Source Code Guide 中的当前能力面。 |
| 6 | 升级 / 对齐 Vite 配置并移除不必要包 | internal | 小-中 | ✅ 完成 | 7 个库包已改用 Vite 8 `resolve.tsconfigPaths`，并移除 `vite-tsconfig-paths` catalog、devDependency 与 lockfile 记录。 |

## ADR / 决策草案

| ADR | 对应 TODO | 主题 | 状态 |
|---|---|---|---|
| [01](./01-stealth-hollow-arrow-parity.md) | TODO-1 | `stealth` 空心箭头 + SVG / Canvas parity demo | Accepted |
| [02](./02-canvas-animation-trigger-bridge.md) | TODO-2 | Canvas 动画触发桥 | Accepted |
| [03](./03-node-canvas-export.md) | TODO-3 | 可选 Node Canvas 服务端导出入口 | Accepted |
| [04](./04-component-preview-vanilla-codegen.md) | TODO-4 | ComponentPreview vanilla 代码视图补齐 | Accepted |
| [05](./05-docs-package-surface-refresh.md) | TODO-5 | 文档与包描述当前能力面刷新 | Accepted |
| [06](./06-vite-tsconfig-paths-cleanup.md) | TODO-6 | Vite tsconfig paths 原生化与依赖清理 | Accepted |

## 执行约束

- 按 `flow-beta` 一条一条做；实现完成后再进入多 LLM 等价性 / 收益评估。
- visible 条目视用户影响同步 `apps/docs`，但本轮不做 changelog 全量整理。
- 若某条实际需要新增 IR 形态、公开字段集或全新功能面，停止并移出 beta.1，改登记为后续 alpha / v0.4 候选。
- breaking 改动若出现，必须单独标注迁移路径，并在发布前补 changelog BREAKING；当前 TODO 预期均不需要 breaking。

## 验证建议

按实际触及包选择最小集：

```bash
pnpm --filter @retikz/core exec vitest run
pnpm --filter @retikz/render exec vitest run
pnpm --filter @retikz/react exec vitest run
pnpm --filter @retikz/vanilla exec vitest run
pnpm --filter @retikz/docs exec vitest run
```

涉及 TypeScript / 导出 / 工程配置时再跑：

```bash
pnpm --filter <pkg> exec eslint . --fix
pnpm --filter <pkg> exec tsc --noEmit
```

> 不运行会 emit 的 `tsc` / `tsc -b`。

## 暂不处理

- changelog 全量措辞与历史段落清理：后续人工统一优化。
- v0.4 功能候选：Progressive / WebGL / 更完整数据过渡 morph 等不进入本 beta.1。
