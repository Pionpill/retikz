# library 分组工作指南

本文件覆盖 `packages/library/`。全仓通用规则见根 [`AGENTS.md`](../../AGENTS.md)。

## 分组职责

`library` 是官方维护、相对 Core 可选安装、供作者和官方 Tier 2 包跨领域复用的绘图能力库分组。它承接移除 Plot、Table、Graph、Flow、Workspace 等领域词汇后仍成立的常用 Drawing Complete 能力，例如可注册的箭头 / shape / connector 定义、通用容器与排版 composite，以及它们的 React / Vanilla authoring。

它不拥有 Core IR、Scene、renderer、数据可视化、逻辑关系模型、算法布局、编辑器运行时或第三方扩展机制。Core 继续拥有 `defineXxx`、registry、compile options 与诊断链路；Library 的官方实现必须与第三方实现走同一条公开路径。

## 包家族

| 包                         | 解决的问题                                       | 拥有                                                                         | 不拥有                                           |
| -------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| `@retikz/standard`         | 为作者与官方 Tier 2 包提供宿主无关的通用绘图能力 | definition / factory、通用 Tier 2 composite、lowering 与按需 Definition 导出 | Core 契约、renderer、领域解析、框架 runtime      |
| `@retikz/standard-react`   | 用 React 使用 Standard 能力                      | JSX sugar、props → Standard 输入、React runtime 接线                         | Standard schema、lowering、registry 与 Core 语义 |
| `@retikz/standard-vanilla` | 用无框架 API 使用 Standard 能力                  | builder、SSR / mount 编排、Vanilla runtime 接线                              | Standard schema、lowering、registry 与 Core 语义 |

标准包家族使用独立 release group `standard`，不与 kernel / viz lockstep；领域包按兼容版本单向依赖所需 Standard capability。

## 分层与依赖

- `standard` 只依赖 `@retikz/core`，必要时依赖 `@retikz/math`；不得依赖 Plot、Table、Graph、Flow、Workspace、renderer 或 DOM
- Plot、Table 等官方 Tier 2 包可以单向依赖 `standard` 的公开 capability；调用方先把 channel、scale、数据、表格规则等领域语义解析为领域无关输入，Standard 不提供反向 adapter 或领域特判
- `standard-react` 只消费 `standard` 与 `@retikz/react` 的公开能力；`standard-vanilla` 只消费 `standard` 与 `@retikz/vanilla` 的公开能力
- 含独立持久化语义的 Tier 2 能力必须 JSON-safe，并通过 Core composite / lowering 下沉为 Core IR；不得建立平行 Scene 或 renderer 分支
- 只有去除领域词汇后仍成立、至少有两个独立消费场景且可通过公开 Core 契约闭环的能力才可进入本组
- Standard 不拥有跨 composite 的 preset 组合层；每个 composite owner 直接导出 Definition、factory、schema 与 lowering

## 当前状态

Standard v0.1 alpha.1 已初始化三个 npm 包与独立 release group，并提供 Grid、Axes、Frame 三个 Tier 2 composite、直接 Definition 注入、React JSX 与 Vanilla authoring。新增能力继续由对应 milestone ADR 冻结 schema、definition、lowering、adapter、测试与文档闭环。
