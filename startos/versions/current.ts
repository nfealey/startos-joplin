import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '3.7.1:1',
  releaseNotes: {
    en_US:
      'Initial release: Joplin Server with a bundled PostgreSQL sidecar, an auto-generated admin password, and pg_dump-based backups. Accessible over the LAN (.local) or a mapped clearnet domain.',
  },
  migrations: {
    // Password generation happens in init/onInstall on first install.
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
