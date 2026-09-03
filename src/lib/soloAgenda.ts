// The overarching enemy plan for a solo campaign (spec §6: "a solo campaign with
// a hidden enemy agenda across chapters and acts"). Distinct from the per-battle
// NpcAgenda in npc.ts: this is the plot the recurring nemesis pursues across the
// whole campaign, its act goals hidden until the campaign ends. All app-original
// flavour built on the sourced setting (doomed Hive Reyklund, the Space Hulk,
// refined diamantine), never presented as ruleset content.

export const ACTS = 3;

export type CampaignAgenda = {
  title: string;
  /** The setup, shown from the start. */
  premise: string;
  /** One line per act (ACTS long) — hidden until revealed. */
  actGoals: string[];
  /** What the enemy is ultimately after — hidden until revealed. */
  victory: string;
};

const AGENDA_POOL: CampaignAgenda[] = [
  {
    title: "The Hulk's Shadow",
    premise: 'A rival warlord has read the omens in the Space Hulk overhead and means to make the dying hive their own throne.',
    actGoals: [
      'Act I — Seize the richest diamantine seams to fund a war host.',
      'Act II — Break the other warbands one by one before they can unite.',
      'Act III — Storm the spire and raise a banner over Mord Hive.',
    ],
    victory: 'To rule the corpse of the hive outright — every rival dead, driven off, or knelt.',
  },
  {
    title: 'The Last Ship',
    premise: 'Word spreads of one warp-capable vessel still berthed in the under-docks. A faction races to seize it and leave the rest to burn.',
    actGoals: [
      'Act I — Buy or steal the diamantine to bribe the dock-guilds.',
      'Act II — Slaughter anyone else who learns the berth exists.',
      'Act III — Fight through to the under-docks and claim the ship.',
    ],
    victory: 'To escape Reyklund alive on the last ship — and pull the ladder up behind them.',
  },
  {
    title: 'The Awakened',
    premise: 'Something vast is stirring inside the Hulk, and a cult believes the hive was always meant to feed it.',
    actGoals: [
      'Act I — Gather diamantine shards as offerings.',
      'Act II — Take prisoners for the ritual and silence the doubters.',
      'Act III — Complete the rite before the Hulk drifts out of alignment.',
    ],
    victory: 'To wake the thing in the Hulk — whatever it costs the hive, or the cult itself.',
  },
  {
    title: 'Scorched Reyklund',
    premise: 'A purge force has decided the hive and everyone in it are already lost, and better cleansed than left to the dark.',
    actGoals: [
      'Act I — Map the warbands still fighting over the ruins.',
      'Act II — Herd the survivors toward the central spans.',
      'Act III — Set the charges and burn Mord Hive to its roots.',
    ],
    victory: 'To leave nothing standing — a clean end, on their terms, for a place beyond saving.',
  },
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function generateCampaignAgenda(): CampaignAgenda {
  return pick(AGENDA_POOL);
}

/** The nemesis grows chapter to chapter: a thrones budget that escalates by act. */
export function budgetForAct(act: number): number {
  return 350 + (Math.max(1, Math.min(ACTS, act)) - 1) * 175; // 350 / 525 / 700
}

export function actLabel(act: number): string {
  return ['Act I', 'Act II', 'Act III'][Math.max(0, Math.min(ACTS - 1, act - 1))];
}
