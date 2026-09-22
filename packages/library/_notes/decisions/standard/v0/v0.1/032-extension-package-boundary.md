---
description: 官方 Core provider 实现与动画预设归入单根入口 Extension，Standard 保留 Tier 2 composite，源码和文档消费者同步迁移。
keywords: Extension、Standard、provider、Definition、包边界、根入口
---

# ADR-032：Extension 与 Standard 包边界

- 状态：Accepted
- 决策日期：2026-09-22
- 关联：[ADR-023](./023-core-minimal-builtins-and-standard-provider-entrypoints.md) · [ADR-031](./031-animation-preset-migration.md)

## 背景与目标

可选的 Core 绘图 Definition 与拥有独立输入语义的 Tier 2 composite 当前共同位于 Standard。只需要节点形状或箭头的作者因此也会安装 Layout 依赖，包名与文档入口无法表达这两类能力的边界。

## 核心决策

`@retikz/extension` 拥有官方节点形状、箭头、裁剪和 Ribbon 的 Definition、provider、参数类型、名称常量与能力集合。唯一公开入口为包根，采用具名导出，保持 `sideEffects: false`。导入不会向任何编译调用注册能力；作者显式提供 Definition 或 provider contribution。

Extension 直接复用 Core 的 define、registry、compile 与 Scene 契约，不创建 Tier 2 composite namespace、独立布局模型或适配器。Definition 所需的参数 schema、Clip 数据契约及 Ribbon Path kind 数据和宽度 profile 契约随实现一起迁移；这些是已有 Core 扩展点的完整实现，不因为拆包删减。Extension 不依赖 Layout、Standard、React 或 Vanilla。

Standard 保留展现与形状 Tier 2 composite、schema、resolve、lowering、React 与 Vanilla 适配器。需要扩展能力时，Standard 与其消费者直接依赖 Extension 的公开根入口。动画效果预设随 Extension 迁移，继续作为纯工厂能力；不创建 registry、provider 或宿主适配器。

Extension 使用独立 release group `extension`；Standard 三包继续使用 `standard`，Layout 三包继续使用 `layout`。

## 公开契约与行为

```ts
import { CrossShapeDefinition, DiamondArrowDefinition, PathClipProvider } from '@retikz/extension';
import { GridDefinition } from '@retikz/standard';
import { pulse } from '@retikz/extension';
import { CircleDefinition } from '@retikz/standard/shape';
```

官方扩展的集合与名称常量统一使用 `ExtensionShapeDefinitions`、`ExtensionShapeProviders`、`ExtensionShapeName` 等 owner 名称。扩展实现产生的错误使用 `RetikzExtensionError` 与 `EXTENSION_*` 错误码，原有错误分类、details 与 cause 保持一致。Core 产生的诊断仍归 Core。

所有 provider 的注册 key、输入数据、默认值、几何、Scene 输出和冲突处理保持原行为。React、Vanilla、直接 compile 使用相同 Definitions 与 Core provider resolver；不新增宿主专用装配机制。已持久化的图形数据无需转换。

## 文档与兼容性

文档由 Standard · 标准包、Extension · 拓展包、Layout · 布局包分别组织。Extension 页面从 `/library/extension` 进入，各包正文可以独立阅读，相关底层机制关系仅作为补充说明。

本决策取代 ADR-023 关于官方扩展归 Standard 能力子入口的结论，以及后续扩展 ADR 的同类包路径约定；其它行为契约继续有效。旧 Standard 扩展子入口、旧集合名和旧扩展页面路径不保留别名或重定向。仓库内所有源码、测试、文档、demo 与构建引用必须作为同一改动集迁移。Standard 的 `/shape` 仍表示 Tier 2 形状，不与节点形状混淆。
