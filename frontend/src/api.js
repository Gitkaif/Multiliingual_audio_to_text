import axios from 'axios'

const API_BASE = 'http://localhost:5001/api'

export async function uploadFile(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  const res = await axios.post(`${API_BASE}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (evt.total && onProgress) onProgress(Math.round((evt.loaded / evt.total) * 100))
    }
  })
  return res.data
}

export async function getStatus(id) {
  const res = await axios.get(`${API_BASE}/status/${id}`)
  return res.data
}

export async function getResult(id) {
  const res = await axios.get(`${API_BASE}/result/${id}`)
  return res.data
}


