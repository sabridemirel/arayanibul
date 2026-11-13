import { useNavigate } from 'react-router-dom';
import { ClockIcon, ExclamationTriangleIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';
import type { Need } from '../services/api';

interface NeedModerationNoticeProps {
  need: Pick<Need, 'status' | 'rejectionReasonText' | 'rejectionNote'>;
  compact?: boolean;
  className?: string;
}

/**
 * Owner-facing explanation for needs that are not public yet (PendingReview) or were not
 * published (Rejected). The web app has no edit page, so a rejected need is replaced by a new one.
 */
const NeedModerationNotice: React.FC<NeedModerationNoticeProps> = ({ need, compact = false, className = '' }) => {
  const navigate = useNavigate();

  if (need.status === 'PendingReview') {
    return (
      <div className={`flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 ${className}`}>
        <ClockIcon className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900">
          İlanınız inceleniyor. Onaylandıktan sonra yayınlanacak ve teklif almaya başlayacak.
        </p>
      </div>
    );
  }

  if (need.status !== 'Rejected') return null;

  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 p-3 ${className}`}>
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 text-sm text-red-900">
          <p className="font-semibold">
            Bu ilan yayınlanmadı{need.rejectionReasonText ? `: ${need.rejectionReasonText}` : '.'}
          </p>
          {need.rejectionNote && <p className="mt-1 whitespace-pre-wrap break-words">{need.rejectionNote}</p>}
          {!compact && (
            <p className="mt-2 text-red-900/80">
              Yayınlanmayan ilanlar düzenlenemez. Kurallara uygun şekilde yeni bir ilan verebilirsiniz.
            </p>
          )}
        </div>
      </div>
      {!compact && (
        <div className="mt-3">
          <Button size="sm" leftIcon={<PlusCircleIcon className="h-4 w-4" />} onClick={() => navigate('/create-need')}>
            Yeni İlan Ver
          </Button>
        </div>
      )}
    </div>
  );
};

export default NeedModerationNotice;
