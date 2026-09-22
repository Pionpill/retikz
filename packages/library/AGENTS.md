# library 分组工作指南

本文件覆盖 `packages/library/`。全仓通用规则见根 [`AGENTS.md`](../../AGENTS.md)。

涉及 Standard 能力归属、Core / Standard 边界或公共契约拆分时，先读 [`Standard Drawing Library 设计`](_notes/architecture/standard-library-design.md)，并按根规则读取能力完备性文档与 `standard-structure` skill

## 分组职责

`library` 是官方维护、相对 Core 可选安装、供作者和官方 Tier 2 包跨领域复用的绘图能力库分组。Extension 提供官方 Core provider 实现；Standard 提供通用 Tier 2 绘图组件与动画效果工厂；Layout 提供领域无关的排版、约束求解、artifact、inspection 与对应 authoring。

它不拥有 Core IR、Scene、renderer、数据可视化、逻辑关系模型、Tree / Layered / Force 等算法布局、编辑器运行时或第三方扩展机制。Core 继续拥有 `defineXxx`、registry、compile options 与诊断链路；Library 的官方实现必须与第三方实现走同一条公开路径。

## 包家族

| 包                         | 解决的问题                      | 拥有                                                                    | 不拥有                                                |
| -------------------------- | ------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| `@retikz/extension`        | 提供可选官方绘图定义            | Core provider 实现、参数 schema、集合与 Ribbon profile 契约             | Tier 2 composite、Layout、adapter、Core registry 机制 |
| `@retikz/standard`         | 提供宿主无关的通用绘图组合      | Tier 2 composite、任意 child Surface、lowering、动画效果工厂            | Core provider 扩展、排版 solver、领域解析             |
| `@retikz/standard-react`   | 用 React 使用 Standard 能力     | JSX sugar、props → Standard 输入、React runtime 接线                    | Standard schema、lowering、registry 与 Core 语义      |
| `@retikz/standard-vanilla` | 用无框架 API 使用 Standard 能力 | builder、SSR / mount 编排、Vanilla runtime 接线                         | Standard schema、lowering、registry 与 Core 语义      |
| `@retikz/layout`           | 提供宿主无关的领域无关排版布局  | Layout schema / Definition、solver、composition、artifact 与 inspection | 算法布局、GraphModel、renderer、领域解析              |
| `@retikz/layout-react`     | 用 React 使用 Layout 能力       | JSX authoring 与 React runtime 接线                                     | Layout schema、solver、artifact 与 Core 语义          |
| `@retikz/layout-vanilla`   | 用无框架 API 使用 Layout 能力   | builder、SSR / mount authoring 与 runtime 接线                          | Layout schema、solver、artifact 与 Core 语义          |

Standard、Extension 与 Layout 分别使用独立 release group `standard`、`extension`、`layout`，不与 kernel / viz 或彼此 lockstep；领域包按兼容版本单向依赖实际使用的 capability。

## 分层与依赖

- `extension` 只依赖 Core / Foundation / Math 与必要 schema 底座；唯一公开根入口，不依赖 Layout、Standard 或 adapter，不自动注册
- Standard 和其 adapter 需要 Core provider 扩展时，直接依赖 Extension 根入口

- `layout` 只依赖 `@retikz/core`、必要的 `@retikz/math` / `@retikz/foundation` 与 schema 底座；不得依赖 Standard 或领域包
- `standard` 可以依赖 Layout 的公开 composition capability，也可以直接依赖 Core / Math；不得 deep import Layout 私有 solver 或复制布局算法
- Plot、Table、Graph 等官方 Tier 2 包按需直接依赖 `standard` 和 `layout` 的公开 capability；不得通过 Standard barrel 转手获得 Layout API
- `standard-react` 只消费 `standard` 与 `@retikz/react` 的公开能力；`standard-vanilla` 只消费 `standard` 与 `@retikz/vanilla` 的公开能力
- `layout-react` 只消费 `layout` 与 `@retikz/react` 的公开能力；`layout-vanilla` 只消费 `layout` 与 `@retikz/vanilla` 的公开能力
- 含独立持久化语义的 Tier 2 能力必须 JSON-safe，并通过 Core composite / lowering 下沉为 Core IR；不得建立平行 Scene 或 renderer 分支
- 只有去除领域词汇后仍成立、至少有两个独立消费场景且可通过公开 Core 契约闭环的能力才可进入本组
- Standard 不拥有跨 composite 的 preset 组合层；每个 composite owner 直接导出 Definition、factory、schema 与 lowering

## 当前状态

Standard 与 Layout 三包均已实现，并分别使用独立 release group。Layout v0.1 alpha.1 已接管排版布局长期契约；Standard 不再拥有或转发 Layout API，也不得新增双 namespace 兼容层。Standard 当前 v0.1 alpha.4 源码已按 Accepted ADR 提供任意 child Surface、五种参数化图式 Shape 与九种端点 Marker，并通过 `ellipticCapsule` 表达独立端深的半椭圆胶囊轮廓；其发布仍随 Standard release group 的独立流程决定。
