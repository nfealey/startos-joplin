import { sdk } from './sdk'
import { storeJson } from './fileModels/store.json'
import {
  getJoplinSub,
  getPostgresSub,
  postgresDb,
  postgresPort,
  postgresUser,
  uiPort,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info('Starting Joplin Server...')

  // Read-only in main (generation happens in init/onInstall), so .const is safe
  // and gives us a restart if the password ever changes.
  const store = await storeJson.read((s) => s).const(effects)
  if (!store) {
    throw new Error('store.json not found — please reinstall the service')
  }
  const postgresPassword = store.postgresPassword

  // Joplin validates every request's origin against APP_BASE_URL (host must
  // match exactly), so it must be the real StartOS interface URL — not
  // localhost. Prefer the LAN .local address, which is how most users connect.
  // .const() re-runs main (restarting the daemon) if the assigned URL changes.
  const appBaseUrl =
    (await sdk.serviceInterface
      .getOwn(effects, 'ui', (i) => {
        const urls = i?.addressInfo?.nonLocal.format('urlstring') ?? []
        const hostOf = (u: string) => {
          try {
            return new URL(u).hostname
          } catch {
            return ''
          }
        }
        // Prefer a registered clearnet domain (e.g. joplin.example.com), then
        // the LAN .local address. Joplin validates each request's origin host
        // against APP_BASE_URL, so whichever we pick here is the address the
        // web UI and sync clients must connect through.
        const clearnet = urls.find((u) => {
          const h = hostOf(u)
          return (
            !!h &&
            !h.endsWith('.local') &&
            !h.endsWith('.onion') &&
            /\.[a-z]{2,}$/i.test(h)
          )
        })
        const local = urls.find((u) => hostOf(u).endsWith('.local'))
        return clearnet ?? local ?? urls[0] ?? null
      })
      .const()) ?? `http://localhost:${uiPort}`
  console.info(`Joplin APP_BASE_URL: ${appBaseUrl}`)

  const postgresSub = await getPostgresSub(effects)
  const joplinSub = await getJoplinSub(effects)

  return (
    sdk.Daemons.of(effects)
      .addDaemon('postgres', {
        subcontainer: postgresSub,
        exec: {
          command: sdk.useEntrypoint(['-c', 'listen_addresses=127.0.0.1']),
          env: {
            POSTGRES_USER: postgresUser,
            POSTGRES_PASSWORD: postgresPassword,
            POSTGRES_DB: postgresDb,
          },
        },
        ready: {
          display: 'Database',
          fn: async () => {
            const { exitCode } = await postgresSub.exec([
              'pg_isready',
              '-U',
              postgresUser,
              '-d',
              postgresDb,
              '-h',
              '127.0.0.1',
            ])
            return exitCode !== 0
              ? {
                  result: 'loading',
                  message: 'Waiting for PostgreSQL to be ready',
                }
              : { result: 'success', message: 'PostgreSQL is ready' }
          },
        },
        requires: [],
      })
      .addDaemon('joplin', {
        subcontainer: joplinSub,
        exec: {
          command: sdk.useEntrypoint(),
          env: {
            NODE_ENV: 'production',
            APP_PORT: String(uiPort),
            APP_BASE_URL: appBaseUrl,
            DB_CLIENT: 'pg',
            // Joplin rewrites POSTGRES_HOST=localhost/127.0.0.1 to
            // host.docker.internal (a Docker Desktop convenience), which does
            // NOT resolve inside the StartOS subcontainer. The connection-string
            // path skips that swap, so we reach the sidecar over loopback — same
            // approach the Start9 mattermost package uses.
            POSTGRES_CONNECTION_STRING: `postgresql://${postgresUser}:${encodeURIComponent(
              postgresPassword,
            )}@127.0.0.1:${postgresPort}/${postgresDb}`,
          },
        },
        ready: {
          display: 'Web Interface',
          // Joplin runs DB migrations on first boot before it binds the port,
          // which can take a while — give it room before flagging unhealthy.
          gracePeriod: 300000,
          fn: () =>
            sdk.healthCheck.checkWebUrl(
              effects,
              `http://localhost:${uiPort}/api/ping`,
              {
                successMessage: 'Joplin Server is ready',
                errorMessage: 'Joplin Server is not responding',
              },
            ),
        },
        requires: ['postgres'],
      })
  )
})
