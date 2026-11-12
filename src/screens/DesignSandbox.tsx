import { strings } from '../strings';
import BannerHeader from '../components/BannerHeader';
import Plate from '../components/Plate';
import Datasheet from '../components/Datasheet';
import DesignerNote from '../components/DesignerNote';
import PageChip from '../components/PageChip';
import ChevronRail from '../components/ChevronRail';
import ProfileBlock from '../components/ProfileBlock';
import { sampleUnits } from '../data/sampleDatasheet';

/**
 * The design sandbox (spec §2.6) — every Codex component in one place, so a
 * screen can be checked against the design language (and, once both themes are
 * wired to a page-level toggle, against both) before it migrates. This is the
 * proof that the Codex skin (§2) works before any v0.5 content lands.
 *
 * (The theme toggle was removed 2026-11-12: the app is Plated-only.) Formerly: swap the whole page between Paper and Plated with the theme toggle in the top
 * bar — every component here re-themes through the CSS variables with no
 * per-component branch.
 */
export default function DesignSandbox() {
  return (
    <div className="space-y-8">
      <div>
        <BannerHeader as="h1" trailing={<PageChip>§2</PageChip>}>
          Codex Design Sandbox
        </BannerHeader>
        <p className="mt-3 font-body text-ink text-body-min leading-relaxed">
          The industrial "hive manual" look, grounded in the v0.5 rulebook: monochrome black / white /
          gunmetal, black banner headers, riveted steel frames, Oxanium display over Spectral body.
          The app ships in Plated only; Paper survives as the print-sheet palette.
        </p>
      </div>

      {/* Datasheets — the signature component (§2.4). */}
      <section className="space-y-4">
        <BannerHeader>Datasheet (§2.4)</BannerHeader>
        <DesignerNote title="Not sourced from v0.5">
          The statlines below are <strong>placeholder</strong> values, present only to exercise the
          layout. Per the §8 sourcing line, no real gang stats are invented from memory — those
          arrive via the converter (§3) from the Mord Hive v0.5 ruleset.
        </DesignerNote>
        <div className="grid gap-4 sm:grid-cols-2">
          {sampleUnits.map((u) => (
            <Datasheet
              key={u.name}
              name={u.name}
              subtitle={u.subtitle}
              stats={u.stats}
              maximums={u.maximums}
              showMaximums
              wargear={u.wargear}
              headerTrailing={<PageChip className="border-on-banner/40">120 tn</PageChip>}
            />
          ))}
        </div>
      </section>

      {/* Statline variants (§2.4 / MM §5.3). */}
      <section className="space-y-4">
        <BannerHeader>Statline — full &amp; collapsed</BannerHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Plate className="p-4">
            <p className="font-display uppercase text-xs tracking-[0.08em] text-ink-faded mb-2">Full</p>
            <ProfileBlock stats={sampleUnits[0].stats} maximums={sampleUnits[0].maximums} showMaximums />
          </Plate>
          <Plate className="p-4">
            <p className="font-display uppercase text-xs tracking-[0.08em] text-ink-faded mb-2">
              Collapsed (roster row)
            </p>
            <ProfileBlock stats={sampleUnits[1].stats} variant="collapsed" label="Placeholder Warrior" />
          </Plate>
        </div>
      </section>

      {/* Structural devices (§2.5). */}
      <section className="space-y-4">
        <BannerHeader>Structural devices (§2.5)</BannerHeader>

        <div className="space-y-2">
          <p className="font-display uppercase text-xs tracking-[0.08em] text-ink-faded">Chevron rail</p>
          <ChevronRail />
        </div>

        <div className="space-y-2">
          <p className="font-display uppercase text-xs tracking-[0.08em] text-ink-faded">Page chips</p>
          <div className="flex flex-wrap gap-2">
            <PageChip>p.14</PageChip>
            <PageChip>Rating 245</PageChip>
            <PageChip>3 / 15 models</PageChip>
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-display uppercase text-xs tracking-[0.08em] text-ink-faded">Designer's-note boxout</p>
          <DesignerNote>
            Every gang and wargear file carries a version-risk note (§3): v0.5 is a moving target, so
            content is revisited on each ruleset release and anything unverified stays a visible TODO.
          </DesignerNote>
        </div>

        <div className="space-y-2">
          <p className="font-display uppercase text-xs tracking-[0.08em] text-ink-faded">Riveted plate</p>
          <Plate className="p-4">
            <p className="font-body text-ink text-body-min">
              A riveted steel plate — a 2px gunmetal border with a bolt at each corner. No skulls, no
              GW marks (§2 IP line): the industrial frame is reproduced, the rulebook's corner skulls
              replaced with plain bolt plates.
            </p>
          </Plate>
        </div>
      </section>

      {/* Typography (§2.3). */}
      <section className="space-y-4">
        <BannerHeader>Typography (§2.3)</BannerHeader>
        <Plate className="p-4 space-y-3">
          <p className="font-display uppercase tracking-[0.06em] text-ink text-2xl">Oxanium — display / labels / data</p>
          <p className="font-body text-ink text-body-min leading-relaxed">
            Spectral — the serif for running body prose at 16px and up: campaign log, lore, rules
            prose. Two-column running text reads as the printed book, while the banners, unit names,
            buttons and numerics carry the rounded-techno display face.
          </p>
          <p className="font-body text-ink text-body-min tabular-nums lining-nums">
            Tabular figures align: 1234567890 — 245 tn — 12/15 models.
          </p>
        </Plate>
      </section>

      {/* Terminology (§4). */}
      <section className="space-y-4">
        <BannerHeader>Terminology (§4) — sourced from v0.5</BannerHeader>
        <Plate className="overflow-hidden">
          <table className="w-full font-body text-ink text-body-min">
            <thead>
              <tr className="bg-banner text-on-banner font-display uppercase text-xs tracking-[0.06em]">
                <th className="text-left px-4 py-2">Generic field</th>
                <th className="text-left px-4 py-2">Mord Hive label</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['roster', strings.terms.roster],
                ['salvageResource', strings.terms.salvageResource],
                ['treasure', strings.terms.treasure],
                ['hiredSpecialist', strings.terms.hiredSpecialistPlural],
                ['postBattleIncome', strings.terms.postBattleIncome],
                ['currency', `${strings.terms.currency} (${strings.terms.currencyAbbr})`],
              ].map(([field, label]) => (
                <tr key={field} className="border-t border-steel-l">
                  <td className="px-4 py-2 font-ui text-ink-faded">{field}</td>
                  <td className="px-4 py-2">{label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Plate>
      </section>
    </div>
  );
}
