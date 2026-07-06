import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { getPassword } from '../utils'
import { showCredentials } from '../actions/showCredentials'
import { bootstrapAdminPassword } from './bootstrap'

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
    primaryAddress: 'auto',
    credentialsShown: true,
  })

  try {
    await bootstrapAdminPassword(effects, {
      postgresPassword,
      loginPassword: 'admin',
      newPassword: adminPassword,
      skipOnAuthFail: true,
    })
    await storeJson.merge(effects, { adminPassword })
    await sdk.notification.create(effects, {
      level: 'success',
      title: 'Joplin admin login ready',
      message:
        'A unique admin password was generated for you. Run the "Show Admin Login" action to view it.',
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
