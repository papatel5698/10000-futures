/// <reference types="vite/client" />

declare module 'virtual:firms' {
  import type { FirmConfig } from './config/firm'
  const bundled: { firms: FirmConfig[]; locked: boolean }
  export default bundled
}
