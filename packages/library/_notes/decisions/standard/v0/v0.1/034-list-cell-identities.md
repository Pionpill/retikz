---
description: List 直属格子可按显式名称、字符串内容或容器下标寻址，显式与下标名称共享同一单元格几何及空间记录
keywords: List、cellIdMode、data、items、getListCellId、下标、单元格、别名、identity
---

# ADR-034：List 直属单元格身份

- 状态：Accepted
- 决策日期：2026-09-23
- 关联：[roadmap](./roadmap.md) · [ADR-030](./030-list-map-presentation.md) · [ADR-033](./033-list-index.md) · [Core ADR-046](../../../../../../kernel/_notes/decisions/v0/v0.5/046-reference-and-spatial-handle-aliases.md)

## 背景与目标

List 的 `data` 主要接收外部 JSON 数组，不把值解释成单元格配置，因此不能从内容推导显式 id。作者仍需要按数组位置连接或检查直属单元格。`items` 则可能给单格显式 id；按下标寻址不应迫使作者放弃该名称，也不应为同一格重复创建图元或空间记录。

本决策只为当前 List 的直属格子定义身份。嵌套数组或对象作为当前格子的内容继续递归呈现，其后代不继承当前 List 的下标身份。

## 决策：一个身份模式，多个名称共享单格结果

List 用 `cellIdMode` 选择身份来源：`explicit` 为默认，只使用单格显式 id；`string` 使 `items` 中的字符串也成为该格 id；`index` 为所有直属格子按 List 主 id 与零基下标生成名称。三种模式互斥，不建立多个布尔开关或兼容别名。

`index` 模式允许 `items` 对象或 React `ListItem` 同时显式指定 id。生成名称与显式名称都指向该格同一个命名目标；inspection 中 `cell:<生成名称>` 为主 id，`cell:<显式名称>` 为别名 id，二者查询返回同一条 qualified handle。两种名称相等时只保留一次，不生成第二个单元格、引用几何、空间记录或 Scene 图元。Core 的命名目标与 handle 别名契约由 Core ADR-046 提供，Standard 只决定当前格子的名称集合。

理由：

1. 下标身份让不含 id 的外部 `data` 可以直接用于位置引用，同时不把数据字段误认为配置
2. 显式名称标识作者选择的格子，下标名称标识当前排列位置，两者可以共存但稳定性不同
3. 单一模式字段清楚排除字符串内容身份与下标身份同时生效的歧义

## 基础公开契约

```ts
type ListCellIdModeValue = 'explicit' | 'string' | 'index';

type IRList = {
  id?: string;
  cellIdMode?: ListCellIdModeValue; // 默认 explicit
  items?: Array<string | IRCell>;
  data?: ReadonlyArray<JsonValue>;
  // 其余 List 字段不变
};

getListCellId(listId: string, index: number): string;
```

`getListCellId` 由 Standard 的 container 公共入口提供，是无状态的纯函数；`listId` 必须是合法非空白 id，`index` 必须是从零开始的非负整数，非法参数以 Standard 错误失败。结果固定为 `<list-id>-<index>`，例如 `getListCellId('items', 1) === 'items-1'`。函数只格式化名称，不检查该位置是否存在；不存在的目标仍按 Core 引用缺失规则诊断。显示用 `index.start` 与下标身份无关。

## 行为、失败语义与兼容性

- `explicit`：默认模式；`items` 对象及 React marker 的显式 id 保留，字符串、`data` 值与无 id 对象不获得身份
- `string`：只适用于 `items`；字符串原文同时成为内容与 id，必须非空白且在当前 List 内唯一；对象项仍可显式指定 id。`data` 与此模式组合在 Source 边界失败，不静默忽略
- `index`：要求 List 有主 `id`；`items` 与 `data` 的每个直属格都得到零基生成名称，和内容、显示索引、排布方向无关。显式单格 id 成为同一格的别名；嵌套结构后代不自动获得名称
- 碰撞：同格显式 id 等于生成名称时去重；不同直属格的任何主名称或别名相同，在 List Source 边界报告冲突位置。与 List 外部实体在同一命名 frame 的碰撞沿 Core 既有诊断与遮蔽规则
- 引用：两个 id 均指向该格 allocation 矩形，不含 gap、索引条或视觉溢出；`localNamespace`、外层变换与延迟引用沿现有 Scope 语义。内容自身的 id 仍指向内容几何
- 空间结果：有身份的每个直属格只有一条 `list-cell` handle；`index` 模式的主 id 由生成名称确定，显式名称是该条记录的查询别名。空 List 不生成单格身份或 handle
- 兼容性：移除尚未发布的 `shouldUseStringAsId`，由 `cellIdMode: 'string'` 表达同一显式选择；不提供旧字段兼容层。Map 身份、List 索引显示与 `data` 的 JSON 展示规则不变
- React / Vanilla：props、factory、Vanilla Input 与直接 IR 表达同一模式；adapter 不生成 id，Standard resolve 决定名称，Core 统一登记和查询
