const PDF_MIME = 'application/pdf'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const PDF_MAGIC = Buffer.from('%PDF')
const DOCX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04])

export function isAllowedResumeFile({ originalname, mimetype, buffer } = {}) {
  if (typeof originalname !== 'string' || !Buffer.isBuffer(buffer) || buffer.length < 4) return false

  const extension = originalname.toLowerCase().slice(originalname.lastIndexOf('.'))
  if (extension === '.pdf') {
    return mimetype === PDF_MIME && buffer.subarray(0, 4).equals(PDF_MAGIC)
  }
  if (extension === '.docx') {
    return mimetype === DOCX_MIME && buffer.subarray(0, 4).equals(DOCX_MAGIC)
  }
  return false
}
