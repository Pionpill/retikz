# 包拓扑

> **状态：当前包与发布组拓扑真源的可读说明。** 机器可读真源是 [`scripts/release-groups.config.mjs`](../../scripts/release-groups.config.mjs)；新增、删除或调整 release group 时必须同步本文。领域职责以根与就近 `AGENTS.md` 为准。

---

retikz 将包的代码归属和发布节奏分开管理。

## 领域目录

文件目录按领域组织：

| 领域      | 目录                 | 职责                                                         |
| --------- | -------------------- | ------------------------------------------------------------ |
| kernel    | `packages/kernel/*`  | 运行时、核心绘图、渲染、adapter 和可选 Kernel 集成（如 TeX） |
| library   | `packages/library/*` | 相对 Core 可选、供作者与官方 Tier 2 包跨领域复用的绘图能力库 |
| schematic | `packages/diagram/*` | 通用关系图、显式几何与自动图示布局能力                       |
| viz       | `packages/viz/*`     | 可视化底座和 plot 等上层功能包                               |

领域目录只表达代码归属和依赖方向，不表示同目录下所有包必须共享版本。

跨领域复用的官方绘图能力库只归 `packages/library/*`，不再以“可选 kernel 扩展”的名义进入 `packages/kernel/*`。它相对 Core 保持可选，但 Plot、Table 等官方 Tier 2 包可以使用兼容版本单向依赖所需 Standard capability。

Schematic 领域的 Graph package family 当前位于 `packages/diagram/*`，作为可独立绘制的通用关系与图式语义基础层；未来 `@retikz/diagram` 在 Graph 之上拥有自动布局、routing 与几何结果。它们可以消费 Core、Math 与 Standard 的公开能力，但 Standard 不反向依赖 Schematic 语义。本轮只更新领域与包职责文档，物理目录和 package metadata 的迁移另行执行。

## 发布组

`scripts/release-groups.config.mjs` 是机器可读的发布组真源。

| 发布组   | 包                                                                                                                                                              | 版本策略                    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| standard | `@retikz/standard`, `@retikz/standard-react`, `@retikz/standard-vanilla`                                                                                        | Standard 组 lockstep        |
| graph    | `@retikz/graph`, `@retikz/graph-react`, `@retikz/graph-vanilla`                                                                                                 | Schematic Graph 组 lockstep |
| kernel   | `@retikz/foundation`, `@retikz/math`, `@retikz/runtime`, `@retikz/core`, `@retikz/inspect`, `@retikz/render`, `@retikz/react`, `@retikz/vanilla`, `@retikz/tex` | kernel 组 lockstep          |
| data     | `@retikz/data`                                                                                                                                                  | 独立底座包                  |
| plot     | `@retikz/plot`, `@retikz/plot-react`, `@retikz/plot-vanilla`                                                                                                    | Plot 组 lockstep            |
| chart    | `@retikz/chart`, `@retikz/chart-react`, `@retikz/chart-vanilla`                                                                                                 | Chart 组 lockstep           |
| table    | `@retikz/table`, `@retikz/table-react`, `@retikz/table-vanilla`                                                                                                 | Table 组 lockstep           |

未来 Geo 等功能家族即使放在 `packages/viz/*` 下，也只有在具体能力 ADR 确认 package manifest 后才进入 release group 真源；领域目录不能替未存在的包预留发布配置。

## 依赖策略

每个可发布包都在 `package.json` 中声明自身元信息：

```json
"retikz": {
  "domain": "viz",
  "releaseGroup": "plot",
  "layer": "feature",
  "publishable": true
}
```

内部依赖范围表达版本耦合强弱：

| 关系       | 范围          | 含义                           |
| ---------- | ------------- | ------------------------------ |
| 同发布组   | `workspace:*` | 包一起发布，并解析到同一组版本 |
| 不同发布组 | `workspace:^` | 消费方接受依赖组的兼容版本     |

`@retikz/foundation` 是 Kernel 拓扑中仅依赖 Zod 的原子契约与基础 schema 底座；消费其公开能力的包必须从根入口直接导入并声明直接依赖。Foundation 不依赖其它 Retikz 包，`@retikz/math` 当前没有真实 Foundation import，因此不声明空依赖。

领域功能发布组不能相互依赖；Plot、Table 等官方 Tier 2 组可以单向依赖作为通用绘图服务层的 `standard` 组，Schematic Graph foundation 也可以消费 Standard 的公开 composition capability，Standard 不得反向依赖任何领域功能组。通用数据、机制或几何能力仍应下沉到 `@retikz/data`、`@retikz/core` 或 `@retikz/math`，跨领域复用的可选绘图 composite 进入 `@retikz/standard`。

运行拓扑检查：

```bash
pnpm run check:release-groups
```
