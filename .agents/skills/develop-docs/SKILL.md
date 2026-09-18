---
name: develop-docs
description: Use when editing apps/docs React components, shared components, layout components, docs UI code, or shadcn-based interface code; covers component shape, props typing, UI library usage, placement, imports, and validation.
---

# Develop Docs: 文档站组件规范

用于修改 `apps/docs/src` 下的 React 组件、布局、共享组件和文档站 UI 代码。正文 MDX、demo 写作仍按 `docs-doc-*` skills；目录归属先读 [code-structure](../docs-doc-principle/references/code-structure.md)。

## 必读

- 根 `AGENTS.md`
- `apps/docs/AGENTS.md`
- `.agents/skills/docs-doc-principle/references/code-structure.md`

## React 组件

- 涉及 React Compiler 配置或运行时 gating 时，按官方契约核对配置及 gating 函数的导入、布尔返回语义；此项由 LLM 自审，不依赖 Oxlint 自动覆盖

- 组件使用 `FC<Props>`，Props 类型独立声明并导出，命名为 `XxxProps`。
- props 在函数体内解构，不在参数列表里展开复杂结构。
- 组件文件用 PascalCase；hook / store / context 文件按 `useXxx`、`useXxxStore`、`useXxxContext` 命名；其他非组件文件和目录用 kebab-case。
- 简单内部 helper 可留在同文件；被复用或承担独立职责时拆到 `utils.ts` / `types.ts` / `constants.ts`。
- JSDoc 保持短，只写职责或非显而易见的约束；不要写临时说明、历史原因或长篇原理。

## UI 组件

- 优先使用 `components/ui/*` 中 vendored shadcn 组件，不重复手写基础 button、dialog、popover、tooltip、dropdown、kbd 等控件。
- 不直接修改 `components/ui/*`；需要项目级语义或组合时，在 `components/shared/` 或具体模块内封装。
- 图标优先使用 `lucide-react`；品牌图标放 `components/icons/`。
- 条件 class 使用 `cn()`；不要手拼 class 字符串。
- Tailwind 使用 v4 CSS-first 约定；不要新增 v3 风格 `tailwind.config.js`。

目录归属与职责文件见 [代码结构](../docs-doc-principle/references/code-structure.md)。

## 导入与导出

- 跨 owner 消费走目标目录 barrel，不 deep import 到私有子文件。
- `index.ts` 默认使用 `export * from './xxx'`。
- 只有需要裁剪公共面、避免冲突或显式重命名时才用 named re-export。
- 尽量避免 import/export `as` 重命名；优先在定义源头给出准确命名。

## 验证

先用 Oxfmt 格式化本次文件，再对受影响源码执行 lint、类型检查及必要测试：

```bash
pnpm --filter @retikz/docs exec oxlint . --fix
pnpm --filter @retikz/docs exec tsc --noEmit
git diff --check
```

涉及可视布局、交互、响应式或 demo 渲染时，再用浏览器确认关键页面。
