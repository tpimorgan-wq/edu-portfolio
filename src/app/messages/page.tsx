'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/firebase/db'
import { getSessionFromCookies } from '@/lib/firebase/auth'
import { Profile, Message } from '@/types'
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Plus,
  X,
  Paperclip,
  Image as ImageIcon,
} from 'lucide-react'

type Tab = 'inbox' | 'sent'

interface ImageAttachment {
  url: string
  name: string
  preview: string
}

export default function MessagesPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [sentMessages, setSentMessages] = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({})
  const [tab, setTab] = useState<Tab>('inbox')
  const [showCompose, setShowCompose] = useState(false)
  const [composeForm, setComposeForm] = useState({ receiver_id: '', content: '' })
  const [allowedRecipients, setAllowedRecipients] = useState<Profile[]>([])
  const [replyContent, setReplyContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendMode, setSendMode] = useState<'individual' | 'broadcast'>('individual')
  const [composeImage, setComposeImage] = useState<ImageAttachment | null>(null)
  const [replyImage, setReplyImage] = useState<ImageAttachment | null>(null)
  const [uploading, setUploading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const composeFileRef = useRef<HTMLInputElement>(null)
  const replyFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const session = getSessionFromCookies()
        if (!session) { router.push('/login'); return }

        const db = createClient()
        const { data: prof } = await db
          .from('profiles')
          .select('*')
          .eq('id', session.userId)
          .single()

        if (!prof) { router.push('/login'); return }
        setProfile(prof)

        // Fetch inbox
        const { data: inbox } = await db
          .from('messages')
          .select('*')
          .eq('receiver_id', session.userId)
          .order('created_at', { ascending: false })
        setMessages(inbox || [])

        // Fetch sent
        const { data: sent } = await db
          .from('messages')
          .select('*')
          .eq('sender_id', session.userId)
          .order('created_at', { ascending: false })
        setSentMessages(sent || [])

        // Build profile map for all unique user IDs
        const userIds = new Set<string>()
        ;(inbox || []).forEach((m: Message) => { userIds.add(m.sender_id); userIds.add(m.receiver_id) })
        ;(sent || []).forEach((m: Message) => { userIds.add(m.sender_id); userIds.add(m.receiver_id) })
        userIds.delete(session.userId)

        const map: Record<string, Profile> = {}
        map[session.userId] = prof
        if (userIds.size > 0) {
          const profilePromises = Array.from(userIds).map(uid =>
            db.from('profiles').select('*').eq('id', uid).single()
          )
          const results = await Promise.all(profilePromises)
          for (const { data: p } of results) {
            if (p) map[p.id] = p
          }
        }
        setProfileMap(map)

        // Fetch allowed recipients
        await fetchAllowedRecipients(db, prof, session.userId)
      } catch (err) {
        console.error('Failed to load messages:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router])

  const fetchAllowedRecipients = async (db: ReturnType<typeof createClient>, prof: Profile, userId: string) => {
    try {
      const recipientIds = new Set<string>()

      if (prof.role === 'admin') {
        // Admin: all users
        const roles = ['admin', 'consultant', 'parent', 'student'] as const
        const results = await Promise.all(
          roles.map(role => db.from('profiles').select('*').eq('role', role))
        )
        const allProfiles = results.flatMap(r => (r.data || []) as Profile[])
        setAllowedRecipients(allProfiles.filter((p: Profile) => p.id !== userId))
        return
      }

      // Fetch all admins (available to all roles)
      const { data: admins } = await db.from('profiles').select('*').eq('role', 'admin')
      console.log('[Recipients] admins:', admins)
      if (admins && Array.isArray(admins)) {
        for (const a of admins) recipientIds.add(a.id)
      }
      console.log('[Recipients] recipientIds after admins:', Array.from(recipientIds))

      if (prof.role === 'student') {
        // Student: consultants from own student record + admins
        console.log('[Recipients] Student user_id:', userId)
        const { data: students } = await db.from('students').select('*').eq('user_id', userId)
        console.log('[Recipients] students query result:', students)
        if (students && Array.isArray(students)) {
          for (const s of students) {
            console.log('[Recipients] student doc:', { id: s.id, user_id: s.user_id, main_consultant_id: s.main_consultant_id, consultant_ids: s.consultant_ids })
            if (s.main_consultant_id) recipientIds.add(s.main_consultant_id)
            if (s.consultant_ids && Array.isArray(s.consultant_ids)) {
              for (const cid of s.consultant_ids) recipientIds.add(cid)
            }
          }
        }
        console.log('[Recipients] recipientIds after student lookup:', Array.from(recipientIds))
      } else if (prof.role === 'parent') {
        // Parent: consultants from children's student records + admins
        const { data: students } = await db.from('students').select('*').eq('parent_id', userId)
        if (students) {
          for (const s of students) {
            if (s.main_consultant_id) recipientIds.add(s.main_consultant_id)
            if (s.consultant_ids) {
              for (const cid of s.consultant_ids) recipientIds.add(cid)
            }
          }
        }
      } else if (prof.role === 'consultant') {
        // Consultant: students + parents linked to assigned students + admins
        const { data: allStudents } = await db.from('students').select('*')
        if (allStudents) {
          for (const s of allStudents) {
            const cids: string[] = s.consultant_ids || []
            if (cids.includes(userId) || s.main_consultant_id === userId) {
              if (s.user_id) recipientIds.add(s.user_id)
              if (s.parent_id) recipientIds.add(s.parent_id)
            }
          }
        }
      }

      recipientIds.delete(userId)
      console.log('[Recipients] final recipientIds:', Array.from(recipientIds))

      if (recipientIds.size > 0) {
        const results = await Promise.all(
          Array.from(recipientIds).map(rid =>
            db.from('profiles').select('*').eq('id', rid).single()
          )
        )
        const resolved = results.map(r => r.data).filter(Boolean) as Profile[]
        console.log('[Recipients] resolved profiles:', resolved.map(p => ({ id: p.id, name: p.full_name, role: p.role })))
        setAllowedRecipients(resolved)
      } else {
        console.log('[Recipients] no recipient IDs found — list will be empty')
      }
    } catch (err) {
      console.error('Failed to fetch allowed recipients:', err)
    }
  }

  const refreshProfileMap = async (inboxMsgs: Message[], sentMsgs: Message[]) => {
    const db = createClient()
    const allMsgs = [...inboxMsgs, ...sentMsgs]
    const missingIds = new Set<string>()
    for (const m of allMsgs) {
      if (!profileMap[m.sender_id]) missingIds.add(m.sender_id)
      if (!profileMap[m.receiver_id]) missingIds.add(m.receiver_id)
    }
    if (missingIds.size === 0) return
    const results = await Promise.all(
      Array.from(missingIds).map(uid =>
        db.from('profiles').select('*').eq('id', uid).single()
      )
    )
    const newEntries: Record<string, Profile> = {}
    for (const { data: p } of results) {
      if (p) newEntries[p.id] = p
    }
    if (Object.keys(newEntries).length > 0) {
      setProfileMap(prev => ({ ...prev, ...newEntries }))
    }
  }

  const handleImageUpload = async (
    file: File,
    setImage: (img: ImageAttachment | null) => void,
  ) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowed.includes(file.type)) {
      alert('JPG, PNG, GIF, WebP 이미지만 첨부할 수 있습니다.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/messages/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '업로드 실패')
      }
      const { url, name } = await res.json()
      setImage({ url, name, preview: URL.createObjectURL(file) })
    } catch (err: any) {
      alert(err.message || '이미지 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const handleSelectMessage = async (msg: Message) => {
    setSelectedMessage(msg)
    setReplyContent('')
    setReplyImage(null)

    // Mark as read if inbox message
    if (profile && msg.receiver_id === profile.id && !msg.is_read) {
      try {
        const db = createClient()
        await db.from('messages').update({ is_read: true }).eq('id', msg.id)
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m))
      } catch (err) {
        console.error('Failed to mark as read:', err)
      }
    }
  }

  const handleReply = async () => {
    if (!selectedMessage || (!replyContent.trim() && !replyImage) || !profile) return
    setSending(true)
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_id: selectedMessage.sender_id,
          content: replyContent.trim() || (replyImage ? '(이미지)' : ''),
          reply_to_id: selectedMessage.id,
          image_url: replyImage?.url || undefined,
          image_name: replyImage?.name || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to send reply')
      setReplyContent('')
      setReplyImage(null)
      // Refresh messages
      const db = createClient()
      const { data: inbox } = await db
        .from('messages')
        .select('*')
        .eq('receiver_id', profile.id)
        .order('created_at', { ascending: false })
      setMessages(inbox || [])
      const { data: sent } = await db
        .from('messages')
        .select('*')
        .eq('sender_id', profile.id)
        .order('created_at', { ascending: false })
      setSentMessages(sent || [])
      await refreshProfileMap(inbox || [], sent || [])
    } catch (err) {
      console.error('Failed to send reply:', err)
    } finally {
      setSending(false)
    }
  }

  const handleCompose = async () => {
    if ((!composeForm.content.trim() && !composeImage) || !profile) return

    const content = composeForm.content.trim() || (composeImage ? '(이미지)' : '')

    if (sendMode === 'broadcast') {
      // Broadcast: send to all allowed recipients
      if (allowedRecipients.length === 0) return
      setSending(true)
      try {
        await Promise.all(
          allowedRecipients.map(r =>
            fetch('/api/messages/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                receiver_id: r.id,
                content,
                reply_to_id: null,
                image_url: composeImage?.url || undefined,
                image_name: composeImage?.name || undefined,
              }),
            })
          )
        )
        setComposeForm({ receiver_id: '', content: '' })
        setComposeImage(null)
        setSendMode('individual')
        setShowCompose(false)
        const db = createClient()
        const { data: sent } = await db
          .from('messages')
          .select('*')
          .eq('sender_id', profile.id)
          .order('created_at', { ascending: false })
        setSentMessages(sent || [])
        await refreshProfileMap(messages, sent || [])
      } catch (err) {
        console.error('Failed to broadcast message:', err)
      } finally {
        setSending(false)
      }
    } else {
      // Individual
      if (!composeForm.receiver_id) return
      setSending(true)
      try {
        const res = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiver_id: composeForm.receiver_id,
            content,
            reply_to_id: null,
            image_url: composeImage?.url || undefined,
            image_name: composeImage?.name || undefined,
          }),
        })
        if (!res.ok) throw new Error('Failed to send message')
        setComposeForm({ receiver_id: '', content: '' })
        setComposeImage(null)
        setShowCompose(false)
        const db = createClient()
        const { data: sent } = await db
          .from('messages')
          .select('*')
          .eq('sender_id', profile.id)
          .order('created_at', { ascending: false })
        setSentMessages(sent || [])
        await refreshProfileMap(messages, sent || [])
      } catch (err) {
        console.error('Failed to send message:', err)
      } finally {
        setSending(false)
      }
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) {
      return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  const currentList = tab === 'inbox' ? messages : sentMessages

  const getDisplayName = (msg: Message) => {
    const targetId = tab === 'inbox' ? msg.sender_id : msg.receiver_id
    return profileMap[targetId]?.full_name || profileMap[targetId]?.email || '알 수 없음'
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return '관리자'
      case 'consultant': return '컨설턴트'
      case 'parent': return '학부모'
      case 'student': return '학생'
      default: return role
    }
  }

  // Group recipients by role for compose modal
  const groupedRecipients = allowedRecipients.reduce((acc, p) => {
    const role = p.role
    if (!acc[role]) acc[role] = []
    acc[role].push(p)
    return acc
  }, {} as Record<string, Profile[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-7 h-7 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">메시지</h1>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          새 메시지
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Message List Panel */}
        <div className={`bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden ${selectedMessage ? 'hidden lg:block' : ''}`}>
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => { setTab('inbox'); setSelectedMessage(null) }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                tab === 'inbox' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              받은함 {messages.filter(m => !m.is_read).length > 0 && (
                <span className="ml-1 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                  {messages.filter(m => !m.is_read).length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setTab('sent'); setSelectedMessage(null) }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                tab === 'sent' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              보낸함
            </button>
          </div>

          {/* List */}
          <div className="divide-y divide-gray-700 max-h-[calc(100vh-250px)] overflow-y-auto">
            {currentList.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                {tab === 'inbox' ? '받은 메시지가 없습니다' : '보낸 메시지가 없습니다'}
              </div>
            ) : (
              currentList.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => handleSelectMessage(msg)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-700/50 transition ${
                    selectedMessage?.id === msg.id ? 'bg-gray-700/50' : ''
                  } ${tab === 'inbox' && !msg.is_read ? 'border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm ${tab === 'inbox' && !msg.is_read ? 'font-bold text-white' : 'text-gray-300'}`}>
                      {getDisplayName(msg)}
                    </span>
                    <div className="flex items-center gap-1">
                      {msg.image_url && <ImageIcon className="w-3 h-3 text-gray-500" />}
                      <span className="text-[11px] text-gray-500">{formatDate(msg.created_at)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{msg.content}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className={`lg:col-span-2 bg-gray-800 rounded-2xl border border-gray-700 ${selectedMessage ? '' : 'hidden lg:flex lg:items-center lg:justify-center'}`}>
          {selectedMessage ? (
            <div className="flex flex-col h-full">
              {/* Detail Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-700">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="lg:hidden text-gray-400 hover:text-white transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">
                    {tab === 'inbox' ? '보낸 사람' : '받는 사람'}:{' '}
                    {tab === 'inbox'
                      ? (profileMap[selectedMessage.sender_id]?.full_name || profileMap[selectedMessage.sender_id]?.email || '알 수 없음')
                      : (profileMap[selectedMessage.receiver_id]?.full_name || profileMap[selectedMessage.receiver_id]?.email || '알 수 없음')}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {new Date(selectedMessage.created_at).toLocaleString('ko-KR')}
                    {selectedMessage.reply_to_id && ' · 답장'}
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div className="flex-1 px-5 py-4 overflow-y-auto">
                <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {selectedMessage.content}
                </p>
                {selectedMessage.image_url && (
                  <div className="mt-3">
                    <button
                      onClick={() => setLightboxUrl(selectedMessage.image_url!)}
                      className="group relative inline-block"
                    >
                      <img
                        src={selectedMessage.image_url}
                        alt={selectedMessage.image_name || '첨부 이미지'}
                        className="max-w-xs max-h-60 rounded-xl border border-gray-600 object-cover cursor-pointer group-hover:brightness-90 transition"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-lg">클릭하여 원본 보기</span>
                      </div>
                    </button>
                    {selectedMessage.image_name && (
                      <p className="text-[11px] text-gray-500 mt-1">{selectedMessage.image_name}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Reply (inbox only) */}
              {tab === 'inbox' && (
                <div className="px-5 py-4 border-t border-gray-700">
                  {replyImage && (
                    <div className="mb-2 relative inline-block">
                      <img
                        src={replyImage.preview}
                        alt={replyImage.name}
                        className="h-20 rounded-lg border border-gray-600 object-cover"
                      />
                      <button
                        onClick={() => setReplyImage(null)}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={replyFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(file, setReplyImage)
                        e.target.value = ''
                      }}
                    />
                    <button
                      onClick={() => replyFileRef.current?.click()}
                      disabled={uploading}
                      className="self-end text-gray-400 hover:text-blue-400 disabled:opacity-50 p-2.5 transition"
                      title="이미지 첨부"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <textarea
                      value={replyContent}
                      onChange={e => setReplyContent(e.target.value)}
                      placeholder="답장을 입력하세요..."
                      rows={2}
                      className="flex-1 bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                    />
                    <button
                      onClick={handleReply}
                      disabled={(!replyContent.trim() && !replyImage) || sending || uploading}
                      className="self-end bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-sm p-8">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-center">메시지를 선택하세요</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">새 메시지</h2>
              <button
                onClick={() => { setShowCompose(false); setComposeForm({ receiver_id: '', content: '' }); setComposeImage(null) }}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">받는 사람</label>
                <select
                  value={composeForm.receiver_id}
                  onChange={e => setComposeForm(prev => ({ ...prev, receiver_id: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">선택하세요</option>
                  {(profile?.role === 'admin' || profile?.role === 'consultant') ? (
                    Object.entries(groupedRecipients).map(([role, profiles]) => (
                      <optgroup key={role} label={getRoleBadge(role)}>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.full_name || p.email}
                          </option>
                        ))}
                      </optgroup>
                    ))
                  ) : (
                    allowedRecipients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.email}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">내용</label>
                <textarea
                  value={composeForm.content}
                  onChange={e => setComposeForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="메시지를 입력하세요..."
                  rows={5}
                  className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              {/* Image Attachment */}
              <div>
                <input
                  ref={composeFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file, setComposeImage)
                    e.target.value = ''
                  }}
                />
                {composeImage ? (
                  <div className="relative inline-block">
                    <img
                      src={composeImage.preview}
                      alt={composeImage.name}
                      className="h-24 rounded-xl border border-gray-600 object-cover"
                    />
                    <button
                      onClick={() => setComposeImage(null)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <p className="text-[11px] text-gray-500 mt-1">{composeImage.name}</p>
                  </div>
                ) : (
                  <button
                    onClick={() => composeFileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-blue-400 disabled:opacity-50 transition"
                  >
                    <Paperclip className="w-4 h-4" />
                    {uploading ? '업로드 중...' : '이미지 첨부'}
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-700">
              <button
                onClick={() => { setShowCompose(false); setComposeForm({ receiver_id: '', content: '' }); setComposeImage(null) }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
              >
                취소
              </button>
              <button
                onClick={handleCompose}
                disabled={!composeForm.receiver_id || (!composeForm.content.trim() && !composeImage) || sending || uploading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium transition"
              >
                <Send className="w-4 h-4" />
                전송
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightboxUrl}
            alt="원본 이미지"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
