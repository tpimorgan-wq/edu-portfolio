const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { readFileSync } = require('fs')
const { resolve } = require('path')

// Load .env.local
const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '')
}

const app = initializeApp({
  credential: cert({
    projectId: env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
})

async function main() {
  const db = getFirestore(app)

  // Auth UID of the student user
  const authUserId = 'CsVF1sTIXoXenACJY7iN8ykVBHv2'

  // Find the profile to get the student's name
  const profileDoc = await db.collection('profiles').doc(authUserId).get()
  if (!profileDoc.exists) {
    console.error('Profile not found for', authUserId)
    return
  }
  const profile = profileDoc.data()
  console.log(`Profile: ${profile.full_name} (${profile.email}), role: ${profile.role}`)

  // Find student documents matching this name
  const studentsSnap = await db.collection('students').where('name', '==', profile.full_name).get()

  if (studentsSnap.empty) {
    console.log(`No student document found with name "${profile.full_name}"`)
    console.log('Listing all students to help find the right one:')
    const allStudents = await db.collection('students').get()
    allStudents.forEach(doc => {
      const d = doc.data()
      console.log(`  - ${doc.id}: ${d.name} (user_id: ${d.user_id || 'not set'})`)
    })
    return
  }

  for (const doc of studentsSnap.docs) {
    console.log(`Setting user_id on student "${doc.data().name}" (${doc.id})`)
    await doc.ref.update({ user_id: authUserId })
    console.log(`Done: student ${doc.id} now has user_id = ${authUserId}`)
  }
}

main().catch(console.error).finally(() => process.exit())
