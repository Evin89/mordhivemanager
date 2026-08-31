import { useState } from 'react';
import Plate from './Plate';
import { Button } from './ui';
import { getSkillByName, getSkillList, checkSkillPrerequisite } from '../lib/skillLookup';

type SkillManagerProps = {
  /** Skill list ids the model may draw on (core + warband-specific). */
  skillLists: string[];
  /** Psyker/prayer list ids, shown as a reference note. */
  spellLists?: string[];
  knownSkills: string[];
  isLeader: boolean;
  warbandType: string;
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
};

/** Known skills with their effects, plus a picker over the model's allowed lists
 * that hard-blocks duplicates and leader-only skills and warns on prerequisites
 * it can't verify. */
export default function SkillManager({
  skillLists,
  spellLists,
  knownSkills,
  isLeader,
  warbandType,
  onAdd,
  onRemove,
}: SkillManagerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const ctx = { isLeader, warbandType, knownSkills };

  return (
    <div className="space-y-3">
      {knownSkills.length === 0 ? (
        <p className="font-body text-ink-faded text-sm px-1">No skills yet.</p>
      ) : (
        <Plate className="p-3">
          <ul className="space-y-2">
            {knownSkills.map((name) => {
              const entry = getSkillByName(name);
              return (
                <li key={name} className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="font-display uppercase tracking-[0.04em] text-ink text-sm">{name}</span>
                    {entry && <span className="block font-body text-ink-faded text-sm">{entry.effect}</span>}
                  </span>
                  <Button size="dense" variant="secondary" fullWidth={false} onClick={() => onRemove(name)}>
                    Remove
                  </Button>
                </li>
              );
            })}
          </ul>
        </Plate>
      )}

      {spellLists && spellLists.length > 0 && (
        <p className="font-body text-ink-faded text-xs px-1">
          Psyker/prayer lists: {spellLists.join(', ')} (browse the full lists in Rules).
        </p>
      )}

      <Button variant="secondary" onClick={() => setPickerOpen((o) => !o)}>
        {pickerOpen ? 'Close skill picker' : 'Add a skill'}
      </Button>

      {pickerOpen && (
        <div className="space-y-3">
          {skillLists.length === 0 && (
            <p className="font-body text-ink-faded text-sm px-1">This model has no skill lists.</p>
          )}
          {skillLists.map((listId) => {
            const list = getSkillList(listId);
            if (!list) return null;
            return (
              <Plate key={listId} className="p-3">
                <p className="font-display uppercase tracking-[0.06em] text-ink text-sm mb-2">{list.name}</p>
                <ul className="space-y-2">
                  {list.skills.map((skill) => {
                    const check = checkSkillPrerequisite(skill, ctx);
                    return (
                      <li key={skill.id} className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="font-body text-ink text-body-min">{skill.name}</span>
                          {check.warning && (
                            <span className="block font-body text-ink-faded text-xs">⚠ {check.warning}</span>
                          )}
                        </span>
                        <Button
                          size="dense"
                          fullWidth={false}
                          disabled={check.blocked}
                          onClick={() => onAdd(skill.name)}
                        >
                          {check.blocked ? check.reason : 'Add'}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </Plate>
            );
          })}
        </div>
      )}
    </div>
  );
}
