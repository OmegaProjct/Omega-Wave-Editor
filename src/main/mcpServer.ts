/**
 * mcpServer.ts
 * Model Context Protocol (MCP) Server for headless, automation-driven DAW operations.
 * Communicates via stdin/stdout using standard JSON-RPC 2.0.
 */

import { Project, Recipe } from '../common/types'
import * as projectCore from '../common/projectCore'
import { HeadlessRunner } from '../common/headlessRunner'
import * as fs from 'fs'
import * as path from 'path'

// Dynamic version retrieval matching package.json
let appVersion = '0.4.1'
try {
  const pkgPath = path.join(__dirname, '..', '..', 'package.json')
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    if (pkg && pkg.version) {
      appVersion = pkg.version
    }
  }
} catch {
  // Safe fallback
}

// Current in-memory project session for the MCP server
let activeProject: Project = projectCore.createDefaultProject(4, 48000)
let activeProjectPath: string | null = null

export function startMcpServer() {
  process.stdin.setEncoding('utf8')

  let buffer = ''

  process.stdin.on('data', (chunk) => {
    buffer += chunk
    
    // Process all complete lines (JSON-RPC frames)
    let newlineIdx = buffer.indexOf('\n')
    while (newlineIdx !== -1) {
      const line = buffer.substring(0, newlineIdx).trim()
      buffer = buffer.substring(newlineIdx + 1)
      
      if (line) {
        try {
          const request = JSON.parse(line)
          handleRequest(request)
        } catch (err: any) {
          sendError(null, -32700, `Parse error: ${err.message}`)
        }
      }
      newlineIdx = buffer.indexOf('\n')
    }
  })

  console.error(`[MCP Server] Omega Wave Editor MCP started (Version: ${appVersion}).`)
}

function sendResponse(id: any, result: any) {
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id,
    result
  })
  process.stdout.write(payload + '\n')
}

function sendError(id: any, code: number, message: string, data?: any) {
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data
    }
  })
  process.stdout.write(payload + '\n')
}

function handleRequest(req: any) {
  const { jsonrpc, method, params, id } = req
  if (jsonrpc !== '2.0') {
    return sendError(id, -32600, 'Invalid Request: expected jsonrpc "2.0"')
  }

  switch (method) {
    case 'initialize':
      return sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'omega-wave-editor-mcp',
          version: appVersion
        }
      })

    case 'tools/list':
      return sendResponse(id, {
        tools: getToolsList()
      })

    case 'tools/call':
      if (!params || !params.name) {
        return sendError(id, -32602, 'Invalid params: name of the tool is required')
      }
      return executeToolCall(id, params.name, params.arguments || {})

    default:
      return sendError(id, -32601, `Method not found: ${method}`)
  }
}

function getToolsList() {
  return [
    {
      name: 'project_create',
      description: 'Creates a new empty audio project arrangement.',
      inputSchema: {
        type: 'object',
        properties: {
          tracksCount: { type: 'number', description: 'Number of initial tracks (default 4)' },
          sampleRate: { type: 'number', description: 'Sample rate (default 48000)' }
        }
      }
    },
    {
      name: 'project_load',
      description: 'Loads and validates an existing .owep project file from absolute path.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to the .owep file' }
        },
        required: ['path']
      }
    },
    {
      name: 'project_save',
      description: 'Saves the current active project file (.owep).',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute destination path for the .owep file' }
        },
        required: ['path']
      }
    },
    {
      name: 'track_add',
      description: 'Adds an empty audio track to the project.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Display name for the track' }
        }
      }
    },
    {
      name: 'track_remove',
      description: 'Removes a track from the project by track ID.',
      inputSchema: {
        type: 'object',
        properties: {
          trackId: { type: 'string', description: 'ID of the track to remove' }
        },
        required: ['trackId']
      }
    },
    {
      name: 'clip_import',
      description: 'Imports a physical audio clip into a track.',
      inputSchema: {
        type: 'object',
        properties: {
          trackId: { type: 'string', description: 'ID of target track' },
          filePath: { type: 'string', description: 'Path to audio file' },
          startPos: { type: 'number', description: 'Timeline start position in seconds' },
          duration: { type: 'number', description: 'Duration in seconds' }
        },
        required: ['trackId', 'filePath', 'startPos', 'duration']
      }
    },
    {
      name: 'clip_split',
      description: 'Splits an existing clip into two separate parts at a specified timeline position.',
      inputSchema: {
        type: 'object',
        properties: {
          trackId: { type: 'string', description: 'Track ID containing the clip' },
          regionId: { type: 'string', description: 'Region/Clip ID to split' },
          splitPos: { type: 'number', description: 'Split playhead position in seconds' }
        },
        required: ['trackId', 'regionId', 'splitPos']
      }
    },
    {
      name: 'batch_execute',
      description: 'Executes a sequential Recipe list of commands with strict file integrity safety.',
      inputSchema: {
        type: 'object',
        properties: {
          recipe: { type: 'object', description: 'The JSON recipe structure containing steps array' }
        },
        required: ['recipe']
      }
    }
  ]
}

async function executeToolCall(id: any, name: string, args: any) {
  try {
    switch (name) {
      case 'project_create': {
        const tracksCount = typeof args.tracksCount === 'number' ? args.tracksCount : 4
        const sampleRate = typeof args.sampleRate === 'number' ? args.sampleRate : 48000
        activeProject = projectCore.createDefaultProject(tracksCount, sampleRate)
        activeProjectPath = null
        return sendResponse(id, {
          content: [{ type: 'text', text: `Neues Projekt erfolgreich erstellt (${tracksCount} Spuren, ${sampleRate} Hz)` }],
          project: activeProject
        })
      }

      case 'project_load': {
        const filePath = path.resolve(args.path)
        if (!fs.existsSync(filePath)) {
          return sendError(id, 404, `Fehler: Datei nicht gefunden unter Pfad: ${filePath}`)
        }
        const fileContent = fs.readFileSync(filePath, 'utf8')
        const rawJson = JSON.parse(fileContent)
        activeProject = projectCore.validateAndMigrateProject(rawJson)
        activeProjectPath = filePath
        return sendResponse(id, {
          content: [{ type: 'text', text: `Projekt erfolgreich geladen und validiert von: ${filePath}` }],
          project: activeProject
        })
      }

      case 'project_save': {
        const targetPath = path.resolve(args.path)
        const inputs = HeadlessRunner.getInputFilePaths(activeProject)
        
        // Safety check to prevent overwriting raw clips
        const safePath = HeadlessRunner.getSafeOutputPath(targetPath, inputs, { allowOverwrite: false })
        
        fs.writeFileSync(safePath, JSON.stringify(activeProject, null, 2), 'utf8')
        activeProjectPath = safePath
        
        return sendResponse(id, {
          content: [{ type: 'text', text: `Projektdatei (.owep) erfolgreich gesichert unter: ${safePath}` }]
        })
      }

      case 'track_add': {
        activeProject = projectCore.addTrack(activeProject, args.name)
        return sendResponse(id, {
          content: [{ type: 'text', text: `Spur erfolgreich hinzugefügt: ${args.name || 'Unbenannt'}` }],
          project: activeProject
        })
      }

      case 'track_remove': {
        const trackExists = activeProject.tracks.some(t => t.id === args.trackId)
        if (!trackExists) {
          return sendError(id, 404, `Fehler: Spur mit der ID '${args.trackId}' existiert nicht im Projekt.`)
        }
        activeProject = projectCore.removeTrack(activeProject, args.trackId)
        return sendResponse(id, {
          content: [{ type: 'text', text: `Spur erfolgreich entfernt: ${args.trackId}` }],
          project: activeProject
        })
      }

      case 'clip_import': {
        const filePath = args.filePath
        const trackExists = activeProject.tracks.some(t => t.id === args.trackId)
        if (!trackExists) {
          return sendError(id, 404, `Fehler: Zielspur mit der ID '${args.trackId}' existiert nicht im Projekt.`)
        }

        // Check if file exists, allowing internal schema paths for tests/placeholders
        if (!filePath.startsWith('internal://') && !fs.existsSync(filePath)) {
          return sendError(id, 404, `Fehler: Audiodatei existiert nicht unter Pfad: ${filePath}`)
        }

        const filename = path.basename(filePath)
        const fileEntry = { name: filename, path: filePath, isDirectory: false }
        
        activeProject = projectCore.importClip(activeProject, args.trackId, fileEntry, args.startPos, args.duration)
        return sendResponse(id, {
          content: [{ type: 'text', text: `Clip erfolgreich in Spur ${args.trackId} importiert: ${filename}` }],
          project: activeProject
        })
      }

      case 'clip_split': {
        // Verify clip/region exists on track
        const track = activeProject.tracks.find(t => t.id === args.trackId)
        if (!track) {
          return sendError(id, 404, `Fehler: Spur mit der ID '${args.trackId}' nicht gefunden.`)
        }
        const regionExists = track.regions.some(r => r.id === args.regionId)
        if (!regionExists) {
          return sendError(id, 404, `Fehler: Clip/Region mit der ID '${args.regionId}' nicht gefunden auf Spur '${args.trackId}'.`)
        }

        activeProject = projectCore.splitClip(activeProject, args.trackId, args.regionId, args.splitPos)
        return sendResponse(id, {
          content: [{ type: 'text', text: `Clip ${args.regionId} an Position ${args.splitPos}s erfolgreich geteilt.` }],
          project: activeProject
        })
      }

      case 'batch_execute': {
        const recipe = args.recipe as Recipe
        const result = await HeadlessRunner.executeRecipe(activeProject, recipe, { allowOverwrite: false })
        activeProject = result.project
        return sendResponse(id, {
          content: [{ type: 'text', text: `Batch-Recipe erfolgreich ausgeführt. Zielpfad: ${result.lastOutputPath || 'Kein Dateiexport'}` }],
          project: activeProject
        })
      }

      default:
        return sendError(id, -32601, `Tool nicht gefunden: ${name}`)
    }
  } catch (err: any) {
    return sendError(id, 500, `Ausführungsfehler: ${err.message}`)
  }
}
