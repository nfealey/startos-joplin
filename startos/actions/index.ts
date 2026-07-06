import { sdk } from '../sdk'
import { showCredentials } from './showCredentials'
import { setPrimaryAddress } from './setPrimaryAddress'
import { resetPassword } from './resetPassword'

export const actions = sdk.Actions.of()
  .addAction(showCredentials)
  .addAction(setPrimaryAddress)
  .addAction(resetPassword)
