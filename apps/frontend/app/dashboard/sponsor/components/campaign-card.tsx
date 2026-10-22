import type { Campaign } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { campaignStatuses } from '../../presentation';
import { CampaignEditor } from './campaign-editor';

const statusTones: Record<Campaign['status'], string> = {
  DRAFT: 'neutral',
  PENDING_REVIEW: 'amber',
  APPROVED: 'blue',
  ACTIVE: 'green',
  PAUSED: 'amber',
  COMPLETED: 'blue',
  CANCELLED: 'neutral',
};

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const progress =
    Number(campaign.budget) > 0 ? (Number(campaign.spent) / Number(campaign.budget)) * 100 : 0;
  const dateOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  };

  return (
    <article className="dashboard-card">
      <div className="dashboard-card-heading">
        <span className={`dashboard-status dashboard-status-${statusTones[campaign.status]}`}>
          <span aria-hidden="true" />
          {campaignStatuses[campaign.status]}
        </span>
        <span className="dashboard-card-kind">Campaign</span>
      </div>
      <h3>{campaign.name}</h3>
      <p className="dashboard-card-description">
        {campaign.description || 'No description added.'}
      </p>
      <div className="dashboard-card-details">
        <p className="dashboard-money-label">Campaign budget</p>
        <p className="dashboard-money">{formatPrice(Number(campaign.budget))}</p>
        <div className="dashboard-spending">
          <span>{formatPrice(Number(campaign.spent))} spent</span>
          <span>{Math.round(progress)}% used</span>
        </div>
        <div
          className="dashboard-progress"
          role="progressbar"
          aria-label="Budget used"
          aria-valuenow={Math.max(0, Math.min(progress, 100))}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${formatPrice(Number(campaign.spent))} of ${formatPrice(Number(campaign.budget))} spent`}
        >
          <div style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} />
        </div>
        <p className="dashboard-dates">
          <time dateTime={campaign.startDate}>
            {new Date(campaign.startDate).toLocaleDateString('en-US', dateOptions)}
          </time>
          <span aria-hidden="true"> – </span>
          <span className="sr-only"> to </span>
          <time dateTime={campaign.endDate}>
            {new Date(campaign.endDate).toLocaleDateString('en-US', dateOptions)}
          </time>
        </p>
      </div>
      <CampaignEditor campaign={campaign} />
    </article>
  );
}
