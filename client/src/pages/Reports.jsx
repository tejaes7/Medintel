import { useState, useRef, useEffect } from 'react'
import Icon from '../components/Icon'
import { Card, CardHead, Badge, Button, PageHead, Empty } from '../components/ui'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'
import { useAuth } from '../lib/auth'
import PatientOnlyNotice from '../components/PatientOnlyNotice'

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.txt'

export default function Reports() {
  const { user } = useAuth()
  if (user?.role === 'hospital') {
    return <PatientOnlyNotice featureName="Medical lab reports and OCR analysis" />
  }
  return <PatientReports />
}

function PatientReports() {
  const [drag, setDrag] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const fileRef = useRef(null)

  const { data: reports, loading, reload } = useApi(() => api.reports.list(), [])

  const selected = (reports ?? []).find((r) => r.id === selectedId) ?? reports?.[0] ?? null

  // Processing happens on the job queue, so poll while anything is still in flight.
  useEffect(() => {
    const pending = (reports ?? []).some((r) => r.status === 'Queued' || r.status === 'Processing')
    if (!pending) return
    const t = setTimeout(reload, 3000)
    return () => clearTimeout(t)
  }, [reports, reload])

  const handleFiles = async (files) => {
    const file = files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const { data } = await api.reports.upload({ file, name: file.name.replace(/\.[^.]+$/, '') })
      setSelectedId(data.id)
      reload()
    } catch (err) {
      setUploadError(err)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const remove = async (id) => {
    await api.reports.remove(id)
    if (selectedId === id) setSelectedId(null)
    reload()
  }

  return (
    <>
      <PageHead
        eyebrow="Module 04"
        title="Medical reports"
        sub="Upload a PDF or image. Extraction runs off the request path on a worker queue, then attaches a plain-language summary to your timeline."
      >
        <Button disabled={uploading} onClick={() => fileRef.current?.click()}>
          <Icon name="upload" className="size-4" /> {uploading ? 'Uploading…' : 'Upload report'}
        </Button>
      </PageHead>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr] lg:items-start">
        <div className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              handleFiles(e.dataTransfer.files)
            }}
            className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center transition ${
              drag ? 'border-brand bg-brand-soft' : 'border-[#cfd8e3] bg-white'
            }`}
          >
            <span className="grid size-10 place-items-center rounded-lg bg-surface text-slate ring-1 ring-line">
              <Icon name="upload" className="size-5" />
            </span>
            <p className="mt-4 text-[14px] font-medium text-ink">
              {uploading ? 'Uploading…' : 'Drop a report here'}
            </p>
            <p className="mt-1 text-[12.5px] text-muted">PDF, image or text · up to 10 MB</p>
            <Button variant="secondary" size="sm" className="mt-4" disabled={uploading} onClick={() => fileRef.current?.click()}>
              Browse files
            </Button>
          </div>

          {uploadError && (
            <div className="flex items-start gap-2.5 rounded-lg bg-rose-soft p-3.5">
              <Icon name="alert" className="mt-px size-4 shrink-0 text-rose" />
              <p className="text-[13px] leading-relaxed text-slate">{uploadError.message}</p>
            </div>
          )}

          <Card>
            <CardHead title="On file" sub={reports ? `${reports.length} report${reports.length === 1 ? '' : 's'}` : '—'} />
            {reports?.length ? (
              <ul className="divide-y divide-line">
                {reports.map((r) => (
                  <li
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface ${
                      selected?.id === r.id ? 'bg-surface' : ''
                    }`}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-slate ring-1 ring-line">
                      <Icon name="file" className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">{r.name}</p>
                      <p className="text-[12px] text-muted">
                        {r.lab} · {r.date}
                      </p>
                    </div>
                    <Badge tone={r.tone}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty
                title={loading ? 'Loading reports…' : 'No reports yet'}
                sub="Upload a lab result or scan and it will be summarised for you."
              />
            )}
          </Card>
        </div>

        {selected ? (
          <Card>
            <CardHead
              title={selected.name}
              sub={`${selected.lab} · ${selected.date}`}
              action={
                <Badge tone={selected.tone}>
                  {selected.flags > 0 ? `${selected.flags} value${selected.flags > 1 ? 's' : ''} flagged` : selected.status}
                </Badge>
              }
            />

            <div className="p-5">
              {selected.status === 'Queued' || selected.status === 'Processing' ? (
                <div className="flex items-start gap-2.5 rounded-lg bg-surface p-4">
                  <Icon name="clock" className="mt-px size-4 shrink-0 text-slate" />
                  <p className="text-[13px] leading-relaxed text-slate">
                    <span className="font-medium text-ink">{selected.status}.</span> Extraction and summarisation
                    run on the job queue, off the request path. This view refreshes automatically.
                  </p>
                </div>
              ) : selected.status === 'Failed' ? (
                <div className="flex items-start gap-2.5 rounded-lg bg-rose-soft p-4">
                  <Icon name="alert" className="mt-px size-4 shrink-0 text-rose" />
                  <div className="text-[13px] leading-relaxed text-slate">
                    <p className="font-medium text-ink">Processing failed.</p>
                    <p className="mt-0.5">{selected.failureReason}</p>
                  </div>
                </div>
              ) : (
                <>
                  {selected.findings.length > 0 && (
                    <>
                      <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                        Extracted values
                      </p>
                      <div className="overflow-x-auto rounded-lg ring-1 ring-line">
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr className="bg-surface text-left text-[11.5px] uppercase tracking-[0.08em] text-muted">
                              <th className="px-4 py-2.5 font-semibold">Marker</th>
                              <th className="px-4 py-2.5 font-semibold">Result</th>
                              <th className="px-4 py-2.5 font-semibold">Reference</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {selected.findings.map((v, i) => (
                              <tr key={`${v.label}-${i}`} className="bg-white">
                                <td className="px-4 py-2.5 text-slate">{v.label}</td>
                                <td className={`px-4 py-2.5 font-medium ${v.flagged ? 'text-amber' : 'text-ink'}`}>
                                  {v.value} {v.unit}
                                  {v.flagged && <span className="ml-1.5 text-[11px] font-semibold">FLAGGED</span>}
                                </td>
                                <td className="px-4 py-2.5 text-muted">{v.referenceRange || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  <p className="mb-2 mt-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted">Summary</p>
                  <p className="text-[13.5px] leading-relaxed text-slate">{selected.summary}</p>
                </>
              )}

              <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-line bg-surface p-3.5">
                <Icon name="alert" className="mt-px size-4 shrink-0 text-amber" />
                <p className="text-[12.5px] leading-relaxed text-slate">
                  Summaries describe what a report contains. They do not interpret it clinically, and they never
                  recommend medication. Discuss flagged values with your physician.
                </p>
              </div>

              <div className="mt-5 flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => remove(selected.id)}>
                  Delete report
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <Empty title="No report selected" sub="Upload a report or pick one from the list to see its summary." />
          </Card>
        )}
      </div>
    </>
  )
}
