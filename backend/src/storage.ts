import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')

export async function uploadFile(
  fileBuffer: Buffer,
  filename: string,
  folder: string,
): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob')
    const blob = await put(`uploads/${folder}/${filename}`, fileBuffer, {
      access: 'public',
    })
    return blob.url
  }
  const dir = path.join(UPLOAD_DIR, folder)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, filename), fileBuffer)
  return `/uploads/${folder}/${filename}`
}

export async function deleteFile(urlOrPath: string): Promise<void> {
  if (process.env.BLOB_READ_WRITE_TOKEN && urlOrPath.startsWith('http')) {
    const { del } = await import('@vercel/blob')
    await del(urlOrPath)
  }
}

export function getLocalUploadsPath(folder: string): string {
  return path.join(UPLOAD_DIR, folder)
}

export function isUsingBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}
