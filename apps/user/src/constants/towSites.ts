import type { TowSite } from '@ongarage/shared';

/** What the owner sees for each site the pickup can have. Labour sites (mud, rocks) are priced by the trucks; the owner only names them. */
export const TOW_SITE_TEXT: Record<TowSite, string> = {
  mud: 'මඩ / වැලි',
  rocks: 'ගල් / බෑවුම',
  winch: 'ඇදීම අවශ්‍යයි',
  tightAccess: 'ප්‍රවේශය පටුයි',
};
