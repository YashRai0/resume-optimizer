import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateDocxArchive } from '../utils/docxArchiveValidation.js'

function buildStoredZip(entries) {
  const localParts = []
  const centralParts = []
  let localOffset = 0

  for (const [name, contents] of entries) {
    const nameBytes = Buffer.from(name)
    const data = Buffer.from(contents)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt32LE(0, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBytes.length, 26)
    local.writeUInt16LE(0, 28)
    localParts.push(local, nameBytes, data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt32LE(0, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBytes.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt32LE(localOffset, 42)
    centralParts.push(central, nameBytes)
    localOffset += local.length + nameBytes.length + data.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralDirectory.length, 12)
  end.writeUInt32LE(localOffset, 16)
  return Buffer.concat([...localParts, centralDirectory, end])
}

const validEntries = [
  ['[Content_Types].xml', '<Types/>'],
  ['word/document.xml', '<document/>']
]

describe('DOCX archive bounds', () => {
  it('accepts a structurally valid minimal DOCX archive', () => {
    assert.equal(validateDocxArchive(buildStoredZip(validEntries)), true)
  })

  it('rejects truncated, missing-entry, and path traversal archives', () => {
    assert.equal(validateDocxArchive(buildStoredZip(validEntries).subarray(0, 40)), false)
    assert.equal(validateDocxArchive(buildStoredZip([['word/document.xml', '<document/>']])), false)
    assert.equal(validateDocxArchive(buildStoredZip([
      ['[Content_Types].xml', '<Types/>'], ['../word/document.xml', '<document/>']
    ])), false)
  })

  it('rejects entries with excessive expanded size or compression ratio', () => {
    const oversized = buildStoredZip(validEntries)
    const centralOffset = oversized.readUInt32LE(oversized.length - 6)
    oversized.writeUInt32LE(11 * 1024 * 1024, centralOffset + 24)
    assert.equal(validateDocxArchive(oversized), false)

    const highRatio = buildStoredZip(validEntries)
    const highRatioCentral = highRatio.readUInt32LE(highRatio.length - 6)
    highRatio.writeUInt32LE(1, highRatioCentral + 20)
    highRatio.writeUInt32LE(1000, highRatioCentral + 24)
    assert.equal(validateDocxArchive(highRatio), false)
  })
})
