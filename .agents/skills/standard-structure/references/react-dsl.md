# React DSL 组织

- React 包的目录归属见 [React 包指南](../../../../packages/kernel/react/AGENTS.md#目录职责)。
- 同一 Kernel 图元的声明、Props 和局部转换逻辑放在同一组件文件，由 Kernel 目录的 `index.ts` 汇总；图元 adapter 不负责场景遍历、事件注册或渲染。
- 容器负责场景树遍历与分派，将必要的父级信息显式传给图元 adapter。Sugar 返回基础 JSX，不为没有转换职责的组件创建 adapter。
