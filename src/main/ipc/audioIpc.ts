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
import { logger } from '../logger'

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
    logger.debug('Audio', 'Lese Medien-Info angefordert', { filePath })
    if (!isSafePath(filePath)) return { duration: 10, tags: {} }
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err || !metadata) {
          resolve({ duration: 10, tags: {} })
        } else {
          const format = metadata.format || {}
          const streams = metadata.streams || []
          const rawTags = format.tags || {}
          const tags: Record<string, string> = {}
          for (const key of Object.keys(rawTags)) {
            tags[key.toLowerCase()] = String(rawTags[key])
          }
          const audioStream = streams.find((s: any) => s.codec_type === 'audio')
          const channels = audioStream ? audioStream.channels : 2
          const sampleRate = audioStream && audioStream.sample_rate ? audioStream.sample_rate : 48000
          const bitDepth = audioStream ? audioStream.bits_per_sample : undefined
          const bitrate = format.bit_rate || undefined
          const codec = audioStream ? audioStream.codec_name : ''
          const formatName = format.format_long_name || format.format_name || ''
          const size = format.size || 0

          resolve({
            duration: format.duration || 10,
            channels: channels,
            sampleRate: sampleRate,
            bitDepth: bitDepth,
            bitrate: bitrate,
            codec: codec,
            formatName: formatName,
            size: size,
            tags: {
              title: tags.title || tags.nam || '',
              artist: tags.artist || tags.composer || tags.performer || '',
              album: tags.album || '',
              year: tags.date || tags.year || tags.creation_time || '',
              genre: tags.genre || '',
              comment: tags.comment || tags.description || '',
              track: tags.track || tags.track_number || '',
              bpm: tags.bpm || tags.tempo || tags.tbpm || ''
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
    logger.info('Audio', 'Audio-Extraktion aus Video gestartet', { videoPath, outputPath })
    if (!isSafePath(videoPath) || !isSafePath(outputPath)) {
      logger.warn('Audio', 'Extraktion abgebrochen: Ungültige Pfade')
      throw new Error('Ungültige Pfade')
    }
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .save(outputPath)
        .on('end', () => {
          logger.info('Audio', 'Audio-Extraktion erfolgreich abgeschlossen', { outputPath })
          resolve(true)
        })
        .on('error', (err) => {
          logger.error('Audio', 'Fehler bei der Audio-Extraktion', err)
          reject(err)
        })
    })
  })

  ipcMain.handle('get-peaks', async (_, filePath: string, samples: number = 1000, channel?: 'left' | 'right') => {
    logger.debug('Audio', 'Berechne Peaks für Datei', { filePath, samples, channel })
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

        if (channel === 'left') {
          ffmpegCmd.audioFilters('pan=mono|c0=c0');
        } else if (channel === 'right') {
          ffmpegCmd.audioFilters('pan=mono|c0=c1');
        }

        ffmpegCmd.on('error', (err) => {
          logger.error('Audio', 'Fehler bei get-peaks (FFmpeg)', { filePath, error: err.message })
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
            logger.debug('Audio', 'Peaks erfolgreich berechnet', { filePath, samples })
            resolve(peaks);
          } catch (e) {
            logger.error('Audio', 'Fehler bei get-peaks (Verarbeitung)', e)
            resolve(Array.from({ length: samples }, () => Math.random() * 0.8));
          }
        });

        const stdoutStream = ffmpegCmd.pipe();
        stdoutStream.on('data', (chunk: Buffer) => {
          pcmBuffer = Buffer.concat([pcmBuffer, chunk]);
        });
      } catch (err) {
        logger.error('Audio', 'Allgemeiner Fehler bei get-peaks', err)
        resolve(Array.from({ length: samples }, () => Math.random() * 0.8));
      }
    });
  })

  ipcMain.handle('export-project', async (_, tracksData: any, outputPath: string, id3Tags?: any) => {
    logger.info('Audio', 'Mixdown Export-Projekt gestartet', { outputPath, id3Tags })
    return new Promise((resolve, reject) => {
      if (!Array.isArray(tracksData)) {
        logger.warn('Audio', 'Mixdown abgebrochen: Ungültige Spurdaten')
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
        command.outputOptions(...metadataOpts)
      }

      command
        .save(outputPath)
        .on('end', () => {
          logger.info('Audio', 'Mixdown erfolgreich abgeschlossen', { outputPath })
          resolve(true)
        })
        .on('error', (err) => {
          logger.error('Audio', 'Mixdown fehlgeschlagen (FFmpeg)', err)
          reject(err)
        })
    })
  })

  ipcMain.handle('transcode-export', async (_, tempWavPath: string, outputPath: string, options: any, id3Tags?: any) => {
    logger.info('Audio', 'Transcodierung für Export gestartet', { tempWavPath, outputPath, options, id3Tags })
    if (!isSafePath(tempWavPath) || !isSafePath(outputPath)) {
      logger.error('Audio', 'Transcodierung abgebrochen: Ungültige Pfade', { tempWavPath, outputPath })
      throw new Error('Ungültige Pfade für Transcodierung')
    }
    return new Promise((resolve, reject) => {
      let hasCover = false
      if (id3Tags && id3Tags.coverPath && isSafePath(id3Tags.coverPath) && fs.existsSync(id3Tags.coverPath)) {
        hasCover = true
      }

      const command = ffmpeg(tempWavPath)
      if (hasCover) {
        command.input(id3Tags.coverPath)
      }
      
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
        const isVorbis = (format === 'flac' || format === 'ogg' || format === 'opus')
        
        if (id3Tags.title) {
          metadataOpts.push('-metadata', `title=${id3Tags.title}`)
          if (isVorbis) metadataOpts.push('-metadata', `TITLE=${id3Tags.title}`)
        }
        if (id3Tags.artist) {
          metadataOpts.push('-metadata', `artist=${id3Tags.artist}`)
          if (isVorbis) metadataOpts.push('-metadata', `ARTIST=${id3Tags.artist}`)
        }
        if (id3Tags.album) {
          metadataOpts.push('-metadata', `album=${id3Tags.album}`)
          if (isVorbis) metadataOpts.push('-metadata', `ALBUM=${id3Tags.album}`)
        }
        if (id3Tags.year) {
          metadataOpts.push('-metadata', `date=${id3Tags.year}`)
          if (isVorbis) metadataOpts.push('-metadata', `DATE=${id3Tags.year}`)
        }
        if (id3Tags.genre) {
          metadataOpts.push('-metadata', `genre=${id3Tags.genre}`)
          if (isVorbis) metadataOpts.push('-metadata', `GENRE=${id3Tags.genre}`)
        }
        if (id3Tags.comment) {
          metadataOpts.push('-metadata', `comment=${id3Tags.comment}`)
          if (isVorbis) metadataOpts.push('-metadata', `COMMENT=${id3Tags.comment}`)
        }
        if (id3Tags.track) {
          metadataOpts.push('-metadata', `track=${id3Tags.track}`)
          if (isVorbis) metadataOpts.push('-metadata', `TRACK=${id3Tags.track}`)
        }
        
        if (format === 'mp3' || format === 'm4a') {
          metadataOpts.push('-id3v2_version', '3')
        }
        command.outputOptions(...metadataOpts)
      }

      if (hasCover) {
        command.outputOptions('-map', '0:a', '-map', '1:v', '-c:v', 'copy')
        if (format === 'flac' || format === 'm4a' || format === 'ogg' || format === 'opus') {
          command.outputOptions('-disposition:v', 'attached_pic')
        }
      }
      
      command
        .save(outputPath)
        .on('end', () => {
          try {
            if (fs.existsSync(tempWavPath)) {
              fs.unlinkSync(tempWavPath)
              logger.debug('Audio', 'Temporäre WAV-Datei gelöscht', { tempWavPath })
            }
          } catch (err) {
            logger.error('Audio', 'Fehler beim Löschen der temporären WAV-Datei', err)
          }
          logger.info('Audio', 'Transcodierung erfolgreich abgeschlossen', { outputPath })
          resolve(true)
        })
        .on('error', (err) => {
          logger.error('Audio', 'Transcodierung fehlgeschlagen (FFmpeg)', err)
          reject(err)
        })
    })
  })
}
