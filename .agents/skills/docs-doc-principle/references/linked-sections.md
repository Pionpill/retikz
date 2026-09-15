# LinkedSections

## 适用场景

- 关联文档、延伸阅读、章节索引和下一步导航使用 `LinkedSections`；多个主题分组各自保留标题和组件
- 正文中的单个说明链接继续使用 Markdown；无链接的特点展示仍可使用 `LinkedCard`，不为统一导航而替换展示卡片

## MDX 写法

组件已全局注册，无需 import。`items` 按阅读顺序提供 `title`、`description`、`url` 三个字符串；组件负责卡片和响应式网格，不手写外层 grid 或逐张 `LinkedCard`

```mdx
## 延伸阅读

<LinkedSections
  items={[
    {
      title: '定位',
      description: '了解节点引用、相对位置与偏移',
      url: '/kernel/components/basic/position',
    },
  ]}
/>
```

- 延伸阅读一般不重复底部已有的上一页、下一页或父级入口；没有其他相关主题时省略整节
- 可链接其他模块或解决方案的相关能力，按读者任务选择并说明关系，不受当前侧栏范围限制；链接必须指向真实可用的权威页
- 标题准确对应目标文档，描述说明阅读目的；`url` 使用真实路由，可带有效锚点
- 单项导航同样使用 `LinkedSections`；固定标题按页型词典：直接子页用“章节内容 / Contents”，相关主题用“延伸阅读 / Further reading”
- zh/en 成对维护，分别保留正确的标题、描述与锚点
- 旧卡片迁移保留文案、链接、顺序和分组；原本没有描述时使用空字符串，不为迁移新增说明。JSX 文本中的 HTML 实体转为字符串中的实际字符

## 验证

对比迁移前后的标题、描述、URL、顺序和分组；运行文档静态检查，并在浏览器检查单项、多项、窄屏及中英文布局。检查本次范围内不再残留手写导航网格，勿删除非导航卡片

源码契约以 `apps/docs/src/modules/docs/components/mdx-content/linked-sections/LinkedSections.tsx` 为准；`LinkedCard` 仍是其内部展示组件
