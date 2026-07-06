import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'

// Joplin's first admin is always created as admin@localhost / admin. At install
// we replace that default with a generated password via Joplin's API (see
// init/onInstall.ts) and store it here. If that bootstrap failed, the stored
// value falls back to 'admin'.
export const showCredentials = sdk.Action.withoutInput(
  'show-credentials',
  async ({ effects }) => ({
    name: 'Show Admin Login',
    description: 'Display the Joplin Server admin login',
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),
  async ({ effects }) => {
    const store = await storeJson.read().once()
    const password = store?.adminPassword ?? 'admin'
    const isDefault = password === 'admin'

    return {
      version: '1',
      title: 'Joplin Server Admin Login',
      message: isDefault
        ? 'Log in to the Joplin Server web UI with the credentials below, then CHANGE THE PASSWORD immediately from the profile page — this is Joplin’s default password.'
        : 'Log in to the Joplin Server web UI with the credentials below. This password was generated for you at install; you can change it anytime from the Joplin profile page.',
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
            name: isDefault ? 'Password (default — change immediately)' : 'Password',
            description: null,
            value: password,
            masked: !isDefault,
            copyable: true,
            qr: false,
          },
        ],
      },
    }
  },
)
