import { T } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import {
  getJoplinSub,
  getPostgresSub,
  postgresDb,
  postgresPort,
  postgresUser,
  uiPort,
} from '../utils'

// Runs inside a Joplin subcontainer (which has Node). Logs into Joplin with
// LOGIN_PASSWORD and sets the admin password to NEW_PASSWORD via Joplin's API.
// Calls over 127.0.0.1 to match the temporary APP_BASE_URL below (Joplin checks
// the request origin host). If SKIP_ON_AUTH_FAIL=1, an auth failure (meaning the
// password was already changed) exits cleanly instead of erroring.
const BOOTSTRAP_SCRIPT = `
const B = 'http://127.0.0.1:${uiPort}'
const lp = process.env.LOGIN_PASSWORD, np = process.env.NEW_PASSWORD
const skip = process.env.SKIP_ON_AUTH_FAIL === '1'
;(async () => {
  const l = await fetch(B + '/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@localhost', password: lp }),
  })
  if (l.status === 401 || l.status === 403) {
    if (skip) { console.log('auth failed; already bootstrapped, skipping'); process.exit(0) }
    console.error('authentication failed ' + l.status); process.exit(1)
  }
  if (!l.ok) { console.error('login failed ' + l.status); process.exit(1) }
  const j = await l.json()
  const p = await fetch(B + '/api/users/' + j.user_id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Api-Auth': j.id },
    body: JSON.stringify({ password: np }),
  })
  if (!p.ok) { console.error('patch failed ' + p.status); process.exit(1) }
  console.log('admin password set')
  process.exit(0)
})().catch((e) => { console.error(e); process.exit(1) })
`

// Brings the full stack up once (postgres → joplin) and runs a bootstrap oneshot
// that changes the Joplin admin password, then tears everything down. Throws if
// the run does not complete successfully within the timeout.
export async function bootstrapAdminPassword(
  effects: T.Effects,
  opts: {
    postgresPassword: string
    loginPassword: string
    newPassword: string
    skipOnAuthFail: boolean
  },
): Promise<void> {
  const postgresSub = await getPostgresSub(effects)
  const joplinSub = await getJoplinSub(effects)
  const bootstrapSub = await getJoplinSub(effects)

  await sdk.Daemons.of(effects)
    .addDaemon('postgres', {
      subcontainer: postgresSub,
      exec: {
        command: sdk.useEntrypoint(['-c', 'listen_addresses=127.0.0.1']),
        env: {
          POSTGRES_USER: postgresUser,
          POSTGRES_PASSWORD: opts.postgresPassword,
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
          // 127.0.0.1 so the internal bootstrap API call passes the origin check.
          APP_BASE_URL: `http://127.0.0.1:${uiPort}`,
          DB_CLIENT: 'pg',
          POSTGRES_CONNECTION_STRING: `postgresql://${postgresUser}:${encodeURIComponent(
            opts.postgresPassword,
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
        env: {
          LOGIN_PASSWORD: opts.loginPassword,
          NEW_PASSWORD: opts.newPassword,
          SKIP_ON_AUTH_FAIL: opts.skipOnAuthFail ? '1' : '0',
        },
      },
      requires: ['joplin'],
    })
    .runUntilSuccess(300_000)
}
