import type { ApiReferenceLanguage } from './tex';

/** 已核对的能力分组，仅组织既有公开成员与 Schema */
export type ReferenceGroup = {
  title: Record<ApiReferenceLanguage, string>;
  members: ReadonlyArray<string>;
  schemas?: ReadonlyArray<string>;
};

/** 显式分组清单，生成时拒绝成员遗漏、未知或重复 */
export const referenceGroups: Readonly<Partial<Record<string, ReadonlyArray<ReferenceGroup>>>> = {
  'viz/plot/scale': [
    {
      title: { zh: '声明输入', en: 'Authoring inputs' },
      members: [
        'PlotScale / PlotScaleProps',
        'InputPlotScale',
        'InputPlotScaleDimension',
        'InputPlotPositionScaleType',
      ],
    },
    {
      title: { zh: '比例尺配置', en: 'Scale configuration' },
      members: ['IRPlotScale', 'IRPlotScaleOperation', 'IRPlotCustomScale'],
      schemas: ['ScaleSchema', 'ScaleOperationSchema', 'CustomScaleSchema'],
    },
    {
      title: { zh: '位置映射', en: 'Position mapping' },
      members: ['PositionScale', 'PositionScaleContinuity', 'PositionTickKind', 'TickSet'],
    },
    {
      title: { zh: '连续位置比例尺', en: 'Continuous position scales' },
      members: [
        'IRPlotLinearScale',
        'IRPlotTimeScale',
        'IRPlotLogScale',
        'IRPlotPowScale',
        'IRPlotSqrtScale',
        'IRPlotSymlogScale',
        'IRPlotRadialScale',
      ],
      schemas: [
        'LinearScaleSchema',
        'TimeScaleSchema',
        'LogScaleSchema',
        'PowScaleSchema',
        'SqrtScaleSchema',
        'SymlogScaleSchema',
        'RadialScaleSchema',
      ],
    },
    {
      title: { zh: '离散比例尺', en: 'Discrete scales' },
      members: ['IRPlotBandScale', 'IRPlotPointScale', 'IRPlotOrdinalScale'],
      schemas: ['BandScaleSchema', 'PointScaleSchema', 'OrdinalScaleSchema'],
    },
    {
      title: { zh: '颜色比例尺', en: 'Color scales' },
      members: [
        'IRPlotSequentialColorScale',
        'IRPlotDivergingColorScale',
        'IRPlotQuantizeColorScale',
        'IRPlotThresholdColorScale',
        'IRPlotQuantileColorScale',
      ],
      schemas: [
        'SequentialColorScaleSchema',
        'DivergingColorScaleSchema',
        'QuantizeColorScaleSchema',
        'ThresholdColorScaleSchema',
        'QuantileColorScaleSchema',
      ],
    },
    {
      title: { zh: '域留白与辅助值', en: 'Domain padding and supporting values' },
      members: ['IRPlotDomainPadding', 'IRPlotCategoryValue'],
      schemas: ['DomainPaddingSchema', 'CategoryValueSchema', 'ColorSchemeNameSchema'],
    },
  ],
  'viz/plot/coordinate': [
    {
      title: { zh: '坐标组合与分面', en: 'Composition and facets' },
      members: [],
      schemas: [
        'CoordinateCompositionSchema',
        'CoordinateViewSchema',
        'PlotFacetConfigurationSchema',
        'FacetArrangementSchema',
        'TrackArrangementSchema',
        'BoxPaddingSchema',
      ],
    },
    {
      title: { zh: '坐标配置', en: 'Coordinate configuration' },
      members: [
        'InputPlotCoordinate',
        'IRPlotCoordinate',
        'IRPlotCoordinateOperation',
        'IRPlotCartesian1DCoordinate',
        'IRPlotPolar1DCoordinate',
        'IRPlotPolar2DCoordinate',
        'IRPlotCustomCoordinate',
      ],
      schemas: [
        'CoordinateSchema',
        'CoordinateOperationSchema',
        'Cartesian2DSchema',
        'Cartesian1DSchema',
        'Polar1DSchema',
        'Polar2DSchema',
        'CustomCoordinateSchema',
      ],
    },
    {
      title: { zh: '定义与注册', en: 'Definitions and registration' },
      members: [
        'CoordinateDefinition',
        'AnyCoordinateDefinition',
        'defineCoordinate',
        'resolveCoordinateRegistry',
        'CoordinateDefinitionResolveContext',
        'CoordinateResolution',
        'CoordinatePlotArea',
      ],
    },
    {
      title: { zh: '比例尺绑定', en: 'Scale bindings' },
      members: [
        'DimensionRole',
        'CoordinateScaleNames',
        'CoordinateScaleBinding',
        'readCoordinateScaleNames',
        'bindCoordinateScaleNames',
      ],
    },
    {
      title: { zh: '位置投影', en: 'Position projection' },
      members: [
        'CoordinateFrame',
        'CoordinateFrameOptions',
        'createCoordinateFrame',
        'CoordinateDomainPaddingCapability',
      ],
    },
    {
      title: { zh: '单元投影', en: 'Cell projection' },
      members: ['Cell', 'CellGeometry', 'CellProjectionOptions', 'CellProjectableCoordinate', 'hasProjectCell'],
    },
  ],
  'viz/data/scale': [
    {
      title: { zh: '定义与注册', en: 'Definitions and registration' },
      members: [
        'BuiltinDataScale',
        'BUILTIN_SCALES',
        'InputScaleDefinition',
        'ScaleDefinition',
        'defineScale',
        'resolveScaleRegistry',
      ],
    },
    {
      title: { zh: '解析与求值', en: 'Resolution and evaluation' },
      members: [
        'parseScaleOperation',
        'resolveScale',
        'ScaleResolveContext',
        'ScaleResolution',
        'ScaleValue',
        'ScaleRebuildOptions',
      ],
    },
  ],
  'viz/plot/mark': [
    {
      title: { zh: '共享图元配置', en: 'Shared mark configuration' },
      members: [],
      schemas: [
        'MarkSchema',
        'MarkPlacementSchema',
        'PositionAdjustmentOperationSchema',
        'JitterPositionAdjustmentSchema',
        'PlotRandomDistributionSchema',
        'JitterRatioSpanSchema',
        'CustomPositionAdjustmentSchema',
        'MarkTransformSchema',
        'AnchorIdSchema',
        'PlotLayerSchema',
      ],
    },
  ],
  'viz/plot/guide': [
    {
      title: { zh: '共享样式与刻度', en: 'Shared styles and ticks' },
      members: [],
      schemas: [
        'GuideSchema',
        'GuideLineStyleSchema',
        'AxisLineStyleSchema',
        'AxisGridLineStyleSchema',
        'GuideTextStyleSchema',
        'GuideTickSourceSchema',
        'GuideTickIntervalSchema',
        'GuideTickLabelFormatSchema',
        'AxisGuideValueSchema',
      ],
    },
  ],
  'viz/plot/mark/interval': [
    {
      title: { zh: '组件属性', en: 'Component properties' },
      members: ['IntervalMarkProps', 'IRPlotIntervalMark'],
      schemas: ['IntervalMarkSchema', 'IntervalBoundsSchema', 'IntervalBoundSchema'],
    },
  ],
  'viz/plot/mark/path': [
    {
      title: { zh: '组件属性', en: 'Component properties' },
      members: ['PathMarkProps', 'IRPlotPathMark'],
      schemas: ['PathMarkSchema', 'PlotPathStepSchema', 'PathClosureSchema', 'MarkPathLabelSchema'],
    },
  ],
  'viz/plot/guide/axis': [
    {
      title: { zh: '声明属性与配置', en: 'Declaration and configuration' },
      members: ['PlotAxisProps', 'IRPlotAxisGuide'],
      schemas: [
        'AxisGuideSchema',
        'AxisPlacementSchema',
        'AxisLineSchema',
        'AxisTicksSchema',
        'AxisTickDensitySchema',
        'AxisTickMarkSchema',
        'AxisTickLabelsSchema',
        'AxisTickLabelLayoutSchema',
        'AxisTickLabelAutoRotateSchema',
        'AxisTickLabelAutoHideSchema',
        'AxisTickLabelBoundsSchema',
        'AxisTitleSchema',
        'AxisGridSchema',
        'AxisGridComponentSchema',
        'GuideTargetSelectorSchema',
      ],
    },
  ],
  'viz/plot/guide/legend': [
    {
      title: { zh: '声明属性与配置', en: 'Declaration and configuration' },
      members: ['PlotLegendProps', 'IRPlotLegendGuide'],
      schemas: ['LegendGuideSchema', 'LegendGuideStyleSchema'],
    },
  ],
  'viz/plot/mark/point': [
    {
      title: { zh: '组件属性', en: 'Component properties' },
      members: ['PointMarkProps', 'IRPlotPointMark'],
      schemas: ['PointMarkSchema', 'MarkNodeLabelSchema'],
    },
  ],
  'viz/plot/channel': [
    {
      title: { zh: '编码输入', en: 'Encoding inputs' },
      members: [],
      schemas: [
        'ChannelSchema',
        'PositionEncodingSchema',
        'Position1DEncodingSchema',
        'Position2DEncodingSchema',
        'Position3DEncodingSchema',
        'VisualEncodingSchema',
        'NodeEncodingSchema',
        'PathEncodingSchema',
        'PointMarkEncodingSchema',
        'PathMarkEncodingSchema',
        'IntervalMarkEncodingSchema',
        'OpacityEncodingSchema',
        'LabelEncodingSchema',
        'LabelFontEncodingSchema',
        'NodeLabelEncodingSchema',
        'PathLabelEncodingSchema',
      ],
    },
    {
      title: { zh: '通道定义', en: 'Channel definitions' },
      members: [
        'ChannelDefinitionKind',
        'defineChannel',
        'defineNodeChannel',
        'defineLabelChannel',
        'definePathChannel',
        'defineScopeChannel',
        'PositionChannelDefinition',
        'MarkChannelDefinition',
        'NodeChannelDefinition',
        'PathChannelDefinition',
        'ScopeChannelDefinition',
        'ChannelDefinition',
        'AnyChannelDefinition',
        'ChannelOutputSpace',
      ],
    },
    {
      title: { zh: '解析上下文与结果', en: 'Resolution context and results' },
      members: [
        'ChannelDefinitionResolveContext',
        'NodeChannelDefinitionResolveContext',
        'PathChannelDefinitionResolveContext',
        'ScopeChannelDefinitionResolveContext',
        'ChannelPaletteContext',
        'ChannelValue',
        'ChannelValueResolver',
        'ChannelBindingResolver',
        'LabelResolver',
        'ChannelResolution',
        'MarkChannelResolution',
        'ScopeChannelResolution',
        'ScaleDescriptor',
        'MarkChannels',
        'LabelChannelDefinition',
        'LabelChannelDelivery',
        'LabelChannelTarget',
        'LabelHost',
      ],
    },
    {
      title: { zh: '属性交付', en: 'Property delivery' },
      members: [
        'NodeChannelDeliveryContext',
        'PathChannelDeliveryContext',
        'ScopeChannelDeliveryContext',
        'NodeChannelDelivery',
        'PathChannelDelivery',
        'ScopeChannelDelivery',
      ],
    },
    {
      title: { zh: '共享默认值', en: 'Shared defaults' },
      members: ['SIZE_MAX_RADIUS'],
    },
    {
      title: { zh: '定义构造', en: 'Definition factories' },
      members: ['ColorChannelDefinitionOptions', 'PlotPaint', 'makeColorChannelDefinition'],
    },
    {
      title: { zh: '字段与取值', en: 'Fields and values' },
      members: [
        'channelField',
        'channelScale',
        'markChannelEncoding',
        'FieldCollector',
        'channelValue',
        'labelOf',
        'MarkValueResolverOptions',
        'MarkValueResolution',
        'createMarkValueResolver',
      ],
    },
  ],
  'viz/data/provenance': [
    {
      title: { zh: '行来源', en: 'Row provenance' },
      members: ['SOURCE_INDEX', 'SOURCE_INDICES', 'tagSourceIndex', 'readSourceIndex', 'readSourceIndices'],
    },
    {
      title: { zh: '记录配置', en: 'Recording options' },
      members: ['DataLineageOptions', 'DataSourceIdentityMode', 'DataSourceIdentityOptions', 'DataValueSampleOptions'],
    },
    {
      title: { zh: '事件与结果', en: 'Events and results' },
      members: [
        'DataSourceIdentity',
        'DataLineageEvent',
        'DataLineageSourceEvent',
        'DataLineageTransformStepEvent',
        'DataLineageFieldFlowEvent',
        'DataLineageReducerEvent',
        'DataLineageSelectorEvent',
        'DataLineageSampleEvent',
        'DataLineageSink',
        'DataLineageRun',
      ],
    },
  ],
  'kernel/components/layout': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Layout / LayoutProps'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'LayoutExtensions',
        'LayoutRetainedRuntimeOptions',
        'LayoutRuntimeOptions',
        'LayoutStaticRuntimeOptions',
        'LayoutRuntimeMode',
        'scene',
        'layer',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputLayer', 'InputScene', 'InputSceneChildren', 'InputSceneLayers'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRScene', 'IRViewBox'],
      schemas: ['SceneSchema', 'ViewBoxSchema'],
    },
  ],
  'kernel/components/node': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Node / NodeProps', 'Text / TextProps', 'Coordinate / CoordinateProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'node / InputNode',
        'coordinate / InputCoordinate',
        'InputNodeLabel',
        'InputNodeLabelBoundaryPosition',
        'InputNodeLabelPosition',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['BoundaryFitContext', 'NodeTextColor'],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'BoundaryDefinition',
        'InputBoundaryDefinition',
        'ShapeDefinition',
        'InputShapeDefinition',
        'ShapeCircumscribedGeometry',
        'defineBoundary',
        'defineShape',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRCoordinate', 'IRNode', 'IRNodeLabel', 'IRNodeLayout', 'IRNodeStyle'],
      schemas: [
        'NodeSchema',
        'NodeStyleSchema',
        'NodeLayoutSchema',
        'NodeLabelSchema',
        'CoordinateSchema',
        'BoundarySchema',
        'BoundaryLabelSchema',
      ],
    },
  ],
  'kernel/components/path': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Path / PathProps', 'Draw / DrawProps', 'Step / StepProps'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'ArcStepProps',
        'AxisLineStepProps',
        'BendStepProps',
        'CirclePathStepProps',
        'CubicStepProps',
        'CurveStepProps',
        'CycleStepProps',
        'EllipsePathStepProps',
        'FoldStepProps',
        'LineStepProps',
        'MoveStepProps',
        'RectangleStepProps',
        'SmoothStepProps',
        'CanonicalPathLabelPlacement',
        'PathLabelGeometryOptions',
        'PathPositionMode',
        'PathPositionGeometry',
        'InputPathBoundaryLabel',
        'PathDefinitionCompileContext',
        'PathCompileResult',
        'WayDSL',
        'WayItem',
        'DrawWay',
        'resolvePathLabelPlacement',
        'samplePathRoute',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['path / InputPath', 'InputStep'],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'ArrowDefinition',
        'MarkDefinition',
        'MarkEmitContext',
        'PathDefinition',
        'definePath',
        'defineArrow',
        'defineMark',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '配置与校验',
        en: 'Configuration and validation',
      },
      members: [],
      schemas: [
        'PathSchema',
        'StepSchema',
        'MoveStepSchema',
        'LineStepSchema',
        'AxisLineStepSchema',
        'FoldStepSchema',
        'CycleStepSchema',
        'CurveStepSchema',
        'CubicStepSchema',
        'BendStepSchema',
        'ArcStepSchema',
        'CirclePathStepSchema',
        'EllipsePathStepSchema',
        'RectangleStepSchema',
        'SmoothStepSchema',
        'PathLabelSchema',
        'PathArrowSchema',
        'MarkStyleSchema',
        'PathMarkPlacementSchema',
        'ArrowDetailSchema',
        'ArrowStyleSchema',
      ],
    },
  ],
  'kernel/components/scope': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Scope / ScopeProps'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['ScopeStyleProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['scope / InputScope'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: [
        'IRScope',
        'IRScopeAnchorPosition',
        'IRScopeDefaults',
        'IRScopePosition',
        'IRScopePositionTarget',
        'IRScopeProps',
      ],
      schemas: [
        'ScopeSchema',
        'ScopePositionSchema',
        'ScopeAnchorPositionSchema',
        'ScopeSelfPointSchema',
        'ScopeDefaultsSchema',
        'ClipSchema',
        'RectClipSchema',
      ],
    },
  ],
  'kernel/packages/foundation': [
    {
      title: { zh: 'ID 分配', en: 'ID allocation' },
      members: ['IdAllocator', 'createIdAllocator'],
      schemas: [],
    },
    {
      title: {
        zh: '错误契约',
        en: 'Error contracts',
      },
      members: [
        'RetikzError',
        'RetikzFoundationError',
        'RetikzErrorOptions',
        'RetikzFoundationErrorCode',
        'isRetikzError',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '类型工具',
        en: 'Type utilities',
      },
      members: [
        'AssertEqual',
        'NonEmptyReadonlyArray',
        'OpenString',
        'ValueOf',
        'WithOptionalProperties',
        'WithRequiredProperties',
        'createOpenStringSchema',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '数据容器',
        en: 'Data containers',
      },
      members: ['JsonObject', 'JsonValue', 'assertPlainDataContainers', 'cloneAndFreezeJson', 'jsonStructuralEquals'],
      schemas: [],
    },
    {
      title: {
        zh: '校验与集合工具',
        en: 'Validation and collection utilities',
      },
      members: [
        'MergePropertiesOptions',
        'ComparePropertiesOptions',
        'compareProperties',
        'assertNonEmptyString',
        'assertPositiveNumber',
        'createReadonlyMap',
        'mergeDefinedProperties',
        'mergeProperties',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '颜色解析',
        en: 'Color parsing',
      },
      members: ['ParsedCssColor', 'staticCssNamedColorHexByName', 'compositeOpaqueColor', 'parseStaticCssColor'],
      schemas: [],
    },
    {
      title: {
        zh: '配置与校验',
        en: 'Configuration and validation',
      },
      members: [],
      schemas: [
        'JsonValueSchema',
        'JsonObjectSchema',
        'NonBlankStringSchema',
        'PositiveNumberSchema',
        'NonNegativeNumberSchema',
        'PositiveIntegerSchema',
        'NonNegativeIntegerSchema',
        'NormalizedFractionSchema',
      ],
    },
  ],
  'kernel/packages/inspect': [
    {
      title: {
        zh: '结果检查',
        en: 'Result inspection',
      },
      members: [
        'InspectionCompileOptions',
        'InspectionCompileResult',
        'InspectionRequest',
        'InspectionTarget',
        'InspectionDiagnostic',
        'InspectionDiagnosticOrigin',
        'InspectionPlane',
        'InspectionPlaneEntry',
        'compileInspectionToScene',
        'RetikzInspectError',
        'RetikzInspectErrorOptions',
        'RetikzInspectErrorCode',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '定义与注册',
        en: 'Definitions and registration',
      },
      members: [
        'InspectionAppearanceContext',
        'InspectionReadonly',
        'InspectorContext',
        'InspectorSubject',
        'InspectorSubjectValue',
        'InspectorCoordinateSpace',
        'InspectorFragment',
        'InspectorKey',
        'InspectorOutput',
        'InputAnyInspectorDefinition',
        'InputInspectorDefinition',
        'InspectorRegistry',
        'createDefaultInspectorRegistry',
        'createInspectorRegistry',
        'defineInspector',
        'mergeInspectorRegistries',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '内置检查',
        en: 'Built-in inspectors',
      },
      members: [
        'ClipInspectOptionsSchema',
        'GroupInspectOptionsSchema',
        'PathInspectOptionsSchema',
        'CLIP_INSPECTOR_KEY',
        'GROUP_INSPECTOR_KEY',
        'PATH_INSPECTOR_KEY',
      ],
      schemas: ['PathInspectOptionsSchema', 'GroupInspectOptionsSchema', 'ClipInspectOptionsSchema'],
    },
    {
      title: {
        zh: '独立呈现',
        en: 'Independent presentation',
      },
      members: [
        'InspectionOverlay / InspectionOverlayProps',
        'InspectionPresentationOptions',
        'InspectionPresentation',
        'InspectionView',
        'prepareInspectionPresentation',
        'renderInspectionToSvgString',
        'renderInspectionToCanvas',
        'mountInspection',
      ],
      schemas: [],
    },
  ],
  'kernel/packages/math': [
    {
      title: { zh: '角度与扫描', en: 'Angles and sweeps' },
      members: [
        'AngleRange',
        'DEG_TO_RAD',
        'RAD_TO_DEG',
        'alignAngleSweep',
        'normalizeAngleRange',
        'normalizeDegrees',
        'normalizeSignedDegrees',
      ],
      schemas: [],
    },
    {
      title: { zh: '轮廓与圆角', en: 'Contours and fillets' },
      members: [
        'ArcSegment',
        'ContourCommand',
        'ContourSegment',
        'FilletSolution',
        'LineSegment',
        'buildContourCommands',
        'intersectContourRay',
        'solveContourFillets',
        'rectOutline',
        'verticesToSegments',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '坐标变换',
        en: 'Coordinate transforms',
      },
      members: [
        'AffineMatrix',
        'applyAffine',
        'getAffineSimilarityScale',
        'isFiniteNonSingularAffine',
        'localToWorld',
        'multiplyAffine',
        'worldToLocal',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '形状与弧段',
        en: 'Shapes and arcs',
      },
      members: [
        'InputArcBoundingCandidates',
        'InputArcSweepAngle',
        'Circle',
        'Ellipse',
        'InputEllipseArcAnglePoint',
        'InputEllipseArcBoundingCandidates',
        'EllipseCircumscribeMode',
        'circle',
        'ellipse',
        'polygon',
        'triangle',
        'collectArcBoundingCandidates',
        'collectEllipseArcBoundingCandidates',
        'convexHull',
        'isAngleWithinArcSweep',
        'pointAtArcAngle',
        'pointAtEllipseArcAngle',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '边界与尺寸',
        en: 'Bounds and dimensions',
      },
      members: [
        'AxisAlignedBounds',
        'BoundsHalfAxes',
        'BoundsInsets',
        'BoundsRect',
        'CenteredBox',
        'CenteredShape',
        'boundsOf',
        'boundsToRect',
        'centerOfBounds',
        'cornersOfBounds',
        'expandBounds',
        'halfAxesOfBounds',
        'isFiniteBoundsRect',
        'isPositiveBoundsRect',
        'mergeBounds',
        'rectToBounds',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '几何相交',
        en: 'Geometric intersections',
      },
      members: [
        'InputCircleCircle',
        'InputLineCircle',
        'InputLineLine',
        'InputRayArcIntersection',
        'intersect',
        'intersectRayWithArc',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '曲线与采样',
        en: 'Curves and sampling',
      },
      members: [
        'CircularArcCurveSegment',
        'CubicBezierCurveSegment',
        'CubicSegment',
        'CurveApproximationOptions',
        'CurveLengthModel',
        'curveMetrics',
        'CurveParameterAtDistanceOptions',
        'CurveSegment',
        'CurveSegmentSample',
        'EllipseArcCurveSegment',
        'LineCurveSegment',
        'QuadraticBezierCurveSegment',
        'curve',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '向量与数值',
        en: 'Vectors and numbers',
      },
      members: [
        'Position',
        'Vector2',
        'AFFINE_IDENTITY',
        'DEFAULT_EPSILON',
        'point',
        'vector2',
        'isFiniteNumber',
        'isFinitePoint',
        'isInfiniteNumber',
        'lerp',
      ],
      schemas: [],
    },
  ],
  'kernel/packages/tex': [
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'TexLoweringOptions',
        'MathJaxEngineOptions',
        'MathJaxLowerTexOptions',
        'MathJaxSvgEngine',
        'TexLoweringDiagnostic',
        'MathJaxExtension',
        'MathJaxProfile',
        'createLowerTex',
        'createMathJaxEngine',
        'createMathJaxLowerTex',
        'MathJaxLowerTexState',
        'useLowerTex',
      ],
      schemas: [],
    },
  ],
  'kernel/visual/animation': [
    {
      title: {
        zh: '预设与编排',
        en: 'Presets and orchestration',
      },
      members: [
        'AnimationPresetOptions',
        'CameraToOptions',
        'ColorShiftOptions',
        'LoopOptions',
        'ScaleInOptions',
        'SlideInOptions',
        'cameraTo',
        'colorShift',
        'drawOn',
        'fadeIn',
        'loop',
        'scaleIn',
        'slideIn',
        'stagger',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '动画声明',
        en: 'Animation declarations',
      },
      members: [
        'IRAnimationTrack',
        'IRKeyframe',
        'AnimationDirection',
        'AnimationFill',
        'AnimationTrigger',
        'AnimationEasing',
        'AnimationProperty',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '播放与扩展',
        en: 'Playback and extensions',
      },
      members: ['AnimationControls'],
      schemas: [],
    },
    {
      title: {
        zh: '配置与校验',
        en: 'Configuration and validation',
      },
      members: [],
      schemas: ['AnimationTrackSchema'],
    },
  ],
  'kernel/visual/style': [
    {
      title: {
        zh: '图案',
        en: 'Patterns',
      },
      members: [
        'IRPatternLineStyle',
        'IRPatternLineStyleCycle',
        'IRPatternPaint',
        'PatternDefinition',
        'PatternEmitContext',
        'PatternEmitOutput',
        'PatternEmitResult',
        'BuiltinPatternShape',
        'definePattern',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '投影',
        en: 'Shadows',
      },
      members: ['IRDropShadow', 'ShadowPreset'],
      schemas: [],
    },
    {
      title: {
        zh: '混合',
        en: 'Blending',
      },
      members: ['BlendMode'],
      schemas: [],
    },
    {
      title: {
        zh: '配置与校验',
        en: 'Configuration and validation',
      },
      members: [],
      schemas: [
        'PatternPaintSchema',
        'PatternShapeNameSchema',
        'PatternLineStyleSchema',
        'PatternLineStyleOverrideSchema',
        'PatternLineStyleCycleSchema',
        'DropShadowSchema',
      ],
    },
  ],
  'library/extension/ribbon': [
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['RibbonCapContext', 'RibbonCapGeometry', 'RibbonWidthProfileContext'],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'RibbonCapDefinition',
        'InputRibbonWidthProfileDefinition',
        'ribbonPathDefinition',
        'createRibbonPathDefinition',
        'createRibbonProviderContribution',
        'defineRibbonCap',
        'defineRibbonWidthProfile',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '配置与校验',
        en: 'Configuration and validation',
      },
      members: [],
      schemas: [
        'RibbonPathSchema',
        'RibbonPathOptionsSchema',
        'RibbonLabelSchema',
        'CenterlineRibbonPathOptionsSchema',
        'BoundaryRibbonPathOptionsSchema',
        'RibbonWidthSchema',
        'FixedRibbonWidthSchema',
        'TaperRibbonWidthSchema',
        'RibbonEndpointSchema',
        'StopsRibbonWidthSchema',
        'ProfileRibbonWidthSchema',
        'RibbonArcCapSchema',
        'RibbonFixedSamplingSchema',
        'RibbonAdaptiveSamplingSchema',
        'RibbonDirectionSchema',
      ],
    },
  ],
  'library/layout/flex-layout': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['FlexLayout / FlexLayoutProps', 'FlexLayoutItem / FlexLayoutItemProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'flexLayout / InputFlexLayout',
        'InputFlexLayoutItem',
        'flexLayoutInputEmbedAdapter',
        'layoutInputEmbedAdapters',
        'createFlexLayout / InputFlexLayoutConfig',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'FlexLayoutArtifact',
        'InputFlexLayoutItemConfig',
        'FlexMainDistribution',
        'InputLayoutAxisSize',
        'InputLayoutSize',
        'FlexLayoutDirection',
        'FlexLayoutWrap',
        'LayoutAlignment',
        'LayoutAxisSizeKind',
        'LayoutDistribution',
        'LayoutItemKind',
        'LayoutOverflow',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRFlexLayout', 'IRFlexLayoutItem'],
      schemas: ['FlexLayoutSchema', 'LayoutItemSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['flexLayoutDefinition', 'flexLayoutProvider'],
      schemas: [],
    },
  ],
  'library/layout/grid-layout': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['GridLayout / GridLayoutProps', 'GridLayoutItem / GridLayoutItemProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'gridLayout / InputGridLayout',
        'InputGridLayoutItem',
        'gridLayoutInputEmbedAdapter',
        'createGridLayout / InputGridLayoutConfig',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'GridLayoutArtifact',
        'InputGridLayoutItemConfig',
        'InputGridPlacement',
        'InputGridTrackBreadth',
        'InputGridTrack',
        'LayoutTrackArtifact',
        'GRID_LAYOUT_MAX_TRACKS_PER_AXIS',
        'GridAutoFlow',
        'GridOverlap',
        'LayoutTrackSourceKind',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRGridLayout', 'IRGridLayoutItem'],
      schemas: ['GridLayoutSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['gridLayoutDefinition', 'gridLayoutProvider'],
      schemas: [],
    },
  ],
  'library/layout/overlay-layout': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['OverlayLayout / OverlayLayoutProps', 'OverlayLayoutItem / OverlayLayoutItemProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'overlayLayout / InputOverlayLayout',
        'InputOverlayLayoutItem',
        'overlayLayoutInputEmbedAdapter',
        'createOverlayLayout / InputOverlayLayoutConfig',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IROverlayLayout', 'IROverlayLayoutItem'],
      schemas: ['OverlayLayoutSchema'],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'OverlayLayoutArtifact',
        'InputOverlayLayoutItemConfig',
        'InputOverlayPlacement',
        'LayoutSizeParticipation',
        'OverlayPlacementKind',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['overlayLayoutDefinition', 'overlayLayoutProvider'],
      schemas: [],
    },
  ],
  'schematic/diagram/branch': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['BranchDiagram / BranchDiagramProps', 'BranchNode / BranchNodeProps', 'Branch / BranchProps'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'BranchDiagramLayoutHostProps',
        'branchDiagramEmbedKind',
        'BranchDiagramArtifact',
        'InputBranchLayout',
        'InputBranchLayoutNode',
        'BranchLayoutNodeOutput',
        'BranchLayoutOutput',
        'BranchLayoutSegmentOutput',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'branchDiagram / BranchDiagramInputEmbedProps',
        'normalizeBranchDiagram / InputBranchDiagram',
        'InputBranch',
        'InputBranchNode',
        'branchDiagramInputEmbedAdapter',
        'createBranchDiagramVanillaAdapters',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'branchDiagramDefinitionOptionsOf',
        'BranchDiagramDefinitionOptions',
        'BranchLayoutDefinition',
        'branchDiagramProviderKey',
        'lanesBranchLayoutDefinition',
        'createBranchDiagramProvider',
        'createBranchDiagramProviderContribution',
        'defineBranchLayout',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRBranch', 'IRBranchDiagram', 'IRBranchLayoutIntent', 'IRBranchNode'],
      schemas: [
        'BranchDiagramSchema',
        'BranchNodeSchema',
        'BranchSchema',
        'BranchLayoutIntentSchema',
        'BranchNodeLayoutSchema',
      ],
    },
  ],
  'schematic/diagram/flow': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: [
        'FlowDiagram / FlowDiagramProps',
        'FlowEntity / FlowEntityProps',
        'FlowEntities / FlowEntitiesProps',
        'FlowGroup / FlowGroupProps',
        'FlowLayout / FlowLayoutProps',
        'FlowRelation / FlowRelationProps',
        'FlowRelations / FlowRelationsProps',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'flowDiagram / FlowDiagramInputEmbedProps',
        'normalizeFlowDiagram / InputFlowDiagram',
        'flowDiagramInputEmbedAdapter',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'FlowBendRoute',
        'FlowBezierRoute',
        'FlowBezierRouting',
        'FlowDiagramArtifact',
        'FlowEndpointTarget',
        'FlowLayoutEndpoint',
        'FlowLayoutExecutionContext',
        'FlowLayoutLabelPlacement',
        'InputFlowLayoutRelation',
        'FlowLayoutRelationOutput',
        'FlowLayoutRoute',
        'FlowLayoutRouting',
        'FlowRoutePointsQuery',
        'FlowRoutingCapability',
        'FlowSmoothRoute',
        'FlowSmoothRouting',
        'getFlowLayoutCatalog',
        'routeFlowRelations',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'FlowDiagramDefinitionOptions',
        'FlowLayoutDefinition',
        'createFlowDiagramProviderContribution',
        'defineFlowLayout',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRFlowDiagram', 'IRFlowEndpoint'],
      schemas: [
        'FlowDiagramSchema',
        'FlowEntitySchema',
        'FlowGroupSchema',
        'FlowLayoutSchema',
        'FlowEndpointSchema',
        'FlowEndpointTargetSchema',
        'FlowRelationSchema',
        'FlowRoutingSchema',
        'FlowDefaultsSchema',
      ],
    },
  ],
  'schematic/graph/block': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: [
        'Block / BlockProps',
        'BlockHeader / BlockHeaderProps',
        'BlockSection / BlockSectionProps',
        'BlockRow / BlockRowProps',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'block / BlockInputEmbedProps',
        'blockHeader / BlockHeaderInputEmbedProps',
        'blockSection / BlockSectionInputEmbedProps',
        'blockRow / BlockRowInputEmbedProps',
        'normalizeBlock / InputBlock',
        'normalizeBlockHeader / InputBlockHeader',
        'normalizeBlockSection / InputBlockSection',
        'normalizeBlockRow / InputBlockRow',
        'blockHeaderInputEmbedAdapter',
        'blockInputEmbedAdapter',
        'blockRowInputEmbedAdapter',
        'blockSectionInputEmbedAdapter',
        'createGraphVanillaAdapters',
        'createBlock / BlockCreateOptions',
        'createBlockHeader / BlockHeaderCreateOptions',
        'createBlockSection / BlockSectionCreateOptions',
        'createBlockRow / BlockRowCreateOptions',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['CodeBlockComposeContext', 'CodeBlockTokens'],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'CodeBlockDefinition',
        'GraphDefinitionOptions',
        'createCodeBlockContribution',
        'createGraphDefinitions',
        'createGraphProviders',
        'defineCodeBlock',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: [
        'IRBlock',
        'IRBlockHeader',
        'IRBlockRow',
        'IRBlockSection',
        'IRBlockText',
        'IRCodeBlock',
        'IRCodeBlockProps',
        'IRCodeLogic',
        'IRCodeMethod',
        'IRCodeParameter',
        'IRCodeProperty',
        'IRCodeSignature',
      ],
      schemas: [
        'BlockSchema',
        'BlockHeaderSchema',
        'BlockSectionSchema',
        'BlockRowSchema',
        'BlockTextSchema',
        'CodeBlockPropsSchema',
        'CodeParameterSchema',
        'CodeSignatureSchema',
        'CodePropertySchema',
        'CodeMethodSchema',
        'CodeLogicSchema',
      ],
    },
  ],
  'schematic/graph/entity': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Entity / EntityProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'entity / EntityInputEmbedProps',
        'normalizeEntity / InputEntity',
        'entityInputEmbedAdapter',
        'createGraphVanillaAdapters',
        'createEntity / EntityCreateOptions',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'EntityKindDefinition',
        'EntityPredicateDefinition',
        'InputEntityPredicateDefinition',
        'EntityRoleDefinition',
        'GraphDefinitionOptions',
        'createGraphDefinitions',
        'createGraphProviders',
        'defineEntityKind',
        'defineEntityPredicate',
        'defineEntityRole',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRGraphEntity'],
      schemas: ['EntitySchema', 'EntityRoleSchema'],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['BuiltinEntityRole', 'GraphStatus'],
      schemas: [],
    },
  ],
  'schematic/graph/relation': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Relation / RelationProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'relation / RelationInputEmbedProps',
        'normalizeRelation / InputRelation',
        'InputRelationEndpoint',
        'InputRelationRoute',
        'InputRelationWay',
        'relationInputEmbedAdapter',
        'createGraphVanillaAdapters',
        'createRelation / RelationCreateOptions',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'GraphDefinitionOptions',
        'RelationKindDefinition',
        'RelationPredicateDefinition',
        'InputRelationPredicateDefinition',
        'RelationRoleDefinition',
        'createGraphDefinitions',
        'createGraphProviders',
        'defineRelationKind',
        'defineRelationPredicate',
        'defineRelationRole',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: [
        'IRGraphRelation',
        'IRGraphRelationMarkerAppearance',
        'IRGraphRelationMarkerRecipe',
        'IRGraphRelationRoleTokenRecipe',
        'IRGraphRelationRouteStep',
        'IRGraphRelationStructureTokenOverrides',
      ],
      schemas: [
        'RelationSchema',
        'RelationRoleSchema',
        'RelationKindSchema',
        'RelationDirectionSchema',
        'GraphRelationMarkerAppearanceSchema',
        'GraphRelationRouteStepSchema',
      ],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['BuiltinRelationRole', 'GraphStatus', 'RelationDirection'],
      schemas: [],
    },
  ],
  'viz/data/model': [
    {
      title: {
        zh: '数据与字段声明',
        en: 'Data and field declarations',
      },
      members: [
        'ExternalDatasets',
        'ExternalRow',
        'FieldResolution',
        'IRDataFieldDefinition',
        'IRDataModel',
        'IRDataReference',
        'ParsedFieldValue',
        'FieldResolver',
        'DataFieldType',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '字段格式',
        en: 'Field formats',
      },
      members: [
        'FieldFormat',
        'FieldFormatDefinition',
        'BUILTIN_FORMATS',
        'BuiltinDataFieldFormat',
        'defineFieldFormat',
        'resolveFormatRegistry',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '字段排序',
        en: 'Field ordering',
      },
      members: [
        'FieldOrderContext',
        'FieldOrderDefinition',
        'BUILTIN_FIELD_ORDERS',
        'BuiltinFieldOrderMode',
        'defineFieldOrder',
        'resolveCategoryDomain',
        'resolveFieldOrderRegistry',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '配置与校验',
        en: 'Configuration and validation',
      },
      members: [],
      schemas: ['DataReferenceSchema', 'DataModelSchema', 'FieldDefinitionSchema'],
    },
  ],
  'viz/data/transform': [
    {
      title: {
        zh: '变换声明',
        en: 'Transform declarations',
      },
      members: ['IRDataTransform', 'IRDataTransformDeclaration'],
      schemas: ['TransformSchema', 'DataTransformDeclarationSchema', 'ExternalTransformSchema'],
    },
    {
      title: {
        zh: '变换定义与实现',
        en: 'Transform definitions and implementations',
      },
      members: [
        'TransformDefinition',
        'InputTransformDefinition',
        'AnyTransformDefinition',
        'TransformSemanticContext',
        'TransformImplementation',
        'AnyTransformImplementation',
        'AnySynchronousTransformImplementation',
        'TransformContext',
        'DEFAULT_TRANSFORM_CONTEXT',
        'defineTransform',
        'defineTransformImplementation',
        'extractTransformKind',
        'resolveTransformRegistry',
        'resolveTransformImplementationRegistry',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '行选择',
        en: 'Row selection',
      },
      members: [
        'IRDataSelectorOperation',
        'RowSelection',
        'RowSelectorDefinition',
        'AnyRowSelectorDefinition',
        'RowSelectorImplementation',
        'AnyRowSelectorImplementation',
        'AnySynchronousRowSelectorImplementation',
        'defineRowSelector',
        'defineRowSelectorImplementation',
        'resolveRowSelectorRegistry',
        'resolveRowSelectorImplementationRegistry',
      ],
      schemas: ['SelectorOperationSchema'],
    },
    {
      title: {
        zh: '统计归约',
        en: 'Statistical reduction',
      },
      members: [
        'IRDataReducerOperation',
        'IRDataReducerMetrics',
        'StatisticsReducerDefinition',
        'AnyStatisticsReducerDefinition',
        'StatisticsReducerImplementation',
        'AnyStatisticsReducerImplementation',
        'AnySynchronousStatisticsReducerImplementation',
        'defineStatisticsReducer',
        'defineStatisticsReducerImplementation',
        'extractStatisticOperation',
        'resolveStatisticsReducerRegistry',
        'resolveStatisticsReducerImplementationRegistry',
      ],
      schemas: ['ReducerOperationSchema', 'ReducerMetricsSchema'],
    },
    {
      title: {
        zh: '回归拟合',
        en: 'Regression fitting',
      },
      members: [
        'IRRegressionMethod',
        'RegressionPair',
        'RegressionScore',
        'evaluateRegression',
        'RegressionFitOptions',
        'RegressionFitContext',
        'RegressionDependency',
        'RegressionModel',
        'RegressionResolution',
        'RegressionDefinition',
        'AnyRegressionDefinition',
        'RegressionImplementation',
        'AnyRegressionImplementation',
        'AnySynchronousRegressionImplementation',
        'defineRegression',
        'defineRegressionImplementation',
        'extractRegressionKind',
        'resolveRegression',
        'resolveRegressionRegistry',
        'resolveRegressionImplementationRegistry',
      ],
      schemas: ['RegressionMethodSchema'],
    },
    {
      title: {
        zh: '字段模型与阶段解析',
        en: 'Field models and stage resolution',
      },
      members: [
        'DataTransformModel',
        'DataTransformInputDescriptor',
        'DataTransformOutputDescriptor',
        'DataTransformOutputModel',
        'DataTransformFieldEffect',
        'DataTransformBindingClass',
        'DataTransformPhase',
        'DataTransformDependency',
        'DataTransformStage',
        'DataTransformResolution',
        'DataTransformResolveOptions',
        'collectTransformFields',
        'describeDataTransformInput',
        'resolveDataTransforms',
        'resolveDataTransformOutputModel',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '执行与调度',
        en: 'Execution and scheduling',
      },
      members: [
        'IRDataExecution',
        'DataInputBinding',
        'DataInputBindings',
        'InputDataTransformStage',
        'DataTransformExecutionRequirements',
        'DataTransformStageSupport',
        'DataTransformStageImplementation',
        'DataTransformImplementationProvider',
        'DataTransformProviderRegistration',
        'DataTransformRequestOptions',
        'DataTransformExecutionOptions',
        'DataTransformPreparation',
        'DataTransformSchedule',
        'DataTransformExecution',
        'DataTransformExecutor',
        'DataTransformResult',
        'DataTransformDiagnostic',
        'resolveDataExecution',
        'createDataTransformExecutor',
        'executeDataTransforms',
        'ingestDataTransformResult',
      ],
      schemas: ['DataExecutionSchema'],
    },
    {
      title: {
        zh: '同步调用',
        en: 'Synchronous calls',
      },
      members: [
        'applyTransforms',
        'ApplyTransformsOptions',
        'ApplyTransformsResult',
        'applyTransformsToDataView',
        'ApplyTransformsToDataViewResult',
      ],
      schemas: [],
    },
  ],
  'library/standard/collection/array': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Array / ArrayProps', 'ArrayItem / ArrayItemProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['array / InputArray', 'arrayInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRArray', 'IRArrayCell', 'IRArrayIndexOptions', 'IRArrayIndexStyle'],
      schemas: ['ArraySchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['arrayDefinition', 'arrayProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createArray', 'getArrayCellId'],
      schemas: [],
    },
  ],
  'library/standard/collection/chain': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: [
        'Chain / ChainProps',
        'ChainCell / ChainCellProps',
        'ChainParallel / ChainParallelProps',
        'ChainBranch / ChainBranchProps',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['chain / InputChain', 'chainInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRChain'],
      schemas: ['ChainSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['chainDefinition', 'chainProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createChain'],
      schemas: [],
    },
  ],
  'library/standard/collection/map': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Map / MapProps', 'MapEntry / MapEntryProps', 'MapKey / MapKeyProps', 'MapValue / MapValueProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['map / InputMap', 'mapInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRMap'],
      schemas: ['MapSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['mapDefinition', 'mapProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createMap'],
      schemas: [],
    },
  ],
  'library/standard/collection/matrix': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Matrix / MatrixProps', 'MatrixRow / MatrixRowProps', 'MatrixCell / MatrixCellProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['matrix / InputMatrix', 'matrixInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRMatrix', 'IRMatrixAxisIndex'],
      schemas: ['MatrixSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['matrixDefinition', 'matrixProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createMatrix', 'getMatrixCellId'],
      schemas: [],
    },
  ],
  'library/standard/collection/queue': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Queue / QueueProps', 'QueueItem / QueueItemProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['queue / InputQueue', 'queueInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRQueue'],
      schemas: ['QueueSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['queueDefinition', 'queueProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createQueue'],
      schemas: [],
    },
  ],
  'library/standard/collection/stack': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Stack / StackProps', 'StackItem / StackItemProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['stack / InputStack', 'stackInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRStack'],
      schemas: ['StackSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['stackDefinition', 'stackProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createStack'],
      schemas: [],
    },
  ],
  'library/standard/collection/tree': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Tree / TreeProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['tree / InputTree', 'treeInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRTree'],
      schemas: ['TreeSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['treeDefinition', 'treeProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createTree'],
      schemas: [],
    },
  ],
  'library/standard/presentation/axes': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Axes / AxesProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['axesInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['axes', 'InputAxes', 'createAxes'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRAxes'],
      schemas: ['AxesSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['axesDefinition', 'axesProvider'],
      schemas: [],
    },
  ],
  'library/standard/presentation/frame': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Frame / FrameProps', 'FrameTitle / FrameTitleProps', 'FrameDescription / FrameDescriptionProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputFrame', 'frameInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'frame',
        'frameDescription',
        'frameTitle',
        'InputFrameDescription',
        'InputFrameConfig',
        'InputFrameTitle',
        'createFrame',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRFrame'],
      schemas: ['FrameSchema', 'FrameTitleSchema', 'FrameDescriptionSchema', 'FrameBorderSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['frameDefinition', 'frameProvider'],
      schemas: [],
    },
  ],
  'library/standard/presentation/grid': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Grid / GridProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['gridInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['grid', 'InputGrid', 'InputGridLine', 'createGrid'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRGrid'],
      schemas: ['GridSchema', 'GridLineInputSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['gridDefinition', 'gridProvider'],
      schemas: [],
    },
  ],
  'library/standard/presentation/legend': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: [
        'Legend / LegendProps',
        'LegendTitle / LegendTitleProps',
        'LegendItem / LegendItemProps',
        'LegendRamp / LegendRampProps',
        'LegendTick / LegendTickProps',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputLegend', 'legendInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['legend', 'LegendArtifact', 'LegendCompileArtifact', 'InputLegendConfig', 'createLegend'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRLegend', 'IRLegendItem', 'IRLegendItemsContent', 'IRLegendRampContent', 'IRLegendTick'],
      schemas: ['LegendSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['legendDefinition', 'legendProvider'],
      schemas: [],
    },
  ],
  'library/standard/presentation/surface': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Surface / SurfaceProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputSurface', 'InputSurfaceChild', 'surfaceInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['surface', 'surfaceChild', 'InputSurfaceConfig', 'createSurface'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRSurface'],
      schemas: ['SurfaceSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['surfaceDefinition', 'surfaceProvider'],
      schemas: [],
    },
  ],
  'library/standard/shape/arc-sector': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Arc / ArcProps', 'Sector / SectorProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputArc', 'InputSector', 'arcInputEmbedAdapter', 'sectorInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRArc', 'IRSector'],
      schemas: ['ArcSchema', 'SectorSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['arcDefinition', 'arcProvider', 'sectorDefinition', 'sectorProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createArc', 'createSector'],
      schemas: [],
    },
  ],
  'library/standard/shape/circle-ellipse': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Circle / CircleProps', 'Ellipse / EllipseProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputCircle', 'InputEllipse', 'circleInputEmbedAdapter', 'ellipseInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRCircle', 'IREllipse'],
      schemas: ['CircleSchema', 'EllipseSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['circleDefinition', 'circleProvider', 'ellipseDefinition', 'ellipseProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createCircle', 'createEllipse'],
      schemas: [],
    },
  ],
  'library/standard/shape/polygon': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Polygon / PolygonProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputPolygon', 'polygonInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRPolygon'],
      schemas: ['PolygonSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['polygonDefinition', 'polygonProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createPolygon'],
      schemas: [],
    },
  ],
  'library/standard/shape/rectangle': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Rectangle / RectangleProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputRectangle', 'rectangleInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRRectangle'],
      schemas: ['RectangleSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['rectangleDefinition', 'rectangleProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createRectangle'],
      schemas: [],
    },
  ],
  'library/standard/shape/star': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Star / StarProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputStar', 'starInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRStar'],
      schemas: ['StarSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['starDefinition', 'starProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createStar'],
      schemas: [],
    },
  ],
  'schematic/graph/group': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Group / GroupProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'group / GroupInputEmbedProps',
        'normalizeGroup / InputGroup',
        'groupInputEmbedAdapter',
        'createGraphVanillaAdapters',
        'createGroup / GroupCreateOptions',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['GraphDefinitionOptions', 'createGraphDefinitions', 'createGraphProviders'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRGroup', 'IRGroupCaption', 'IRGroupCaptionText'],
      schemas: [
        'GroupSchema',
        'GroupCaptionSchema',
        'GroupCaptionTextSchema',
        'GroupCaptionSideSchema',
        'GroupCaptionDirectionSchema',
      ],
    },
  ],
};
