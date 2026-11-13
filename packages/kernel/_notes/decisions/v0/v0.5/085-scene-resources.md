---
description: Scene 及编译资源载体统一按 Paint 与 Clip 分类，保持资源身份、引用闭包与同 revision 提交语义
keywords: SceneResources、PaintResource、ClipResource、资源分类、Scene、Weave
---

# ADR-085：场景资源按绘制与裁剪分类

- 状态：Accepted
- 决策日期：2026-11-13
- 关联：[roadmap](./roadmap.md) · [绘图完备](../../../architecture/core-drawing-complete.md) · [编译输出](./077-compile-output-contract.md) · [统一编译执行](./080-unified-reconciler-compilation.md) · [资源内容契约](./070-marker-scene-primitives.md)
- 替代关系：替代 [Paint 基础](../v0.2/019-paint-basics.md) 与 [Clip 资源](../v0.2/028-clip.md) 中关于 Scene 使用混合资源数组的规定；绘制值、裁剪引用与后端中立语义继续保留

## 背景与目标

绘制资源与裁剪资源有独立的输入、生成及登记能力，却在编译结果、跨次复用及 Scene 中合并为混合资源数组，恢复时再按种类分发。该载体掩盖已有领域边界，并让分类信息反复通过遍历恢复。

目标是使资源实例从生成到结果消费保持同一语义分类，去除不必要的混合载体，不改变绘制含义、作者输入、资源身份或事务边界。

## 决策：统一资源容器，绘制与裁剪独立分类

Core 定义分类资源容器。编译片段、复用贡献、候选结果、最终 Scene 及 Render 资源更新沿用相同分类，不同时保存分类容器和混合数组两份资源真源。

Paint 包括渐变、Pattern 与图片，继续共用填充和描边的绘制值契约；Clip 描述分组裁剪，作为独立类别。Pattern 不提升为与 Paint 并列的资源分类。未来新增类别须有独立的资源语义和实际消费需求，不预设占位类别。

Core 继续拥有资源契约、生成及身份规则；Reconciler 负责工作区、缓存、候选选择和输出事务；Render 负责后端物化与运行时执行。各消费方可以按需派生分类查询索引或统一遍历能力，但不得将派生投影重复写入公共资源模型。

## 基础数据结构与公开契约

```ts
type SceneResources = Readonly<{
  paints: ReadonlyArray<PaintResource>;
  clips: ReadonlyArray<ClipResource>;
}>;

type Scene = {
  // 其余既有字段保持不变
  resources?: SceneResources;
};
```

资源容器出现时，paints 与 clips 两个集合均存在；无该类资源时使用空集合。没有资源的 Scene 可以省略整个 resources。运行时快照始终具有完整的分类资源容器，以两个空集合表示无资源；完整资源替换以相同空容器清除资源。

资源集合以单一只读契约交付，不按可变性另立类型。构建端可以持有并传入普通数组；只读标注不代表运行时自动冻结资源，也不改变既有对象所有权与隔离规则。

独立资源继续保留既有 kind、id 与内容字段。SceneResource 仍可表示单个 PaintResource 或 ClipResource，不再作为持久化混合数组的依据。填充和描边的资源引用只查询 paints，分组的 clipRef 只查询 clips。

作者声明保持不变：渐变、Pattern 和图片仍在填充或描边中表达，裁剪仍在 Scope.clip 中表达；不在作者 IR 中新增独立资源声明表，也不因容器分类提前执行依赖上下文的资源解析或登记。

## 行为、失败语义与兼容性

- 相同资源内容保持原有确定性 ID 与去重语义；缓存导入保留原 ID，不重新执行定义回调。资源 ID 在同一 Scene 的全部类别间唯一，同一 ID 的冲突内容不得静默覆盖
- 各分类内保持确定的登记顺序；不同资源类别之间没有绘制先后语义，图元绘制顺序仍由 primitives 决定
- 复用、试算、回放和失败重试必须同时保留图元及其真实资源依赖。未选择或失败的候选不能泄漏资源，资源变化与引用它的图元必须在同一 revision 原子生效
- 外部 Scene 的资源引用必须存在、种类匹配、ID 唯一且依赖可终止；有限嵌套资源及宿主隔离的动画、命中与裁剪语义保持不变。provider 的资源来源约束继续遵循既有契约，分类不授予声明或手写引用资源的额外权限
- 缺失引用、错误分类、重复 ID、冲突内容及引用循环沿用所属能力的错误边界，不静默忽略、跨类别补查或返回部分成功结果。已类型化内部产物不因换容器而重新执行结构校验
- 这是公开 Scene、编译片段和运行时资源更新结构的 breaking 变更；旧混合数组直接移除，不提供兼容转换、别名或新旧双轨。它不改变持久化作者 IR 的结构或版本
- React 与 Vanilla 继续表达相同作者输入，消费同一分类编译结果与 Render 契约；不增加框架专属资源语义
