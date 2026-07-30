# @retikz/vanilla 工作指南

本文件只写 `@retikz/vanilla` 包内特有规则。全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，kernel 组规则见 [`../AGENTS.md`](../AGENTS.md)。

## 包职责契约

- **解决的问题**：让无 UI 框架和 SSR / build-time 环境能够用 plain data authoring、编译、渲染、挂载和更新 retikz 图形
- **拥有的契约**：Vanilla plain spec 与 normalization、Tier 2 embed adapter 接口、static / retained view 判别、mount / update / dispose 生命周期、DOM 物化、SSR 入口及 hydration / animation 接线
- **不拥有的能力**：Core IR / Scene 语义、通用 compile 规则、SVG / Canvas emitter 算法、Tier 2 领域语法、框架组件或业务交互状态
- **输入与输出**：接收 Core IR、Scene 或 VanillaFigureSpec 及 options，输出 SVG string、稳定 SVG / Canvas view、hydration handle 与 animation controls
- **缺口流向**：新图形语义补 `@retikz/core`；后端执行补 `@retikz/render`；领域 authoring 进入对应 vanilla adapter；只有无框架宿主生命周期或 plain-spec convenience 才进入本包

## 分层

```text
spec/      plain spec、helper、normalization、Tier 2 embed contract
runtime/   compile / render 编排、SSR、DOM mount、hydrate、view lifecycle
```

- plain spec helper 只能构造或归一化既有 Core IR；不得新增平行字段语义。
- `runtime` 组合 core / render；Scene → SVG / Canvas 算法保持在 `@retikz/render`。
- 预编译 `Scene` 只创建 static view；IR / plain spec 由 `runtime.mode` 选择 retained Session 或无 Session 的 static full 执行，默认 retained；Patch、fallback 与 rollback 只属于 retained 路径并委托 Render participant。
- SSR 路径不得依赖 DOM 全局；DOM 访问只在浏览器 mount / hydrate 调用路径发生。
- Tier 2 adapter 只负责把领域输入转成 Core IR contribution，不把领域 schema 或算法内置到 vanilla。

## 验证

结构化改动后至少运行：

```bash
pnpm --filter @retikz/vanilla exec eslint . --fix
pnpm --filter @retikz/vanilla exec tsc --noEmit
pnpm --filter @retikz/vanilla test:changed
```
