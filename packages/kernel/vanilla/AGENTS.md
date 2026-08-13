# @retikz/vanilla 工作指南

本文件只写 `@retikz/vanilla` 包内特有规则。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，kernel 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：向无 UI 框架、SSR / build-time 环境和全部框架包提供统一的 plain-data authoring 与 processing 基础
- **拥有的契约**：TypeScript-only `InputXxx`、Input-to-IR normalize、Tier 2 embed adapter / dependency contribution 接口、framework-neutral processing / retained session / readonly processing result、SSR 入口，以及 DOM 子入口的 mount / update / dispose / hydrate / animation 接线
- **不拥有的能力**：Core IR / Scene 语义、通用 compile 规则、SVG / Canvas emitter 算法、Tier 2 领域语法、框架组件或业务交互状态
- **输入与输出**：根入口接收已类型化 Input、Core IR、Scene 及 options，输出 Source IR、只读 processing result 与 SSR string；DOM 子入口输出稳定 SVG / Canvas view、hydration handle 与 animation controls
- **缺口流向**：新图形语义补 `@retikz/core`；后端执行补 `@retikz/render`；领域 authoring 进入对应 vanilla adapter；框架语法、生命周期与结果宿主接线留在对应框架包；只有无框架 authoring、processing 或 DOM materialization 才进入本包

## 分层

```text
normalize/ Input 类型、Input normalize、helper、Tier 2 embed contract
processing/ framework-neutral compile / retained processing / readonly result
runtime/   shared compile driver、SSR 与 DOM 可复用的运行时类型
dom/       DOM mount、hydrate、view lifecycle
```

- `normalize` 是所有框架包的 authoring 真源：React 等框架包只构造 `InputXxx` 并调度此处公开 normalizer，不能直接拼装 Core IR 或复制 authoring shorthand 逻辑。
- helper 只能构造或归一化既有 Core IR；不得新增平行字段语义。
- `processing` 组合 Core / Render，拥有所有框架可复用的 compile driver、retained processing session、revision、只读 processing result；`runtime` 保留 SSR 和共享运行时类型，Scene → SVG / Canvas 算法保持在 `@retikz/render`。
- 预编译 `Scene` 只创建 static processing result；IR / plain spec 由 processing mode 选择 retained Session 或无 Session 的 static full 执行，默认 retained；Patch、fallback 与 rollback 只属于 retained 路径并委托 Render participant。
- 根入口与 SSR 路径不得依赖 DOM 全局。DOM 访问只在 `dom/` 的浏览器 mount / hydrate 调用路径发生；框架包不调用该子入口。
- Tier 2 adapter 只负责把领域输入转成 Core IR contribution，不把领域 schema 或算法内置到 vanilla。
- Tier 2 adapter 的 Composite roots / providers 只收集后交给 Core provider graph resolver；Vanilla 不维护单 namespace maker 聚合、私有拓扑、dataset 冲突或 definition 去重语义。

## 验证

结构化改动后至少运行：

```bash
pnpm --filter @retikz/vanilla exec eslint . --fix
pnpm --filter @retikz/vanilla exec tsc --noEmit
pnpm --filter @retikz/vanilla test:changed
```
