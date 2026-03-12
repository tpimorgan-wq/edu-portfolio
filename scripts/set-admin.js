const { initializeApp, cert } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
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
  const email = 'tpimorgan@tpiglobal.network'
  const auth = getAuth(app)
  const db = getFirestore(app)

  // Find user by email
  const user = await auth.getUserByEmail(email)
  console.log(`Found user: ${user.uid} (${user.email})`)

  // Update profile role to admin
  await db.collection('profiles').doc(user.uid).update({ role: 'admin' })
  console.log(`Updated role to admin for ${email}`)
}

main().catch(console.error).finally(() => process.exit())
