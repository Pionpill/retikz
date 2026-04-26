# AGENTS.md

面向 AI 编码助手（Claude Code / Copilot / Cursor 等）的项目工作指南。人类贡献者同样适用。

## 项目概览

**retikz** 是一个基于 React 与 D3 的绘图库，灵感来自 LaTeX 的 TikZ，用于以组件化的方式声明节点、路径、箭头等图元。

- 语言：TypeScript（ESM）
- 运行时：React ≥ 18
- 构建：Vite + `vite-plugin-dts`
- 文档站：<https://pionpill.github.io/retikz.doc/>

## 仓库结构

这是一个 pnpm monorepo，workspace 定义在 `pnpm-workspace.yaml`：

```
retikz/
├── packages/
│   ├── legacy-core/    # @retikz/legacy-core — v0.0.x 旧实现，保留作参考，不发布
│   └── core/           # @retikz/core — v0.1 重写中，见 docs/CORE-REFACTOR.md
├── apps/
│   └── docs/           # @retikz/docs — 文档站点，mdx 内容在 apps/docs/doc/{en,zh}/
├── config/
│   └── eslint/         # 共享的 ESLint 预设
├── docs/               # 项目内部架构与重构方案文档
├── pnpm-workspace.yaml # workspace + catalog（统一依赖版本）
├── eslint.config.js    # 根级 flat config
└── tsconfig.json
```

v0.1 重写正在 `next` 分支上进行。架构与实施方案见 `docs/`：
- `docs/DESIGN.md`：架构与底层建设
- `docs/CORE-REFACTOR.md`：@retikz/core 重写方案
- `docs/REACT-ADAPTER.md`：@retikz/react 适配层方案

## 依赖管理

**所有共享依赖的版本都写在 `pnpm-workspace.yaml` 的 `catalog:` 段。** 子包 `package.json` 中只使用 `"some-pkg": "catalog:"` 引用，不要硬编码版本号。

- 新增依赖：先在 `pnpm-workspace.yaml` 的 `catalog:` 中登记版本，再在需要它的 `package.json` 里写 `"catalog:"`
- 升级版本：只改 `catalog:` 中的版本号，所有子包自动生效
- 某个包仅被单个子包使用，也建议登记到 catalog，便于后续复用
- React / React-DOM 对库来说是 `peerDependencies`（保留宽松区间如 `>=18`），同时放进 `devDependencies` 用 `catalog:` 供本地开发

## 常用命令

根目录：

```bash
pnpm install                         # 安装所有 workspace 依赖
pnpm lint                            # ESLint 全量（带 --cache）
```

子包（示例：legacy-core）：

```bash
pnpm --filter @retikz/legacy-core dev       # 启动开发
pnpm --filter @retikz/legacy-core build     # 构建产物到 dist/
pnpm --filter @retikz/legacy-core lint      # 单包 lint
pnpm --filter @retikz/legacy-core preview   # 预览构建结果
```

v0.1 新 core 正在 `next` 分支重写中，写完后命令切换为 `pnpm --filter @retikz/core ...`。

## Commit 规范

**格式：`<emoji> <简短描述>`**

使用 [gitmoji](https://gitmoji.dev/) 风格的 `:slug:` 形式或对应 Unicode 表情均可，描述使用中文，一般不超过 50 字。示例：

```
:sparkles: 添加 PathNode 组件
:bug: 修复路径分段错误
:recycle: context 细粒度拆分
🚚 改为多 packages 项目管理形式，迁移代码到 core 下
```

### 本项目已使用的 emoji

下表是从 git 历史中总结出的用法，**新 commit 请沿用同一套语义**，不要引入其它 emoji（除非确有新场景且需先在此处补充说明）：

| Slug | 符号 | 用途 |
| --- | --- | --- |
| `:construction:` | 🚧 | 开发中 / 进行中的增量修改（最常用） |
| `:sparkles:` | ✨ | 新增独立功能或组件 |
| `:bug:` | 🐛 | 修复 bug |
| `:recycle:` | ♻️ | 重构（不改变外部行为） |
| `:truck:` | 🚚 | 移动或重命名文件 / 变量 |
| `:pencil:` | 📝 | 文档、注释、说明类改动 |
| `:wrench:` | 🔧 | 工程/配置文件调整（eslint、tsconfig、CI 等） |
| `:package:` | 📦 | 打包配置、产物发布相关 |
| `:heavy_plus_sign:` | ➕ | 新增依赖 |
| `:fire:` | 🔥 | 删除代码或文件 |
| `:bookmark:` | 🔖 | 发布版本（打 tag） |

### 选择建议

- 改了 `.md` / `apps/docs/doc/` → `:pencil:`
- 改了 `pnpm-workspace.yaml` / `eslint.config.js` / `tsconfig.json` 等 → `:wrench:`（配置）或 `:recycle:`（结构性整理）
- 新增一个 API / 组件 → `:sparkles:`；其细节打磨后续改动 → `:construction:`
- 纯删除无用代码 → `:fire:`
- 版本号变更并准备发布 → `:bookmark:`

## 代码风格

- ESLint 统一在根目录通过 `pnpm lint` 运行，flat config 见 `eslint.config.js`
- 不要在子包里重复声明工具链（eslint、typescript 等）的版本，统一用 catalog
- 变量/文件命名沿用现有风格：组件 PascalCase，hooks `useXxx`，工具类小驼峰
- 尽量不写注释；确需解释"为什么"时再写，避免复述代码做了什么
