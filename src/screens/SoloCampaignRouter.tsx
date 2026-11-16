import { useParams } from 'react-router-dom';
import { useSoloCampaigns } from '../store/soloCampaign';
import HiveCampaignScreen from './HiveCampaignScreen';
import SoloCampaignScreen from './SoloCampaignScreen';

export default function SoloCampaignRouter() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { getCampaign, ready } = useSoloCampaigns();
  if (!ready) return <p className="font-body text-ink" role="status">Loading campaign…</p>;
  return getCampaign(campaignId)?.kind === 'hive' ? <HiveCampaignScreen /> : <SoloCampaignScreen />;
}
