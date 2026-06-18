# @retikz/plot 工作指南

`@retikz/plot` 是 plot 分组的核心包：定义 Plot IR，处理 data / transform / scale / coordinate / mark / guide，并通过 composite lowering 接入 `@retikz/core`。

## 模块依赖方向

新增代码按图形语法的单向顺序依赖：

```text
ir
  -> data
  -> transform
  -> scale
  -> coordinate
  -> mark / guide
  -> pipeline
  -> interaction
```

- `ir` 是 schema / 类型真源，所有模块都可以依赖 `ir`。
- 下游模块可以依赖上游模块；上游模块不要反向读取下游模块实现。
- `pipeline` 是编排层，可以调用各模块提供的公开函数；具体规则应放回拥有该概念的模块。
- 跨模块引用走目录 barrel，例如 `../data`、`../mark`、`../scale`；同目录内部才使用具体文件路径。
- 新增共享逻辑先放到最小合理归属模块；若多个语法层都需要，优先抽到更底层模块或 `@retikz/math` / `@retikz/core`。

## 公共能力复用

- 几何坐标类型使用 `@retikz/math` 的 `Position`。
- core IR / Scene 类型从 `@retikz/core` 获取，不在 plot 内复制。
- 有限 / 无穷数值判断从 `@retikz/math` 的 `isFiniteNumber` / `isInfiniteNumber` 获取；字段解析、label 格式化、scale 解析等使用所属模块已有 helper。
- 函数保持纯计算和 plain data；不要把 d3 scale 函数、class 实例、ReactNode 等放入 IR。

## 公开 API

- `src/index.ts` 是包公开入口；新增公开能力必须明确评估文档同步。
- 子目录 `index.ts` 是模块边界；模块外 import 优先经过该 barrel。
- 破坏性命名 / schema 改动在 0.x 阶段允许，但必须保持代码、测试、docs 一致。

## 测试

- schema / 数据契约改动：补 `tests/ir` 或 data/model 相关测试。
- lowering 行为改动：补 `tests/lower`，优先覆盖 IR 输出形状和边界输入。
- 坐标 / cell 几何改动：补 coordinate / cell 相关测试，避免只靠视觉 demo。
