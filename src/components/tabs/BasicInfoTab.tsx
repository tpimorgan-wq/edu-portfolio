'use client'

import { useState } from 'react'
import { createClient } from '@/lib/firebase/db'
import { Student, Profile, UserRole } from '@/types'
import { Edit2, Save, X, User, School, Globe, BookOpen, Plus, Star } from 'lucide-react'
import { recordTabUpdate } from '@/lib/tab-update'
import TabUpdateBanner from '@/components/TabUpdateBanner'

interface BasicInfoTabProps {
  student: Student
  userRole: UserRole
  consultants: Profile[]
  parents: Profile[]
  onUpdate: (updated: Student) => void
  userId: string
  userName: string
}

export default function BasicInfoTab({
  student,
  userRole,
  consultants,
  parents,
  onUpdate,
  userId,
  userName,
}: BasicInfoTabProps) {
  // DEBUG: 브라우저 콘솔에서 현재 역할 확인
  console.log('[BasicInfoTab] userRole:', userRole, '| consultants count:', consultants.length)

  const isManager = userRole === 'admin' || userRole === 'consultant'

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: student.name,
    nationality: student.nationality || '',
    birth_date: student.birth_date || '',
    school: student.school || '',
    grade: student.grade || '',
    target_countries: student.target_countries?.join(', ') || '',
    target_majors: student.target_majors?.join(', ') || '',
    main_consultant_id: student.main_consultant_id || '',
    consultant_ids: (student.consultant_ids || []) as string[],
    parent_id: student.parent_id || '',
    notes: student.notes || '',
    status: student.status,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* ───── 담당자 필드 즉시 저장 ───── */
  const saveField = async (fields: Record<string, any>) => {
    const db = createClient()
    const { data, error: err } = await db
      .from('students')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', student.id)
      .select()
      .single()
    if (!err && data) {
      onUpdate(data)
      recordTabUpdate(student.id, 'basic', userId, userName, userRole)
    }
  }

  /* ───── 기본 정보 전체 저장 ───── */
  const handleSave = async () => {
    setLoading(true)
    setError(null)
    const db = createClient()

    const { data, error: err } = await db
      .from('students')
      .update({
        name: form.name,
        nationality: form.nationality.trim() || null,
        birth_date: form.birth_date || null,
        school: form.school || null,
        grade: form.grade || null,
        target_countries: form.target_countries
          ? form.target_countries.split(',').map(s => s.trim()).filter(Boolean)
          : null,
        target_majors: form.target_majors
          ? form.target_majors.split(',').map(s => s.trim()).filter(Boolean)
          : null,
        main_consultant_id: form.main_consultant_id || null,
        consultant_ids: form.consultant_ids.filter(Boolean).length > 0
          ? form.consultant_ids.filter(Boolean)
          : null,
        parent_id: form.parent_id || null,
        notes: form.notes || null,
        status: form.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', student.id)
      .select()
      .single()

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    onUpdate(data)
    setEditing(false)
    setLoading(false)
    recordTabUpdate(student.id, 'basic', userId, userName, userRole)
  }

  /* ───── 컨설턴트 추가/삭제 헬퍼 ───── */
  const [showConsultantDropdown, setShowConsultantDropdown] = useState(false)

  const addConsultantById = (id: string) => {
    if (!id || form.consultant_ids.includes(id) || form.consultant_ids.length >= 6) return
    const updated = [...form.consultant_ids, id]
    setForm(prev => ({ ...prev, consultant_ids: updated }))
    saveField({ consultant_ids: updated })
    setShowConsultantDropdown(false)
  }

  const removeConsultant = (idx: number) => {
    const updated = form.consultant_ids.filter((_, i) => i !== idx)
    setForm(prev => ({ ...prev, consultant_ids: updated }))
    const filtered = updated.filter(Boolean)
    saveField({ consultant_ids: filtered.length > 0 ? filtered : null })
  }

  /* ───── 상수 ───── */
  const gradeOptions = [
    'G1(Y2)', 'G2(Y3)', 'G3(Y4)', 'G4(Y5)', 'G5(Y6)', 'G6(Y7)',
    'G7(Y8)', 'G8(Y9)', 'G9(Y10)', 'G10(Y11)', 'G11(Y12)', 'G12(Y13)',
  ]

  const statusLabels: Record<string, string> = {
    active: '활성', inactive: '비활성', graduated: '졸업',
  }
  const statusColors: Record<string, string> = {
    active: 'text-green-400', inactive: 'text-gray-400', graduated: 'text-blue-400',
  }

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="flex items-start gap-4 py-3 border-b border-gray-700 last:border-0">
      <span className="text-gray-400 text-sm w-32 flex-shrink-0">{label}</span>
      <span className="text-white text-sm flex-1">{value || '-'}</span>
    </div>
  )

  /* ───── 프로필 조회 ───── */
  const mainConsultantInfo = consultants.find(c => c.id === student.main_consultant_id)
  const consultantInfos = (student.consultant_ids || [])
    .map(cid => consultants.find(c => c.id === cid))
    .filter(Boolean) as Profile[]
  const parentInfo = parents.find(p => p.id === student.parent_id)

  const selectClass = 'w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  /* ═══════════════════════════════════════════
     편집 모드 (이름, 학교, 학년 등 기본 정보)
     ═══════════════════════════════════════════ */
  if (editing) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">이름 *</label>
            <input type="text" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">국적</label>
            <input type="text" value={form.nationality}
              onChange={e => setForm({ ...form, nationality: e.target.value })}
              placeholder="한국"
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">생년월일</label>
            <input type="date" value={form.birth_date}
              onChange={e => setForm({ ...form, birth_date: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">상태</label>
            <select value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value as any })}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
              <option value="graduated">졸업</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">학교</label>
            <input type="text" value={form.school}
              onChange={e => setForm({ ...form, school: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">학년</label>
            <select value={form.grade}
              onChange={e => setForm({ ...form, grade: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">선택</option>
              {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">목표 국가 (쉼표 구분)</label>
            <input type="text" value={form.target_countries}
              onChange={e => setForm({ ...form, target_countries: e.target.value })}
              placeholder="미국, 영국, 캐나다"
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">목표 전공 (쉼표 구분)</label>
            <input type="text" value={form.target_majors}
              onChange={e => setForm({ ...form, target_majors: e.target.value })}
              placeholder="컴퓨터공학, 경영학"
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">메모</label>
            <textarea value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={() => setEditing(false)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition">
            <X className="w-4 h-4" /> 취소
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition">
            <Save className="w-4 h-4" /> {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════
     읽기 모드 (담당자 섹션은 항상 인라인 편집)
     ═══════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      <TabUpdateBanner studentId={student.id} tabName="basic" />

      {/* 헤더 + 수정 버튼 */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-blue-400" /> 기본 정보
        </h3>
        <button onClick={() => setEditing(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg text-sm transition">
          <Edit2 className="w-3.5 h-3.5" /> 수정
        </button>
      </div>

      {/* 기본 정보 */}
      <div className="bg-gray-750 rounded-xl divide-y divide-gray-700">
        <InfoRow label="이름" value={student.name} />
        <InfoRow label="국적" value={student.nationality} />
        <InfoRow label="생년월일" value={student.birth_date} />
        <div className="flex items-start gap-4 py-3 border-b border-gray-700">
          <span className="text-gray-400 text-sm w-32 flex-shrink-0">상태</span>
          <span className={`text-sm font-medium ${statusColors[student.status]}`}>
            {statusLabels[student.status]}
          </span>
        </div>
      </div>

      {/* 학교 정보 */}
      <div className="bg-gray-750 rounded-xl divide-y divide-gray-700">
        <div className="py-2 px-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <School className="w-3.5 h-3.5" /> 학교 정보
          </p>
        </div>
        <InfoRow label="학교" value={student.school} />
        <InfoRow label="학년" value={student.grade} />
      </div>

      {/* 목표 정보 */}
      <div className="bg-gray-750 rounded-xl divide-y divide-gray-700">
        <div className="py-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Globe className="w-3.5 h-3.5" /> 목표 정보
          </p>
        </div>
        <InfoRow label="목표 국가" value={student.target_countries?.join(', ')} />
        <InfoRow label="목표 전공" value={student.target_majors?.join(', ')} />
      </div>

      {/* ─────────────────────────────────────
          담당자 정보 (isManager면 인라인 편집)
         ───────────────────────────────────── */}
      <div className="bg-gray-750 rounded-xl p-4 space-y-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5" /> 담당자 정보
        </p>

        {/* DEBUG: 역할 확인 배지 */}
        <div className="text-[10px] text-gray-600">
          role: {userRole} | isManager: {String(isManager)} | consultants: {consultants.length}
        </div>

        {/* 메인 담당자 */}
        <div>
          <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400" /> 메인 담당자
          </label>
          {isManager ? (
            <select value={form.main_consultant_id}
              onChange={e => {
                const v = e.target.value
                setForm(prev => ({ ...prev, main_consultant_id: v }))
                saveField({ main_consultant_id: v || null })
              }}
              className={selectClass}>
              <option value="">선택 안함</option>
              {consultants.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
            </select>
          ) : (
            <p className="text-sm text-white">
              {mainConsultantInfo ? (mainConsultantInfo.full_name || mainConsultantInfo.email) : '-'}
            </p>
          )}
        </div>

        {/* 담당 컨설턴트 (최대 5명) */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">담당 컨설턴트 (최대 6명)</label>

          {isManager ? (
            <div className="space-y-2">
              {/* 태그 목록 */}
              {form.consultant_ids.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.consultant_ids.map((cid, idx) => {
                    const c = consultants.find(con => con.id === cid)
                    return (
                      <span key={cid || idx}
                        className="inline-flex items-center gap-1.5 bg-blue-900/30 border border-blue-700 text-blue-300 rounded-full px-3 py-1 text-sm">
                        {c ? (c.full_name || c.email) : cid}
                        <button type="button" onClick={() => removeConsultant(idx)}
                          className="hover:text-red-400 transition">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}

              {/* 추가 버튼 + 드롭다운 */}
              {form.consultant_ids.length < 6 && (
                <>
                  <button type="button" onClick={() => setShowConsultantDropdown(prev => !prev)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-900/30 border border-blue-800 text-blue-400 hover:bg-blue-900/50 rounded-lg text-sm transition w-full justify-center">
                    <Plus className="w-4 h-4" /> 컨설턴트 추가
                  </button>
                  {showConsultantDropdown && (
                    <select
                      value=""
                      onChange={e => addConsultantById(e.target.value)}
                      className={selectClass}>
                      <option value="">컨설턴트 선택</option>
                      {consultants
                        .filter(c => !form.consultant_ids.includes(c.id))
                        .map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
                    </select>
                  )}
                </>
              )}
            </div>
          ) : (
            consultantInfos.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {consultantInfos.map(c => (
                  <span key={c.id} className="text-sm bg-gray-700 text-white px-2.5 py-1 rounded-lg">
                    {c.full_name || c.email}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white">-</p>
            )
          )}
        </div>

        {/* 학부모 */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">학부모</label>
          {isManager ? (
            <select value={form.parent_id}
              onChange={e => {
                const v = e.target.value
                setForm(prev => ({ ...prev, parent_id: v }))
                saveField({ parent_id: v || null })
              }}
              className={selectClass}>
              <option value="">선택 안함</option>
              {parents.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
            </select>
          ) : (
            <p className="text-sm text-white">{parentInfo?.full_name || parentInfo?.email || '-'}</p>
          )}
        </div>
      </div>

      {/* 메모 */}
      {student.notes && (
        <div className="bg-gray-750 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">메모</p>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{student.notes}</p>
        </div>
      )}
    </div>
  )
}
