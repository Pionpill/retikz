# 包拓扑

retikz 将包的代码归属和发布节奏分开管理。

## 领域目录

文件目录按领域组织：

| 领域   | 目录                | 职责                                       |
| ------ | ------------------- | ------------------------------------------ |
| kernel | `packages/kernel/*` | 核心绘图、渲染、adapter 和可选 kernel 扩展 |
| viz    | `packages/viz/*`    | 可视化底座和 plot 等上层功能包             |

领域目录只表达代码归属和依赖方向，不表示同目录下所有包必须共享版本。

## 发布组

`scripts/release-groups.config.mjs` 是机器可读的发布组真源。

| 发布组 | 包                                                                                                  | 版本策略        |
| ------ | --------------------------------------------------------------------------------------------------- | --------------- |
| kernel | `@retikz/math`, `@retikz/core`, `@retikz/render`, `@retikz/react`, `@retikz/vanilla`, `@retikz/tex` | 组内 lockstep   |
| data   | `@retikz/data`                                                                                      | 独立底座包      |
| plot   | `@retikz/plot`, `@retikz/plot-react`, `@retikz/plot-vanilla`                                        | plot 组内同步发 |

未来 table 等功能家族即使放在 `packages/viz/*` 下，也应该拥有独立发布组。

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

功能发布组不能依赖其他功能发布组。共享能力应下沉到 `@retikz/data`、`@retikz/core` 或 `@retikz/math` 这类底座包。

运行拓扑检查：

```bash
pnpm run check:release-groups
```
