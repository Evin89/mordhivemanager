import { Link } from 'react-router-dom';
import { strings } from '../strings';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import DesignerNote from '../components/DesignerNote';
import PageChip from '../components/PageChip';

const { terms } = strings;

/**
 * The front door. A short "what this is", the setting fluff (sourced, v0.5), and
 * a pointer into the design sandbox. Deliberately thin — the real home
 * dashboard arrives with the vendored UI (build step 4+).
 */
export default function Landing() {
  return (
    <div className="space-y-6">
      <section>
        <BannerHeader as="h1" trailing={<PageChip>v0.5 WIP</PageChip>}>
          {strings.appName}
        </BannerHeader>
        <Plate className="mt-3 p-4 sm:p-6">
          <p className="font-body text-ink text-body-min leading-relaxed">
            {strings.tagline}. Mord Hive is the sibling app to Mordheim Manager — the same engine,
            a different skin, different content, and its own deployment. Build a{' '}
            {terms.roster.toLowerCase()} to {terms.startingBudget} {terms.currencyAbbr}, run games
            end to end, and keep a campaign across your group.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <PageChip>Build to {terms.startingBudget} {terms.currencyAbbr}</PageChip>
            <PageChip>Min {terms.minModels} models</PageChip>
            <PageChip>Up to {terms.maxHeroes} {terms.heroPlural}</PageChip>
          </div>
        </Plate>
      </section>

      <section>
        <BannerHeader>The Setting</BannerHeader>
        <div className="mt-3 space-y-3">
          <p className="font-body text-ink text-body-min leading-relaxed">
            Hive World <strong>Reyklund</strong> (Vagorn Sector, Ultima Segmentum) was an Imperial
            diamantine-mining world; <strong>Mord Hive</strong> was its capital. After the fighting,
            an immense Space Hulk burst into realspace above the hive, dooming it. The abandoned hive
            is now fought over by isolated warbands, xenos, heretics and scavengers for caches of
            refined <strong>{terms.salvageResource.toLowerCase()}</strong> — the price of a berth on
            the last warp-capable ships.
          </p>
          <DesignerNote>
            Setting fluff is sourced from the Mord Hive v0.5 rulebook and never embellished (§3, §8).
            Author: Nick; original Mordheim by Pirinen, Priestley &amp; Cavatore. Unofficial fan
            publication.
          </DesignerNote>
        </div>
      </section>

      <section>
        <BannerHeader>Design System</BannerHeader>
        <Plate className="mt-3 p-4 sm:p-6">
          <p className="font-body text-ink text-body-min leading-relaxed">
            The Codex skin — black banners, riveted gunmetal frames, Oxanium over Spectral, monochrome
            throughout — is built and previewable in both themes.
          </p>
          <Link
            to="/design"
            className="mt-4 inline-block bg-banner text-on-banner font-display uppercase tracking-[0.06em] px-4 py-2 min-h-[44px]"
          >
            Open the design sandbox →
          </Link>
        </Plate>
      </section>
    </div>
  );
}
