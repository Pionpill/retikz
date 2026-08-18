# ADR-02: Node layout measurement surface

- 状态：Accepted
- 决策日期：2026-07-07
- 关联：[compile structure ADR](./01-compile-structure-convention.md)

## 背景

普通文本和 TeX 混排都在 compile 阶段参与 Node 内容布局、shape circumscribe、label 布局和 Scene emit，但内部 `NodeLayout` 含有 provider、registry 等实现对象，不能作为稳定观测面。混排 Node 也无法仅从多个 Scene primitive 可靠反推出整体内容尺寸

## 决策

`compileToScene` 增加同步 `onNodeLayout` observer，使用独立纯数据 DTO：

```ts
type CompiledNodeLayout = {
  kind: 'node';
  id?: string;
  irPath: string;
  content: {
    center: [number, number];
    size: { width: number; height: number };
    bounds: { x: number; y: number; width: number; height: number };
  };
  rect: { x: number; y: number; width: number; height: number; rotate: number };
  text: { hasInlineTex: boolean; lineCount: number };
};

type CompileLayoutObserver = (layout: CompiledNodeLayout) => void;
type CompileHostOptions = { onNodeLayout?: CompileLayoutObserver };
```

`content.size` 是用于 shape circumscribe 的正文内容块尺寸，包含 Node 自身 scale，不含 padding、margin、label、shadow 或 ancestor transform。`content.center` 与 `content.bounds` 应用当前 Scope transform；旋转或非均匀缩放时，全局轴对齐尺寸使用 bounds。`rect` 是 Node 视觉外框的 compile 布局结果，observer 保持 compile double precision，最终 Scene precision 不影响它

只回调真实 IR Node；coordinate 与 Scope synthetic layout 不回调。回调同步执行，抛错向外传播。TeX 结果遵循既有 lowering 语义：缺少 lowerer、无效 run 和普通文本 sugar 的 warning / fallback 不被吞掉。React 不在 render 阶段直接执行用户回调，而是在 commit 后批量通知；Vanilla 直接继承同步 observer

## 行为、失败语义与兼容性

不修改 Scene、IR、renderer primitive 或 TeX 错误语义；不暴露内部 NodeLayout、provider definition、shape params、margin 或 registry。DTO 只表达 compile 结果，不保证跨 IR 改写或版本稳定的 locator

## 最终结果与遗留边界

Node layout measurement 已成为 renderer-agnostic 的 compile host observation，并为 plain、mixed 和 TeX 内容提供同一稳定表面。Path label、Node label、Scope bbox 等独立观测不在本契约内
