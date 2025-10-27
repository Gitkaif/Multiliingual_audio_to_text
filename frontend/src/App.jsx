import { useEffect, useRef, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import UploadArea from './components/UploadArea.jsx'
import ProgressBar from './components/ProgressBar.jsx'
import { uploadFile, getStatus, getResult } from './api.js'

export default function App() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [jobId, setJobId] = useState(null)
  const [status, setStatus] = useState(null)
  const [resultText, setResultText] = useState('')
  const [error, setError] = useState('')
  const [language, setLanguage] = useState('Auto')
  const pollRef = useRef(null)

  useEffect(() => {
    if (!jobId) return
    pollRef.current = setInterval(async () => {
      try {
        const s = await getStatus(jobId)
        setStatus(s)
        if (s.status === 'completed') {
          const r = await getResult(jobId)
          setResultText(r.text || '')
          clearInterval(pollRef.current)
        } else if (s.status === 'failed') {
          clearInterval(pollRef.current)
          setError(s.message || 'Processing failed')
        }
      } catch (e) {
        clearInterval(pollRef.current)
        setError('Failed to fetch status')
      }
    }, 1500)
    return () => clearInterval(pollRef.current)
  }, [jobId])

  const onFileSelected = async (f) => {
    setError('')
    setResultText('')
    setStatus(null)
    setFile(f)
    setUploading(true)
    setUploadProgress(0)
    try {
      const { jobId } = await uploadFile(f, setUploadProgress, language)
      setJobId(jobId)
    } catch (e) {
      setError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const canDownload = resultText && resultText.length > 0

  const onDownload = () => {
    const blob = new Blob([resultText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (file?.name || 'transcript') + '.txt'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('TXT downloaded', { autoClose: 1500 })
  }

const onDownloadPdf = async () => {
  try {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const margin = 40
    const pageWidth = doc.internal.pageSize.getWidth()
    const usableWidth = pageWidth - margin * 2
    
    const title = (file?.name || 'Transcript')
    const headerFontSize = 14
    const headerGap = 28 // increased space below header

    // Helper to draw header and return starting Y for content
    const drawHeader = () => {
      doc.setFont('times', 'normal')
      doc.setFontSize(headerFontSize)
      // Slightly faded gray for header
      doc.setTextColor(120, 120, 120)
      doc.text(title, margin, margin)
      // Reset base font for body
      // Force reset by toggling font family
      doc.setFont('helvetica', 'normal')
      doc.setFont('times', 'normal')
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      // Start content below header + gap
      return margin + headerFontSize + headerGap
    }

    // Draw header on first page
    let y = drawHeader()

    const raw = resultText || ''
    const lineHeight = 16
    const pageHeight = doc.internal.pageSize.getHeight()

    // Tokenize by sentences (., !, ? and Unicode variants). Keep punctuation attached.
    const sentences = raw.match(/[^.!?？！\u061F\uFF01\uFF1F]+[.!?？！\u061F\uFF01\uFF1F]|[^.!?？！\u061F\uFF01\uFF1F]+/g) || []

    const qEnd = /[?？\u061F\uFF1F]\s*['"”’)]?\s*$/
    sentences.forEach((line) => {
      const text = (line || '').trim()
      if (text.length === 0) {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = drawHeader();
          // After header, ensure normal body style
          doc.setFont('times', 'normal');
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
        }
        y += lineHeight
        return
      }

      const isQuestion = qEnd.test(text)
      // Start each sentence from a known normal style (hard reset)
      doc.setFont('helvetica', 'normal')
      doc.setFont('times', 'normal')
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)

      const wrapped = doc.splitTextToSize(text, usableWidth)
      wrapped.forEach((sub) => {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = drawHeader();
          // After header, ensure normal body style
          doc.setFont('helvetica', 'normal');
          doc.setFont('times', 'normal');
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
        }
        // Apply weight only for the current sub-line, then reset to normal immediately after
        doc.setFont('times', isQuestion ? 'bold' : 'normal')
        doc.setFontSize(12)
        doc.setTextColor(0, 0, 0)
        doc.text(sub, margin, y)
        // Reset to normal to prevent state leaking into next lines/pages
        doc.setFont('helvetica', 'normal')
        doc.setFont('times', 'normal')
        y += lineHeight
      })
      // Tiny extra gap after question for visual separation
      if (isQuestion) {
        if (y + 4 > pageHeight - margin) {
          doc.addPage();
          y = drawHeader();
          doc.setFont('helvetica', 'normal');
          doc.setFont('times', 'normal');
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
        }
        y += 4
      }
      // Extra safety: reset after finishing each sentence
      doc.setFont('helvetica', 'normal')
      doc.setFont('times', 'normal')
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
    })
    // (Diagnostics removed)

    doc.save((file?.name || 'transcript') + '.pdf')
    toast.success('PDF downloaded', { autoClose: 1500 })
  } catch (e) {
    console.error('PDF generation failed', e)
    toast.error('Failed to generate PDF')
  }
}

  return (
    <div className="min-h-full">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent drop-shadow-sm">
              SHADOW SPEED
            </div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 border border-gray-200 bg-white/60 backdrop-blur text-[11px] font-medium text-gray-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>AI Transcription</span>
            </div>
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
            Multilingual Audio → English Transcription
          </h1>
          <p className="text-gray-600 mt-2 text-sm">Fast. Private. On your machine.</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-700">Input language</label>
          <select
            className="w-full sm:w-64 p-2 rounded-xl border border-gray-200 bg-white text-gray-900"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option>Auto</option>
            <option>Hindi</option>
            <option>Marathi</option>
            <option>English</option>
          </select>
        </div>

        <UploadArea onFileSelected={onFileSelected} uploading={uploading} progress={uploadProgress} />

        {file && (
          <div className="mt-4 text-sm text-gray-700">
            <div><span className="font-medium">File:</span> {file.name}</div>
            <div><span className="font-medium">Size:</span> {(file.size / (1024*1024)).toFixed(2)} MB</div>
          </div>
        )}

        {status && (
          <div className="mt-6 p-5 rounded-2xl glass">
            <div className="text-gray-900"><span className="font-medium">Status:</span> {status.status}</div>
            {status.totalChunks > 0 && (
              <div className="mt-3">
                <ProgressBar value={Math.round((status.processedChunks / status.totalChunks) * 100)} />
                <div className="text-xs text-gray-600 mt-2">
                  Processing {status.processedChunks}/{status.totalChunks} ({Math.round((status.processedChunks / status.totalChunks) * 100)}%)
                </div>
              </div>
            )}
            {status.message && (
              <div className="text-gray-600 text-sm mt-2 break-words">{status.message}</div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">{error}</div>
        )}

        <div className="mt-8">
          <label className="block text-sm font-medium mb-2 text-gray-700">Transcribed Text (English)</label>
          <textarea
            className="w-full h-60 p-4 rounded-2xl glass text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
            value={resultText}
            onChange={(e) => setResultText(e.target.value)}
            placeholder="Your transcription will appear here..."
          />
          <div className="mt-3 flex gap-2">
            <button
              className="px-4 py-2 rounded-full bg-gray-900 text-white border border-gray-900 hover:opacity-90 disabled:opacity-50"
              disabled={!canDownload}
              onClick={async () => { await navigator.clipboard.writeText(resultText); toast.success('Copied to clipboard', { autoClose: 1200 }) }}
            >Copy</button>
            <button
              className="px-4 py-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow hover:opacity-95 disabled:opacity-50"
              disabled={!canDownload}
              onClick={onDownload}
            >Download .txt</button>
            <button
              className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow hover:opacity-95 disabled:opacity-50"
              disabled={!canDownload}
              onClick={onDownloadPdf}
            >Download .pdf</button>
          </div>
        </div>
      </div>
      <ToastContainer position="bottom-right" theme="light" newestOnTop closeOnClick pauseOnFocusLoss={false} pauseOnHover={false} draggable={false} />
    </div>
  )
}


