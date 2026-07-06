import { T, utils } from '@start9labs/start-sdk'
import { sdk } from './sdk'

export const uiPort = 22300
export const postgresPort = 5432
export const postgresUser = 'joplin'
export const postgresDb = 'joplin'

// Mattermost/Nextcloud mount the postgres volume at the parent dir; the image's
// default PGDATA (/var/lib/postgresql/data) then lives on the volume.
export const POSTGRES_DIR = '/var/lib/postgresql'

export function getPassword(): string {
  return utils.getDefaultString({ charset: 'a-z,A-Z,1-9', len: 24 })
}

export const postgresMount = sdk.Mounts.of().mountVolume({
  volumeId: 'db',
  subpath: null,
  mountpoint: POSTGRES_DIR,
  readonly: false,
})

export function getPostgresSub(effects: T.Effects) {
  return sdk.SubContainer.of(
    effects,
    { imageId: 'postgres' },
    postgresMount,
    'postgres-sub',
  )
}

// Joplin stores everything in Postgres by default, so its container needs no
// persistent volume of its own.
export function getJoplinSub(effects: T.Effects) {
  return sdk.SubContainer.of(
    effects,
    { imageId: 'joplin' },
    sdk.Mounts.of(),
    'joplin-sub',
  )
}
