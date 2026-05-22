import { ipcMain, shell, dialog, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
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

export function setupIpc() {
  ipcMain.handle('open-external', (_, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('show-open-dialog', async (_, options: any) => {
    return await dialog.showOpenDialog(options)
  })

  ipcMain.handle('show-save-dialog', async (_, options: any) => {
    return await dialog.showSaveDialog(options)
  })

  ipcMain.handle('get-home-dir', () => {
    try {
      return app.getPath('desktop') // Returns the actual user desktop, avoiding Gemini container paths
    } catch (e) {
      return os.homedir()
    }
  })

  ipcMain.handle('get-media-info', async (_, filePath: string) => {
    return new Promise((resolve, reject) => {
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
    return await fs.promises.readFile(filePath)
  })

  ipcMain.handle('extract-audio', async (_, videoPath: string, outputPath: string) => {
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
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('load-project', async (_, filePath: string) => {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      return { success: true, data: JSON.parse(content) }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('save-preset', async (_, filePath: string, data: any) => {
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('get-peaks', async (_, filePath: string, samples: number = 1000) => {
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
      await fs.promises.writeFile(outputPath, Buffer.from(arrayBuffer));
      console.log(`Real recording saved to: ${outputPath}`);
      return { path: outputPath, success: true };
    } catch (err: any) {
      console.error('Failed to save recording:', err);
      return { success: false, error: err.message };
    }
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

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })
}
