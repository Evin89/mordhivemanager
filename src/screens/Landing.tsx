import content from '../landing-content.html?raw';
import '../landing.css';
import { useAuth } from '../store/auth';
export default function Landing() {
  const { user } = useAuth();
  return <div className="landing-page" dangerouslySetInnerHTML={{ __html: user ? content : content.replace(/href="\/warbands\/new"/g, 'href="/sign-in"') }} />;
}
