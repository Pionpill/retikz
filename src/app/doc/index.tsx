import { SidebarProvider } from '@/components/ui/sidebar';
import { FC } from 'react';
import { SideContent, SideMenu } from './components/side-bar';
import { useLocation } from 'react-router';

const Doc: FC = () => {
  const { pathname } = useLocation();
  console.log('pathname', pathname);

  return (
    <SidebarProvider>
      <SideMenu />
      <SideContent>
        TODO
      </SideContent>
    </SidebarProvider>
  );
};

export default Doc;
