# pixel-hunter

A monster-hunting, 8-bit pixel RPG layout for Herdr. Herdr's spaces become hunting grounds and its agents become hunters fighting the monster there.

## World

**Area**:
A Herdr space, shown as one hunting map (Forest, Desert, Dungeon, Field, Ruins, Lakeside). Spaces take maps in order, cycling once every map is used.
_Avoid_: Biome, Locale, Map, Zone

**Monster**:
The single creature living in an Area. Every Area has one, whether or not anyone is hunting it. An Area's first Monster is its map's own; later ones come from Respawn.
_Avoid_: Quarry, Boss, Enemy, Target

**HP**:
How much fight a Monster has left. Purely cosmetic: it wears down while its Party is Hunting.
_Avoid_: Health, Damage

**Respawn**:
A fresh Monster with full HP appearing in an Area after the last one was Slain, when a Hunter starts Hunting again. It is picked at random from every Monster except the one just Slain, so any Monster can live in any map.
_Avoid_: Reset, Revive

## Hunters

**Hunter**:
A Herdr agent, shown as one party member. A Hunter goes by its Herdr tab name; its Class is secondary.
_Avoid_: Agent (in UI text), Character, Member

**Class**:
A Hunter's role and look: Knight, Mage, Archer, Rogue, Monk or Samurai. A Hunter has exactly one.
_Avoid_: Job, Weapon type, Role

**Pet**:
A subagent running inside a Hunter's agent, however deeply nested, shown under that Hunter. A Pet belongs to exactly one Hunter and is a member of its Hunter's Party, but has no Class or Rank of its own. Each Pet looks like a small animal picked at random. A Pet exists only while its agent is Hunting or Needs help, and leaves once it finishes.
_Avoid_: Sub-agent (in UI text), Companion, Familiar, Minion, Summon

**Party**:
All Hunters in the same Area, together with their Pets.
_Avoid_: Team, Squad, Group

**Stamina**:
How much of a Hunter's context window is left.
_Avoid_: HP, Context, Energy

**Rank**:
The model a Hunter runs on, headed by a letter grade (S, A, B, C, or ? when unknown).
_Avoid_: Level, Tier, Model (in UI text)

## Hunt states

**Hunting**:
The Hunter's or Pet's agent is working.

**Needs help**:
The Hunter's or Pet's agent is blocked, waiting for the user.
_Avoid_: SOS, Blocked (in UI text)

**Cleared**:
The Hunter's agent is done, whether or not the Monster has fallen yet. A Pet is never Cleared: it leaves as soon as its agent is done.
_Avoid_: Slain (that is the Monster's state), Done (in UI text), Victory

**Slain**:
A Monster's state once no member of its Party (Hunter or Pet) is Hunting and at least one Hunter's agent is done.
_Avoid_: Complete, Finished, Dead

**Resting**:
The Hunter's agent is idle. A Pet is never Resting.
_Avoid_: Idle (in UI text)
