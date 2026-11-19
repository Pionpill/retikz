---
description: '应用构建复用 TypeScript 的路径映射，而不在每个应用另外维护一份别名表'
keywords: 'Vite、tsconfig、paths、vite-tsconfig-paths、vite.config.ts、package.json、resolve.tsconfigPaths'
---

# ADR-028：Vite tsconfig paths 原生化与依赖清理——先确认 Vite 8 原生选项可用，再统一替换 7 处 `vite-tsconfig-paths`

- 状态：Accepted
- 决策日期：2026-06-09
- 关联：[`v0.3-beta.1 roadmap`](./roadmap.md)

## 决策

应用构建复用 TypeScript 的路径映射，而不在每个应用另外维护一份别名表。选择 Vite 原生的 tsconfig 路径解析后，不再需要仅用于复现同一映射的插件；以解析结果等价为前提，不改变包的对外导入路径。
