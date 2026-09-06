import PDFParser from "pdf2json"
import mammoth from "mammoth"
import Papa from "papaparse"

// The Python backend parses with docling: PDF / DOCX / XLSX only.
const SUPPORTED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

export function isSupportedFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  return SUPPORTED_TYPES.has(file.type) || ["pdf", "docx", "xlsx"].includes(ext)
}

export async function extractText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""

  if (file.type === "application/pdf" || ext === "pdf") return parsePdf(buffer)
  if (
    file.type.includes("wordprocessingml") ||
    file.type.includes("msword") ||
    ext === "docx" ||
    ext === "doc"
  )
    return parseDocx(buffer)
  if (file.type === "text/csv" || file.type === "application/csv" || ext === "csv")
    return parseCsv(buffer.toString("utf-8"))

  return buffer.toString("utf-8")
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParser(undefined, true)
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("PDF parsing timed out after 30s")), 30_000)
    parser.on("pdfParser_dataError", (e: any) => {
      clearTimeout(timeout)
      reject(new Error(e?.parserError ?? String(e)))
    })
    parser.on("pdfParser_dataReady", () => {
      clearTimeout(timeout)
      resolve((parser as any).getRawTextContent())
    })
    parser.parseBuffer(buffer)
  })
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

function parseCsv(csv: string): string {
  const result = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: true,
  })
  return result.data
    .map(row => Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(", "))
    .join("\n")
}
