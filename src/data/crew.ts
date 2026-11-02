// Survivors you can recruit. Each role gives a concrete, always-on benefit and rides visibly on deck
// (GITCRAFT MeshCraft `deckhand` characters: public/models/tb_crew_<role>.glb, Mixamo-named rig + clips).

export type CrewRole = 'mechanic' | 'navigator' | 'salvager' | 'fisher' | 'lookout' | 'defender';

export interface CrewDef {
  id: string;
  name: string;
  role: CrewRole;
  home: string; // settlement id, or 'castaway'
  cost?: number; // gold to sign on
  requires?: { upgrade?: string; goal?: string };
  pitch: string;
}

export const ROLE_INFO: Record<CrewRole, { label: string; perk: string; color: string; icon: string }> = {
  mechanic: { label: 'Mechanic', perk: 'Engine burns 35% less fuel · slowly repairs the hull at sea', color: '#f2b825', icon: '\u{1F527}' },
  navigator: { label: 'Navigator', perk: 'Marks the nearest unsalvaged site · +10% sail speed', color: '#4aa3ff', icon: '\u{1F9ED}' },
  salvager: { label: 'Salvager', perk: '+1 loot roll on every haul · wider winch window', color: '#d2702f', icon: '\u{1FA9D}' },
  fisher: { label: 'Fisher', perk: 'Catches Silverfin while you sail (3× with Trolling Rods)', color: '#3e8c80', icon: '\u{1F3A3}' },
  lookout: { label: 'Lookout', perk: 'Warns of storms and raiders · more drifting caches spotted', color: '#b26bff', icon: '\u{1F52D}' },
  defender: { label: 'Defender', perk: 'Raiders think twice · harpoon reloads twice as fast', color: '#c8352a', icon: '\u{1F6E1}' },
};

export const CREW: CrewDef[] = [
  { id: 'juno', name: 'Juno Vale', role: 'mechanic', home: 'driftholm', cost: 120, requires: { upgrade: 'engine_outboard' },
    pitch: '“You bought an outboard and you don’t know how to keep it alive? Hire me before it dies of embarrassment.”' },
  { id: 'tomas', name: 'Tomas Reyes', role: 'fisher', home: 'hollow', cost: 60,
    pitch: '“Forty years on this roof. Take me somewhere the fish haven’t heard of me.”' },
  { id: 'kai', name: 'Kai', role: 'lookout', home: 'castaway',
    pitch: '“Eleven days on that raft. I saw you coming from six miles out. I see everything.”' },
  { id: 'mara', name: 'Mara Okonkwo', role: 'navigator', home: 'helios', cost: 250,
    pitch: '“I charted every roof in Old Meridian. For a share of the haul I’ll chart them for you.”' },
  { id: 'bram', name: 'Bram Steele', role: 'salvager', home: 'castaway',
    pitch: '“Rustfang took my boat and left me tied to a lamppost. I know where they keep the good stuff.”' },
  { id: 'ines', name: 'Ines Ferro', role: 'defender', home: 'helios', cost: 300, requires: { upgrade: 'harpoon_turret' },
    pitch: '“Show me a harpoon and I’ll show you a quiet voyage.”' },
];
export const CREW_MAP: Record<string, CrewDef> = Object.fromEntries(CREW.map((c) => [c.id, c]));
