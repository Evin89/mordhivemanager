import { Link } from 'react-router-dom';
import { useWarbands } from '../store/warbands';
import { getWarbandTypeName } from '../data/warbandRegistry';
import { computeWarbandRating, countModels } from '../lib/rating';
import Plate from '../components/Plate';
import ChevronRail from '../components/ChevronRail';
export default function WarbandsListScreen() {
 const { warbands } = useWarbands();
 return <div className="space-y-6"><div><div className="dossier-band"><h1>Your warbands</h1></div><ChevronRail /></div>
 {warbands.length === 0 && <Plate className="p-6"><p>No warbands yet. Muster one to start fighting over the hive.</p></Plate>}
 <div className="space-y-4">{warbands.map(w => <Link key={w.id} to={`/warbands/${w.id}`} className="block"><Plate className="p-5 hover:bg-page"><h2 className="text-[28px]">{w.name}</h2><p className="italic text-secondary">{getWarbandTypeName(w.warbandType)}</p><div className="metrics"><div><strong>{computeWarbandRating(w)}</strong><span>Rating</span></div><div><strong>{w.gold} tn</strong><span>Thrones</span></div><div><strong>{countModels(w)}</strong><span>Models</span></div></div></Plate></Link>)}</div>
 <Link to="/warbands/new" className="btn btn-p w-full">Create a warband</Link></div>;
}
