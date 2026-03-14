import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { getApps, initializeApp } from 'firebase/app'

function getFirebaseStorage() {
  // Ensure app is initialized
  if (!getApps().length) {
    initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'dummy',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'dummy.firebaseapp.com',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'dummy',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    })
  }
  return getStorage()
}

export async function uploadContractFile(studentId: string, file: File): Promise<{ url: string; path: string }> {
  const storage = getFirebaseStorage()
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `contracts/${studentId}/${timestamp}_${safeName}`
  const storageRef = ref(storage, filePath)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return { url, path: filePath }
}

export async function deleteContractFile(filePath: string): Promise<void> {
  const storage = getFirebaseStorage()
  const storageRef = ref(storage, filePath)
  await deleteObject(storageRef)
}
