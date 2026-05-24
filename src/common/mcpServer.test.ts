/**
 * mcpServer.test.ts
 * Standalone Node.js Integration Tests for the Model Context Protocol (MCP) Server.
 * Spawns the server as a child process and communicates via stdin/stdout.
 */

import { spawn } from 'child_process'
import * as assert from 'assert'
import * as path from 'path'
import * as fs from 'fs'

console.log('=== STARTE OMEGA WAVE EDITOR MCP INTEGRATION TESTS ===\n')

async function runMcpTests() {
  // Path to main entry point or a simple loader that invokes the mcpServer
  // We can write a tiny loader or use ts-node to run the mcpServer start routine directly!
  const serverPath = path.resolve(__dirname, 'mcpTestLoader.ts')
  
  // Create a temporary loader script that imports and starts the MCP server
  fs.writeFileSync(
    serverPath,
    `import { startMcpServer } from '../main/mcpServer'; startMcpServer();`,
    'utf8'
  )

  // Spawn the ts-node child process
  const child = spawn(
    'npx',
    ['ts-node', `"${serverPath}"`],
    {
      shell: true,
      env: {
        ...process.env,
        TS_NODE_COMPILER_OPTIONS: '{"module":"commonjs"}'
      }
    }
  )

  child.stderr.on('data', (data) => {
    console.error(`[Server Stderr] ${data.toString()}`)
  })

  let buffer = ''
  
  const writeRequest = (req: any) => {
    child.stdin.write(JSON.stringify(req) + '\n')
  }

  const readResponse = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      const onData = (chunk: any) => {
        buffer += chunk.toString()
        const newlineIdx = buffer.indexOf('\n')
        if (newlineIdx !== -1) {
          const line = buffer.substring(0, newlineIdx).trim()
          buffer = buffer.substring(newlineIdx + 1)
          child.stdout.off('data', onData)
          try {
            resolve(JSON.parse(line))
          } catch (err) {
            reject(err)
          }
        }
      }
      child.stdout.on('data', onData)
      
      // Safety timeout
      setTimeout(() => {
        child.stdout.off('data', onData)
        reject(new Error('Timeout waiting for MCP response'))
      }, 5000)
    })
  }

  const pkgPath = path.resolve(__dirname, '../../package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const expectedVersion = pkg.version || '0.5.0'

  try {
    // --- Test 1: MCP initialize ---
    console.log('[MCP Test 1] Sende initialize Handshake...');
    writeRequest({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {},
      id: 1
    })
    const initRes = await readResponse()
    assert.strictEqual(initRes.jsonrpc, '2.0')
    assert.strictEqual(initRes.id, 1)
    assert.strictEqual(initRes.result.serverInfo.name, 'omega-wave-editor-mcp')
    assert.strictEqual(initRes.result.serverInfo.version, expectedVersion)
    console.log(`  -> OK: Handshake erfolgreich (Version: ${expectedVersion}).\n`)

    // --- Test 2: MCP tools/list ---
    console.log('[MCP Test 2] Sende tools/list...');
    writeRequest({
      jsonrpc: '2.0',
      method: 'tools/list',
      id: 2
    })
    const listRes = await readResponse()
    assert.strictEqual(listRes.id, 2)
    const tools = listRes.result.tools
    assert.ok(Array.isArray(tools))
    
    // Verify no unimplemented tools are listed
    const toolNames = tools.map((t: any) => t.name)
    assert.ok(toolNames.includes('project_create'))
    assert.ok(toolNames.includes('project_load'))
    assert.ok(toolNames.includes('project_save'))
    assert.ok(toolNames.includes('track_add'))
    assert.ok(toolNames.includes('track_remove'))
    assert.ok(toolNames.includes('clip_import'))
    assert.ok(toolNames.includes('clip_split'))
    assert.ok(toolNames.includes('batch_execute'))
    
    // Unimplemented must NOT exist
    assert.ok(!toolNames.includes('project_export'))
    assert.ok(!toolNames.includes('effects_apply'))
    console.log('  -> OK: tools/list listet ausschließlich funktionierende Tools.\n')

    // --- Test 3: MCP clip_import mit falscher Track-ID (erwarteter Fehler) ---
    console.log('[MCP Test 3] clip_import mit ungültiger trackId (erwarteter Fehler)...');
    writeRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'clip_import',
        arguments: {
          trackId: 'invalid-track-999',
          filePath: 'internal://limiter',
          startPos: 0,
          duration: 10
        }
      },
      id: 3
    })
    const callRes = await readResponse()
    assert.ok(callRes.error)
    assert.strictEqual(callRes.error.code, 404)
    assert.ok(callRes.error.message.includes('Zielspur mit der ID \'invalid-track-999\' existiert nicht'))
    console.log('  -> OK: Import schlägt bei ungültiger trackId verlässlich fehl.\n')

    // --- Test 4: MCP project_save schreiben ---
    console.log('[MCP Test 4] project_save sichert gültige OWEP Datei...');
    const outPath = path.join(__dirname, 'mcp_saved_test.owep')
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath)

    writeRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'project_save',
        arguments: {
          path: outPath
        }
      },
      id: 4
    })
    const saveRes = await readResponse()
    assert.ok(!saveRes.error)
    assert.ok(fs.existsSync(outPath))
    
    // Verify file content structure
    const savedData = JSON.parse(fs.readFileSync(outPath, 'utf8'))
    assert.strictEqual(savedData.format, 'OWEP')
    
    // Cleanup
    fs.unlinkSync(outPath)
    console.log('  -> OK: project_save schreibt gültige, strukturierte OWEP Projektdatei.\n')

    // --- Test 5: MCP batch_execute mit unbekannter Action (erwarteter Fehler) ---
    console.log('[MCP Test 5] batch_execute mit unbekannter Action (erwarteter Fehler)...');
    writeRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'batch_execute',
        arguments: {
          recipe: {
            steps: [
              {
                action: 'invalid.action.name',
                payload: {}
              }
            ]
          }
        }
      },
      id: 5
    })
    const batchRes = await readResponse()
    assert.ok(batchRes.error)
    assert.ok(batchRes.error.message.includes('Unbekannter oder nicht unterstützter Action-Typ'))
    console.log('  -> OK: Batch-Recipe mit unbekannter Action schlägt kontrolliert fehl.\n')

    console.log('=== ALLE MCP INTEGRATION TESTS ERFOLGREICH BESTANDEN! ===');
  } finally {
    // Cleanup loader script
    try {
      if (fs.existsSync(serverPath)) fs.unlinkSync(serverPath)
    } catch {}

    // Shutdown subprocess safely
    child.kill()
  }
}

runMcpTests().then(() => process.exit(0)).catch(err => {
  console.error('\n!!! MCP INTEGRATION TEST FEHLGESCHLAGEN !!!')
  console.error(err)
  process.exit(1)
})
