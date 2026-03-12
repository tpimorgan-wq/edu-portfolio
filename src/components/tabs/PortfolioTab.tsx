'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/firebase/db'
import { PortfolioItem, UserRole } from '@/types'
import { recordTabUpdate } from '@/lib/tab-update'
import TabUpdateBanner from '@/components/TabUpdateBanner'
import { Plus, Trash2, Save, X, Briefcase, ExternalLink } from 'lucide-react'

interface PortfolioTabProps {
  studentId: string
  userRole?: UserRole
  userId?: string
  userName?: string
}

const emptyForm = {
  title: '',
  category: '',
  description: '',
  url: '',
  date: '',
}

const CATEGORIES = ['리서치', '프로젝트', '수상/인증', '출판', '예술', '기술', '봉사', '기타']

export default function PortfolioTab({ studentId, userRole, userId, userName }: PortfolioTabProps) {
  const canEdit = true
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('portfolio')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [studentId])

  const handleAdd = async () => {
    if (!form.title) {
      setError('제목은 필수입니다.')
      return
    }
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('portfolio').insert({
      student_id: studentId,
      title: form.title,
      category: form.category || null,
      description: form.description || null,
      url: form.url || null,
      date: form.date || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setForm(emptyForm)
    setShowForm(false)
    fetchItems()
    setSaving(false)
    if (userId && userName && userRole) recordTabUpdate(studentId, 'portfolio', userId, userName, userRole)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 포트폴리오 항목을 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('portfolio').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const categoryColors: Record<string, string> = {
    '리서치': 'bg-blue-900/40 text-blue-400',
    '프로젝트': 'bg-purple-900/40 text-purple-400',
    '수상/인증': 'bg-yellow-900/40 text-yellow-400',
    '출판': 'bg-green-900/40 text-green-400',
    '예술': 'bg-pink-900/40 text-pink-400',
    '기술': 'bg-teal-900/40 text-teal-400',
    '봉사': 'bg-orange-900/40 text-orange-400',
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
      <TabUpdateBanner studentId={studentId} tabName="portfolio" />
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-blue-400" />
          포트폴리오
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
          <h4 className="text-sm font-medium text-white">포트폴리오 추가</h4>
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">제목 *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">카테고리</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">날짜</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">URL</label>
              <input
                type="url"
                value={form.url}
                onChange={e => setForm({ ...form, url: e.target.value })}
                placeholder="https://"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">설명</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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

      {items.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">포트폴리오 항목이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map(item => (
            <div key={item.id} className="bg-gray-750 border border-gray-700 rounded-xl p-4 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{item.title}</div>
                  {item.date && <div className="text-xs text-gray-400 mt-0.5">{item.date}</div>}
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {item.category && (
                <span className={`text-xs px-2 py-0.5 rounded-full w-fit mb-2 ${categoryColors[item.category] || 'bg-gray-700 text-gray-300'}`}>
                  {item.category}
                </span>
              )}
              {item.description && (
                <p className="text-xs text-gray-400 flex-1 line-clamp-3">{item.description}</p>
              )}
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> 링크 열기
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
