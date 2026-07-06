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
    credentialsShown: z.boolean().default(false),
  })
  .strip()

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: './store.json' },
  shape,
)
