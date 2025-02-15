import { SidebarMenu, SidebarMenuButton } from '@/components/ui/sidebar';
import { Typography } from '@/components/ui/typography';
import { LocaleTypes } from '@/config';
import useTrans from '@/hooks/useTrans';
import { BookMarked } from 'lucide-react';
import { FC } from 'react';

export type HeaderInfoProps = {
  lng: LocaleTypes;
  module: string;
};

const HeaderInfo: FC<HeaderInfoProps> = async props => {
  const { lng, module } = props;
  const { t } = await useTrans(lng);

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
