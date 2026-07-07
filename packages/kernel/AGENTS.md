# kernel 分组工作指南

本文件覆盖 `packages/kernel/` 下的 `math` / `core` / `render` / `react` / `vanilla` / `tex`。全仓通用规则见根 [`AGENTS.md`](../../AGENTS.md)，包内细则看就近 `AGENTS.md`。

## 包职责

| 包                | 职责                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `@retikz/math`    | 零依赖纯计算几何：向量、仿射、arc、求交、圆、多边形、凸包等；被 core 依赖，不写 IR / zod / class |
| `@retikz/core`    | renderer-agnostic IR + Scene 编译器；运行时依赖限于 `zod` + `@retikz/math`                       |
| `@retikz/render`  | Scene 到渲染后端，提供 `./svg`、`./canvas`、hydration、animation 等能力                          |
| `@retikz/react`   | React adapter：Kernel + Sugar JSX，对接 render                                                   |
| `@retikz/vanilla` | framework-free runtime / SSR 入口                                                                |
| `@retikz/tex`     | 可选 LaTeX 公式接入：MathJax SVG 到 renderer-agnostic 字形路径，经 core 的 `lowerTex` 注入       |

依赖方向：`math` 被 `core` 消费；`render` 消费 `core`；`react` / `vanilla` 消费 `core` 与 `render`；`tex` 消费 `core`。不要让 core 反依赖公式、React、Vanilla 或具体渲染后端。

## 版本与发布

六个包同属 core 组，版本号保持 lockstep：任一包发布时，其余包同步 bump 到同一版本并一并发布。包间依赖用 `workspace:*`，对外发布时由发布流程替换为固定版本。

Tier 2（如 plot 组）独立版本线，只依赖 core 组能力，不进 core 组 lockstep。

发包细节、tag、changelog、roadmap 和授权边界按 `.agents/skills/package-publish/SKILL.md` 执行；若技能里的包列表与当前 `package.json` 不一致，以当前源码为准并先修正流程文档。
