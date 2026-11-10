// Art-direction previews (docs/jury-rigged): `?look=jury` turns on the Jury-Rigged proof of concept, The Rustfang Toll,
// for this visit only.
//
//   ?look=jury                 the new look on a copy of your save
//   ?look=jury&fresh=1         the new look on a brand-new game (in memory)
//   ?look=jury&ship=skiff      combine with the existing ?ship= / &upgrades= previews
//
// Like an `?exp=` experiment, a look visit is a sandbox: it runs on an in-memory copy of the save and never writes to
// localStorage. Without the parameter nothing changes and none of its files are fetched. Rollback = drop the
// parameter (or revert the PR); no save, asset or default code path depends on it.

export type LookId = 'jury';
const LOOKS: readonly LookId[] = ['jury'];

/** The look a query string asks for (null = the default look). Unknown values are ignored. */
export function parseLook(search: string): LookId | null {
  const v = new URLSearchParams(search).get('look')?.trim().toLowerCase();
  return v && (LOOKS as readonly string[]).includes(v) ? (v as LookId) : null;
}

/** This page's look (null outside a browser or without `?look=`). Read once: the look never changes mid-visit. */
export const LOOK: LookId | null = typeof location === 'undefined' ? null : parseLook(location.search);

/** Is the Jury-Rigged look on for this visit? */
export const jury = () => LOOK === 'jury';
