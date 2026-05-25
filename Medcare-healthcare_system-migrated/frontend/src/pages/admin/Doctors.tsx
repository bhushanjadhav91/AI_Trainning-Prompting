import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api'
import type { Doctor } from '../../types'

const SPECS = ['Cardiologist','Neurologist','Orthopedic','Pediatrician','Dermatologist','Gynecologist','General Medicine','Surgeon','Psychiatrist','ENT Specialist','Ophthalmologist']

function empty(): Doctor { return { name:'', specialization:'General Medicine', email:'', password:'', phone:'', schedule:'', experience:'', qualification:'' } }

export default function AdminDoctors() {
  const qc = useQueryClient()
  const { data: doctors = [] } = useQuery({ queryKey: ['admin-docs'], queryFn: adminApi.getDoctors })
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Doctor | null>(null)
  const [form, setForm] = useState<Doctor>(empty())
  const [error, setError] = useState('')
  const [resetTarget, setResetTarget] = useState<Doctor | null>(null)
  const [resetPw, setResetPw] = useState(''); const [resetErr, setResetErr] = useState('')
  const [delTarget, setDelTarget] = useState<Doctor | null>(null)

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-docs'] })

  const save = useMutation({ mutationFn: async () => {
    if (!form.name.trim()) throw new Error('Name is required')
    if (!form.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) throw new Error('Valid email required')
    if (form.password && (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)))
      throw new Error('Password: ≥8 chars, 1 uppercase, 1 digit')
    const payload: Doctor = { ...form }; if (!payload.password) delete payload.password
    editing ? await adminApi.updateDoctor(editing.id!, payload) : await adminApi.addDoctor(payload)
  }, onSuccess: () => { refresh(); setShowForm(false); setEditing(null); setForm(empty()) }, onError: (e: Error) => setError(e.message) })

  const doReset = useMutation({ mutationFn: async () => {
    if (!resetPw || resetPw.length < 8 || !/[A-Z]/.test(resetPw) || !/[0-9]/.test(resetPw)) throw new Error('Min 8 chars, 1 uppercase, 1 digit')
    await adminApi.resetDoctorPw(resetTarget!.id!, resetPw)
  }, onSuccess: () => { setResetTarget(null); refresh() }, onError: (e: Error) => setResetErr(e.message) })

  const doDelete = useMutation({ mutationFn: () => adminApi.deleteDoctor(delTarget!.id!),
    onSuccess: () => { setDelTarget(null); refresh() }, onError: (e: Error) => alert(e.message) })

  const f = (k: keyof Doctor) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value })

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Doctor Accounts ({doctors.length})</div><div className="card-sub">Add, edit, delete, or reset doctor login passwords.</div></div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(empty()); setError(''); setShowForm(true) }}>+ Add Doctor</button>
        </div>
        <table>
          <thead><tr><th>Doctor</th><th>Specialization</th><th>Email</th><th>Account</th><th>Availability</th><th>Action</th></tr></thead>
          <tbody>
            {doctors.map((d: Doctor) => (
              <tr key={d.id}>
                <td><div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <div style={{ width:32,height:32,borderRadius:'50%',background:'var(--primary-light)',color:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600 }}>
                    {d.name.split(' ').filter(Boolean).slice(1).map(s=>s[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div><div style={{ fontWeight:600 }}>{d.name}</div><div style={{ fontSize:11,color:'var(--text3)' }}>{d.experience}</div></div>
                </div></td>
                <td>{d.specialization}</td>
                <td style={{ fontSize:12 }}>{d.email}</td>
                <td><span className={`badge ${d.accountStatus==='active'?'badge-success':d.accountStatus==='pending'?'badge-warning':'badge-danger'}`}>{d.accountStatus}</span></td>
                <td><span className={`badge ${d.availabilityStatus==='available'?'badge-success':d.availabilityStatus==='in-operation'?'badge-warning':'badge-danger'}`}>{d.availabilityStatus}</span></td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => { setEditing(d); setForm({...d,password:''}); setError(''); setShowForm(true) }}>Edit</button>
                  <button className="btn btn-outline btn-sm" style={{ marginLeft:4 }} onClick={() => { setResetTarget(d); setResetPw(''); setResetErr('') }}>{d.accountStatus==='pending'?'Set Password':'Reset Password'}</button>
                  <button className="btn btn-danger btn-sm" style={{ marginLeft:4 }} onClick={() => setDelTarget(d)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="overlay" onClick={e => { if ((e.target as HTMLElement).classList.contains('overlay')) setShowForm(false) }}>
          <div className="modal">
            <div className="modal-header"><div style={{ fontWeight:600,fontSize:16 }}>{editing ? 'Edit Doctor' : 'Add New Doctor'}</div><button className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field"><label>Full Name *</label><input value={form.name} onChange={f('name')} /></div>
                <div className="field"><label>Specialization *</label><select value={form.specialization} onChange={f('specialization')}>{SPECS.map(s=><option key={s}>{s}</option>)}</select></div>
                <div className="field"><label>Email *</label><input type="email" value={form.email} onChange={f('email')} disabled={!!editing} /></div>
                <div className="field"><label>Phone</label><input value={form.phone??''} onChange={f('phone')} /></div>
                <div className="field form-full"><label>Password (leave blank = pending account)</label><input type="password" value={form.password??''} onChange={f('password')} placeholder="Min 8 chars, 1 uppercase, 1 digit" /></div>
                <div className="field"><label>Experience</label><input value={form.experience??''} onChange={f('experience')} /></div>
                <div className="field"><label>Qualification</label><input value={form.qualification??''} onChange={f('qualification')} /></div>
                <div className="field form-full"><label>Schedule (OPD hours)</label><input value={form.schedule??''} onChange={f('schedule')} /></div>
              </div>
              {error && <div className="notif notif-danger" style={{ marginTop:14 }}>{error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { setError(''); save.mutate() }} disabled={save.isPending}>{save.isPending ? 'Saving...' : editing ? 'Update Doctor' : 'Create Doctor'}</button>
            </div>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="overlay" onClick={e => { if ((e.target as HTMLElement).classList.contains('overlay')) setResetTarget(null) }}>
          <div className="modal" style={{ maxWidth:440 }}>
            <div className="modal-header"><div style={{ fontWeight:600 }}>{resetTarget.accountStatus==='pending'?'Set':'Reset'} Password — {resetTarget.name}</div><button className="btn btn-outline btn-sm" onClick={() => setResetTarget(null)}>✕</button></div>
            <div className="modal-body">
              {resetTarget.accountStatus==='pending' && <div className="notif notif-warning">This doctor is <strong>pending</strong>. Set a password to activate.</div>}
              <div className="field" style={{ marginTop:14 }}><label>New Password *</label><input type="password" value={resetPw} onChange={e => setResetPw(e.target.value)} placeholder="Min 8 chars, 1 uppercase, 1 digit" /></div>
              {resetErr && <div className="notif notif-danger">{resetErr}</div>}
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setResetTarget(null)}>Cancel</button><button className="btn btn-primary" onClick={() => doReset.mutate()} disabled={doReset.isPending}>Save Password</button></div>
          </div>
        </div>
      )}

      {delTarget && (
        <div className="overlay" onClick={e => { if ((e.target as HTMLElement).classList.contains('overlay')) setDelTarget(null) }}>
          <div className="modal" style={{ maxWidth:420 }}>
            <div className="modal-header"><div style={{ fontWeight:600,color:'var(--red)' }}>Delete Doctor</div></div>
            <div className="modal-body"><p>Delete <strong>{delTarget.name}</strong>? This cannot be undone.</p></div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setDelTarget(null)}>Cancel</button><button className="btn btn-danger" onClick={() => doDelete.mutate()} disabled={doDelete.isPending}>Yes, Delete</button></div>
          </div>
        </div>
      )}
    </>
  )
}
