import { getRawApi } from '@/api/github';
import { SidebarProvider } from '@/components/ui/sidebar';
import useModule from '@/hooks/useModule';
import useLang from '@/hooks/useLang';
import { FC, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { SideContent, SideMenu } from './components/side-bar';
import { moduleConfig } from './config/module';
import MdxContent from '@/components/shared/mdx';
import MdxToc from './MdxToc';

const Doc: FC = () => {
  const module = useModule();
  const { lang } = useLang();
  const [searchParams] = useSearchParams();
  const path = searchParams.get('path')!;

  const [source, setSource] = useState('');
  const [mdxStatus, setMdxStatus] = useState<'compiling' | 'error' | 'no-content' | 'compiled' | 'rendered'>(
    'no-content',
  );
  const mdxRef = useRef<HTMLDivElement>(null!);
  const contentRef = useRef<HTMLDivElement>(null!);

  useEffect(() => {
    if (!path) return;

    getRawApi(moduleConfig[module].repos, `doc/${lang}/${path}`).then(res => {
      setSource(res);
    });
  }, [module, lang, path]);

  return (
    <SidebarProvider>
      <SideMenu />
      <SideContent>
        <div className="flex relative max-h-full overflow-auto" ref={contentRef}>
          <div className="flex-1 my-4 flex justify-center">
            <MdxContent ref={mdxRef} content={source} onStatusChange={setMdxStatus} />
          </div>
          {mdxStatus === 'rendered' && (
            <MdxToc mdxRef={mdxRef} path={path} contentRef={contentRef} mdxStatus={mdxStatus} />
          )}
        </div>
      </SideContent>
    </SidebarProvider>
  );
};

export default Doc;
