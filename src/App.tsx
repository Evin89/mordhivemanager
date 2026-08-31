import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { strings } from './strings';
import ThemeToggle from './components/ThemeToggle';
import ChevronRail from './components/ChevronRail';
import { WarbandsProvider } from './store/warbands';
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
import RulesScreen from './screens/RulesScreen';

/**
 * App shell for the slice 1–4 standalone (spec §9). Two routes for now: the
 * landing front door and the `/design` sandbox (§2.6) that proves every Codex
 * component in both themes. The full tabbed app (warbands, battle, trading,
 * campaigns, rules) lands as the shared UI is vendored in.
 */
export default function App() {
  return (
    <BrowserRouter>
      <WarbandsProvider>
        <div className="min-h-full flex flex-col">
          <TopBar />
          <ChevronRail />
          <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/design" element={<DesignSandbox />} />
              <Route path="/warbands" element={<WarbandsListScreen />} />
              <Route path="/warbands/new" element={<NewWarbandScreen />} />
              <Route path="/warbands/:warbandId" element={<RosterScreen />} />
              <Route path="/warbands/:warbandId/add-hero" element={<AddHeroScreen />} />
              <Route path="/warbands/:warbandId/add-henchmen" element={<AddHenchmenScreen />} />
              <Route path="/warbands/:warbandId/hero/:heroId" element={<HeroDetailScreen />} />
              <Route path="/warbands/:warbandId/henchmen/:groupId" element={<HenchmenDetailScreen />} />
              <Route path="/warbands/:warbandId/trading" element={<TradingPostScreen />} />
              <Route path="/warbands/:warbandId/pre-battle" element={<PreBattleScreen />} />
              <Route path="/warbands/:warbandId/battle" element={<DuringBattleScreen />} />
              <Route path="/warbands/:warbandId/post-battle" element={<PostBattleScreen />} />
              <Route path="/rules" element={<RulesScreen />} />
              <Route path="*" element={<Landing />} />
            </Routes>
          </main>
          <ChevronRail />
          <footer className="bg-plate border-t-2 border-steel">
            <div className="max-w-4xl mx-auto px-4 py-3 font-body text-ink-faded text-sm">
              {strings.fanNotice}
            </div>
          </footer>
        </div>
      </WarbandsProvider>
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
    <header className="bg-banner">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Wordmark — the app's own bolt sigil beside the name. */}
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
        </div>
        <nav className="flex items-center gap-1">
          {link('/', strings.nav.home)}
          {link('/warbands', strings.nav.warbands)}
          {link('/rules', strings.nav.rules)}
          {link('/design', strings.nav.design)}
          <div className="pl-2">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
