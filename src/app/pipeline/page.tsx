'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/firebase/db'
import { getSessionFromCookies } from '@/lib/firebase/auth'
import { Profile } from '@/types'
import { Plus, X, Target, Filter, Check } from 'lucide-react'

interface PipelineEntry {
  id: string
  name: string
  phone: string
  source: string
  consult_type: string
  consult_purpose: string
  status: string
  consultant_id: string | null
  consult_done: boolean
  contract_sent: boolean
  contract_signed: boolean
  followup_date: string
  start_date: string
  note: string
  created_at: string
  updated_at: string
}

const SOURCE_OPTIONS = ['홈페이지', '카카오채널', '소개', 'SNS', '기타']
const CONSULT_TYPE_OPTIONS = ['상담', '온라인', '용시']
const PURPOSE_OPTIONS = ['국제학교 컨설팅', '보딩스쿨 컨설팅', '미국 대학교 입시 컨설팅', 'GPA관리', '기타']
const STATUS_OPTIONS = [
  { value: 'consulting', label: '상담중', color: 'bg-blue-900/40 text-blue-400 border-blue-800' },
  { value: 'contracted', label: '계약완료', color: 'bg-green-900/40 text-green-400 border-green-800' },
  { value: 'enrolled', label: '수강중', color: 'bg-cyan-900/40 text-cyan-400 border-cyan-800' },
  { value: 'hold', label: '보류', color: 'bg-yellow-900/40 text-yellow-400 border-yellow-800' },
  { value: 'cancelled', label: '취소', color: 'bg-red-900/40 text-red-400 border-red-800' },
]

function statusColor(s: string) {
  return STATUS_OPTIONS.find(o => o.value === s)?.color || 'bg-gray-700 text-gray-400 border-gray-600'
}
function statusLabel(s: string) {
  return STATUS_OPTIONS.find(o => o.value === s)?.label || s
}

export default function PipelinePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [entries, setEntries] = useState<PipelineEntry[]>([])
  const [consultants, setConsultants] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<PipelineEntry | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  const emptyEntry: Omit<PipelineEntry, 'id'> = {
    name: '', phone: '', source: '홈페이지', consult_type: '상담',
    consult_purpose: '보딩스쿨 컨설팅', status: 'consulting',
    consultant_id: null, consult_done: false, contract_sent: false,
    contract_signed: false, followup_date: '', start_date: '',
    note: '', created_at: '', updated_at: '',
  }
  const [form, setForm] = useState(emptyEntry)

  useEffect(() => {
    fetchAll()
  }, [router])

  const fetchAll = async () => {
    try {
      const session = getSessionFromCookies()
      if (!session) { router.push('/login'); return }
      const db = createClient()
      const { data: prof } = await db.from('profiles').select('*').eq('id', session.userId).single()
      if (!prof || (prof.role !== 'admin' && prof.role !== 'consultant')) { router.push('/dashboard'); return }
      setProfile(prof)

      const [{ data: pipeData }, { data: allProfiles }] = await Promise.all([
        db.from('pipeline').select('*').order('created_at', { ascending: false }),
        db.from('profiles').select('*'),
      ])
      setEntries((pipeData || []) as PipelineEntry[])
      setConsultants(((allProfiles || []) as Profile[]).filter(p => p.role === 'admin' || p.role === 'consultant'))
    } catch (err) {
      console.error('Failed to fetch pipeline:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    const db = createClient()
    const now = new Date().toISOString()
    if (modal) {
      await db.from('pipeline').update({ ...form, updated_at: now }).eq('id', modal.id)
    } else {
      await db.from('pipeline').insert({ ...form, created_at: now, updated_at: now }).select('*').single()
    }
    setModal(null)
    setShowNew(false)
    setForm(emptyEntry)
    await fetchAll()
  }

  const handleCheckToggle = async (entry: PipelineEntry, field: 'consult_done' | 'contract_sent' | 'contract_signed', e: React.MouseEvent) => {
    e.stopPropagation()
    const db = createClient()
    const newVal = !entry[field]
    await db.from('pipeline').update({ [field]: newVal, updated_at: new Date().toISOString() }).eq('id', entry.id)
    setEntries(prev => prev.map(en => en.id === entry.id ? { ...en, [field]: newVal } : en))
  }

  const openEdit = (entry: PipelineEntry) => {
    setForm({ ...entry })
    setModal(entry)
    setShowNew(true)
  }

  const openNew = () => {
    setForm(emptyEntry)
    setModal(null)
    setShowNew(true)
  }

  let filtered = entries
  if (filterStatus !== 'all') filtered = filtered.filter(e => e.status === filterStatus)

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-'
  const consultantName = (id: string | null) => {
    if (!id) return '-'
    const c = consultants.find(p => p.id === id)
    return c?.full_name || c?.email || '-'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-full mx-auto space-y-5 p-4 lg:p-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="w-7 h-7 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">신규 파이프라인</h1>
            <p className="text-gray-400 text-sm">총 {filtered.length}건</p>
          </div>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          <Plus className="w-4 h-4" /> 신규 등록
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm">
          <option value="all">전체 상태</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left px-3 py-3 font-medium w-10">No</th>
                <th className="text-left px-3 py-3 font-medium">등록일</th>
                <th className="text-left px-3 py-3 font-medium">Follow-up</th>
                <th className="text-left px-3 py-3 font-medium">이름</th>
                <th className="text-left px-3 py-3 font-medium">전화번호</th>
                <th className="text-left px-3 py-3 font-medium">유입경로</th>
                <th className="text-left px-3 py-3 font-medium">상담유형</th>
                <th className="text-left px-3 py-3 font-medium">상담목적</th>
                <th className="text-center px-3 py-3 font-medium">상담완료</th>
                <th className="text-center px-3 py-3 font-medium">계약배부</th>
                <th className="text-center px-3 py-3 font-medium">계약서명</th>
                <th className="text-left px-3 py-3 font-medium">수강시작</th>
                <th className="text-left px-3 py-3 font-medium">담당</th>
                <th className="text-left px-3 py-3 font-medium">상태</th>
                <th className="text-left px-3 py-3 font-medium">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filtered.length === 0 ? (
                <tr><td colSpan={15} className="px-4 py-12 text-center text-gray-500 text-sm">등록된 데이터가 없습니다</td></tr>
              ) : filtered.map((entry, idx) => (
                <tr key={entry.id} onClick={() => openEdit(entry)} className="hover:bg-gray-700/40 cursor-pointer transition">
                  <td className="px-3 py-3 text-xs text-gray-500">{idx + 1}</td>
                  <td className="px-3 py-3 text-xs text-gray-400">{formatDate(entry.created_at)}</td>
                  <td className="px-3 py-3 text-xs text-gray-400">{formatDate(entry.followup_date)}</td>
                  <td className="px-3 py-3 text-sm text-white font-medium">{entry.name}</td>
                  <td className="px-3 py-3 text-xs text-gray-300">{entry.phone || '-'}</td>
                  <td className="px-3 py-3 text-xs text-gray-300">{entry.source}</td>
                  <td className="px-3 py-3 text-xs text-gray-300">{entry.consult_type}</td>
                  <td className="px-3 py-3 text-xs text-gray-300 max-w-[120px] truncate">{entry.consult_purpose}</td>
                  <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <button onClick={(e) => handleCheckToggle(entry, 'consult_done', e)} className={`w-5 h-5 rounded border flex items-center justify-center mx-auto ${entry.consult_done ? 'bg-green-600 border-green-600' : 'border-gray-600'}`}>
                      {entry.consult_done && <Check className="w-3 h-3 text-white" />}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <button onClick={(e) => handleCheckToggle(entry, 'contract_sent', e)} className={`w-5 h-5 rounded border flex items-center justify-center mx-auto ${entry.contract_sent ? 'bg-green-600 border-green-600' : 'border-gray-600'}`}>
                      {entry.contract_sent && <Check className="w-3 h-3 text-white" />}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <button onClick={(e) => handleCheckToggle(entry, 'contract_signed', e)} className={`w-5 h-5 rounded border flex items-center justify-center mx-auto ${entry.contract_signed ? 'bg-green-600 border-green-600' : 'border-gray-600'}`}>
                      {entry.contract_signed && <Check className="w-3 h-3 text-white" />}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-400">{formatDate(entry.start_date)}</td>
                  <td className="px-3 py-3 text-xs text-gray-300">{consultantName(entry.consultant_id)}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor(entry.status)}`}>{statusLabel(entry.status)}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-400 max-w-[100px] truncate">{entry.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">{modal ? '상세/수정' : '신규 등록'}</h2>
              <button onClick={() => { setShowNew(false); setModal(null); setForm(emptyEntry) }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">이름 *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">전화번호</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">유입경로</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white">
                    {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">상담유형</label>
                  <select value={form.consult_type} onChange={e => setForm(f => ({ ...f, consult_type: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white">
                    {CONSULT_TYPE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">상담목적</label>
                  <select value={form.consult_purpose} onChange={e => setForm(f => ({ ...f, consult_purpose: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white">
                    {PURPOSE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setForm(f => ({ ...f, consult_done: !f.consult_done }))} className={`w-5 h-5 rounded border flex items-center justify-center ${form.consult_done ? 'bg-green-600 border-green-600' : 'border-gray-600'}`}>
                    {form.consult_done && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className="text-xs text-gray-300">상담완료</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setForm(f => ({ ...f, contract_sent: !f.contract_sent }))} className={`w-5 h-5 rounded border flex items-center justify-center ${form.contract_sent ? 'bg-green-600 border-green-600' : 'border-gray-600'}`}>
                    {form.contract_sent && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className="text-xs text-gray-300">계약서 배부</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setForm(f => ({ ...f, contract_signed: !f.contract_signed }))} className={`w-5 h-5 rounded border flex items-center justify-center ${form.contract_signed ? 'bg-green-600 border-green-600' : 'border-gray-600'}`}>
                    {form.contract_signed && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className="text-xs text-gray-300">계약서 서명</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Follow-up 연락일</label>
                  <input type="date" value={form.followup_date} onChange={e => setForm(f => ({ ...f, followup_date: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">수강시작일</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">상태</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white">
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">담당 컨설턴트</label>
                <select value={form.consultant_id || ''} onChange={e => setForm(f => ({ ...f, consultant_id: e.target.value || null }))} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white">
                  <option value="">선택</option>
                  {consultants.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">비고</label>
                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={3} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-700">
              <button onClick={() => { setShowNew(false); setModal(null); setForm(emptyEntry) }} className="px-4 py-2 text-sm text-gray-400 hover:text-white">취소</button>
              <button onClick={handleSave} disabled={!form.name.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium">
                {modal ? '저장' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
