import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z
  .object({
    // Internal password for the bundled PostgreSQL sidecar (never shown to the
    // user).
    postgresPassword: z.string(),
    // The Joplin admin login password. Set to a generated value at install (via
    // Joplin's API); falls back to 'admin' if that bootstrap fails.
    adminPassword: z.string().default('admin'),
    // Which StartOS address Joplin uses as its canonical URL (APP_BASE_URL).
    // Joplin only accepts one origin; the user picks via the Set Primary
    // Address action.
    primaryAddress: z.enum(['auto', 'domain', 'local']).default('auto'),
    credentialsShown: z.boolean().default(false),
  })
  .strip()

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: './store.json' },
  shape,
)
