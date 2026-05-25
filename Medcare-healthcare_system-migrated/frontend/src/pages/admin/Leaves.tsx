import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api'
import type { Leave, Doctor } from '../../types'

export default function AdminLeaves() {
  const qc = useQueryClient()
  const { data: leaves = [] } = useQuery({ queryKey:['admin-leaves'], queryFn: adminApi.getLeaves })
  const { data: doctors = [] } = useQuery({ queryKey:['admin-docs'], queryFn: adminApi.getDoctors })
  const decide = useMutation({ mutationFn: ({id,approve}:{id:number,approve:boolean}) => adminApi.decideLeave(id,approve),
    onSuccess: () => qc.invalidateQueries({ queryKey:['admin-leaves'] }) })
  const pending = leaves.filter((l:Leave) => l.status==='pending').length
  const docName = (id:number) => doctors.find((d:Doctor) => d.id===id)?.name ?? `Doctor #${id}`
  const docSpec = (id:number) => doctors.find((d:Doctor) => d.id===id)?.specialization ?? ''

  return (
    <>
      {pending > 0 && <div className="notif notif-warning">{pending} leave request(s) pending approval.</div>}
      <div className="card">
        <div className="card-header"><div className="card-title">Leave Requests</div></div>
        <table>
          <thead><tr><th>Doctor</th><th>From</th><th>To</th><th>Reason</th><th>Applied</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {leaves.length === 0 ? <tr><td colSpan={7} style={{textAlign:'center',color:'var(--text3)',padding:30}}>No leave requests.</td></tr> :
            leaves.map((l:Leave) => (
              <tr key={l.id}>
                <td><strong>{docName(l.doctorId)}</strong><br/><span style={{fontSize:11,color:'var(--text3)'}}>{docSpec(l.doctorId)}</span></td>
                <td>{l.fromDate}</td><td>{l.toDate}</td>
                <td style={{fontSize:12,maxWidth:200}}>{l.reason}</td>
                <td style={{fontSize:12}}>{l.appliedDate}</td>
                <td><span className={`badge ${l.status==='approved'?'badge-success':l.status==='rejected'?'badge-danger':'badge-warning'}`}>{l.status}</span></td>
                <td>{l.status==='pending' ? <>
                  <button className="btn btn-success btn-sm" onClick={() => decide.mutate({id:l.id!,approve:true})}>Approve</button>
                  <button className="btn btn-danger btn-sm" style={{marginLeft:6}} onClick={() => decide.mutate({id:l.id!,approve:false})}>Reject</button>
                </> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
