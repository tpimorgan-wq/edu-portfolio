'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/firebase/db'
import { Document, UserRole } from '@/types'
import { recordTabUpdate } from '@/lib/tab-update'
import TabUpdateBanner from '@/components/TabUpdateBanner'
import { Plus, Trash2, Save, X, FolderOpen, FileCheck, ExternalLink } from 'lucide-react'

interface DocumentsTabProps {
  studentId: string
  userRole?: UserRole
  userId?: string
  userName?: string
}

const emptyForm = {
  name: '',
  type: '',
  url: '',
  notes: '',
}

const DOC_TYPES = [
  '여권',
  '성적증명서',
  '졸업증명서',
  '재학증명서',
  '추천서',
  '재정보증서',
  '영문주민등록등본',
  '건강검진서',
  '예방접종증명서',
  '비자서류',
  '기타',
]

const typeColors: Record<string, string> = {
  '여권': 'bg-blue-900/40 text-blue-400',
  '성적증명서': 'bg-green-900/40 text-green-400',
  '졸업증명서': 'bg-purple-900/40 text-purple-400',
  '재학증명서': 'bg-teal-900/40 text-teal-400',
  '추천서': 'bg-orange-900/40 text-orange-400',
  '재정보증서': 'bg-yellow-900/40 text-yellow-400',
  '비자서류': 'bg-red-900/40 text-red-400',
}

export default function DocumentsTab({ studentId, userRole, userId, userName }: DocumentsTabProps) {
  const canEdit = true
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = async () => {
    try {
      const db = createClient()
      const { data } = await db
        .from('documents')
        .select('*')
        .eq('student_id', studentId)
        .order('uploaded_at', { ascending: false })
      setDocuments(data || [])
    } catch (err) {
      console.error('Failed to fetch documents:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDocuments() }, [studentId])

  const handleAdd = async () => {
    if (!form.name) {
      setError('서류명은 필수입니다.')
      return
    }
    setSaving(true)
    setError(null)

    const db = createClient()
    const { error: err } = await db.from('documents').insert({
      student_id: studentId,
      name: form.name,
      type: form.type || null,
      url: form.url || null,
      notes: form.notes || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setForm(emptyForm)
    setShowForm(false)
    fetchDocuments()
    setSaving(false)
    if (userId && userName && userRole) recordTabUpdate(studentId, 'documents', userId, userName, userRole)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 서류를 삭제하시겠습니까?')) return
    const db = createClient()
    await db.from('documents').delete().eq('id', id)
    setDocuments(prev => prev.filter(d => d.id !== id))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )

  return (
    <div className="space-y-5">
      <TabUpdateBanner studentId={studentId} tabName="documents" />
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-blue-400" />
          필수 서류
        </h3>
        {canEdit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition"
          >
            <Plus className="w-3.5 h-3.5" /> 추가
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-gray-750 border border-gray-600 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-medium text-white">서류 추가</h4>
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">서류명 *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="예: 여권 사본"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">서류 유형</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택</option>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">링크 (URL)</label>
              <input
                type="url"
                value={form.url}
                onChange={e => setForm({ ...form, url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">메모</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="비고"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setForm(emptyForm); setError(null) }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition"
            >
              <X className="w-3.5 h-3.5" /> 취소
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">등록된 서류가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => (
            <div key={doc.id} className="bg-gray-750 border border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {doc.type && (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${typeColors[doc.type] || 'bg-gray-700 text-gray-300'}`}>
                      {doc.type}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      <span className="truncate">{doc.name}</span>
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {doc.uploaded_at?.split('T')[0]}
                    </div>
                  </div>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {doc.notes && (
                <div className="mt-2 text-xs text-gray-400">{doc.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
