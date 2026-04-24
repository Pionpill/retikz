import { SidebarProvider } from '@/components/ui/sidebar';
import useLang from '@/hooks/useLang';
import type { FC} from 'react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { SideContent, SideMenu } from './components/side-bar';
import { getMdxSource } from './content';
import MdxContent from '@/components/shared/mdx';
import MdxToc from './MdxToc';

const Doc: FC = () => {
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
    setSource(getMdxSource(lang, path));
  }, [lang, path]);

  return (
    <SidebarProvider>
      <SideMenu />
      <SideContent>
        <div className="flex relative max-h-full overflow-auto" ref={contentRef}>
          <div className="flex-1 my-4 flex justify-center px-4">
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
