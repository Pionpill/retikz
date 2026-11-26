import { translateLayoutApiReference } from './layout.en';

/** 布局组件公开说明的受审阅英文翻译 */
const translations: Readonly<Record<string, string>> = {
  归一化时保留的不透明声明数据: 'Opaque authoring data retained during normalization',
  '由 FlexLayout 静态读取的直属布局子项': 'Direct layout item read statically by FlexLayout',
  '由 GridLayout 静态读取的直属布局子项': 'Direct layout item read statically by GridLayout',
  '由 OverlayLayout 静态读取的直属布局子项': 'Direct layout item read statically by OverlayLayout',
  '容器与子项输入，保留传入对象引用': 'Container and item input; the input object reference is retained',
  '归一化时保留的不透明声明数据；省略时不附加声明':
    'Opaque data retained during normalization; omitted input adds no authoring data',
  '由布局适配器消费的 InputEmbed，不在创建时求解布局':
    'An InputEmbed consumed by the layout adapter; creation does not solve the layout',
  '直属布局 child 的作者侧输入': 'Authoring input for a direct layout child',
  '三种 Layout 容器的 InputEmbed adapter catalog': 'InputEmbed adapter catalog for the three layout containers',
  '容器与子项配置；静态默认值由 Schema 解析时应用':
    'Container and item configuration; Schema parsing applies static defaults',
  '带 layout 命名空间与容器类型的 Source IR，不修改 input':
    'Source IR with the layout namespace and container type; input is not mutated',
  '创建单轴尺寸策略时允许的 schema 输入': 'Schema input for an axis sizing policy',
  创建双轴尺寸策略时允许省略默认轴的输入: 'Two-axis sizing input allowing default axes to be omitted',
  物理轴上的项目对齐方式: 'Item alignment along a physical axis',
  单轴容器尺寸策略: 'Container sizing policy for one axis',
  剩余空间分布方式: 'Remaining-space distribution mode',
  布局项目所属的容器种类: 'Container kind owning a layout item',
  容器视觉溢出策略: 'Container visual overflow policy',
  'FlexLayout 主轴方向取值': 'FlexLayout main-axis direction values',
  '创建 FlexLayout 时允许省略固定 discriminator 与 可选字段的输入':
    'FlexLayout input allowing fixed discriminators and optional fields to be omitted',
  '创建 FlexLayout item 时允许省略默认字段的输入': 'FlexLayout item input allowing defaulted fields to be omitted',
  'FlexLayout 换行策略取值': 'FlexLayout wrapping policy values',
  'FlexLayout 主轴剩余空间分布取值': 'FlexLayout main-axis remaining-space distribution values',
  '持久化的 Layout FlexLayout composite': 'Persistent FlexLayout composite input',
  '持久化的 FlexLayout item': 'Persistent FlexLayout item input',
  'FlexLayout 的主轴方向': 'FlexLayout main-axis direction',
  'FlexLayout 的换行策略': 'FlexLayout wrapping policy',
  'GridLayout 自动放置流向取值': 'GridLayout automatic placement direction values',
  'GridLayout fully explicit overlap 策略取值': 'GridLayout fully explicit overlap policy values',
  'Grid 单轴 placement 的作者输入': 'Authoring input for placement along one grid axis',
  'Grid track breadth 的作者输入': 'Authoring input for a grid track breadth',
  'Grid track 的作者输入': 'Authoring input for a grid track',
  'GridLayout 的 resolved track artifact': 'Resolved GridLayout track artifact',
  'GridLayout 轨道产物来源取值': 'GridLayout track artifact source values',
  'GridLayout 单轴最多解析的显式与隐式 track 数':
    'Maximum combined number of explicit and implicit tracks along one grid axis',
  'GridLayout 自动放置的流向': 'GridLayout automatic placement direction',
  'GridLayout 显式区域重叠策略': 'GridLayout explicit-area overlap policy',
  'GridLayout 布局产物中轨道的定义尺寸来源': 'Authored sizing source for a track in GridLayout artifacts',
  'Overlay 结构尺寸参与策略值': 'Overlay intrinsic-size participation policy values',
  'Overlay placement 的作者输入': 'Authoring input for Overlay placement',
  'Overlay placement 判别值': 'Overlay placement discriminator values',
  'Overlay item 是否参与 container intrinsic size': 'Whether an Overlay item contributes to intrinsic container size',
  'Overlay item 的 placement 模式': 'Overlay item placement mode',
  'Layout Flex 布局的 React 声明组件': 'React declaration component for FlexLayout',
  'Flex 布局的 React 属性': 'React props for FlexLayout',
  '必须由 Flex 类型布局项目组成的子元素': 'Direct children must be flex layout items',
  'FlexLayout 直属 item 的 React authoring props': 'React authoring props for a direct FlexLayout item',
  '创建FlexLayout 嵌入项': 'Create a FlexLayout embed',
  'Vanilla FlexLayout authoring 输入': 'Vanilla authoring input for FlexLayout',
  'Vanilla FlexLayout item 输入': 'Vanilla input for a FlexLayout item',
  'Layout Flex 布局的 InputEmbed adapter': 'InputEmbed adapter for FlexLayout',
  '创建保留省略字段与简写的 FlexLayout 持久化输入':
    'Create persistent FlexLayout input preserving omitted fields and shorthand',
  'FlexLayout 的 JSON-safe compile artifact payload': 'JSON-safe compilation artifact payload for FlexLayout',
  'Layout FlexLayout 的官方 Core layout-aware composite definition':
    'Official layout-aware composite definition for FlexLayout',
  'FlexLayout 的 Core Composite dependency provider': 'Composite dependency provider for FlexLayout',
  'FlexLayout factory 接受的作者输入': 'Authoring input accepted by the FlexLayout factory',
  'FlexLayout item 的作者输入': 'Authoring input for a FlexLayout item',
  'FlexLayout 的 canonical JSON IR': 'Persistent JSON input for FlexLayout',
  'FlexLayout item 的 canonical JSON IR': 'Persistent JSON input for a FlexLayout item',
  'Layout Grid 布局的 React 声明组件': 'React declaration component for GridLayout',
  'Grid 布局的 React 属性': 'React props for GridLayout',
  '必须由 Grid 类型布局项目组成的子元素': 'Direct children must be grid layout items',
  'GridLayout 直属 item 的 React authoring props': 'React authoring props for a direct GridLayout item',
  '创建GridLayout 嵌入项': 'Create a GridLayout embed',
  'Vanilla GridLayout authoring 输入': 'Vanilla authoring input for GridLayout',
  'Vanilla GridLayout item 输入': 'Vanilla input for a GridLayout item',
  'Layout Grid 布局的 InputEmbed adapter': 'InputEmbed adapter for GridLayout',
  '创建保留省略字段与简写的 GridLayout 持久化输入':
    'Create persistent GridLayout input preserving omitted fields and shorthand',
  'GridLayout 的 JSON-safe compile artifact payload': 'JSON-safe compilation artifact payload for GridLayout',
  'Layout GridLayout 的官方 Core layout-aware composite definition':
    'Official layout-aware composite definition for GridLayout',
  'GridLayout 的 Core Composite dependency provider': 'Composite dependency provider for GridLayout',
  'GridLayout factory 接受的作者输入': 'Authoring input accepted by the GridLayout factory',
  'GridLayout item 的作者输入': 'Authoring input for a GridLayout item',
  'GridLayout 的 canonical JSON IR': 'Persistent JSON input for GridLayout',
  'GridLayout item 的 canonical JSON IR': 'Persistent JSON input for a GridLayout item',
  'Layout Overlay 布局的 React 声明组件': 'React declaration component for OverlayLayout',
  'Overlay 布局的 React 属性': 'React props for OverlayLayout',
  '必须由 Overlay 类型布局项目组成的子元素': 'Direct children must be overlay layout items',
  'OverlayLayout 直属 item 的 React authoring props': 'React authoring props for a direct OverlayLayout item',
  '创建OverlayLayout 嵌入项': 'Create a OverlayLayout embed',
  'Vanilla OverlayLayout authoring 输入': 'Vanilla authoring input for OverlayLayout',
  'Vanilla OverlayLayout item 输入': 'Vanilla input for a OverlayLayout item',
  'Layout Overlay 布局的 InputEmbed adapter': 'InputEmbed adapter for OverlayLayout',
  '创建保留省略字段与简写的 OverlayLayout 持久化输入':
    'Create persistent OverlayLayout input preserving omitted fields and shorthand',
  'OverlayLayout 的 JSON-safe compile artifact payload': 'JSON-safe compilation artifact payload for OverlayLayout',
  'Layout OverlayLayout 的官方 Core layout-aware composite definition':
    'Official layout-aware composite definition for OverlayLayout',
  'OverlayLayout 的 Core Composite dependency provider': 'Composite dependency provider for OverlayLayout',
  'OverlayLayout factory 接受的作者输入': 'Authoring input accepted by the OverlayLayout factory',
  'OverlayLayout item 的作者输入': 'Authoring input for a OverlayLayout item',
  'OverlayLayout 的 canonical JSON IR': 'Persistent JSON input for OverlayLayout',
  'OverlayLayout item 的 canonical JSON IR': 'Persistent JSON input for a OverlayLayout item',
  '提供恰好一个可绘制 JSX 子元素；不能同时传 ir': 'Provide exactly one drawable JSX child; cannot be combined with ir',
  'JSX 分支不接受 IR 输入': 'The JSX branch does not accept IR input',
  'IR 分支不接受 JSX 子元素': 'The IR branch does not accept JSX children',
  '已声明的可序列化子图形；不能同时传 children': 'A serializable child drawing; cannot be combined with children',
  选择匹配的直属布局容器: 'Select the matching direct layout container',
  '容器内稳定身份；省略时内部按位置生成，不读取 React key':
    'Stable identity within the container; omission generates a positional internal key, independently of React key',
  '必须由 Flex 类型布局项目组成的子元素；省略时容器为空':
    'Direct children must be flex layout items; omission creates an empty container',
  '必须由 Grid 类型布局项目组成的子元素；省略时容器为空':
    'Direct children must be grid layout items; omission creates an empty container',
  '必须由 Overlay 类型布局项目组成的子元素；省略时容器为空':
    'Direct children must be overlay layout items; omission creates an empty container',
  '作者声明的直属子项，省略时按空列表处理': 'Authored direct items; omission is treated as an empty list',
  同次编译已求解的布局产物: 'Solved layout artifact from the same compilation',
};

/** 复用布局宿主词典，未收录说明仍阻止生成 */
export const translateLayoutComponentApiReference = (source: string): string => {
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  if (translations[source]) return translations[source];

  return translateLayoutApiReference(source);
};
