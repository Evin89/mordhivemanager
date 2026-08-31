import { ResolvedSpecialRule, WarbandDefinition } from './types';
import { resolveSpecialRules } from '../lib/specialRulesLookup';
import imperialGuardRemnants from './warbands/imperial-guard-remnants.json';
import ordoHereticusRetainers from './warbands/ordo-hereticus-retainers.json';
import orderOfTheBlackSepulchre from './warbands/order-of-the-black-sepulchre.json';
import forsakenAstartes from './warbands/forsaken-astartes.json';
import squatStripMiners from './warbands/squat-strip-miners.json';
import thePoxCult from './warbands/the-pox-cult.json';
import lostAndTheDamned from './warbands/lost-and-the-damned.json';
import orkMob from './warbands/ork-mob.json';
import cultOfTheFourArmedEmperor from './warbands/cult-of-the-four-armed-emperor.json';
import darkEldarCoterie from './warbands/dark-eldar-coterie.json';
import eldarWaywardHost from './warbands/eldar-wayward-host.json';
import tauPathfinderCadre from './warbands/tau-pathfinder-cadre.json';

// Every playable Mord Hive warband definition. The v0.5 list is 12 warbands
// (spec §3), all converted from the ruleset PDF.
export const warbandDefinitions: WarbandDefinition[] = [
  imperialGuardRemnants,
  ordoHereticusRetainers,
  orderOfTheBlackSepulchre,
  forsakenAstartes,
  squatStripMiners,
  thePoxCult,
  lostAndTheDamned,
  orkMob,
  cultOfTheFourArmedEmperor,
  darkEldarCoterie,
  eldarWaywardHost,
  tauPathfinderCadre,
] as WarbandDefinition[];

export function getWarbandDefinition(id: string): WarbandDefinition | undefined {
  return warbandDefinitions.find((def) => def.id === id);
}

/** Display name for a stored `warbandType`. Falls back to the raw slug so an
 * unrecognised or legacy type still shows something rather than blanking out. */
export function getWarbandTypeName(id: string): string {
  return getWarbandDefinition(id)?.name ?? id;
}

/** Warbands A-Z, for pickers. */
export const warbandDefinitionsByName: WarbandDefinition[] = [...warbandDefinitions].sort((a, b) =>
  a.name.localeCompare(b.name),
);

/** The special rules printed in a unit's entry, resolved from the definition. */
export function getUnitSpecialRules(warbandType: string, unitType: string): ResolvedSpecialRule[] {
  const definition = getWarbandDefinition(warbandType);
  if (!definition) return [];
  const unit =
    definition.heroSlots.find((s) => s.unitType === unitType) ??
    definition.henchmenTypes.find((h) => h.unitType === unitType);
  return resolveSpecialRules(unit?.specialRules);
}

/** Whatever text on a unit hasn't been split into named rules yet. */
export function getUnitNotes(warbandType: string, unitType: string): string {
  const definition = getWarbandDefinition(warbandType);
  if (!definition) return '';
  const unit =
    definition.heroSlots.find((s) => s.unitType === unitType) ??
    definition.henchmenTypes.find((h) => h.unitType === unitType);
  return unit?.notes ?? '';
}
