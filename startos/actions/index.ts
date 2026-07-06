import { sdk } from '../sdk'
import { showCredentials } from './showCredentials'

export const actions = sdk.Actions.of().addAction(showCredentials)
