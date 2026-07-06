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

export type PrimaryAddress = 'auto' | 'domain' | 'local'

// Joplin validates every request's origin host against APP_BASE_URL, so it must
// be a real StartOS interface URL. StartOS may expose several addresses (a LAN
// .local hostname, a clearnet domain, Tor), but Joplin accepts only one — so we
// pick according to the user's preference (default: prefer a clearnet domain,
// else the LAN .local address). Using .const() re-runs main (restarting the
// daemon) if the chosen URL changes.
export async function getAppBaseUrl(
  effects: T.Effects,
  preference: PrimaryAddress = 'auto',
): Promise<string> {
  const chosen = await sdk.serviceInterface
    .getOwn(effects, 'ui', (i) => {
      const urls = i?.addressInfo?.nonLocal.format('urlstring') ?? []
      const hostOf = (u: string) => {
        try {
          return new URL(u).hostname
        } catch {
          return ''
        }
      }
      const domain = urls.find((u) => {
        const h = hostOf(u)
        return (
          !!h &&
          !h.endsWith('.local') &&
          !h.endsWith('.onion') &&
          /\.[a-z]{2,}$/i.test(h)
        )
      })
      const local = urls.find((u) => hostOf(u).endsWith('.local'))
      if (preference === 'local') return local ?? domain ?? urls[0] ?? null
      // 'auto' and 'domain' both prefer a clearnet domain when one exists.
      return domain ?? local ?? urls[0] ?? null
    })
    .const()
  return chosen ?? `http://localhost:${uiPort}`
}
