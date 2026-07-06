import { sdk } from './sdk'
import { storeJson } from './fileModels/store.json'
import {
  getAppBaseUrl,
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

  // Joplin validates each request's origin host against APP_BASE_URL, so it
  // must be a real StartOS interface URL. Which address (domain vs LAN) is used
  // follows the user's Primary Address preference (see actions/setPrimaryAddress).
  const appBaseUrl = await getAppBaseUrl(effects, store.primaryAddress)
  console.info(`Joplin APP_BASE_URL: ${appBaseUrl}`)

  const postgresSub = await getPostgresSub(effects)
  const joplinSub = await getJoplinSub(effects)

  return sdk.Daemons.of(effects)
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
})
