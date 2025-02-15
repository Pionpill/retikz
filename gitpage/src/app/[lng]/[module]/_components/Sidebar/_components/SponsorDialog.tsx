'use client';
import ContactDialog from '@/components/shared/contact-dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Typography } from '@/components/ui/typography';
import useClientTrans from '@/hooks/useClientTrans';
import { Coffee } from 'lucide-react';
import { FC } from 'react';

const SponsorDialog: FC = () => {
  const { t } = useClientTrans();

  return (
    <ContactDialog
      icon={<Coffee className="text-red-500" />}
      label={t('sponsor')}
      imgUrl="https://q2.qlogo.cn/headimg_dl?dst_uin=673486387&spec=100"
      title={t('wechatPay')}
      content={<Typography>{t('sponsorMe')}</Typography>}
      qrCodeUrl="wxp://f2f0Yjq6V1UceqPynyK1QLZnrBC-Gq6H7sMGFH2YhFbWjIFCSju7eAlGnFSSNqeGhxbM"
      bottomContent={t('sponsorThanks')}
      trigger={
        <DropdownMenuItem>
          <Coffee />
          <Typography className="text-sm">{t('sponsorAuthor')}</Typography>
        </DropdownMenuItem>
      }
    />
  );
};

export default SponsorDialog;
