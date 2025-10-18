import { useCallback, useState } from 'react'
import ProgressBar from './ProgressBar.jsx'

export default function UploadArea({ onFileSelected, uploading, progress }) {
  const [dragOver, setDragOver] = useState(false)

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFileSelected(file)
  }, [onFileSelected])

  return (
    <div
      className={`relative rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer glass hover:shadow-2xl ${dragOver ? 'ring-2 ring-violet-400 scale-[1.01]' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
        🎵
      </div>
      <h3 className="text-gray-900 text-lg font-semibold">Upload your audio</h3>
      <p className="text-gray-600 text-sm mt-1">Drag & drop files here, or click to browse</p>
      <input
        type="file"
        accept="audio/*"
        className="hidden"
        id="file-input"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelected(file)
        }}
      />
      <div className="mt-6">
        <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gray-900 text-white border border-gray-900 hover:opacity-90">
          Choose File
        </span>
      </div>

      {uploading && (
        <div className="mt-6">
          <ProgressBar value={progress} />
          <p className="text-xs text-gray-600 mt-2">Uploading... {progress}%</p>
        </div>
      )}
    </div>
  )
}


