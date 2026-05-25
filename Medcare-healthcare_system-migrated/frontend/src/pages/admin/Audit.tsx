import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api'
import type { AuditLog } from '../../types'

export default function AdminAudit() {
  const { data: logs = [] } = useQuery({ queryKey:['audit-logs'], queryFn: adminApi.getAuditLogs })
  return (
    <div className="card">
      <div className="card-header"><div><div className="card-title">System Audit Logs</div><div className="card-sub">Latest 50 actions. HIPAA/GDPR compliant tracking.</div></div></div>
      <table>
        <thead><tr><th>Action</th><th>Performed By</th><th>Timestamp</th></tr></thead>
        <tbody>
          {logs.length === 0 ? <tr><td colSpan={3} style={{textAlign:'center',color:'var(--text3)',padding:30}}>No audit entries.</td></tr> :
          logs.map((l:AuditLog) => <tr key={l.id}><td>{l.action}</td><td>{l.performedBy}</td><td style={{fontSize:12,color:'var(--text3)'}}>{l.timestamp}</td></tr>)}
        </tbody>
      </table>
    </div>
  )
}
