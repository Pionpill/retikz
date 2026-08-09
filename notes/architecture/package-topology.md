# 包拓扑

> **状态：当前包与发布组拓扑真源的可读说明。** 机器可读真源是 [`scripts/release-groups.config.mjs`](../../scripts/release-groups.config.mjs)；新增、删除或调整 release group 时必须同步本文。领域职责以根与就近 `AGENTS.md` 为准。

---

retikz 将包的代码归属和发布节奏分开管理。

## 领域目录

文件目录按领域组织：

| 领域    | 目录                 | 职责                                                         |
| ------- | -------------------- | ------------------------------------------------------------ |
| kernel  | `packages/kernel/*`  | 运行时、核心绘图、渲染、adapter 和可选 Kernel 集成（如 TeX） |
| library | `packages/library/*` | 相对 Core 可选、供作者与官方 Tier 2 包跨领域复用的绘图能力库 |
| viz     | `packages/viz/*`     | 可视化底座和 plot 等上层功能包                               |

领域目录只表达代码归属和依赖方向，不表示同目录下所有包必须共享版本。

跨领域复用的官方绘图能力库只归 `packages/library/*`，不再以“可选 kernel 扩展”的名义进入 `packages/kernel/*`。它相对 Core 保持可选，但 Plot、Table 等官方 Tier 2 包可以使用兼容版本单向依赖所需 Standard capability。

## 发布组

`scripts/release-groups.config.mjs` 是机器可读的发布组真源。

| 发布组   | 包                                                                                                                                                              | 版本策略             |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| standard | `@retikz/standard`, `@retikz/standard-react`, `@retikz/standard-vanilla`                                                                                        | Standard 组 lockstep |
| kernel   | `@retikz/foundation`, `@retikz/math`, `@retikz/runtime`, `@retikz/core`, `@retikz/inspect`, `@retikz/render`, `@retikz/react`, `@retikz/vanilla`, `@retikz/tex` | kernel 组 lockstep   |
| data     | `@retikz/data`                                                                                                                                                  | 独立底座包           |
| plot     | `@retikz/plot`, `@retikz/plot-react`, `@retikz/plot-vanilla`                                                                                                    | Plot 组 lockstep     |
| table    | `@retikz/table`, `@retikz/table-react`, `@retikz/table-vanilla`                                                                                                 | Table 组 lockstep    |

未来 chart、geo 等功能家族即使放在 `packages/viz/*` 下，也只有在具体能力 ADR 确认 package manifest 后才进入 release group 真源；领域目录不能替未存在的包预留发布配置。

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

`@retikz/foundation` 是 Kernel 拓扑的零依赖原子契约底座；消费其公开能力的包必须从根入口直接导入并声明直接依赖。`@retikz/math` 当前没有真实 Foundation import，因此不声明空依赖。

领域功能发布组不能相互依赖；Plot、Table 等官方 Tier 2 组可以单向依赖作为通用绘图服务层的 `standard` 组，Standard 不得反向依赖领域功能组。通用数据、机制或几何能力仍应下沉到 `@retikz/data`、`@retikz/core` 或 `@retikz/math`，跨领域复用的可选绘图 composite 进入 `@retikz/standard`。

运行拓扑检查：

```bash
pnpm run check:release-groups
```
