/**
 * ipc.ts
 * Main entry point for IPC registration.
 * Orchestrates and imports submodules to avoid monolithic code.
 */

import { registerProjectIpc, setStartupFile } from './ipc/projectIpc'
import { registerAudioIpc } from './ipc/audioIpc'
import { registerSystemIpc } from './ipc/systemIpc'
import { registerPluginIpc } from './ipc/pluginIpc'

// Re-export setStartupFile for index.ts compatibility
export { setStartupFile }

/**
 * Registers all IPC handlers.
 * Executed once during the Electron application bootstrap.
 */
export function setupIpc() {
  registerProjectIpc()
  registerAudioIpc()
  registerSystemIpc()
  registerPluginIpc()
}
