import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// 请求拦截器：附加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 响应拦截器：统一处理错误
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// 下载文件：带 token 请求二进制流，再触发浏览器下载
export async function downloadFile(url, filename) {
  const token = localStorage.getItem('token')
  const res = await axios.get(url, {
    baseURL: '/api',
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 60000,
  })
  // 从响应头解析文件名（后端 Content-Disposition 优先）
  let name = filename
  const disposition = res.headers['content-disposition']
  if (disposition) {
    const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)
    if (match) name = decodeURIComponent(match[1])
  }
  const urlObj = window.URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = urlObj
  a.download = name || 'download'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(urlObj)
}

export default api
