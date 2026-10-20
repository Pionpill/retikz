---
description: 定义 WeaveBatch 的有序增删改输入、目标定位、候选结构应用与整批计算提交边界
keywords: WeaveBatch、WeaveOperation、增删改、候选状态、批处理、定位、变化标记、依赖就绪
---

# ADR-059：Weave 批次操作与更新计算

- 状态：Accepted
- 决策日期：2026-10-20
- 关联：[版本目标](./roadmap.md)、[058](./058-weave-foundation.md)

## 背景与目标

输入替换只能描述已有元素的修改，无法明确表达插入和删除。Reconciler 需要接收一批明确的输入操作，维护候选声明结构，统一计算受影响内容，并在完成后提交；不通过整棵输入树的深比较猜测操作。

本决策确定批次输入、节点待处理记录与处理边界。具体调度、传播与优化算法继续讨论；Accepted 不表示执行机制已经实现。

## 批次与操作

外层命名为 WeaveBatch，单条命名为 WeaveOperation；Update 仅表示修改已有元素。批次承载操作数据，不等同于 Runtime 的事务执行对象。查询是独立读取能力，不进入计算批次。

```ts
type WeaveBatch = {
  operations: Array<WeaveOperation>;
};

type WeaveOperation = WeaveInsertOperation | WeaveUpdateOperation | WeaveRemoveOperation;
```

插入与修改复用 Core 的基础元素输入，区别仅在 Scope 是否携带声明子树：

```ts
type WeaveOwnInput = IRNode | IRCoordinate | IRPathBase | Omit<IRScope, 'children'>;

type WeaveElementInput =
  IRNode | IRCoordinate | IRPathBase | (Omit<IRScope, 'children'> & { children: Array<WeaveElementInput> });

type WeaveTarget =
  | { kind: 'scope'; scopeId: string }
  | { kind: 'id'; scopeId: string; id: string }
  | { kind: 'child'; scopeId: string; index: number };

type WeaveInsertOperation = {
  kind: 'insert';
  parentId: string;
  index: number;
  elements: Array<WeaveElementInput>;
};

type WeaveUpdateOperation = {
  kind: 'update';
  target: WeaveTarget;
  input: WeaveOwnInput;
};

type WeaveRemoveOperation = {
  kind: 'remove';
  target: WeaveTarget;
};
```

Core 输入自身的 type 判别元素类别，不另存一份类别字段。动态地址对应的实际元素必须与 input.type 一致；scope 目标仅用于 Scope 自身修改。WeaveElementInput 递归排除 Composite，展开职责仍由 Core 拥有。parentId 使用 Scope 或 root 的容器定位 id。

外部操作不携带 style / layout 提示，变化分类由内部依据权威输入确定，不能因调用方漏报而跳过必要计算。

| 操作   | 必要内容                  | 语义                                                                                |
| ------ | ------------------------- | ----------------------------------------------------------------------------------- |
| insert | parentId、index、elements | 在指定 Scope 或 root 的直接 children 中按数组顺序连续插入基础元素；Scope 可携带子树 |
| update | target、元素类别、input   | 替换已有元素的完整自身输入，不改变类别；Scope 自身输入不包含 children               |
| remove | target                    | 移除指定元素；Scope 连同其子树移除                                                  |

insert 的 index 表示插入前的位置，等于 children 长度时追加。elements 统一使用数组，单个元素也通过数组传入；空数组不产生修改，但不豁免目标与索引有效性校验。新增 Scope 的自动 id 遵循第二阶段的 Scope 定位契约。

update 的 input 复用 Core 对应元素的自身输入契约，不包含继承上下文或编译状态。输入中省略原有覆盖字段表示移除该覆盖，之后按 Core 继承和默认规则解析；不采用隐含的 Partial 深合并语义。元素类别与 input 类型必须关联。

## 目标定位

| 目标             | 地址           | 含义                                       |
| ---------------- | -------------- | ------------------------------------------ |
| Scope            | scopeId        | 通过树内唯一的 Scope id 定位自身           |
| 有用户 id 的元素 | scopeId、id    | 在指定 Scope 的命名空间上下文中解析用户 id |
| 无用户 id 的元素 | scopeId、index | 定位 Scope 的直接 children 成员            |

root 提供同等容器定位入口。Scope 运行时定位与子元素的名称可见性是不同职责，不改变 Core 的局部命名空间规则。

位置地址不具有跨结构版本的稳定性。水合事件携带的位置必须关联其来源输出版本，不能将旧画面的 index 直接解释为新结构中的目标；具体版本字段、绑定方式与失效诊断待定位接入契约确定。

## 有序应用与统一计算

操作按数组顺序解释，后续操作看到前序操作形成的候选结构，包括 children 索引和名称绑定变化。不能将整批目标统一按旧 current 预先解析；事件地址的来源版本校验与批次中的顺序寻址分别处理。

输入操作的顺序应用不意味着逐条完整编译。声明变更与自身输入在 candidate 中归集，再依据最终有效输入、继承上下文和计算依赖统一计算。同一目标连续的完整输入替换以最后一份为准，但不得未经等价性证明跨越结构操作或省略必要校验。

外部操作与节点 pendingInputs 不要求同型。外部提供权威输入，内部还需表达上下文失效与依赖通知。

## 变化标记与依赖就绪

变化标记决定需要处理的内容，声明层级与计算依赖决定何时可以处理。来源采用 WeaveChangeSource，取值 own、context、dependency；影响范围采用 WeaveChangeKind，取值 style、layout。两者均为 const object enum 及其派生类型。

- own 表示自身输入改变，context 表示有效继承上下文改变，dependency 表示读取的依赖结果改变
- style 表示视觉呈现受影响，layout 表示定位、尺寸、几何或包络等计算受影响；两者可以同时出现，字体等变化不能仅按样式字段归类为 style
- 无法精确分类时保守标记全部影响范围，不以不完整分类跳过必要计算
- 增删操作仍须维护声明结构、索引和依赖绑定，不能仅替换成 style / layout 通知

节点组合输入沿用 [058](./058-weave-foundation.md) 的形态：

```ts
type WeaveInput<TInput, TContext> = {
  own: TInput;
  scope: TContext;
};

type WeavePendingInput =
  | {
      source: 'own';
      changes: ReadonlySet<WeaveChangeKind>;
    }
  | {
      source: 'context';
      changes: ReadonlySet<WeaveChangeKind>;
    }
  | {
      source: 'dependency';
      producer: WeaveNode;
      changes: ReadonlySet<WeaveChangeKind>;
    };
```

WeaveNode 的 pendingInputs 固定为上述记录数组，移除任意待处理条目的泛型参数。input.own 保存操作应用后的自身输入，input.context 保存解析后的有效上下文，待处理记录不重复保存完整输入。dependency 必须保留 producer 以匹配读取需求，引用遵守候选版本一致性；own 与 context 不重复记录可从节点自身及声明父容器确定的来源对象。上下文直接使用 Core 契约，依赖分类直接使用 WeaveDependencyKind，不由调用方通过泛型扩展语义。

同一节点的多种变化先归集合并，重复影响按集合语义去重，不因收到多次通知而立即重复编译。pendingInputs 保留必要的来源与顺序信息；输入阶段的“可能受影响”与计算后的“结果实际变化”分别表达，结果未变时可停止相应传播。

调度记录待处理范围，不默认每批从 root 扫描整棵树，也不要求给变化 Scope 的全部后代逐个设置等待标记。消费继承上下文的计算必须等待相关上下文确定；父 Scope 上下文先于子 Scope，有效上下文不变时可停止该分支的继承传播，但不能遗漏后代自身的修改。

Scope 上下文就绪不等于整个 Scope 编译完成：包络须等待参与聚合的子元素几何。其它计算遵循实际读取依赖，不采用所有 Scope 优先或 style / layout 固定优先级。待处理不等于已就绪，上游尚未确定是否变化时不能直接将旧缓存视为本批就绪结果。

初始标记不代表最终影响范围，计算后的通知可以继续归集受影响任务。标记存储、祖先关系查询、就绪判断、动态依赖与环检测、具体调度及优化算法后续细化，不承诺所有节点在任意依赖变化下一批只计算一次。

## 提交、失败与兼容性

遵循双根隔离：candidate 的变更不得污染 current，整批计算成功后才提交并发布完整输出。操作或计算失败时不发布部分结果，保留 current；未提交请求的保留、重试和取消规则尚待确定。

目标不存在、类别不匹配、索引越界和名称冲突须明确诊断，不静默改成插入、忽略删除或覆盖其它元素。删除后的引用有效性按最终结构与 Core 引用规则判断，保留前向及延后引用能力。

移动、重排、局部赋值和相对增量操作尚未定义；不将它们隐含在 update 中。Core 有效上下文及单元素读取事实由 [060](./060-core-element-compilation.md) 定义；读取需求分类、候选引用隔离、依赖调度与性能优化仍需补齐，类型定义不表示这些执行机制已实现。

本决策不立即改变 React、Vanilla、Plot 或水合公开 API；后续 adapter 应表达同一批次语义，领域配置到基础元素操作的转换仍归上层负责。
