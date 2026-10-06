/** LLM 审阅的分支名称，以判别字段类型或入口必填性匹配，避免依赖 TypeScript 分支顺序 */
export const apiReferenceBranchLabels: Readonly<
  Partial<
    Record<
      string,
      ReadonlyArray<{
        value: string;
        field: string;
        type?: string;
        required?: boolean;
        and?: ReadonlyArray<{ field: string; type?: string; required?: boolean }>;
        label: { zh: string; en: string };
      }>
    >
  >
> = {
  '@retikz/standard/collection#IRArray': [
    { value: 'items', field: 'items', required: true, label: { zh: '显式单元格', en: 'Explicit cells' } },
    { value: 'data', field: 'data', required: true, label: { zh: 'JSON 数据', en: 'JSON data' } },
    { value: 'skeleton', field: 'skeleton', required: true, label: { zh: '示意骨架', en: 'Skeleton' } },
  ],
  '@retikz/standard-react/shape#CircleProps': [
    { value: 'radius-0', field: 'radius', required: true, label: { zh: '半径', en: 'Radius' } },
    { value: 'diameter-1', field: 'diameter', required: true, label: { zh: '直径', en: 'Diameter' } },
    { value: 'from-2', field: 'from', required: true, label: { zh: '直径端点', en: 'Diameter endpoints' } },
    { value: 'corner1-3', field: 'corner1', required: true, label: { zh: '包围框角点', en: 'Bounding corners' } },
    { value: 'box-4', field: 'box', required: true, label: { zh: '包围框', en: 'Bounding box' } },
  ],
  '@retikz/standard-vanilla/shape#InputCircle': [
    { value: 'radius-0', field: 'radius', required: true, label: { zh: '半径', en: 'Radius' } },
    { value: 'diameter-1', field: 'diameter', required: true, label: { zh: '直径', en: 'Diameter' } },
    { value: 'from-2', field: 'from', required: true, label: { zh: '直径端点', en: 'Diameter endpoints' } },
    { value: 'corner1-3', field: 'corner1', required: true, label: { zh: '包围框角点', en: 'Bounding corners' } },
    { value: 'box-4', field: 'box', required: true, label: { zh: '包围框', en: 'Bounding box' } },
  ],
  '@retikz/standard/shape#IRCircle': [
    { value: 'radius', field: 'radius', required: true, label: { zh: '半径', en: 'Radius' } },
    { value: 'diameter', field: 'diameter', required: true, label: { zh: '直径', en: 'Diameter' } },
    { value: 'from', field: 'from', required: true, label: { zh: '直径端点', en: 'Diameter endpoints' } },
    { value: 'corner1', field: 'corner1', required: true, label: { zh: '包围框角点', en: 'Bounding corners' } },
    { value: 'box', field: 'box', required: true, label: { zh: '包围框', en: 'Bounding box' } },
  ],
  '@retikz/standard-react/shape#EllipseProps': [
    { value: 'radius-0', field: 'radius', required: true, label: { zh: '轴半径', en: 'Axis radii' } },
    { value: 'diameterX-1', field: 'diameterX', required: true, label: { zh: '轴直径', en: 'Axis diameters' } },
    { value: 'corner1-2', field: 'corner1', required: true, label: { zh: '包围框角点', en: 'Bounding corners' } },
    { value: 'box-3', field: 'box', required: true, label: { zh: '包围框', en: 'Bounding box' } },
  ],
  '@retikz/standard-vanilla/shape#InputEllipse': [
    { value: 'radius-0', field: 'radius', required: true, label: { zh: '轴半径', en: 'Axis radii' } },
    { value: 'diameterX-1', field: 'diameterX', required: true, label: { zh: '轴直径', en: 'Axis diameters' } },
    { value: 'corner1-2', field: 'corner1', required: true, label: { zh: '包围框角点', en: 'Bounding corners' } },
    { value: 'box-3', field: 'box', required: true, label: { zh: '包围框', en: 'Bounding box' } },
  ],
  '@retikz/standard/shape#IREllipse': [
    { value: 'radius', field: 'radius', required: true, label: { zh: '轴半径', en: 'Axis radii' } },
    { value: 'diameterX', field: 'diameterX', required: true, label: { zh: '轴直径', en: 'Axis diameters' } },
    { value: 'corner1', field: 'corner1', required: true, label: { zh: '包围框角点', en: 'Bounding corners' } },
    { value: 'box', field: 'box', required: true, label: { zh: '包围框', en: 'Bounding box' } },
  ],
  '@retikz/standard-react/shape#RectangleProps': [
    { value: 'corner2-0', field: 'corner2', required: true, label: { zh: '对角点', en: 'Opposite corners' } },
    {
      value: 'center-1',
      field: 'center',
      required: true,
      and: [{ field: 'width', required: true }],
      label: { zh: '中心与宽高', en: 'Center and dimensions' },
    },
    { value: 'side-2', field: 'side', required: true, label: { zh: '正方形', en: 'Square' } },
    {
      value: 'width-3',
      field: 'width',
      required: true,
      and: [{ field: 'corner1', required: true }],
      label: { zh: '角点与宽高', en: 'Corner and dimensions' },
    },
  ],
  '@retikz/standard-vanilla/shape#InputRectangle': [
    { value: 'corner2-0', field: 'corner2', required: true, label: { zh: '对角点', en: 'Opposite corners' } },
    {
      value: 'center-1',
      field: 'center',
      required: true,
      and: [{ field: 'width', required: true }],
      label: { zh: '中心与宽高', en: 'Center and dimensions' },
    },
    { value: 'side-2', field: 'side', required: true, label: { zh: '正方形', en: 'Square' } },
    {
      value: 'width-3',
      field: 'width',
      required: true,
      and: [{ field: 'corner1', required: true }],
      label: { zh: '角点与宽高', en: 'Corner and dimensions' },
    },
  ],
  '@retikz/standard/shape#IRRectangle': [
    { value: 'corner2', field: 'corner2', required: true, label: { zh: '对角点', en: 'Opposite corners' } },
    {
      value: 'center',
      field: 'center',
      required: true,
      and: [{ field: 'width', required: true }],
      label: { zh: '中心与宽高', en: 'Center and dimensions' },
    },
    { value: 'side', field: 'side', required: true, label: { zh: '正方形', en: 'Square' } },
    {
      value: 'width',
      field: 'width',
      required: true,
      and: [{ field: 'corner1', required: true }],
      label: { zh: '角点与宽高', en: 'Corner and dimensions' },
    },
  ],
  '@retikz/standard-react/shape#PolygonProps': [
    { value: 'radius-0', field: 'radius', required: true, label: { zh: '外接半径', en: 'Circumradius' } },
    { value: 'sideLength-1', field: 'sideLength', required: true, label: { zh: '边长', en: 'Side length' } },
  ],
  '@retikz/standard-react/shape#StarProps': [
    { value: 'innerRadius-0', field: 'innerRadius', required: true, label: { zh: '内半径', en: 'Inner radius' } },
    {
      value: 'innerRatio-1',
      field: 'innerRatio',
      type: 'number',
      label: { zh: '内半径比例', en: 'Inner radius ratio' },
    },
  ],
  '@retikz/standard-react/shape#SectorProps': [
    { value: 'innerRadius-0', field: 'innerRadius', type: '0', label: { zh: '圆形扇区', en: 'Circular sector' } },
    {
      value: 'innerRadius-1',
      field: 'innerRadius',
      type: '{ x: 0; y: 0; }',
      label: { zh: '椭圆扇区', en: 'Elliptical sector' },
    },
    { value: 'innerRadius-2', field: 'innerRadius', type: 'number', label: { zh: '圆环扇区', en: 'Annular sector' } },
    {
      value: 'innerRadius-3',
      field: 'innerRadius',
      type: '{ x: number; y: number; }',
      label: { zh: '椭圆环扇区', en: 'Elliptical annular sector' },
    },
  ],
  '@retikz/standard-vanilla/shape#InputSector': [
    { value: 'innerRadius-0', field: 'innerRadius', type: '0', label: { zh: '圆形扇区', en: 'Circular sector' } },
    {
      value: 'innerRadius-1',
      field: 'innerRadius',
      type: '{ x: 0; y: 0; }',
      label: { zh: '椭圆扇区', en: 'Elliptical sector' },
    },
    { value: 'innerRadius-2', field: 'innerRadius', type: 'number', label: { zh: '圆环扇区', en: 'Annular sector' } },
    {
      value: 'innerRadius-3',
      field: 'innerRadius',
      type: '{ x: number; y: number; }',
      label: { zh: '椭圆环扇区', en: 'Elliptical annular sector' },
    },
  ],
  '@retikz/standard/shape#IRSector': [
    { value: 'circular', field: 'innerRadius', type: '0', label: { zh: '圆形扇区', en: 'Circular sector' } },
    {
      value: 'elliptical',
      field: 'innerRadius',
      type: '{ x: 0; y: 0; }',
      label: { zh: '椭圆扇区', en: 'Elliptical sector' },
    },
    { value: 'annular', field: 'innerRadius', type: 'number', label: { zh: '圆环扇区', en: 'Annular sector' } },
    {
      value: 'elliptical-annular',
      field: 'innerRadius',
      type: '{ x: number; y: number; }',
      label: { zh: '椭圆环扇区', en: 'Elliptical annular sector' },
    },
  ],
  '@retikz/graph-vanilla#RelationInputEmbedProps': [
    { value: 'route', field: 'way', type: 'never', label: { zh: '路径步骤', en: 'Route steps' } },
    { value: 'way', field: 'way', required: true, label: { zh: 'Way 路径', en: 'Way path' } },
  ],
  '@retikz/standard-react/collection#ArrayProps': [
    { value: 'items', field: 'items', required: true, label: { zh: '显式单元格', en: 'Explicit cells' } },
    { value: 'data', field: 'data', required: true, label: { zh: 'JSON 数据', en: 'JSON data' } },
    { value: 'skeleton', field: 'skeleton', required: true, label: { zh: '示意骨架', en: 'Skeleton' } },
    { value: 'children', field: 'children', type: 'ReactNode', label: { zh: 'JSX 子项', en: 'JSX children' } },
  ],
  '@retikz/standard-react/collection#MatrixProps': [
    { value: 'items', field: 'items', required: true, label: { zh: '显式单元格', en: 'Explicit cells' } },
    { value: 'data', field: 'data', required: true, label: { zh: 'JSON 数据', en: 'JSON data' } },
    { value: 'skeleton', field: 'skeleton', required: true, label: { zh: '示意骨架', en: 'Skeleton' } },
    { value: 'children', field: 'children', type: 'ReactNode', label: { zh: 'JSX 子项', en: 'JSX children' } },
  ],
  '@retikz/standard-react/collection#MapProps': [
    { value: 'entries', field: 'entries', required: true, label: { zh: '显式单元格', en: 'Explicit cells' } },
    { value: 'data', field: 'data', required: true, label: { zh: 'JSON 数据', en: 'JSON data' } },
    { value: 'skeleton', field: 'skeleton', required: true, label: { zh: '示意骨架', en: 'Skeleton' } },
    { value: 'children', field: 'children', type: 'ReactNode', label: { zh: 'JSX 子项', en: 'JSX children' } },
  ],
  '@retikz/graph#IRBlockRow': [
    { value: 'text', field: 'content', required: true, label: { zh: '文本内容', en: 'Text content' } },
    {
      value: 'children',
      field: 'children',
      type: 'Array<IRChild>',
      label: { zh: '任意子元素', en: 'Arbitrary children' },
    },
  ],
  '@retikz/graph-react#BlockRowProps': [
    { value: 'text', field: 'content', required: true, label: { zh: '文本内容', en: 'Text content' } },
    { value: 'children', field: 'content', type: 'never', label: { zh: '任意子元素', en: 'Arbitrary children' } },
  ],
  '@retikz/graph-vanilla#BlockRowInputEmbedProps': [
    { value: 'text', field: 'content', required: true, label: { zh: '文本内容', en: 'Text content' } },
    { value: 'children', field: 'content', type: 'never', label: { zh: '任意子元素', en: 'Arbitrary children' } },
  ],
  '@retikz/graph-vanilla#InputBlockRow': [
    { value: 'text', field: 'content', required: true, label: { zh: '文本内容', en: 'Text content' } },
    { value: 'children', field: 'content', type: 'never', label: { zh: '任意子元素', en: 'Arbitrary children' } },
  ],
  '@retikz/standard-react/presentation#LegendProps': [
    {
      value: 'items',
      field: 'kind',
      type: 'typeof LegendContentKind.Items',
      label: { zh: '离散条目', en: 'Discrete items' },
    },
    {
      value: 'ramp',
      field: 'kind',
      type: 'typeof LegendContentKind.Ramp',
      label: { zh: '连续样本', en: 'Continuous sample' },
    },
  ],
  '@retikz/graph-vanilla#InputRelation': [
    { value: 'route', field: 'way', type: 'never', label: { zh: '路径步骤', en: 'Route steps' } },
    { value: 'way', field: 'way', required: true, label: { zh: 'Way 路径', en: 'Way path' } },
  ],
  '@retikz/diagram#FlowBezierRoute': [
    { value: 'curve', field: 'kind', type: "'curve'", label: { zh: '二次贝塞尔', en: 'Quadratic Bezier' } },
    { value: 'cubic', field: 'kind', type: "'cubic'", label: { zh: '三次贝塞尔', en: 'Cubic Bezier' } },
  ],
  '@retikz/diagram#FlowBezierRouting': [
    { value: 'curve', field: 'kind', type: "'curve'", label: { zh: '二次贝塞尔', en: 'Quadratic Bezier' } },
    {
      value: 'cubic-auto',
      field: 'control1',
      type: 'never',
      label: { zh: '自动三次贝塞尔', en: 'Automatic cubic Bezier' },
    },
    {
      value: 'cubic-explicit',
      field: 'control1',
      type: 'Readonly<Position>',
      label: { zh: '显式三次贝塞尔', en: 'Explicit cubic Bezier' },
    },
  ],
  '@retikz/diagram#FlowRoutingCapability': [
    {
      value: 'regular',
      field: 'kind',
      type: "Exclude<FlowRoutingKind, 'curve' | 'cubic'>",
      label: { zh: '常规路由', en: 'Regular routing' },
    },
    {
      value: 'bezier',
      field: 'modes',
      type: "ReadonlyArray<'auto' | 'explicit'>",
      label: { zh: '贝塞尔能力', en: 'Bezier capabilities' },
    },
  ],
  '@retikz/diagram#FlowBendRoute': [
    { value: 'symmetric', field: 'bendAngle', type: 'number', label: { zh: '对称弯曲', en: 'Symmetric bend' } },
    { value: 'tangent', field: 'outAngle', type: 'number', label: { zh: '切线弯曲', en: 'Tangent bend' } },
  ],
  '@retikz/diagram#FlowLayoutRouting': [
    { value: 'smooth', field: 'kind', type: "'smooth'", label: { zh: '过点曲线', en: 'Through-point curve' } },
    { value: 'curve', field: 'kind', type: "'curve'", label: { zh: '二次贝塞尔', en: 'Quadratic Bezier' } },
    {
      value: 'cubic-auto',
      field: 'control1',
      type: 'never',
      label: { zh: '自动三次贝塞尔', en: 'Automatic cubic Bezier' },
    },
    {
      value: 'cubic-explicit',
      field: 'control1',
      type: 'Readonly<Position>',
      label: { zh: '显式三次贝塞尔', en: 'Explicit cubic Bezier' },
    },

    { value: 'straight', field: 'kind', type: "'straight'", label: { zh: '直线', en: 'Straight' } },
    { value: 'axis', field: 'kind', type: "'-|' | '|-'", label: { zh: '单折角', en: 'Single elbow' } },
    { value: 'orthogonal', field: 'kind', type: "'orthogonal'", label: { zh: '正交折线', en: 'Orthogonal' } },
    { value: 'symmetric', field: 'bendAngle', type: 'number', label: { zh: '对称弯曲', en: 'Symmetric bend' } },
    { value: 'tangent', field: 'outAngle', type: 'number', label: { zh: '切线弯曲', en: 'Tangent bend' } },
  ],
  '@retikz/diagram#FlowLayoutRoute': [
    { value: 'smooth', field: 'kind', type: "'smooth'", label: { zh: '过点曲线', en: 'Through-point curve' } },
    { value: 'curve', field: 'kind', type: "'curve'", label: { zh: '二次贝塞尔', en: 'Quadratic Bezier' } },
    { value: 'cubic', field: 'kind', type: "'cubic'", label: { zh: '三次贝塞尔', en: 'Cubic Bezier' } },

    { value: 'straight', field: 'kind', type: "'straight'", label: { zh: '直线', en: 'Straight' } },
    { value: 'axis', field: 'kind', type: "'-|' | '|-'", label: { zh: '单折角', en: 'Single elbow' } },
    { value: 'orthogonal', field: 'kind', type: "'orthogonal'", label: { zh: '正交折线', en: 'Orthogonal' } },
    { value: 'symmetric', field: 'bendAngle', type: 'number', label: { zh: '对称弯曲', en: 'Symmetric bend' } },
    { value: 'tangent', field: 'outAngle', type: 'number', label: { zh: '切线弯曲', en: 'Tangent bend' } },
  ],

  '@retikz/diagram-react#FlowLayoutProps': [
    { value: 'linear', field: 'kind', type: '"linear"', label: { zh: '线性排列', en: 'Linear placement' } },
    { value: 'grid', field: 'kind', type: '"grid"', label: { zh: '网格排列', en: 'Grid placement' } },
  ],
  '@retikz/layout-react#FlexLayoutItemProps': [
    { value: 'jsx', field: 'ir', type: 'never', label: { zh: 'JSX 子元素', en: 'JSX child' } },
    { value: 'ir', field: 'children', type: 'never', label: { zh: 'IR 子图形', en: 'IR child' } },
  ],
  '@retikz/layout-react#GridLayoutItemProps': [
    { value: 'jsx', field: 'ir', type: 'never', label: { zh: 'JSX 子元素', en: 'JSX child' } },
    { value: 'ir', field: 'children', type: 'never', label: { zh: 'IR 子图形', en: 'IR child' } },
  ],
  '@retikz/layout-react#OverlayLayoutItemProps': [
    { value: 'jsx', field: 'ir', type: 'never', label: { zh: 'JSX 子元素', en: 'JSX child' } },
    { value: 'ir', field: 'children', type: 'never', label: { zh: 'IR 子图形', en: 'IR child' } },
  ],
  '@retikz/layout#LayoutAxisSizeInput': [
    { value: 'content', field: 'kind', type: '"content"', label: { zh: '内容尺寸', en: 'Content' } },
    { value: 'fixed', field: 'kind', type: '"fixed"', label: { zh: '固定尺寸', en: 'Fixed' } },
    { value: 'fill', field: 'kind', type: '"fill"', label: { zh: '填充空间', en: 'Fill' } },
  ],
  '@retikz/layout#GridTrackBreadthInput': [
    { value: 'fixed', field: 'kind', type: '"fixed"', label: { zh: '固定尺寸', en: 'Fixed' } },
    { value: 'content', field: 'kind', type: '"content"', label: { zh: '内容尺寸', en: 'Content' } },
    { value: 'fraction', field: 'kind', type: '"fraction"', label: { zh: '份额', en: 'Fraction' } },
  ],
  '@retikz/layout#GridTrackInput': [
    { value: 'fixed', field: 'kind', type: '"fixed"', label: { zh: '固定尺寸', en: 'Fixed' } },
    { value: 'content', field: 'kind', type: '"content"', label: { zh: '内容尺寸', en: 'Content' } },
    { value: 'fraction', field: 'kind', type: '"fraction"', label: { zh: '份额', en: 'Fraction' } },
    { value: 'minmax', field: 'kind', type: '"minmax"', label: { zh: '上下界', en: 'Minmax' } },
  ],
  '@retikz/layout#OverlayPlacementInput': [
    { value: 'aligned', field: 'kind', type: '"aligned"', label: { zh: '对齐', en: 'Aligned' } },
    { value: 'positioned', field: 'kind', type: '"positioned"', label: { zh: '局部定位', en: 'Positioned' } },
  ],
  '@retikz/standard/presentation#LegendArtifact': [
    { value: 'items', field: 'kind', type: '"items"', label: { zh: '离散条目', en: 'Discrete items' } },
    { value: 'ramp', field: 'kind', type: '"ramp"', label: { zh: '连续样本', en: 'Continuous sample' } },
  ],
  '@retikz/standard-vanilla/shape#InputStar': [
    { value: 'radius', field: 'innerRadius', type: 'number', label: { zh: '内半径', en: 'Inner radius' } },
    { value: 'ratio', field: 'innerRatio', type: 'number', label: { zh: '内半径比例', en: 'Inner radius ratio' } },
  ],
  '@retikz/standard/shape#IRStar': [
    { value: 'radius', field: 'innerRadius', type: 'number', label: { zh: '内半径', en: 'Inner radius' } },
    { value: 'ratio', field: 'innerRatio', type: 'number', label: { zh: '内半径比例', en: 'Inner radius ratio' } },
  ],
  '@retikz/standard-vanilla/shape#InputPolygon': [
    { value: 'radius', field: 'radius', type: 'number', label: { zh: '外接半径', en: 'Circumradius' } },
    { value: 'side-length', field: 'sideLength', type: 'number', label: { zh: '边长', en: 'Side length' } },
  ],
  '@retikz/standard/shape#IRPolygon': [
    { value: 'radius', field: 'radius', type: 'number', label: { zh: '外接半径', en: 'Circumradius' } },
    { value: 'side-length', field: 'sideLength', type: 'number', label: { zh: '边长', en: 'Side length' } },
  ],
  '@retikz/standard-react/collection#ChainProps': [
    {
      value: 'items',
      field: 'items',
      required: true,
      label: { zh: '显式单元格', en: 'Explicit cells' },
    },
    {
      value: 'data',
      field: 'data',
      required: true,
      label: { zh: 'JSON 数据', en: 'JSON data' },
    },
    {
      value: 'skeleton',
      field: 'skeleton',
      required: true,
      label: { zh: '示意骨架', en: 'Skeleton' },
    },
    { value: 'children', field: 'children', type: 'ReactNode', label: { zh: 'JSX 子项', en: 'JSX children' } },
  ],
  '@retikz/standard-react/collection#ChainCellProps': [
    { value: 'text', field: 'text', type: 'string', label: { zh: '文本或空格', en: 'Text or empty cell' } },
    { value: 'drawable', field: 'text', type: 'never', label: { zh: '图形内容', en: 'Drawable content' } },
  ],
  '@retikz/standard-react/collection#MatrixCellProps': [
    { value: 'text', field: 'text', type: 'string', label: { zh: '文本或空格', en: 'Text or empty cell' } },
    { value: 'drawable', field: 'text', type: 'never', label: { zh: '图形内容', en: 'Drawable content' } },
  ],
  '@retikz/standard/collection#IRMatrixAxisIndex': [
    { value: 'automatic', field: 'start', type: 'number', label: { zh: '自动编号', en: 'Automatic numbering' } },
    { value: 'labels', field: 'start', type: 'never', label: { zh: '显式标号', en: 'Explicit labels' } },
  ],
  '@retikz/standard/collection#IRChain': [
    {
      value: 'items',
      field: 'items',
      required: true,
      label: { zh: '显式单元格', en: 'Explicit cells' },
    },
    {
      value: 'data',
      field: 'data',
      required: true,
      label: { zh: 'JSON 数据', en: 'JSON data' },
    },
    {
      value: 'skeleton',
      field: 'skeleton',
      required: true,
      label: { zh: '示意骨架', en: 'Skeleton' },
    },
  ],
  '@retikz/standard-vanilla/collection#InputChain': [
    {
      value: 'items',
      field: 'items',
      required: true,
      label: { zh: '显式单元格', en: 'Explicit cells' },
    },
    {
      value: 'data',
      field: 'data',
      required: true,
      label: { zh: 'JSON 数据', en: 'JSON data' },
    },
    {
      value: 'skeleton',
      field: 'skeleton',
      required: true,
      label: { zh: '示意骨架', en: 'Skeleton' },
    },
  ],
  '@retikz/standard/collection#IRMatrix': [
    {
      value: 'items',
      field: 'items',
      type: `Array<Array<string | IRCell>>`,
      label: { zh: '显式单元格', en: 'Explicit cells' },
    },
    {
      value: 'data',
      field: 'data',
      type: `NonNullable<input<typeof MatrixSchema>['data']>`,
      label: { zh: 'JSON 数据', en: 'JSON data' },
    },
    {
      value: 'skeleton',
      field: 'skeleton',
      type: `NonNullable<input<typeof MatrixSchema>['skeleton']>`,
      label: { zh: '示意骨架', en: 'Skeleton' },
    },
  ],
  '@retikz/standard-vanilla/collection#InputMatrix': [
    {
      value: 'items',
      field: 'items',
      type: `Array<Array<string | InputCell>>`,
      label: { zh: '显式单元格', en: 'Explicit cells' },
    },
    {
      value: 'data',
      field: 'data',
      type: `NonNullable<IRMatrix['data']>`,
      label: { zh: 'JSON 数据', en: 'JSON data' },
    },
    {
      value: 'skeleton',
      field: 'skeleton',
      type: `NonNullable<IRMatrix['skeleton']>`,
      label: { zh: '示意骨架', en: 'Skeleton' },
    },
  ],
  '@retikz/standard/collection#IRArrayIndexOptions': [
    { value: 'automatic', field: 'start', type: 'number', label: { zh: '自动编号', en: 'Automatic numbering' } },
    { value: 'labels', field: 'start', type: 'never', label: { zh: '显式标号', en: 'Explicit labels' } },
  ],
  '@retikz/standard/collection#IRMap': [
    {
      value: 'entries',
      field: 'entries',
      type: `Array<{
    key: string | IRCell;
    value: string | IRCell;
}>`,
      label: { zh: '显式单元格', en: 'Explicit cells' },
    },
    {
      value: 'data',
      field: 'data',
      type: "NonNullable<input<typeof MapSchema>['data']>",
      label: { zh: 'JSON 数据', en: 'JSON data' },
    },
    {
      value: 'skeleton',
      field: 'skeleton',
      type: "NonNullable<input<typeof MapSchema>['skeleton']>",
      label: { zh: '示意骨架', en: 'Skeleton' },
    },
  ],
  '@retikz/standard-vanilla/collection#InputMap': [
    {
      value: 'entries',
      field: 'entries',
      type: `Array<{
    key: string | InputCell;
    value: string | InputCell;
}>`,
      label: { zh: '显式单元格', en: 'Explicit cells' },
    },
    { value: 'data', field: 'data', type: "NonNullable<IRMap['data']>", label: { zh: 'JSON 数据', en: 'JSON data' } },
    {
      value: 'skeleton',
      field: 'skeleton',
      type: "NonNullable<IRMap['skeleton']>",
      label: { zh: '示意骨架', en: 'Skeleton' },
    },
  ],
  '@retikz/standard-react/collection#MapKeyProps': [
    { value: 'text', field: 'text', type: 'string', label: { zh: '文本或空格', en: 'Text or empty cell' } },
    { value: 'drawable', field: 'text', type: 'never', label: { zh: '图形内容', en: 'Drawable content' } },
  ],
  '@retikz/standard-react/collection#MapValueProps': [
    { value: 'text', field: 'text', type: 'string', label: { zh: '文本或空格', en: 'Text or empty cell' } },
    { value: 'drawable', field: 'text', type: 'never', label: { zh: '图形内容', en: 'Drawable content' } },
  ],
  '@retikz/standard-vanilla/collection#InputArray': [
    {
      value: 'items',
      field: 'items',
      type: `Array<string | InputCell<IRArrayCell>>`,
      label: { zh: '显式单元格', en: 'Explicit cells' },
    },
    { value: 'data', field: 'data', type: "NonNullable<IRArray['data']>", label: { zh: 'JSON 数据', en: 'JSON data' } },
    {
      value: 'skeleton',
      field: 'skeleton',
      type: "NonNullable<IRArray['skeleton']>",
      label: { zh: '示意骨架', en: 'Skeleton' },
    },
  ],
  '@retikz/standard-react/collection#ArrayItemProps': [
    { value: 'text', field: 'text', type: 'string', label: { zh: '文本或空格', en: 'Text or empty cell' } },
    { value: 'drawable', field: 'text', type: 'never', label: { zh: '图形内容', en: 'Drawable content' } },
  ],
  '@retikz/graph#BlockRowCreateOptions': [
    {
      value: 'text',
      field: 'content',
      type: 'BlockRowCreateOptions["content"]',
      label: { zh: '文本内容', en: 'Text content' },
    },
    {
      value: 'children',
      field: 'children',
      type: 'Array<IRChild>',
      label: { zh: '任意子元素', en: 'Arbitrary children' },
    },
  ],
  '@retikz/tex#MathJaxLowerTexState': [
    { value: 'loading', field: 'status', type: "'loading'", label: { zh: '初始化中', en: 'Loading' } },
    { value: 'ready', field: 'status', type: "'ready'", label: { zh: '就绪', en: 'Ready' } },
    { value: 'error', field: 'status', type: "'error'", label: { zh: '初始化失败', en: 'Initialization failure' } },
  ],
  '@retikz/tex#TexLoweringDiagnostic': [
    { value: 'engine-error', field: 'kind', type: "'engine-error'", label: { zh: '引擎失败', en: 'Engine failure' } },
    {
      value: 'mathjax-error',
      field: 'kind',
      type: "'mathjax-error'",
      label: { zh: '公式解析失败', en: 'Formula parsing failure' },
    },
    {
      value: 'unsupported-svg',
      field: 'kind',
      type: "'unsupported-svg'",
      label: { zh: '不支持的 SVG', en: 'Unsupported SVG' },
    },
    { value: 'malformed-svg', field: 'kind', type: "'malformed-svg'", label: { zh: '无效 SVG', en: 'Malformed SVG' } },
  ],
  '@retikz/inspect#InspectionSelectionRule': [
    { value: 'request', field: 'kind', type: "'request'", label: { zh: '请求', en: 'Request' } },
    { value: 'barrier', field: 'kind', type: "'barrier'", label: { zh: '封锁', en: 'Barrier' } },
  ],
  '@retikz/inspect#InspectionSelectionTarget': [
    { value: 'scene', field: 'kind', type: "'scene'", label: { zh: '整图', en: 'Scene' } },
    { value: 'subtree', field: 'kind', type: "'subtree'", label: { zh: '子树', en: 'Subtree' } },
    { value: 'self', field: 'kind', type: "'self'", label: { zh: '实例', en: 'Occurrence' } },
  ],
  '@retikz/inspect#InspectionDiagnosticOrigin': [
    { value: 'selection', field: 'stage', type: "'selection'", label: { zh: '选择规则', en: 'Selection' } },
    {
      value: 'inspect',
      field: 'stage',
      type: "'subject' | 'inspect'",
      label: { zh: '对象与回调', en: 'Subject and callback' },
    },
    {
      value: 'output',
      field: 'stage',
      type: "'output' | 'fragment'",
      label: { zh: '输出与片段', en: 'Output and fragment' },
    },
    { value: 'complete', field: 'stage', type: "'complete'", label: { zh: '结果汇总', en: 'Completion' } },
  ],

  '@retikz/vanilla#InputScene': [
    { value: 'children', field: 'layers', type: 'never', label: { zh: '子节点', en: 'Children' } },
    { value: 'layers', field: 'layers', type: 'ReadonlyArray<InputLayer>', label: { zh: '分层', en: 'Layers' } },
  ],
  '@retikz/math#CurveSegment': [
    { value: 'line', field: 'kind', type: "'line'", label: { zh: '直线', en: 'Line' } },
    {
      value: 'quadratic',
      field: 'kind',
      type: "'quadraticBezier'",
      label: { zh: '二次贝塞尔', en: 'Quadratic Bézier' },
    },
    { value: 'cubic', field: 'kind', type: "'cubicBezier'", label: { zh: '三次贝塞尔', en: 'Cubic Bézier' } },
    { value: 'arc', field: 'kind', type: "'arc'", label: { zh: '圆弧', en: 'Circular arc' } },
    { value: 'ellipse-arc', field: 'kind', type: "'ellipseArc'", label: { zh: '椭圆弧', en: 'Elliptical arc' } },
  ],
  '@retikz/react#FoldStepProps': [
    { value: 'two-segments', field: 'via', type: "'-|' | '|-'", label: { zh: '两段折线', en: 'Two segments' } },
    { value: 'three-segments', field: 'via', type: "'-|-' | '|-|'", label: { zh: '三段折线', en: 'Three segments' } },
  ],
  '@retikz/react#LayoutRuntimeOptions': [
    {
      value: 'retained',
      field: 'mode',
      type: 'typeof LayoutRuntimeMode.Retained',
      label: { zh: '保留模式', en: 'Retained' },
    },
    {
      value: 'static',
      field: 'mode',
      type: 'typeof LayoutRuntimeMode.Static',
      label: { zh: '静态模式', en: 'Static' },
    },
  ],
  '@retikz/standard-react/collection#StackProps': [
    { value: 'items', field: 'items', required: true, label: { zh: '显式单元格', en: 'Explicit cells' } },
    { value: 'data', field: 'data', required: true, label: { zh: 'JSON 数据', en: 'JSON data' } },
    { value: 'skeleton', field: 'skeleton', required: true, label: { zh: '示意骨架', en: 'Skeleton' } },
    { value: 'children', field: 'children', type: 'ReactNode', label: { zh: 'JSX 子项', en: 'JSX children' } },
  ],
  '@retikz/standard-react/collection#StackItemProps': [
    { value: 'text', field: 'text', type: 'string', label: { zh: '文本或空格', en: 'Text or empty cell' } },
    { value: 'drawable', field: 'text', type: 'never', label: { zh: '图形内容', en: 'Drawable content' } },
  ],
  '@retikz/standard/collection#IRStack': [
    { value: 'items', field: 'items', required: true, label: { zh: '显式单元格', en: 'Explicit cells' } },
    { value: 'data', field: 'data', required: true, label: { zh: 'JSON 数据', en: 'JSON data' } },
    { value: 'skeleton', field: 'skeleton', required: true, label: { zh: '示意骨架', en: 'Skeleton' } },
  ],
  '@retikz/standard-vanilla/collection#InputStack': [
    {
      value: 'items',
      field: 'items',
      type: `Array<string | InputCell<IRCell>>`,
      label: { zh: '显式单元格', en: 'Explicit cells' },
    },
    { value: 'data', field: 'data', type: "NonNullable<IRStack['data']>", label: { zh: 'JSON 数据', en: 'JSON data' } },
    {
      value: 'skeleton',
      field: 'skeleton',
      type: "NonNullable<IRStack['skeleton']>",
      label: { zh: '示意骨架', en: 'Skeleton' },
    },
  ],
};
