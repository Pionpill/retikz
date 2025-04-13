'use client';
import { FC, ReactElement, useMemo, useState } from 'react';
import MarkdownCode from './MarkdownCode';
import { Button } from '@/components/ui/button';
import { PanelBottomClose, PanelTopClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type ReactFiberElement = {
  props: {
    children?: ReactFiberElement[];
    [key: string]: unknown;
  };
  type: {
    (props: unknown[]): unknown;
    displayName: string;
    name: string;
  };
};

export type CodeStringNode = ReactFiberElement | ReactFiberElement[] | string;

const getCodeString = (node: CodeStringNode, indentSize = 2): string => {
  // 如果是数组，递归处理每个子节点
  if (Array.isArray(node)) {
    return node.map(child => getCodeString(child)).join('\n');
  }

  // 如果是对象（React 元素），提取其类型和属性
  if (typeof node === 'object') {
    const { type, props } = node;
    const typeName = type.displayName ?? type;

    // 处理子节点
    const childrenCode = props.children
      ? Array.isArray(props.children)
        ? props.children.map(child => getCodeString(child)).join('\n')
        : getCodeString(props.children)
      : '';

    // 将属性转换为字符串
    const propsCode = Object.keys(props)
      .filter(key => key !== 'children') // 排除 children
      .map(key => {
        const value = props[key];
        if (typeof value === 'boolean') {
          return value ? key : '';
        } else if (typeof value === 'function') {
          return `${key}={${value.name}}`;
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          return `${key}={${JSON.stringify(value)}}`;
        } else {
          return `${key}={${JSON.stringify(value)}}`;
        }
      })
      .filter(Boolean) // 过滤掉空字符串
      .join(' ');

    // 生成单行版本
    const singleLine = `<${typeName}${propsCode ? ' ' + propsCode : ''}>${childrenCode}</${typeName}>`;

    // 检查单行长度
    if (singleLine.length <= 120) {
      return `${singleLine}`;
    }

    // 返回多行版本
    return `<${typeName}${propsCode ? ' ' + propsCode : ''}>\n${
      childrenCode
        ? childrenCode
            .split('\n')
            .map(line => `${' '.repeat(indentSize)}${line}`)
            .join('\n')
        : ''
    }\n</${typeName}>`;
  }

  // 如果是字符串或数字，直接返回
  return `${String(node)}`;
};

export type CodeSpaceProps = {
  /** true: 始终显示，false: 始终不显示，click: 显示按钮，hover: 悬浮时显示按钮 */
  showCode: boolean | 'click' | 'hover';
  children: ReactElement;
  lang?: string;
};

const CodeSpace: FC<CodeSpaceProps> = props => {
  const { showCode = 'hover', lang, children } = props;
  const [isCodeVisible, setIsCodeVisible] = useState(showCode === true);
  const { t } = useTranslation();

  // 获取子组件的源代码
  const codeString = useMemo(() => getCodeString(children as unknown as CodeStringNode), [children]);

  return (
    <div data-visible={isCodeVisible} className=" relative group mt-6">
      <div className="flex items-center">
        {children}
        {typeof showCode === 'boolean' ? null : (
          <Button
            className={cn('absolute top-2 right-2', { 'opacity-0 group-hover:opacity-100': showCode === 'hover' })}
            variant="secondary"
            size="icon"
            onClick={() => setIsCodeVisible(!isCodeVisible)}
          >
            {isCodeVisible ? <PanelTopClose /> : <PanelBottomClose />}
            {isCodeVisible ? t('closeCode') : t('showCode')}
          </Button>
        )}
      </div>

      {/* 渲染代码部分 */}
      {showCode === false ? null : (
        <MarkdownCode className={`language-${lang} hidden group-data-[visible=true]:block`}>{codeString}</MarkdownCode>
      )}
    </div>
  );
};

export default CodeSpace;
