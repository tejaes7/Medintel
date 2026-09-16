import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9222
const SCREENSHOT_DIR = path.resolve('docs/screenshots')

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

class CDP {
  constructor(ws) {
    this.ws = ws
    this.id = 1
    this.callbacks = new Map()
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id)
        this.callbacks.delete(msg.id)
        if (msg.error) reject(new Error(msg.error.message))
        else resolve(msg.result)
      }
    }
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++
      this.callbacks.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
}

async function getTokens(email, password) {
  const res = await fetch('http://127.0.0.1:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  return json.data.tokens
}

async function main() {
  console.log('Fetching auth tokens...')
  const patientTokens = await getTokens('aarav.menon@example.com', 'MedIntel2025!')
  const hospitalTokens = await getTokens('hospital@example.com', 'MedIntel2025!')

  console.log('Launching headless Chrome with debugging port 9222...')
  const proc = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,850',
    'http://localhost:5173/',
  ])

  await sleep(1500)

  try {
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`)
    const targets = await listRes.json()
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0]
    if (!pageTarget) throw new Error('No page target found')

    console.log('Connecting to DevTools via WebSocket:', pageTarget.webSocketDebuggerUrl)
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl)
    await new Promise((resolve) => {
      ws.onopen = resolve
    })

    const cdp = new CDP(ws)
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')

    async function capture(url, filename, waitMs = 1200) {
      console.log(`Navigating to ${url}...`)
      await cdp.send('Page.navigate', { url })
      await sleep(waitMs)
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
      const filePath = path.join(SCREENSHOT_DIR, filename)
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'))
      console.log(`Saved screenshot: ${filename} (${data.length} bytes)`)
    }

    async function setAuth(tokens) {
      await cdp.send('Runtime.evaluate', {
        expression: `
          localStorage.setItem('medintel.accessToken', '${tokens.accessToken}');
          localStorage.setItem('medintel.refreshToken', '${tokens.refreshToken}');
        `,
      })
      await sleep(200)
    }

    // 1. Landing & SignIn
    await capture('http://localhost:5173/', '01_landing.png')
    await capture('http://localhost:5173/signin', '02_signin.png')

    // 2. Patient Pages
    await setAuth(patientTokens)
    await capture('http://localhost:5173/app', '03_patient_dashboard.png', 1500)
    await capture('http://localhost:5173/app/symptoms', '04_patient_symptoms.png', 1200)
    await capture('http://localhost:5173/app/chat', '05_patient_chat.png', 1200)
    await capture('http://localhost:5173/app/hospitals', '06_patient_hospitals.png', 1800)
    await capture('http://localhost:5173/app/reports', '07_patient_reports.png', 1200)
    await capture('http://localhost:5173/app/reminders', '08_patient_reminders.png', 1200)
    await capture('http://localhost:5173/app/history', '09_patient_history.png', 1500)

    // 3. Hospital Admin Pages
    await setAuth(hospitalTokens)
    await capture('http://localhost:5173/app/appointments', '10_hospital_appointments.png', 1500)
    await capture('http://localhost:5173/app/doctors', '11_hospital_doctors.png', 1500)
    await capture('http://localhost:5173/app/events', '12_hospital_events.png', 1200)
    await capture('http://localhost:5173/app/facility', '13_hospital_facility.png', 1200)

    ws.close()
    console.log('All screenshots captured successfully!')
  } finally {
    proc.kill()
  }
}

main().catch((err) => {
  console.error('Error during screenshot capture:', err)
  process.exit(1)
})
