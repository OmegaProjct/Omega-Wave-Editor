import type { PluginDescriptor } from '../../../common/types'

type RackPluginEntry = {
  id?: string
  name?: string
  manufacturer?: string
  path?: string
  instanceId?: number
  hasEditor?: boolean
  active?: boolean
  missingFromScan?: boolean
  notHostable?: boolean
  unsupportedReason?: string
}

type StorePluginLike = {
  id: string
  name: string
  manufacturer: string
}

export type DerivedPluginStatus = {
  scannedPlugin?: PluginDescriptor
  rackEntry?: RackPluginEntry
  isDownloaded: boolean
  downloadedPath?: string
  isInstalled: boolean
  isInRack: boolean
  isActiveInRack: boolean
  isHostable: boolean
  missingFromScan: boolean
  notHostable: boolean
  unsupportedReason?: string
}

export function normalizePluginLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/\(free\)/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

export function isPlaceholderPluginPath(filePath?: string): boolean {
  return !!filePath && (filePath.startsWith('store://') || filePath.startsWith('internal://'))
}

export function isRealExternalPlugin(plugin: { path?: string }): boolean {
  return !!plugin.path && !isPlaceholderPluginPath(plugin.path)
}

export function readRackPluginsFromStorage(): RackPluginEntry[] {
  const raw = localStorage.getItem('vst_rack_plugins')
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry === 'object') : []
  } catch {
    return []
  }
}

export function hasRealPluginLoadedInRack(rackPlugins: RackPluginEntry[]): boolean {
  return rackPlugins.some((plugin) => plugin && isRealExternalPlugin(plugin))
}

export function isPluginBlockedBySingleton(plugin: { id?: string; path?: string }, rackPlugins: RackPluginEntry[]): boolean {
  return false
}

export function getRackEntryForPlugin(
  plugin: { id?: string; path?: string },
  rackPlugins: RackPluginEntry[]
): RackPluginEntry | undefined {
  return rackPlugins.find((entry) => entry && (entry.id === plugin.id || (!!plugin.path && entry.path === plugin.path)))
}

export function pluginLooksInstalled(
  storePlugin: StorePluginLike,
  scannedPlugin: { name?: string; manufacturer?: string; path?: string }
): boolean {
  const storeName = normalizePluginLabel(storePlugin.name)
  const scanName = normalizePluginLabel(scannedPlugin.name || '')
  const storeManufacturer = normalizePluginLabel(storePlugin.manufacturer)
  const scanManufacturer = normalizePluginLabel(scannedPlugin.manufacturer || '')
  const scanPath = normalizePluginLabel(scannedPlugin.path || '')

  if (!scanName) return false
  if (scanName === storeName || scanName.includes(storeName) || storeName.includes(scanName)) return true
  if (storeManufacturer && (scanManufacturer.includes(storeManufacturer) || scanPath.includes(storeManufacturer))) {
    return scanName.includes(storeName.slice(0, Math.min(storeName.length, 5)))
  }
  return false
}

export function getScannedPluginForStore(
  storePlugin: StorePluginLike,
  scannedPlugins: PluginDescriptor[]
): PluginDescriptor | undefined {
  return scannedPlugins.find((scannedPlugin) => pluginLooksInstalled(storePlugin, scannedPlugin))
}

export function getDerivedPluginStatus(
  plugin: { id?: string; path?: string; hostable?: boolean; unsupportedReason?: string },
  rackPlugins: RackPluginEntry[],
  downloadedPaths?: Record<string, string>
): DerivedPluginStatus {
  const rackEntry = getRackEntryForPlugin(plugin, rackPlugins)
  const downloadedPath = plugin.id && downloadedPaths ? downloadedPaths[plugin.id] : undefined
  const missingFromScan = rackEntry?.missingFromScan === true
  const notHostable = rackEntry?.notHostable === true || plugin.hostable === false
  const unsupportedReason = rackEntry?.unsupportedReason || plugin.unsupportedReason

  return {
    isDownloaded: !!downloadedPath,
    downloadedPath,
    rackEntry,
    isInstalled: false,
    isInRack: !!rackEntry,
    isActiveInRack: rackEntry?.active !== false && !!rackEntry,
    isHostable: !notHostable,
    missingFromScan,
    notHostable,
    unsupportedReason
  }
}

export function getStorePluginStatus(
  storePlugin: StorePluginLike,
  scannedPlugins: PluginDescriptor[],
  rackPlugins: RackPluginEntry[],
  downloadedPaths: Record<string, string>
): DerivedPluginStatus {
  const scannedPlugin = getScannedPluginForStore(storePlugin, scannedPlugins)
  const rackEntry = scannedPlugin
    ? getRackEntryForPlugin(scannedPlugin, rackPlugins)
    : getRackEntryForPlugin(storePlugin, rackPlugins)
  const downloadedPath = downloadedPaths[storePlugin.id]
  const missingFromScan = rackEntry?.missingFromScan === true
  const notHostable = rackEntry?.notHostable === true || scannedPlugin?.hostable === false
  const unsupportedReason = rackEntry?.unsupportedReason || scannedPlugin?.unsupportedReason

  return {
    scannedPlugin,
    rackEntry,
    isDownloaded: !!downloadedPath,
    downloadedPath,
    isInstalled: !!scannedPlugin,
    isInRack: !!rackEntry,
    isActiveInRack: rackEntry?.active !== false && !!rackEntry,
    isHostable: scannedPlugin ? scannedPlugin.hostable !== false && !notHostable : false,
    missingFromScan,
    notHostable,
    unsupportedReason
  }
}
