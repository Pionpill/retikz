import { SidebarMenu, SidebarMenuButton } from '@/components/ui/sidebar';
import { Typography } from '@/components/ui/typography';
import useModule from '@/hooks/useModule';
import { BookMarked } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

const HeaderInfo: FC = () => {
  const { t } = useTranslation();
  const module = useModule();

  return (
    <SidebarMenu>
      <SidebarMenuButton size="lg">
        <div className="size-8 rounded-md p-1 bg-primary text-primary-foreground hover:bg-primary/80">
          <BookMarked />
        </div>
        <div className="flex flex-col flex-1 text-left">
          <Typography className="font-semibold">{t(`doc.${module}.title`)}</Typography>
          <Typography className="text-xs">0.0.1-rc.0 {t(`doc.${module}.description`)}</Typography>
        </div>
      </SidebarMenuButton>
    </SidebarMenu>
  );
};

export default HeaderInfo;
