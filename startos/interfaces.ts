import { sdk } from './sdk'
import { uiPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const uiMulti = sdk.MultiHost.of(effects, 'ui-multi')
  const uiOrigin = await uiMulti.bindPort(uiPort, { protocol: 'http' })

  // Joplin serves both its web admin UI and the sync API on the same port.
  const ui = sdk.createInterface(effects, {
    name: 'Joplin Server',
    id: 'ui',
    description: 'The Joplin Server web interface and sync API',
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  const receipt = await uiOrigin.export([ui])
  return [receipt]
})
