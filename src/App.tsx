import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { strings } from './strings';
import ChevronRail from './components/ChevronRail';
import { AuthProvider, useAuth } from './store/auth';
import { WarbandsProvider } from './store/warbands';
import { SoloCampaignsProvider } from './store/soloCampaign';
import Landing from './screens/Landing';
import DesignSandbox from './screens/DesignSandbox';
import WarbandsListScreen from './screens/WarbandsListScreen';
import NewWarbandScreen from './screens/NewWarbandScreen';
import RosterScreen from './screens/RosterScreen';
import AddHeroScreen from './screens/AddHeroScreen';
import AddHenchmenScreen from './screens/AddHenchmenScreen';
import HeroDetailScreen from './screens/HeroDetailScreen';
import HenchmenDetailScreen from './screens/HenchmenDetailScreen';
import TradingPostScreen from './screens/TradingPostScreen';
import PreBattleScreen from './screens/PreBattleScreen';
import DuringBattleScreen from './screens/DuringBattleScreen';
import PostBattleScreen from './screens/PostBattleScreen';
import SoloCampaignsScreen from './screens/SoloCampaignsScreen';
import SoloCampaignScreen from './screens/SoloCampaignScreen';
import RulesScreen from './screens/RulesScreen';
import SignInScreen from './screens/SignInScreen';
import AccountScreen from './screens/AccountScreen';
import CampaignsScreen from './screens/CampaignsScreen';
import CampaignScreen from './screens/CampaignScreen';
import PrintRosterScreen from './screens/PrintRosterScreen';
import AddHiredGunScreen from './screens/AddHiredGunScreen';
import HiredGunDetailScreen from './screens/HiredGunDetailScreen';
import GalleryScreen from './screens/GalleryScreen';
import GalleryRosterScreen from './screens/GalleryRosterScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import RequireAuth from './components/RequireAuth';
import SyncBanner from './components/SyncBanner';

/**
 * App shell for the slice 1–4 standalone (spec §9). Two routes for now: the
 * landing front door and the `/design` sandbox (§2.6) that proves every Codex
 * component in both themes. The full tabbed app (warbands, battle, trading,
 * campaigns, rules) lands as the shared UI is vendored in.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <WarbandsProvider>
        <SoloCampaignsProvider>
        <div className="min-h-full flex flex-col">
          <TopBar />
          <ChevronRail />
          <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
            <SyncBanner />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/design" element={<DesignSandbox />} />
              <Route path="/warbands" element={<RequireAuth><WarbandsListScreen /></RequireAuth>} />
              <Route path="/warbands/new" element={<RequireAuth><NewWarbandScreen /></RequireAuth>} />
              <Route path="/warbands/:warbandId" element={<RequireAuth><RosterScreen /></RequireAuth>} />
              <Route path="/warbands/:warbandId/add-hero" element={<RequireAuth><AddHeroScreen /></RequireAuth>} />
              <Route path="/warbands/:warbandId/add-henchmen" element={<RequireAuth><AddHenchmenScreen /></RequireAuth>} />
              <Route path="/warbands/:warbandId/hero/:heroId" element={<RequireAuth><HeroDetailScreen /></RequireAuth>} />
              <Route path="/warbands/:warbandId/henchmen/:groupId" element={<RequireAuth><HenchmenDetailScreen /></RequireAuth>} />
              <Route path="/warbands/:warbandId/trading" element={<RequireAuth><TradingPostScreen /></RequireAuth>} />
              <Route path="/warbands/:warbandId/pre-battle" element={<RequireAuth><PreBattleScreen /></RequireAuth>} />
              <Route path="/warbands/:warbandId/battle" element={<RequireAuth><DuringBattleScreen /></RequireAuth>} />
              <Route path="/warbands/:warbandId/post-battle" element={<RequireAuth><PostBattleScreen /></RequireAuth>} />
              <Route path="/solo" element={<RequireAuth><SoloCampaignsScreen /></RequireAuth>} />
              <Route path="/solo/:campaignId" element={<RequireAuth><SoloCampaignScreen /></RequireAuth>} />
              <Route path="/rules" element={<RulesScreen />} />
              <Route path="/warbands/:warbandId/add-hired-gun" element={<RequireAuth><AddHiredGunScreen /></RequireAuth>} />
              <Route path="/warbands/:warbandId/hired/:hiredId" element={<RequireAuth><HiredGunDetailScreen /></RequireAuth>} />
              <Route path="/warbands/:warbandId/print" element={<RequireAuth><PrintRosterScreen /></RequireAuth>} />
              <Route path="/campaigns" element={<RequireAuth><CampaignsScreen /></RequireAuth>} />
              <Route path="/campaigns/:campaignId" element={<RequireAuth><CampaignScreen /></RequireAuth>} />
              <Route path="/account" element={<RequireAuth><AccountScreen /></RequireAuth>} />
              <Route path="/gallery" element={<GalleryScreen />} />
              <Route path="/gallery/:warbandId" element={<GalleryRosterScreen />} />
              <Route path="/sign-in" element={<SignInScreen />} />
              <Route path="/reset-password" element={<ResetPasswordScreen />} />
              <Route path="*" element={<Landing />} />
            </Routes>
          </main>
          <ChevronRail />
          <footer className="no-print bg-plate border-t-2 border-steel">
            <div className="max-w-4xl mx-auto px-4 py-3 font-body text-ink-faded text-sm">
              {strings.fanNotice}
            </div>
          </footer>
        </div>
        </SoloCampaignsProvider>
      </WarbandsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function TopBar() {
  const link = (to: string, label: string) => (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `px-3 py-1.5 font-display uppercase tracking-[0.06em] text-sm min-h-[44px] flex items-center ${
          isActive ? 'text-on-banner underline underline-offset-4 decoration-2' : 'text-on-banner/75 hover:text-on-banner'
        }`
      }
    >
      {label}
    </NavLink>
  );

  return (
    <header className="no-print bg-banner">
      <div className="max-w-4xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <NavLink to="/" className="flex items-center gap-2 min-h-[44px]" aria-label={`${strings.appName}, home`}>
          {/* Wordmark — the app's own bolt sigil beside the name. Doubles as the Home link. */}
          <span
            className="inline-block h-6 w-6 border-2 border-on-banner"
            style={{
              backgroundImage:
                'radial-gradient(circle at 4px 4px, rgb(var(--color-on-banner)) 1.4px, transparent 1.8px),' +
                'radial-gradient(circle at calc(100% - 4px) calc(100% - 4px), rgb(var(--color-on-banner)) 1.4px, transparent 1.8px)',
            }}
            aria-hidden="true"
          />
          <span className="font-display uppercase tracking-[0.1em] text-on-banner text-lg">
            {strings.appName}
          </span>
        </NavLink>
        <nav className="flex flex-wrap items-center gap-1">
          {link('/warbands', strings.nav.warbands)}
          {link('/solo', 'Solo')}
          {link('/campaigns', strings.nav.campaigns)}
          {link('/gallery', strings.nav.gallery)}
          {link('/rules', strings.nav.rules)}
          <AccountLink />
        </nav>
      </div>
    </header>
  );
}

/** Sign in when signed out; the account page (under the player's Mord Hive name) when signed in. */
function AccountLink() {
  const { user, loading, displayName } = useAuth();
  if (loading) return null;
  const cls =
    'px-3 py-1.5 font-display uppercase tracking-[0.06em] text-sm min-h-[44px] flex items-center text-on-banner/75 hover:text-on-banner';
  if (!user) {
    return (
      <NavLink to="/sign-in" className={cls}>
        {strings.nav.signIn}
      </NavLink>
    );
  }
  return (
    <NavLink to="/account" className={cls} title={user.email ?? undefined}>
      {displayName || strings.nav.settings}
    </NavLink>
  );
}
