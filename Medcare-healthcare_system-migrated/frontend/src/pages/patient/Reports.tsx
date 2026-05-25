import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { patientApi } from '../../api'
import { viewFile } from '../../api'
import type { MedicalReport } from '../../types'

export default function PatientReports() {
  const qc = useQueryClient()
  const { data: reports = [] } = useQuery({ queryKey:['pat-reports'], queryFn: patientApi.reports })
  const [showUpload, setShowUpload] = useState(false)
  const [file, setFile] = useState<File|null>(null)
  const [form, setForm] = useState({reportType:'lab',reportDate:'',description:''})
  const [uploadErr, setUploadErr] = useState('')
  const [delTarget, setDelTarget] = useState<MedicalReport|null>(null)

  const fmtSize = (b?:number) => !b?'0 KB':b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB'

  const upload = useMutation({ mutationFn: () => {
    if (!file) throw new Error('Please select a file')
    if (file.size > 10*1024*1024) throw new Error('File exceeds 10MB limit')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('reportType', form.reportType)
    if (form.description) fd.append('description', form.description)
    if (form.reportDate) fd.append('reportDate', form.reportDate)
    return patientApi.uploadReport(fd)
  }, onSuccess: () => { setShowUpload(false); setFile(null); qc.invalidateQueries({queryKey:['pat-reports']}) },
  onError: (e:Error) => setUploadErr(e.message) })

  const doDelete = useMutation({ mutationFn: () => patientApi.deleteReport(delTarget!.id!),
    onSuccess: () => { setDelTarget(null); qc.invalidateQueries({queryKey:['pat-reports']}) } })

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">My Medical Reports ({(reports as MedicalReport[]).length})</div><div className="card-sub">Upload test results, scans, and lab reports — visible to your doctor.</div></div>
          <button className="btn btn-primary" onClick={() => { setFile(null); setUploadErr(''); setForm({reportType:'lab',reportDate:new Date().toISOString().slice(0,10),description:''}); setShowUpload(true) }}>+ Upload Report</button>
        </div>
        {(reports as MedicalReport[]).length===0 ? <div style={{color:'var(--text3)',textAlign:'center',padding:30}}>No reports uploaded yet.</div> :
          <table><thead><tr><th>File</th><th>Type</th><th>Description</th><th>Report Date</th><th>Uploaded</th><th>Action</th></tr></thead>
          <tbody>{(reports as MedicalReport[]).map(r=><tr key={r.id}>
            <td><div style={{fontWeight:500}}>{r.fileName}</div><div style={{fontSize:11,color:'var(--text3)'}}>{fmtSize(r.fileSize)}</div></td>
            <td><span className={`badge ${r.reportType==='lab'?'badge-info':r.reportType==='prescription'?'badge-success':'badge-warning'}`}>{r.reportType}</span></td>
            <td style={{fontSize:12,maxWidth:200}}>{r.description||'—'}</td>
            <td style={{fontSize:12}}>{r.reportDate||'—'}</td>
            <td style={{fontSize:12,color:'var(--text3)'}}>{r.uploadedAt?.split('T')[0]}</td>
            <td>
              <button className="btn btn-outline btn-sm" onClick={() => viewFile(r.id!)}>View</button>
              <button className="btn btn-danger btn-sm" style={{marginLeft:4}} onClick={() => setDelTarget(r)}>Delete</button>
            </td>
          </tr>)}</tbody></table>}
      </div>

      {showUpload && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setShowUpload(false)}}>
        <div className="modal" style={{maxWidth:500}}>
          <div className="modal-header"><div style={{fontWeight:600}}>Upload Medical Report</div><button className="btn btn-outline btn-sm" onClick={()=>setShowUpload(false)}>✕</button></div>
          <div className="modal-body">
            <div className="field"><label>File * (PDF, image, or doc — max 10MB)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.txt" onChange={e=>setFile(e.target.files?.[0]??null)} />
              {file && <div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>Selected: {file.name} ({fmtSize(file.size)})</div>}
            </div>
            <div className="form-grid">
              <div className="field"><label>Report Type *</label>
                <select value={form.reportType} onChange={e=>setForm({...form,reportType:e.target.value})}>
                  {['lab','scan','xray','mri','prescription','other'].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
              <div className="field"><label>Report Date</label><input type="date" value={form.reportDate} onChange={e=>setForm({...form,reportDate:e.target.value})} /></div>
              <div className="field form-full"><label>Description / Notes</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="e.g. Blood test results from MedLab" /></div>
            </div>
            {uploadErr && <div className="notif notif-danger" style={{marginTop:10}}>{uploadErr}</div>}
            {upload.isPending && <div className="notif notif-info" style={{marginTop:10}}>Uploading...</div>}
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowUpload(false)} disabled={upload.isPending}>Cancel</button>
            <button className="btn btn-primary" onClick={()=>{setUploadErr('');upload.mutate()}} disabled={upload.isPending||!file}>{upload.isPending?'Uploading...':'Upload'}</button>
          </div>
        </div>
      </div>}

      {delTarget && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setDelTarget(null)}}>
        <div className="modal" style={{maxWidth:400}}>
          <div className="modal-header"><div style={{fontWeight:600,color:'var(--red)'}}>Delete Report</div></div>
          <div className="modal-body"><p>Delete <strong>{delTarget.fileName}</strong>? This action cannot be undone.</p></div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setDelTarget(null)}>Cancel</button><button className="btn btn-danger" onClick={()=>doDelete.mutate()} disabled={doDelete.isPending}>Delete</button></div>
        </div>
      </div>}
    </>
  )
}
