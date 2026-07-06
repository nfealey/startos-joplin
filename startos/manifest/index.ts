import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'joplin-server',
  title: 'Joplin Server',
  // Joplin Server is distributed under the proprietary "Joplin Server Personal
  // Use License" (non-commercial personal use only) — not an SPDX license.
  license: 'other',
  packageRepo: 'https://github.com/nfealey/startos-joplin',
  upstreamRepo: 'https://github.com/laurent22/joplin',
  marketingUrl: 'https://joplinapp.org/',
  donationUrl: 'https://joplinapp.org/donate/',
  description: { short, long },
  volumes: ['main', 'db'],
  images: {
    joplin: {
      source: { dockerTag: 'joplin/server:3.7.1' },
      arch: ['x86_64', 'aarch64'],
    },
    postgres: {
      source: { dockerTag: 'postgres:16-alpine' },
      arch: ['x86_64', 'aarch64'],
    },
  },
  alerts: {
    install: null,
    update: null,
    uninstall: null,
    restore: null,
    start: null,
    stop: null,
  },
  dependencies: {},
})
