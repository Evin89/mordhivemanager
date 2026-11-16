import { Hero, Warband } from '../types';
import { getWarbandDefinition } from './warbandRegistry';

export type PortraitIndex = 0 | 1 | 2 | 3;
export type PortraitSet = { faces: { index: PortraitIndex; label: string }[]; defaultBySlotId: Record<string, PortraitIndex> };
export const PORTRAIT_SETS: Record<string, PortraitSet> = {
  "imperial-guard-remnants": {
    "faces": [
      {
        "index": 0,
        "label": "Officer"
      },
      {
        "index": 1,
        "label": "NCO"
      },
      {
        "index": 2,
        "label": "Steward"
      },
      {
        "index": 3,
        "label": "Guardsman"
      }
    ],
    "defaultBySlotId": {
      "remnant-officer": 0,
      "non-commissioned-officer": 1,
      "steward": 2
    }
  },
  "ordo-hereticus-retainers": {
    "faces": [
      {
        "index": 0,
        "label": "Interrogator"
      },
      {
        "index": 1,
        "label": "Priest"
      },
      {
        "index": 2,
        "label": "Acolyte"
      },
      {
        "index": 3,
        "label": "Acolyte"
      }
    ],
    "defaultBySlotId": {
      "interrogator": 0,
      "ecclesiastic-priest": 1,
      "acolyte": 2
    }
  },
  "order-of-the-black-sepulchre": {
    "faces": [
      {
        "index": 0,
        "label": "Palatine"
      },
      {
        "index": 1,
        "label": "Exactor"
      },
      {
        "index": 2,
        "label": "Pronatus"
      },
      {
        "index": 3,
        "label": "Repentia"
      }
    ],
    "defaultBySlotId": {
      "palatine": 0,
      "sister-exactor": 1,
      "sister-pronatus": 2,
      "sister-superior": 3
    }
  },
  "forsaken-astartes": {
    "faces": [
      {
        "index": 0,
        "label": "Astartes"
      },
      {
        "index": 1,
        "label": "Artificer"
      },
      {
        "index": 2,
        "label": "Chapter Serf"
      },
      {
        "index": 3,
        "label": "Servitor"
      }
    ],
    "defaultBySlotId": {
      "forsaken-astartes": 0,
      "artificer": 1,
      "chapter-serf": 2
    }
  },
  "squat-strip-miners": {
    "faces": [
      {
        "index": 0,
        "label": "Drill Master"
      },
      {
        "index": 1,
        "label": "Engineer"
      },
      {
        "index": 2,
        "label": "Claim Jumper"
      },
      {
        "index": 3,
        "label": "Bore Guard"
      }
    ],
    "defaultBySlotId": {
      "drill-master": 0,
      "engineer": 1,
      "claim-jumper": 2
    }
  },
  "the-pox-cult": {
    "faces": [
      {
        "index": 0,
        "label": "Plague Abbot"
      },
      {
        "index": 1,
        "label": "Fetid Enforcer"
      },
      {
        "index": 2,
        "label": "The Blessed"
      },
      {
        "index": 3,
        "label": "Brethren"
      }
    ],
    "defaultBySlotId": {
      "plague-abbot": 0,
      "fetid-enforcer": 1,
      "the-blessed": 2
    }
  },
  "lost-and-the-damned": {
    "faces": [
      {
        "index": 0,
        "label": "Demagogue"
      },
      {
        "index": 1,
        "label": "Psyker"
      },
      {
        "index": 2,
        "label": "Warp-Touched"
      },
      {
        "index": 3,
        "label": "Enforcer"
      }
    ],
    "defaultBySlotId": {
      "demagogue": 0,
      "unsanctioned-psyker": 1,
      "warp-touched": 2,
      "enforcer": 3
    }
  },
  "ork-mob": {
    "faces": [
      {
        "index": 0,
        "label": "Boss"
      },
      {
        "index": 1,
        "label": "Wyrd Boy"
      },
      {
        "index": 2,
        "label": "Nob"
      },
      {
        "index": 3,
        "label": "Grot"
      }
    ],
    "defaultBySlotId": {
      "ork-boss": 0,
      "wyrd-boy": 1,
      "nobz": 2
    }
  },
  "cult-of-the-four-armed-emperor": {
    "faces": [
      {
        "index": 0,
        "label": "Magus"
      },
      {
        "index": 1,
        "label": "Anointed"
      },
      {
        "index": 2,
        "label": "Hybrid Acolyte"
      },
      {
        "index": 3,
        "label": "Neophyte"
      }
    ],
    "defaultBySlotId": {
      "magus": 0,
      "anointed": 1,
      "hybrid-acolytes": 2
    }
  },
  "dark-eldar-coterie": {
    "faces": [
      {
        "index": 0,
        "label": "Trueborn"
      },
      {
        "index": 1,
        "label": "Wych"
      },
      {
        "index": 2,
        "label": "Wracks"
      },
      {
        "index": 3,
        "label": "Kabalite"
      }
    ],
    "defaultBySlotId": {
      "kabalite-trueborn": 0,
      "wyches": 1,
      "wracks": 2,
      "beast-master": 3,
      "scourge": 3
    }
  },
  "eldar-wayward-host": {
    "faces": [
      {
        "index": 0,
        "label": "Aspect Warrior"
      },
      {
        "index": 1,
        "label": "Warlock"
      },
      {
        "index": 2,
        "label": "Ranger"
      },
      {
        "index": 3,
        "label": "Guardian"
      }
    ],
    "defaultBySlotId": {
      "aspect-warrior": 0,
      "warlock-or-bonesinger": 1,
      "storm-guardians": 3
    }
  },
  "tau-pathfinder-cadre": {
    "faces": [
      {
        "index": 0,
        "label": "Shas'vre"
      },
      {
        "index": 1,
        "label": "Shas'ui"
      },
      {
        "index": 2,
        "label": "Engineer"
      },
      {
        "index": 3,
        "label": "Kroot"
      }
    ],
    "defaultBySlotId": {
      "shas-vre": 0,
      "shas-ui": 1,
      "earth-caste-engineers": 2
    }
  }
};

export function portraitUrl(slug: string, index: PortraitIndex): string {
  return `/img/portraits/${slug}/${index}.webp`;
}

export function defaultPortraitIndex(hero: Hero, warband: Warband): PortraitIndex {
  const slot = getWarbandDefinition(warband.warbandType)?.heroSlots.find(s => s.unitType === hero.unitType);
  return (slot && PORTRAIT_SETS[warband.warbandType]?.defaultBySlotId[slot.id]) ?? 3;
}

export function resolvePortraitSrc(hero: Hero, warband: Warband): string | null {
  if (hero.portrait === 'none') return null;
  if (/^data:image\/(webp|jpeg);base64,/.test(hero.portrait ?? '')) return hero.portrait!;
  if (!PORTRAIT_SETS[warband.warbandType]) return null;
  const preset = /^preset:([0-3])$/.exec(hero.portrait ?? '');
  return portraitUrl(warband.warbandType, preset ? Number(preset[1]) as PortraitIndex : defaultPortraitIndex(hero, warband));
}
