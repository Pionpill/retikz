# kernel 分组工作指南

本文件覆盖 `packages/kernel/` 下的 `foundation` / `math` / `runtime` / `core` / `inspect` / `render` / `react` / `vanilla` / `tex`。全仓通用规则见根 [`AGENTS.md`](../../AGENTS.md)，包内细则看就近 `AGENTS.md`。

## 包职责与边界

| 包                   | 解决的问题                                | 拥有                                                           | 不拥有                                               |
| -------------------- | ----------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| `@retikz/foundation` | 跨包复用的零依赖原子基础契约              | 类型工具、typed non-empty string 断言、结构化错误骨架          | IR、schema、Diagnostic、geometry、renderer、领域状态 |
| `@retikz/math`       | 共享确定性的纯计算几何底座                | 数值、向量、仿射、arc、求交、边界和通用几何算法                | IR、绘图语义、schema、renderer、框架 runtime         |
| `@retikz/runtime`    | 共享领域中立的增量执行与事务底座          | identity、ownership、program、transaction、trace 与调度契约    | IR、Scene、几何、renderer、框架与领域 operation      |
| `@retikz/core`       | 后端中立的二维绘图表达与编译              | Core IR / schema、扩展契约、compile、Scene / manifest 语义     | 具体渲染执行、框架 authoring、数据可视化、TeX 引擎   |
| `@retikz/inspect`    | 可选的编译结果检查与辅助内容生成          | Inspector 定义、注册、选择、诊断、辅助平面与宿主接线           | Core IR / compile、Scene 执行、领域布局与编辑交互    |
| `@retikz/render`     | 在不同后端一致执行 Scene                  | SVG / Canvas 输出、后端资源映射、hydration 与 animation 执行器 | Core IR / compile、布局语义、业务交互状态、框架组件  |
| `@retikz/react`      | 用 React JSX authoring 并接入宿主 runtime | Kernel / Sugar JSX、JSX ↔ IR adapter、React 渲染接线           | Core / Scene 语义、renderer 算法、Tier 2 领域语法    |
| `@retikz/vanilla`    | 无框架 authoring、浏览器挂载与 SSR        | plain spec、挂载生命周期、DOM 接线、SSR 入口                   | Core / Scene 语义、renderer 算法、Tier 2 领域语法    |
| `@retikz/tex`        | 可选 TeX 排版能力接入 Core 文本契约       | TeX 引擎抽象、MathJax 集成、字形 lowering、可选 React hook     | Core 文本 IR、通用 SVG renderer、应用公式编辑体验    |

依赖方向：`foundation` 保持零依赖；`runtime` 直接消费 `foundation`，`math` 当前没有 Foundation import 且继续保持零依赖；`core` 直接消费 `foundation`、`runtime` 与 `math`；`inspect` 根入口消费 `core` 并按实际 source import 直接消费 `foundation`；宿主子入口可选消费 `render`、`react` 或 `vanilla`；`render` 消费 `foundation`、`runtime` 与 `core`；`react` / `vanilla` 消费 `foundation`、`runtime`、`core` 与 `render`；`tex` 消费 `foundation` 与 `core`。Standard、Plot、Chart、Table 等其它实际 consumer 同样必须按真实 Foundation import 声明 direct dependency。不要让 foundation 反依赖上层包，不要让 runtime 反依赖领域包，也不要让 core 反依赖 Inspector、公式、React、Vanilla 或具体渲染后端。

每个包的输入输出与缺口流向以就近 `AGENTS.md` 为准。通用纯几何下沉 math；后端中立绘图语义进入 core；Scene 执行进入 render；框架或无框架接线进入对应 adapter；可选领域集成留在扩展包。某包需要一项能力不等于该能力归它所有。

## 版本与发布

九个包同属 kernel 组，版本号保持 lockstep：任一包发布时，其余包同步 bump 到同一版本并一并发布。包间依赖用 `workspace:*`，对外发布时由发布流程替换为固定版本。

Tier 2（如 plot 组）独立版本线，只依赖 core 组能力，不进 core 组 lockstep。

发包细节、tag、changelog、roadmap 和授权边界按 `.agents/skills/package-publish/SKILL.md` 执行；若技能里的包列表与当前 `package.json` 不一致，以当前源码为准并先修正流程文档。
