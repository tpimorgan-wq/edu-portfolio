'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/firebase/db'
import { uploadContractFile } from '@/lib/firebase/storage'
import { Contract } from '@/types'
import { FileText, Upload, Trash2, Download, X, FolderOpen } from 'lucide-react'

interface ContractsTabProps {
  studentId: string
  userRole: string
  userId: string
  userName: string
}

export default function ContractsTab({ studentId, userRole, userId, userName }: ContractsTabProps) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canUpload = userRole === 'admin' || userRole === 'parent'
  const canDeleteAny = userRole === 'admin'

  const fetchContracts = async () => {
    try {
      const db = createClient()
      const { data } = await db
        .from('contracts')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      setContracts(data || [])
    } catch (err) {
      console.error('Failed to fetch contracts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchContracts() }, [studentId])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('PDF 파일만 업로드할 수 있습니다.')
        return
      }
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setError(null)

    try {
      const { url } = await uploadContractFile(studentId, selectedFile)
      const db = createClient()
      const { error: dbErr } = await db.from('contracts').insert({
        student_id: studentId,
        file_url: url,
        file_name: selectedFile.name,
        uploaded_by: userId,
        uploader_name: userName,
      })
      if (dbErr) {
        setError(dbErr.message)
      } else {
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        fetchContracts()
      }
    } catch (err: any) {
      setError(err.message || '업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (contract: Contract) => {
    if (!confirm('이 계약서를 삭제하시겠습니까?')) return

    const db = createClient()
    await db.from('contracts').delete().eq('id', contract.id)
    setContracts(prev => prev.filter(c => c.id !== contract.id))
  }

  const canDelete = (contract: Contract) => {
    if (canDeleteAny) return true
    if (userRole === 'parent' && contract.uploaded_by === userId) return true
    return false
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
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          계약서 관리
        </h3>
      </div>

      {canUpload && (
        <div className="bg-gray-750 border border-gray-600 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-medium text-white">계약서 업로드</h4>
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition"
            >
              <FileText className="w-3.5 h-3.5" /> PDF 선택
            </button>
            {selectedFile && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm text-gray-300 truncate">{selectedFile.name}</span>
                <button
                  onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  className="p-1 text-gray-500 hover:text-gray-300 transition flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          {selectedFile && (
            <div className="flex justify-end">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition"
              >
                <Upload className="w-3.5 h-3.5" /> {uploading ? '업로드 중...' : '업로드'}
              </button>
            </div>
          )}
        </div>
      )}

      {contracts.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">등록된 계약서가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map(contract => (
            <div key={contract.id} className="bg-gray-750 border border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium flex-shrink-0 bg-blue-900/40 text-blue-400">
                    PDF
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      <span className="truncate">{contract.file_name}</span>
                      <a
                        href={contract.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                        onClick={e => e.stopPropagation()}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {contract.uploader_name} &middot; {contract.created_at?.split('T')[0]}
                    </div>
                  </div>
                </div>
                {canDelete(contract) && (
                  <button
                    onClick={() => handleDelete(contract)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
