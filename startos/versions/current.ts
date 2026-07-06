import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '3.7.1:2',
  releaseNotes: {
    en_US:
      'Add a "Set Primary Address" action to choose Joplin\'s canonical URL (domain vs LAN), a "Reset Admin Password" action, and a notification when the install-time password setup completes.',
  },
  migrations: {
    // Password generation happens in init/onInstall on first install.
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
