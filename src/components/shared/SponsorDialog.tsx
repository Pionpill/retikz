import ContactDialog, { ContactDialogProps } from '@/components/shared/ContactDialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Typography } from '@/components/ui/typography';
import { Coffee } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

const SponsorDialog: FC<Partial<ContactDialogProps>> = props => {
  const { t } = useTranslation();

  return (
    <ContactDialog
      icon={<Coffee className="text-red-500" />}
      label={t('common.sponsor')}
      imgUrl="https://q2.qlogo.cn/headimg_dl?dst_uin=673486387&spec=100"
      title={t('wechatPay')}
      content={<Typography>{t('common.sponsorMe')}</Typography>}
      qrCodeUrl="wxp://f2f0Yjq6V1UceqPynyK1QLZnrBC-Gq6H7sMGFH2YhFbWjIFCSju7eAlGnFSSNqeGhxbM"
      bottomContent={t('common.sponsorThanks')}
      trigger={
        <DropdownMenuItem>
          <Coffee />
          <Typography className="text-sm">{t('common.sponsorAuthor')}</Typography>
        </DropdownMenuItem>
      }
      {...props}
    />
  );
};

export default SponsorDialog;
