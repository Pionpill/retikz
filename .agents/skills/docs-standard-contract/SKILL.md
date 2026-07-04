---
name: docs-standard-contract
description: retikz docs 站代码与文件结构基础规范。Use when changing apps/docs source organization, module/component folder layout, docs-specific utils/types/constants placement, React context/store/hooks naming, or when deciding whether code belongs in modules/docs, layout, components/shared, store, or lib.
---

# Docs Standard Contract: 文档站代码结构规范

## Overview

用于 `apps/docs` 代码结构整理、文件命名、React 目录边界和 barrel 约束。写正文 MDX 仍读 docs-doc-principle；本 skill 只管代码 / 文件结构。

## 顶层职责

- `src/app/`：入口、路由、全局快捷键、App 装配、站点级 layout、header、全局面板容器；不得放阅读模块业务状态。
- `src/modules/docs/`：文档阅读模块，包含 contents、data、DocLayout、MDX runtime、demo preview、docs 专属 store/lib/components。
- `src/components/shared/`：真正跨模块复用组件；docs-only 组件先放 `modules/docs/components/`。
- `src/store/`：全局状态，如 theme/layout；模块状态放模块内。
- `src/lib/`：无 React、无业务模块依赖的底层工具。

## 场景文件命名

在一个功能场景目录内，优先使用这些稳定文件名表达职责：

- `utils.ts` 或 `utils/`：纯函数 helper；不放 React 状态、副作用、组件。
- `types.ts`：导出类型、局部复杂类型、由 constants 派生的类型。
- `constants.ts`：稳定常量、const object enum、关键字集合、查表数据。
- `index.ts`：barrel；默认 `export *`，不写业务逻辑。

简单场景可以先单文件；当一个文件同时承担工具、类型、常量、组件或状态时，再拆成上面的职责文件 / 文件夹。

一般情况下不使用 `xxx.xxx.ts` / `xxx.xxx.tsx` 这类双后缀命名；只有需要批量统一处理、外部工具识别或已有命名解析逻辑时例外，例如 `*.demo.tsx`、`*.data.ts`。

## React 场景目录

React 相关文件按职责分目录，文件名保持可搜索：

- `context/`：React Context。公开消费文件与导出的 hook 统一命名为 `useXxxContext.ts` / `useXxxContext`，provider context 常量可放在同文件内。
- `store/`：zustand 状态。文件命名为 `useXxxStore.ts`。
- `hooks/`：业务钩子。文件命名为 `useXxx.ts` / `useXxx.tsx`。
- `components/`：本场景内部展示组件；确认跨模块复用后再上移到 `components/shared/`。
- `utils/`：不渲染 React UI 的工具逻辑；如果包含 JSX，不放这里。
- `commands/`：由 UI 触发的浏览器命令或副作用 helper，如下载、复制、打开窗口；不放 React 组件或状态。

## 模块内导入

- 场景内部可相邻导入或从本场景 barrel 导入。
- `components/`、`utils/`、`hooks/`、`context/`、`store/`、`commands/` 等职责子目录必须提供 `index.ts`；目录外消费只从目录 barrel 导入，不 deep import 子文件。
- 模块外消费优先走拥有者 barrel；避免 deep import 到 `utils/`、`constants.ts`、`types.ts` 等私有文件。
- barrel 默认 `export * from './xxx'`；需要裁剪公共面、避免冲突或显式重命名时才用 named re-export。
- 不从 `components/shared` 转手 export docs-only 模块内容。

## 整理检查清单

改 `apps/docs` 结构前后检查：

- 是否仍符合 `apps/docs/AGENTS.md` 顶层职责。
- docs-only 代码是否留在 `modules/docs/` 内。
- React context/store/hooks 是否按目录和 `useXxx...` 命名。
- 工具、类型、常量是否按 `utils` / `types` / `constants` 拆分，且无 JSX 混入 `utils`。
- barrel 是否只导出稳定 API，且默认使用 `export *`。
- 移动文件后是否更新 tests、scripts、MDX imports、glob key、README / AGENTS 中的路径说明。
