import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import {
  getJoplinSub,
  getPassword,
  getPostgresSub,
  postgresDb,
  postgresPort,
  postgresUser,
  uiPort,
} from '../utils'
import { showCredentials } from '../actions/showCredentials'

// Runs inside a Joplin subcontainer (which has Node) to replace Joplin's default
// admin login (admin@localhost / admin) with a generated password, via Joplin's
// own API. Self-guards: if admin/admin is already rejected, the password was
// changed before, so it exits cleanly. Calls the API over 127.0.0.1 to match
// APP_BASE_URL (Joplin validates the request origin host against it).
const BOOTSTRAP_SCRIPT = `
const B = 'http://127.0.0.1:${uiPort}', pw = process.env.ADMIN_PASSWORD
;(async () => {
  const l = await fetch(B + '/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@localhost', password: 'admin' }),
  })
  if (l.status === 403) { console.log('admin password already changed; skipping'); process.exit(0) }
  if (!l.ok) { console.error('login failed ' + l.status); process.exit(1) }
  const j = await l.json()
  const p = await fetch(B + '/api/users/' + j.user_id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Api-Auth': j.id },
    body: JSON.stringify({ password: pw }),
  })
  if (!p.ok) { console.error('patch failed ' + p.status); process.exit(1) }
  console.log('admin password set')
  process.exit(0)
})().catch((e) => { console.error(e); process.exit(1) })
`

export const onInstall = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') return

  const postgresPassword = getPassword()
  const adminPassword = getPassword()

  // Store with the default admin password first; only upgrade to the generated
  // one after the API bootstrap confirms it was applied. This way a failed
  // bootstrap leaves a working (default-login) install rather than a lockout.
  await storeJson.write(effects, {
    postgresPassword,
    adminPassword: 'admin',
    credentialsShown: true,
  })

  try {
    const postgresSub = await getPostgresSub(effects)
    const joplinSub = await getJoplinSub(effects)
    const bootstrapSub = await getJoplinSub(effects)

    // Bring the whole stack up once (postgres → joplin), then run a bootstrap
    // oneshot that changes the admin password once Joplin is serving.
    await sdk.Daemons.of(effects)
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
          display: null,
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
              ? { result: 'loading', message: 'Waiting for PostgreSQL' }
              : { result: 'success', message: 'PostgreSQL ready' }
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
            // 127.0.0.1 so the internal bootstrap API call passes origin check.
            APP_BASE_URL: `http://127.0.0.1:${uiPort}`,
            DB_CLIENT: 'pg',
            POSTGRES_CONNECTION_STRING: `postgresql://${postgresUser}:${encodeURIComponent(
              postgresPassword,
            )}@127.0.0.1:${postgresPort}/${postgresDb}`,
          },
        },
        ready: {
          display: null,
          fn: () =>
            sdk.healthCheck.checkWebUrl(
              effects,
              `http://127.0.0.1:${uiPort}/api/ping`,
              {
                successMessage: 'Joplin ready',
                errorMessage: 'Joplin not ready',
              },
            ),
        },
        requires: ['postgres'],
      })
      .addOneshot('bootstrap-admin', {
        subcontainer: bootstrapSub,
        exec: {
          command: ['node', '-e', BOOTSTRAP_SCRIPT],
          env: { ADMIN_PASSWORD: adminPassword },
        },
        requires: ['joplin'],
      })
      .runUntilSuccess(300_000)

    // Bootstrap succeeded — persist the generated password.
    await storeJson.write(effects, {
      postgresPassword,
      adminPassword,
      credentialsShown: true,
    })
  } catch (e) {
    // Leave the default admin/admin (already stored) so the install still works.
    console.error(
      'Admin password bootstrap failed; leaving Joplin default admin/admin',
      e,
    )
  }

  await sdk.action.createOwnTask(effects, showCredentials, 'critical', {
    reason: 'View your Joplin admin login',
  })
})
