import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { getPassword } from '../utils'
import { bootstrapAdminPassword } from '../init/bootstrap'

// Rotates the Joplin admin password. Runs with the service stopped and brings
// up a short-lived stack (like install) to apply the change via Joplin's API,
// which avoids the origin-check issues of calling the live service.
export const resetPassword = sdk.Action.withoutInput(
  'reset-admin-password',

  async ({ effects }) => ({
    name: 'Reset Admin Password',
    description: 'Generate a new Joplin admin password and apply it',
    warning:
      'This changes your Joplin admin password. You will need to update any Joplin clients that log in with it.',
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const store = await storeJson.read().once()
    if (!store) throw new Error('store.json not found')

    const newPassword = getPassword()

    await bootstrapAdminPassword(effects, {
      postgresPassword: store.postgresPassword,
      loginPassword: store.adminPassword,
      newPassword,
      skipOnAuthFail: false,
    })

    await storeJson.merge(effects, { adminPassword: newPassword })

    return {
      version: '1' as const,
      title: 'Admin Password Reset',
      message:
        'Your Joplin admin password has been changed. Use the new password below and update any sync clients.',
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: 'Email',
            description: null,
            value: 'admin@localhost',
            masked: false,
            copyable: true,
            qr: false,
          },
          {
            type: 'single',
            name: 'New Password',
            description: null,
            value: newPassword,
            masked: true,
            copyable: true,
            qr: false,
          },
        ],
      },
    }
  },
)
