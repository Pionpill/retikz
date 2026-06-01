# core 分组（基础设施层）工作指南

> 本文件是 retikz **基础设施分组**——`packages/core/` 下 `core` / `render` / `react` / `vanilla` 四个 Tier 1 包——的共享规范。
>
> - 仓库通用规则（commit / 分支 / 依赖 catalog / 代码风格 / React 规范 / zod IR 风格 / Kernel·Sugar·Tier 2 分层等）见根 [`AGENTS.md`](../../AGENTS.md)。
> - 各包专属实现细节见各自的 `AGENTS.md`：[`core/AGENTS.md`](./core/AGENTS.md)（IR + Scene 编译器）、[`react/AGENTS.md`](./react/AGENTS.md)（Kernel + Sugar）；`render` / `vanilla` 暂无，按需补。
> - 本文件只放「跨这四个基础包、但不属于全仓」的规范。

## 分组定位

| 包 | 职责 |
| --- | --- |
| `@retikz/core` | renderer-agnostic IR + Scene 编译器；运行时依赖白名单只有 `zod` |
| `@retikz/render` | Scene → 渲染后端，子路径 `./svg` / `./canvas` |
| `@retikz/react` | React adapter：Kernel + Sugar JSX，对接 render |
| `@retikz/vanilla` | framework-free runtime / SSR 入口 |

这四包构成 **Tier 1 底座**。Tier 2（`@retikz/plot` / `@retikz/chart` 等）是**另外的分组**，通过 core 的 `lowerComposites` 钩子接入、不进 core——分层契约见根 [`AGENTS.md` 的「抽象分层：Kernel / Sugar / Tier 2」](../../AGENTS.md)。

## 版本与发布

core / render / react / vanilla 同属 **core 模块**，**版本号始终保持一致（lockstep）**：任一包发生改动并发布时，其余三包一并 bump 到同一版本号并同时发布——不单独错版发布。包间相互依赖用 `workspace:*`，对外发布时由发布流程统一替换为同一固定版本。

> Tier 2 的 `@retikz/plot` / `@retikz/chart` 等分组**各自独立版本**，不进此 lockstep；它们只依赖 core 模块的能力，按自身节奏发布。
