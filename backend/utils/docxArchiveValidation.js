const EOCD = 0x06054b50
const CENTRAL_FILE = 0x02014b50
const LOCAL_FILE = 0x04034b50
const MAX_ENTRIES = 100
const MAX_CENTRAL_DIRECTORY_BYTES = 1024 * 1024
const MAX_ENTRY_UNCOMPRESSED_BYTES = 10 * 1024 * 1024
const MAX_TOTAL_UNCOMPRESSED_BYTES = 20 * 1024 * 1024
const MAX_COMPRESSION_RATIO = 100

export function validateDocxArchive(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22) return false

  const searchStart = Math.max(0, buffer.length - 22 - 0xffff)
  let eocdOffset = -1
  for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD) {
      eocdOffset = offset
      break
    }
  }
  if (eocdOffset < 0) return false

  const commentLength = buffer.readUInt16LE(eocdOffset + 20)
  if (eocdOffset + 22 + commentLength !== buffer.length) return false
  if (buffer.readUInt16LE(eocdOffset + 4) !== 0 || buffer.readUInt16LE(eocdOffset + 6) !== 0) return false

  const entriesOnDisk = buffer.readUInt16LE(eocdOffset + 8)
  const entryCount = buffer.readUInt16LE(eocdOffset + 10)
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12)
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16)
  if (entriesOnDisk !== entryCount || entryCount < 1 || entryCount > MAX_ENTRIES) return false
  if (entryCount === 0xffff || centralDirectorySize === 0xffffffff || centralDirectoryOffset === 0xffffffff) return false
  if (centralDirectorySize > MAX_CENTRAL_DIRECTORY_BYTES) return false
  if (centralDirectoryOffset + centralDirectorySize !== eocdOffset) return false

  let cursor = centralDirectoryOffset
  let totalUncompressed = 0
  const names = new Set()

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > eocdOffset || buffer.readUInt32LE(cursor) !== CENTRAL_FILE) return false
    const flags = buffer.readUInt16LE(cursor + 8)
    const method = buffer.readUInt16LE(cursor + 10)
    const compressedSize = buffer.readUInt32LE(cursor + 20)
    const uncompressedSize = buffer.readUInt32LE(cursor + 24)
    const nameLength = buffer.readUInt16LE(cursor + 28)
    const extraLength = buffer.readUInt16LE(cursor + 30)
    const fileCommentLength = buffer.readUInt16LE(cursor + 32)
    const localOffset = buffer.readUInt32LE(cursor + 42)
    const centralEntryEnd = cursor + 46 + nameLength + extraLength + fileCommentLength
    if (centralEntryEnd > eocdOffset || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) return false
    if ((flags & 0x0001) !== 0 || (method !== 0 && method !== 8)) return false
    if (uncompressedSize > MAX_ENTRY_UNCOMPRESSED_BYTES) return false
    if (uncompressedSize > 0 && (compressedSize === 0 || uncompressedSize / compressedSize > MAX_COMPRESSION_RATIO)) return false

    const fileName = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength)
    const normalizedName = fileName.replace(/\\/g, '/')
    if (!fileName || normalizedName.startsWith('/') || normalizedName.split('/').includes('..')) return false
    names.add(normalizedName)
    totalUncompressed += uncompressedSize
    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) return false

    if (localOffset + 30 > centralDirectoryOffset || buffer.readUInt32LE(localOffset) !== LOCAL_FILE) return false
    const localFlags = buffer.readUInt16LE(localOffset + 6)
    const localMethod = buffer.readUInt16LE(localOffset + 8)
    const localNameLength = buffer.readUInt16LE(localOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    if (localFlags !== flags || localMethod !== method || dataStart + compressedSize > centralDirectoryOffset) return false
    const localName = buffer.toString('utf8', localOffset + 30, localOffset + 30 + localNameLength)
    if (localName !== fileName) return false

    cursor = centralEntryEnd
  }

  if (cursor !== eocdOffset) return false
  return names.has('[Content_Types].xml') && names.has('word/document.xml')
}
