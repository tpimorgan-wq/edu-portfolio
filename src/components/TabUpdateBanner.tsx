'use client'

import { useEffect, useState } from 'react'
import { getTabUpdate } from '@/lib/tab-update'
import { TabUpdate } from '@/types'
import { Clock } from 'lucide-react'

interface TabUpdateBannerProps {
  studentId: string
  tabName: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}.${m}.${day} ${h}:${min}`
}

const roleLabelMap: Record<string, string> = {
  admin: '관리자',
  consultant: '컨설턴트',
  parent: '학부모',
  student: '학생',
}

export default function TabUpdateBanner({ studentId, tabName }: TabUpdateBannerProps) {
  const [update, setUpdate] = useState<TabUpdate | null>(null)

  useEffect(() => {
    getTabUpdate(studentId, tabName).then(setUpdate)
  }, [studentId, tabName])

  if (!update) return null

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
      <Clock className="w-3 h-3" />
      <span>
        마지막 업데이트: {formatDate(update.updated_at)} · {update.updater_name} ({roleLabelMap[update.updater_role] || update.updater_role})
      </span>
    </div>
  )
}
