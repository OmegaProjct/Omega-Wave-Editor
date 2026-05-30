/**
 * audioIpc.ts
 * Main process IPC handlers for FFmpeg conversions, audio mixdown,
 * transcode-export, metadata tagging, and waveform peaks.
 */

import { ipcMain, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'

// Setup static ffmpeg/ffprobe binary paths (with app.asar.unpacked support)
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

export function registerAudioIpc() {
  ipcMain.handle('get-media-info', async (_, filePath: string) => {
    if (!isSafePath(filePath)) return { duration: 10, tags: {} }
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          resolve({ duration: 10, tags: {} })
        } else {
          const rawTags = metadata.format.tags || {}
          const tags: Record<string, string> = {}
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

  ipcMain.handle('get-peaks', async (_, filePath: string, samples: number = 1000) => {
    if (!isSafePath(filePath)) return Array.from({ length: samples }, () => Math.random() * 0.8)
    return new Promise((resolve) => {
      try {
        let pcmBuffer = Buffer.alloc(0);
        const sampleRate = 8000;
        const ffmpegCmd = ffmpeg(filePath)
          .noVideo()
          .audioChannels(1)
          .audioFrequency(sampleRate)
          .format('s16le'); // 16-bit Signed Integer PCM

        ffmpegCmd.on('error', (err) => {
          console.error('get-peaks ffmpeg error:', err);
          resolve(Array.from({ length: samples }, () => Math.random() * 0.8));
        });

        ffmpegCmd.on('end', () => {
          try {
            if (pcmBuffer.length === 0) {
              return resolve(Array.from({ length: samples }, () => Math.random() * 0.8));
            }

            const int16Data = new Int16Array(
              pcmBuffer.buffer,
              pcmBuffer.byteOffset,
              pcmBuffer.length / 2
            );

            // Downsample to exactly 'samples' points
            const blockSize = Math.max(1, Math.floor(int16Data.length / samples));
            const peaks: number[] = [];

            for (let i = 0; i < samples; i++) {
              const start = i * blockSize;
              const end = Math.min(int16Data.length, start + blockSize);
              let maxVal = 0;
              for (let j = start; j < end; j++) {
                const val = Math.abs(int16Data[j]);
                if (val > maxVal) {
                  maxVal = val;
                }
              }
              // Normalize 16-bit value (0 to 32767) to (0.0 to 1.0)
              const normalized = maxVal / 32768;
              // Boost slightly for visual quality
              peaks.push(Math.max(0.04, Math.min(0.95, normalized * 1.5)));
            }
            resolve(peaks);
          } catch (e) {
            console.error('get-peaks end processing error:', e);
            resolve(Array.from({ length: samples }, () => Math.random() * 0.8));
          }
        });

        const stdoutStream = ffmpegCmd.pipe();
        stdoutStream.on('data', (chunk: Buffer) => {
          pcmBuffer = Buffer.concat([pcmBuffer, chunk]);
        });
      } catch (err) {
        console.error('get-peaks general error:', err);
        resolve(Array.from({ length: samples }, () => Math.random() * 0.8));
      }
    });
  })

  ipcMain.handle('export-project', async (_, tracksData: any, outputPath: string, id3Tags?: any) => {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(tracksData)) {
        return reject(new Error('Ungültige Spurdaten übergeben'))
      }

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

      allRegions.forEach((region: any) => {
        command.input(region.file.path)
      })

      if (allRegions.length === 1) {
        const region = allRegions[0]
        const sourceOffset = region.sourceOffset || 0
        filterChain.push(`[0:a]atrim=start=${sourceOffset}:duration=${region.duration},asetpts=PTS-STARTPTS,adelay=${Math.floor(region.startPos * 1000)}|${Math.floor(region.startPos * 1000)}[out]`)
      } else {
        allRegions.forEach((region: any, i: number) => {
          const sourceOffset = region.sourceOffset || 0
          filterChain.push(`[${i}:a]atrim=start=${sourceOffset}:duration=${region.duration},asetpts=PTS-STARTPTS,adelay=${Math.floor(region.startPos * 1000)}|${Math.floor(region.startPos * 1000)}[a${i}]`)
        })
        const inputs = allRegions.map((_, i: number) => `[a${i}]`).join('')
        filterChain.push(`${inputs}amix=inputs=${allRegions.length}:duration=longest[out]`)
      }

      command
        .complexFilter(filterChain)
        .map('[out]')

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
        .on('end', () => resolve(true))
        .on('error', (err) => {
          console.error('Mixdown Error:', err)
          reject(err)
        })
    })
  })

  ipcMain.handle('transcode-export', async (_, tempWavPath: string, outputPath: string, options: any, id3Tags?: any) => {
    if (!isSafePath(tempWavPath) || !isSafePath(outputPath)) {
      throw new Error('Ungültige Pfade für Transcodierung')
    }
    return new Promise((resolve, reject) => {
      const command = ffmpeg(tempWavPath)
      
      if (options && options.sampleRate) {
        const parsedRate = parseInt(options.sampleRate, 10)
        if (!isNaN(parsedRate)) {
          command.audioFrequency(parsedRate)
        }
      }
      
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
        command.audioCodec('pcm_s16le')
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
}
