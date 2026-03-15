/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

let initialized = false

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG' && !initialized) {
    firebase.initializeApp(event.data.config)
    initialized = true
    setupMessaging()
  }
})

function setupMessaging() {
  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification || {}
    if (!title) return

    self.registration.showNotification(title, {
      body: body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: payload.data || {},
    })
  })
}
