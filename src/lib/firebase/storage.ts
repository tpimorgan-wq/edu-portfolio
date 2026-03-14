export async function uploadContractFile(studentId: string, file: File): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('studentId', studentId)
  const res = await fetch('/api/contracts/upload', { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || '업로드 실패')
  }
  return res.json()
}
