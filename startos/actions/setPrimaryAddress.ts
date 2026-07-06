import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'

// Joplin accepts only one canonical URL (APP_BASE_URL) and rejects every other
// host with "Invalid origin". This action lets the user choose which StartOS
// address that URL should be, rather than the package guessing.
const inputSpec = sdk.InputSpec.of({
  primaryAddress: sdk.Value.select({
    name: 'Primary address',
    description:
      'Which StartOS address Joplin uses as its canonical URL. Joplin only accepts one, so use this address for the web UI and all sync clients — the others will report "Invalid origin".',
    default: 'auto',
    values: {
      auto: 'Auto (prefer a clearnet domain, else LAN .local)',
      domain: 'Clearnet domain',
      local: 'LAN (.local)',
    },
  }),
})

export const setPrimaryAddress = sdk.Action.withInput(
  'set-primary-address',

  async ({ effects }) => ({
    name: 'Set Primary Address',
    description: 'Choose which address Joplin treats as its canonical URL',
    warning:
      'Changing this restarts Joplin. Use the selected address for the web UI and sync clients.',
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => ({
    primaryAddress:
      (await storeJson.read((s) => s.primaryAddress).const(effects)) ?? 'auto',
  }),

  async ({ effects, input }) =>
    storeJson.merge(effects, { primaryAddress: input.primaryAddress }),
)
