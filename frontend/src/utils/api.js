// src/utils/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000',
})

// sempre use `common` para Authorization
const token = localStorage.getItem('token')
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

export default api
