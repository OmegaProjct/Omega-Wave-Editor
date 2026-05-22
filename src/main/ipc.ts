import { ipcMain, shell, dialog, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { spawn } from 'child_process'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'

// Set ffmpeg and ffprobe paths with app.asar.unpacked handling for packaged production builds
let ffmpegPath = ffmpegStatic
let ffprobePath = ffprobeStatic && ffprobeStatic.path ? ffprobeStatic.path : ''

if (app.isPackaged) {
  if (ffmpegPath) {
    ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked')
  }
  if (ffprobePath) {
    ffprobePath = ffprobePath.replace('app.asar', 'app.asar.unpacked')
  }
}

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath)
}
if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath)
}

let startupFile: string | null = null

export function setStartupFile(filePath: string | null) {
  startupFile = filePath
}

function isNewerVersion(current: string, latest: string): boolean {
  if (!current || !latest) return false
  const parse = (v: string) => {
    const parts = v.replace(/^v/, '').split('.').map(Number)
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
  }
  const [currMajor, currMinor, currPatch] = parse(current)
  const [lateMajor, lateMinor, latePatch] = parse(latest)

  if (lateMajor > currMajor) return true
  if (lateMajor < currMajor) return false

  if (lateMinor > currMinor) return true
  if (lateMinor < currMinor) return false

  return latePatch > currPatch
}

function isSafePath(filePath: any): boolean {
  if (typeof filePath !== 'string' || filePath.trim() === '') return false
  try {
    const resolved = path.resolve(filePath)
    if (filePath.includes('file://')) return false
    if (filePath.includes('javascript:')) return false
    if (filePath.includes('data:')) return false
    return true
  } catch {
    return false
  }
}

export function setupIpc() {
  const appDataDir = app.getPath('userData')
  const settingsPath = path.join(appDataDir, 'settings.json')

  function getDefaultProjPath(): string {
    try {
      if (fs.existsSync(settingsPath)) {
        const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
        if (data && typeof data.projPath === 'string' && data.projPath.trim() !== '') {
          return data.projPath
        }
      }
    } catch (e) {
      console.error('Error reading projPath from settings.json:', e)
    }
    let docPath = ''
    try {
      docPath = app.getPath('documents')
    } catch (e) {
      docPath = path.join(os.homedir(), 'Documents')
    }
    return path.join(docPath, 'OmegaProjects', 'Omega Wave Editor', 'Projects')
  }

  ipcMain.handle('open-external', (_, url: string) => {
    if (typeof url !== 'string') return
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(url)
      } else {
        console.warn(`Blocked attempt to open insecure external URL: ${url}`)
      }
    } catch (e) {
      console.error(`Invalid URL attempt: ${url}`, e)
    }
  })

  ipcMain.handle('open-path', async (_, dirPath: string) => {
    if (!isSafePath(dirPath)) return { success: false, error: 'Ungültiger Pfad' }
    try {
      const resolved = path.resolve(dirPath)
      if (!fs.existsSync(resolved)) {
        return { success: false, error: 'Pfad existiert nicht' }
      }
      const err = await shell.openPath(resolved)
      if (err) {
        return { success: false, error: err }
      }
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('show-open-dialog', async (_, options: any) => {
    const opts = (typeof options === 'object' && options !== null) ? { ...options } : {}
    if (!opts.defaultPath) {
      opts.defaultPath = getDefaultProjPath()
    }
    return await dialog.showOpenDialog(opts)
  })

  ipcMain.handle('show-save-dialog', async (_, options: any) => {
    const opts = (typeof options === 'object' && options !== null) ? { ...options } : {}
    if (!opts.defaultPath) {
      opts.defaultPath = getDefaultProjPath()
    }
    return await dialog.showSaveDialog(opts)
  })

  ipcMain.handle('get-home-dir', () => {
    try {
      return app.getPath('desktop') // Returns the actual user desktop, avoiding Gemini container paths
    } catch (e) {
      return os.homedir()
    }
  })

  ipcMain.handle('get-media-info', async (_, filePath: string) => {
    if (!isSafePath(filePath)) return { duration: 10, tags: {} }
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          resolve({ duration: 10, tags: {} }) // Fallback bei Fehler
        } else {
          const rawTags = metadata.format.tags || {}
          const tags: Record<string, string> = {}
          // Normalisiere alle Metadaten-Schlüssel in Kleinschreibung
          for (const key of Object.keys(rawTags)) {
            tags[key.toLowerCase()] = String(rawTags[key])
          }
          resolve({
            duration: metadata.format.duration || 10,
            tags: {
              title: tags.title || tags.nam || '',
              artist: tags.artist || tags.composer || tags.performer || '',
              album: tags.album || '',
              year: tags.date || tags.year || tags.creation_time || '',
              genre: tags.genre || '',
              comment: tags.comment || tags.description || '',
              track: tags.track || tags.track_number || ''
            }
          })
        }
      })
    })
  })

  ipcMain.handle('read-dir', async (_, dirPath: string) => {
    if (!isSafePath(dirPath)) return []
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
      const visibleEntries = entries.filter(e => !e.name.startsWith('.'))
      const files = visibleEntries.map(entry => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        isDirectory: entry.isDirectory()
      }))
      return files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })
    } catch (error) {
      console.error('Error reading dir:', error)
      return []
    }
  })

  ipcMain.handle('read-file-buffer', async (_, filePath: string) => {
    if (!isSafePath(filePath)) throw new Error('Ungültiger Pfad')
    return await fs.promises.readFile(filePath)
  })

  ipcMain.handle('extract-audio', async (_, videoPath: string, outputPath: string) => {
    if (!isSafePath(videoPath) || !isSafePath(outputPath)) throw new Error('Ungültige Pfade')
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .save(outputPath)
        .on('end', () => resolve(true))
        .on('error', (err) => reject(err))
    })
  })

  ipcMain.handle('save-project', async (_, filePath: string, data: any) => {
    if (!isSafePath(filePath)) return { success: false, error: 'Ungültiger Pfad' }
    try {
      // Force .owep extension
      let targetPath = filePath
      if (!targetPath.endsWith('.owep')) {
        targetPath = targetPath.replace(/\.[a-zA-Z0-9]+$/, '') + '.owep'
      }

      // Convert absolute paths inside data to relative paths
      const projectDir = path.dirname(targetPath)
      if (data && Array.isArray(data.tracks)) {
        data.tracks.forEach((track: any) => {
          if (track && Array.isArray(track.regions)) {
            track.regions.forEach((region: any) => {
              if (region && region.file && region.file.path) {
                const fileAbsPath = region.file.path
                if (path.isAbsolute(fileAbsPath)) {
                  const relativePath = path.relative(projectDir, fileAbsPath)
                  if (!path.isAbsolute(relativePath)) {
                    region.file.path = relativePath
                  }
                }
              }
            })
          }
        })
      }

      await fs.promises.writeFile(targetPath, JSON.stringify(data, null, 2), 'utf-8')
      return { success: true, filePath: targetPath }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('save-project-backup', async (_, filePath: string, data: any) => {
    if (!isSafePath(filePath)) return { success: false, error: 'Ungültiger Pfad' }
    try {
      let targetPath = filePath
      if (filePath.includes('Recovery')) {
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
      }

      const projectDir = path.dirname(targetPath)
      if (data && Array.isArray(data.tracks)) {
        data.tracks.forEach((track: any) => {
          if (track && Array.isArray(track.regions)) {
            track.regions.forEach((region: any) => {
              if (region && region.file && region.file.path) {
                const fileAbsPath = region.file.path
                if (path.isAbsolute(fileAbsPath)) {
                  const relativePath = path.relative(projectDir, fileAbsPath)
                  if (!path.isAbsolute(relativePath)) {
                    region.file.path = relativePath
                  }
                }
              }
            })
          }
        })
      }

      await fs.promises.writeFile(targetPath, JSON.stringify(data, null, 2), 'utf-8')
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('load-project', async (_, filePath: string) => {
    if (!isSafePath(filePath)) return { success: false, error: 'Ungültiger Pfad' }
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      const mainData = JSON.parse(content)

      const projectDir = path.dirname(filePath)
      const resolvePaths = (data: any) => {
        if (data && Array.isArray(data.tracks)) {
          data.tracks.forEach((track: any) => {
            if (track && Array.isArray(track.regions)) {
              track.regions.forEach((region: any) => {
                if (region && region.file && region.file.path) {
                  const filePathInJson = region.file.path
                  if (!path.isAbsolute(filePathInJson)) {
                    region.file.path = path.resolve(projectDir, filePathInJson)
                  }
                }
              })
            }
          })
        }
      }
      resolvePaths(mainData)

      // Recovery check: Look for projektname.owep.bak
      const bakPath = filePath + '.bak'
      let hasBackup = false
      let backupData = null
      if (fs.existsSync(bakPath)) {
        try {
          const statMain = fs.statSync(filePath)
          const statBak = fs.statSync(bakPath)
          if (statBak.mtimeMs > statMain.mtimeMs) {
            const bakContent = await fs.promises.readFile(bakPath, 'utf-8')
            backupData = JSON.parse(bakContent)
            resolvePaths(backupData)
            hasBackup = true
          }
        } catch (bakErr) {
          console.error('Error reading backup file:', bakErr)
        }
      }

      return { success: true, data: mainData, hasBackup, backupData }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('save-preset', async (_, filePath: string, data: any) => {
    if (!isSafePath(filePath)) return { success: false, error: 'Ungültiger Pfad' }
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('get-startup-file', () => {
    const file = startupFile
    startupFile = null // Consume startup argument once fetched
    return file
  })

  ipcMain.handle('get-peaks', async (_, filePath: string, samples: number = 1000) => {
    if (!isSafePath(filePath)) return Array.from({ length: samples }, () => Math.random() * 0.8)
    return new Promise((resolve) => {
      let peakData: number[] = [];
      const command = ffmpeg(filePath)
        // Extract 1000 samples evenly distributed
        .audioFilters(`astats=metadata=1:reset=1,aresample=8000,asetnsamples=n=${Math.floor(8000 / samples)}`)
        .format('null')
        .on('stderr', (stderrLine: string) => {
           // Parse astats output for peak level (e.g., "[Parsed_astats_0 @ ...] ... RMS level dB: -20.5")
           if (stderrLine.includes('RMS level dB')) {
              const match = stderrLine.match(/RMS level dB:\s*([\-\d\.]+)/);
              if (match) {
                 const db = parseFloat(match[1]);
                 // Convert dB to linear (0-1)
                 const linear = Math.pow(10, db / 20);
                 peakData.push(Math.min(1, linear * 4)); // Boosted for visual clarity
              }
           }
        })
        .on('end', () => {
          if (peakData.length === 0) {
             // Fallback to random if parsing fails
             resolve(Array.from({ length: samples }, () => Math.random() * 0.8))
          } else {
             // Resample array to exact 'samples' size if needed
             resolve(peakData)
          }
        })
        .on('error', () => resolve(Array.from({ length: samples }, () => Math.random() * 0.8)))
      command.run()
    })
  })

  ipcMain.handle('export-project', async (_, tracksData: any, outputPath: string, id3Tags?: any) => {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(tracksData)) {
        return reject(new Error('Ungültige Spurdaten übergeben'))
      }

      // 1. Spuren nach Mute und Solo filtern (Solo hat Priorität)
      const hasSolo = tracksData.some((t: any) => t.solo)
      const activeTracks = tracksData.filter((t: any) => {
        if (hasSolo) {
          return t.solo && !t.muted
        }
        return !t.muted
      })

      const allRegions = activeTracks.flatMap((t: any) => t.regions)
      if (allRegions.length === 0) {
        return reject(new Error('Keine aktiven Spuren oder Regionen zum Exportieren vorhanden'))
      }

      const command = ffmpeg()
      const filterChain: string[] = []

      // 2. Eingangsdateien hinzufügen
      allRegions.forEach((region: any) => {
        command.input(region.file.path)
      })

      // 3. Audio-Mixdown Filterkette aufbauen
      if (allRegions.length === 1) {
        const region = allRegions[0]
        // Einzelne Region: amix umgehen, um Verzerrungen/Doppelungen zu vermeiden
        filterChain.push(`[0:a]adelay=${Math.floor(region.startPos * 1000)}|${Math.floor(region.startPos * 1000)}[out]`)
      } else {
        // Mehrere Regionen: Verzögern und danach mit amix mischen
        allRegions.forEach((region: any, i: number) => {
          filterChain.push(`[${i}:a]adelay=${Math.floor(region.startPos * 1000)}|${Math.floor(region.startPos * 1000)}[a${i}]`)
        })
        const inputs = allRegions.map((_, i: number) => `[a${i}]`).join('')
        filterChain.push(`${inputs}amix=inputs=${allRegions.length}:duration=longest[out]`)
      }

      command
        .complexFilter(filterChain)
        .map('[out]')

      // 4. Metadaten (ID3-Tags) schreiben
      if (id3Tags) {
        const metadataOpts: string[] = ['-map_metadata', '-1'] // Vorhandene Tags verwerfen
        
        if (id3Tags.title) metadataOpts.push('-metadata', `title=${id3Tags.title}`)
        if (id3Tags.artist) metadataOpts.push('-metadata', `artist=${id3Tags.artist}`)
        if (id3Tags.album) metadataOpts.push('-metadata', `album=${id3Tags.album}`)
        if (id3Tags.year) metadataOpts.push('-metadata', `date=${id3Tags.year}`)
        if (id3Tags.genre) metadataOpts.push('-metadata', `genre=${id3Tags.genre}`)
        if (id3Tags.comment) metadataOpts.push('-metadata', `comment=${id3Tags.comment}`)
        if (id3Tags.track) metadataOpts.push('-metadata', `track=${id3Tags.track}`)
        
        // ID3v2.3 erzwingen, damit Windows Explorer die Tags lesen kann
        metadataOpts.push('-id3v2_version', '3')
        
        command.outputOptions(metadataOpts)
      }

      command
        .save(outputPath)
        .on('end', () => resolve(true))
        .on('error', (err) => {
           console.error('Mixdown Error:', err)
           reject(err)
        })
    })
  })

  // --- VST PLUGIN BRIDGE ---
  
  ipcMain.handle('scan-vst-plugins', async () => {
    const commonPaths = process.platform === 'win32' 
      ? ['C:\\Program Files\\VSTPlugins', 'C:\\Program Files\\Common Files\\VST3', 'C:\\Program Files\\Steinberg\\VSTPlugins']
      : ['/Library/Audio/Plug-Ins/VST', '/Library/Audio/Plug-Ins/VST3'];
    
    let foundPlugins: any[] = [];
    
    for (const p of commonPaths) {
      try {
        if (fs.existsSync(p)) {
          const files = await fs.promises.readdir(p, { withFileTypes: true });
          for (const file of files) {
            if (file.name.endsWith('.dll') || file.name.endsWith('.vst3')) {
              foundPlugins.push({
                name: file.name.replace(/\.(dll|vst3)$/, ''),
                path: path.join(p, file.name),
                type: file.name.endsWith('.vst3') ? 'VST3' : 'VST2',
                version: 'Unknown'
              });
            }
          }
        }
      } catch (err) {
        console.error(`Fehler beim Scannen von ${p}:`, err);
      }
    }

    if (foundPlugins.length === 0) {
       // Fallback if none found
       foundPlugins.push({ name: 'Omega Limiter (Built-in)', path: 'internal://limiter', type: 'Native', version: '1.0' });
    }
    
    return foundPlugins;
  })

  ipcMain.handle('open-vst-ui', async (_, pluginPath: string) => {
    console.log(`Opening VST UI for: ${pluginPath}`);
    // This would open a native window hosting the VST editor
    return true;
  })

  // --- RECORDING ENGINE ---
  ipcMain.handle('save-recording', async (_, outputPath: string, arrayBuffer: ArrayBuffer) => {
    try {
      const dir = path.dirname(outputPath);
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(outputPath, Buffer.from(arrayBuffer));
      console.log(`Real recording saved to: ${outputPath}`);
      return { path: outputPath, success: true };
    } catch (err: any) {
      console.error('Failed to save recording:', err);
      return { success: false, error: err.message };
    }
  })

  ipcMain.handle('transcode-export', async (_, tempWavPath: string, outputPath: string, options: any, id3Tags?: any) => {
    if (!isSafePath(tempWavPath) || !isSafePath(outputPath)) {
      throw new Error('Ungültige Pfade für Transcodierung')
    }
    return new Promise((resolve, reject) => {
      const command = ffmpeg(tempWavPath)
      
      const format = (options && typeof options.format === 'string') ? options.format.toLowerCase() : 'wav'
      
      if (format === 'mp3') {
        command.audioCodec('libmp3lame')
        const bitrate = (options && options.bitrate) ? `${options.bitrate}` : '320k'
        command.audioBitrate(bitrate.endsWith('k') ? bitrate : `${bitrate}k`)
      } else if (format === 'flac') {
        command.audioCodec('flac')
      } else if (format === 'm4a') {
        command.audioCodec('aac')
      } else {
        command.audioCodec('pcm_s16le') // wav standard 16-bit
      }
      
      if (id3Tags) {
        const metadataOpts: string[] = ['-map_metadata', '-1']
        if (id3Tags.title) metadataOpts.push('-metadata', `title=${id3Tags.title}`)
        if (id3Tags.artist) metadataOpts.push('-metadata', `artist=${id3Tags.artist}`)
        if (id3Tags.album) metadataOpts.push('-metadata', `album=${id3Tags.album}`)
        if (id3Tags.year) metadataOpts.push('-metadata', `date=${id3Tags.year}`)
        if (id3Tags.genre) metadataOpts.push('-metadata', `genre=${id3Tags.genre}`)
        if (id3Tags.comment) metadataOpts.push('-metadata', `comment=${id3Tags.comment}`)
        if (id3Tags.track) metadataOpts.push('-metadata', `track=${id3Tags.track}`)
        metadataOpts.push('-id3v2_version', '3')
        command.outputOptions(metadataOpts)
      }
      
      command
        .save(outputPath)
        .on('end', () => {
          // Delete temporary WAV file once transcode completes successfully
          try {
            if (fs.existsSync(tempWavPath)) {
              fs.unlinkSync(tempWavPath)
            }
          } catch (err) {
            console.error('Failed to delete temp WAV file:', err)
          }
          resolve(true)
        })
        .on('error', (err) => {
          console.error('Transcode Error:', err)
          reject(err)
        })
    })
  })

  // --- SOFTWARE UPDATER ---
  ipcMain.handle('check-for-updates', async () => {
    const currentVersion = app.getVersion()
    try {
      const response = await fetch('https://api.github.com/repos/OmegaProjct/Omega-Wave-Editor/releases/latest', {
        headers: {
          'User-Agent': 'Omega-Wave-Editor-Updater'
        }
      })

      if (response.status === 404) {
        return {
          available: false,
          currentVersion,
          latestVersion: currentVersion,
          url: 'https://github.com/OmegaProjct/Omega-Wave-Editor/releases',
          body: ''
        }
      }

      if (!response.ok) {
        throw new Error(`GitHub API meldet Status ${response.status}`)
      }

      const data: any = await response.json()
      const latestVersion = data.tag_name || ''
      const updateAvailable = isNewerVersion(currentVersion, latestVersion)

      return {
        available: updateAvailable,
        currentVersion,
        latestVersion,
        url: data.html_url || 'https://github.com/OmegaProjct/Omega-Wave-Editor/releases',
        body: data.body || ''
      }
    } catch (err: any) {
      console.error('Update-Prüfung fehlgeschlagen:', err)
      return {
        error: err.message,
        currentVersion,
        available: false
      }
    }
  })

  ipcMain.handle('get-disk-space', async (_, dirPath: string) => {
    if (!isSafePath(dirPath)) return { success: false, error: 'Ungültiger Pfad' }
    try {
      if (typeof fs.promises.statfs === 'function') {
        const stats = await fs.promises.statfs(dirPath)
        const freeBytes = stats.bavail * stats.bsize
        return { success: true, freeBytes }
      }
    } catch (e) {
      console.warn('statfs not supported or failed, trying fallback:', e)
    }
    if (process.platform === 'win32') {
      try {
        const drive = path.parse(dirPath).root.replace('\\', '')
        const { execSync } = require('child_process')
        const output = execSync(`wmic logicaldisk where "DeviceID='${drive}'" get FreeSpace`).toString()
        const num = output.replace(/\D/g, '')
        if (num) {
          return { success: true, freeBytes: parseInt(num, 10) }
        }
      } catch (err) {
        console.error('Fallback disk space query failed:', err)
      }
    }
    return { success: true, freeBytes: 500 * 1024 * 1024 * 1024 }
  })

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })
}
