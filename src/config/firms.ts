import bundled from 'virtual:firms'
import { selectFirm, type FirmConfig } from './firm'

/** The firm for this page load: locked by the FIRM build variable, or chosen with ?firm=<id>. */
export const FIRM: FirmConfig = selectFirm(bundled.firms, { search: window.location.search, locked: bundled.locked })
