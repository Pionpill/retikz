---
description: 用 Mark 身份与实例 key 引用生成图元，扩展 Path 的 from/to 端点并复用 Core 目标几何与依赖解析
keywords: Mark、Path、from、to、key、anchorId、目标引用、连接端点
---

# ADR-026：Mark 目标引用与 Path 端点统一

- 状态：Accepted
- 决策日期：2026-10-25
- 关联：[版本规划](./roadmap.md)、[可视化能力边界](../../../../architecture/plot-visualization-complete.md)、[包职责](../../../../../../../notes/architecture/package-responsibility-design.md)
- 修订关系：扩展 [021](./021-unified-mark-position-inputs.md) 的显式端点输入；扩展 [069](../v0.1/069-relation-mark-anchor.md) 的锚点消费方式，不替代其 RelationMark 路由及其它能力；延续 [023](./023-closed-mark-vocabulary.md) 的封闭 Mark 集合

## 背景与目标

连接可以从数据坐标出发，也可以依赖已经生成的节点或区域。数据关系只能确定关联身份；目标图元才提供最终位置、锚点与边界。同一数据可以被多个 Mark 绘制，仅凭数据 key 无法确定连接对象。

现有锚点规则可以生成 Core id，但引用方需要重复目标的命名空间和生成规则。Path 已有逐实例 from/to 输入，应让这套端点表达同时承接坐标与图元引用，避免为连接目标另建一套路径构造入口。

## 决策：端点选择坐标或 Mark 实例引用

Path 的 encodings.from 与 encodings.to 各自接受两个互斥分支：现有坐标输入，或由 mark 与 key 组成的图元引用。两端可独立选择，因此允许图元到图元、坐标到图元及坐标到坐标。

mark 指向当前 Plot 作用域内一个显式命名的 Mark 声明，key 指向该 Mark 生成的一个可寻址目标。mark 不是数据集名，也不是最终 Core id。引用方不提供目标的 prefix、template 或 generator。

Plot 拥有业务身份、数据字段及目标生成实体之间的映射；Core 继续拥有 NodeTarget、锚点、边界、偏移和几何依赖解析。下沉后的 Core 输入不包含 Mark 名称或数据字段查询，Plot 不复制 Core 的目标几何系统。

## 基础数据结构与公开契约

### 端点

以下为公开结构示意，实际类型由 Plot schema 派生；引用几何字段复用 Core 的权威类型。

```ts
type MarkKeyInput = { field: string } | { value: string | number };

type MarkTarget = {
  mark: string;
  key: MarkKeyInput;
  anchor?: IRAnchorRef;
  offset?: IRNodeTarget['offset'];
  boundary?: IRNodeTarget['boundary'];
};

type PathEndpoint = IRPlotPositionEncoding | MarkTarget;
```

坐标分支保持 x、y、z 的角色约束，各角色使用 field、value 或 edge；不因新增引用而允许缺少必要坐标。引用分支必须同时提供 mark 与 key，不接受坐标角色。对象封闭，不猜测裸字符串是字段名还是常量。

key.field 从当前连线 Mark 的最终数据行读取，key.value 是固定身份。两者均不经过比例尺映射，不允许 edge。mark 是固定声明 ID，不开放逐行选择 Mark。

整个端点是一个位置目标，统一放在 encodings.from/to，包括可选 anchor、offset、boundary；不在 properties.from/to 建立平行表示。这里的固定几何选择属于位置契约，不扩展到颜色、尺寸等非位置属性。anchor 与 boundary 不支持字段编码；offset 使用 Core 世界坐标单位，不经过 Plot 比例尺。

boundary 直接复用 Core 边界契约，例如 'shape'，不增加 Relation 现有的 boolean 简写。省略 anchor、boundary 时保留 Core 路径端点的自动连接语义，不在 Plot 层替换为固定中心。

```ts
// 被引用的 Point：每行 id 是目标实例的身份来源
{
  type: 'point',
  id: 'nodes',
  encodings: {
    anchorId: 'id',
    position: { x: { field: 'x' }, y: { field: 'y' } },
  },
}

// 当前连线行中的 sourceId / targetId 指向 nodes 的实例
{
  type: 'path',
  encodings: {
    from: { mark: 'nodes', key: { field: 'sourceId' }, boundary: 'shape' },
    to: { mark: 'nodes', key: { field: 'targetId' }, anchor: 'left' },
  },
}

// 坐标与固定图元引用可以混合
{
  type: 'path',
  encodings: {
    from: { x: { value: 0 }, y: { edge: 'start' } },
    to: { mark: 'nodes', key: { value: 'alice' } },
  },
}
```

React 与 Vanilla 均在 encodings.from/to 表达相同端点结构，并归一到上述 Source IR，不增加顶层 from/to 简写。JSON、React、Vanilla、standalone 与 embedded 使用相同解析和诊断，不增加框架专属查询语法。

### 目标身份

目标 Mark 必须显式设置 id，并通过既有 anchorId 契约暴露实例身份，不另增一份需要同步的业务 key 字段：

- encodings.anchorId：key 为目标最终结果行中该字段的值
- properties.anchorId.template：key 为目标侧模板求值结果，在追加 Plot 命名空间之前取得
- properties.anchorId.generator：key 为目标侧生成器返回值，在追加 Plot 命名空间之前取得

三类身份来源继续互斥。引用方提供的是上述来源的结果，不是生成规则；模板和生成器只在目标侧求值。常量单实例可用固定模板暴露身份，不伪造数据行。

key 限定为非空白字符串或有限数值。数值按字符串身份比较，因此 1 与 '1' 是同一身份；不对字符串 trim、slug 或重新解释其内容。目标身份在同一 Mark、同一实际 Plot 视图实例内唯一，不同 Mark 可使用相同 key。底层 Core id 仍复用目标既有生成规则；不同身份映射到相同 Core id 时明确失败，不静默覆盖。

字段身份在排序或无关记录插入后保持关联；模板或生成器只有在输出本身稳定时才具有同样保证。依赖行号的规则不承诺重排稳定性。业务身份映射属于当前编译的派生结果，不写回 Source IR，也不复制到长期公共状态中。

引用作用域限定为当前 Plot 视图实例。分面内只查找当前分面的目标，不跨分面、嵌套 Plot 或外部 Core 场景搜索；找不到时不扩大搜索范围。

### 目标粒度

| 被引用对象  | key 对应的实体                | 可用几何                               |
| ----------- | ----------------------------- | -------------------------------------- |
| Point       | 生成的单个节点                | Core 节点锚点、边界与偏移              |
| Interval    | 生成的单个区域节点            | 该区域形状公开的 Core 锚点、边界与偏移 |
| 顶点型 Path | 有效数据顶点生成的 Coordinate | 顶点位置与偏移；不具备形状边界         |

Path 的 key 不表示 series，也不表示整条路径。显式 from/to Path 生成的整条路径，即使具有 id，也不能作为此 NodeTarget 契约的目标。Relation 同样不是本契约的可引用目标。沿线比例、切向、路径包围盒与曲线本体引用需要独立几何契约，不能用隐式取中点替代。

Coordinate 目标不接受 anchor 或 boundary；offset 可用。Interval 形状不提供的命名锚点遵循 Core 诊断，不由 Plot 合成矩形锚点。

### 实例、域与连接空间

key.field 是有效字段依赖，与位置、外观等现有字段共同决定实例来源。字段从连线自己的最终结果表读取，目标 key 从目标自己的最终结果表取得；不读取变换前数据，也不执行隐式 join。所有输入均为常量且无其它字段依赖时，完整端点生成一个实例；字段消费得到空结果时生成零实例。

引用 key 不贡献位置 domain，不按 sourceId 或 targetId 推导尺度，也不把目标位置重复纳入连线的 domain。坐标分支仍按现有 contributeToDomain 规则处理，edge 不贡献 domain。

两端都是坐标时，connection 保留既有默认 coordinate 与显式 straight。任一端为图元引用时，省略 connection 的默认是 straight；显式 coordinate 明确报错，因为节点锚点与边界不提供可逆的坐标角色参数。不能从目标的屏幕位置反推极坐标参数，或忽略 anchor/boundary 后改用目标原始数据坐标。

## 行为、失败语义与兼容性

- 被引用的 Mark 必须在当前连线 Mark 之前声明。引用自身或后置 Mark 时，Plot 在下沉阶段明确报错，不等待 Core 跳过路径。Plot 保留声明顺序，不排序依赖、不预生成占位几何；目标几何仍由 Core 按既有 Scope 求值规则处理
- 绘制层级继续由现有层级与 zIndex 控制。依赖目标几何不意味着连线必须绘制在节点上方
- 目标必须实际生成可寻址实体；因过滤、无效位置或空结果而未生成的目标不可引用，不回退为原点、不跳过连线、不回查原始数据
- 缺失或重复 Mark ID、缺失 key 字段、非法 key、重复目标身份、Core id 冲突、目标未暴露身份、未知 Mark、未知 key、不支持的目标粒度及连接空间均明确失败。Plot 诊断携带连线 Mark、端点、目标 Mark、key 及可用的行上下文；底层几何失败保留 Core 原因
- 不改变顶点型 Path 的 series/order、缺值分段和现有曲线规则；显式端点与多行顶点输入仍互斥
- 现有坐标端点保持行为；本决策新增图元引用分支。RelationMark 及其目标契约尚未被此决策替代，路由、ribbon、端点图形等迁移完成前不删除 RelationMark，也不把旧 source/target 转换成新 from/to 的兼容层
- 实施交付须同步中英文位置说明、目标身份说明、Schema 参考和 React / Vanilla / JSON 示例，清楚区分坐标输入与图元引用，以及 Path 顶点和整条路径
