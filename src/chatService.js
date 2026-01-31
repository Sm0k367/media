import { db } from './AuthContext.jsx'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export async function loadChatHistory(userId) {
  if (!userId) return []
  
  const docRef = doc(db, 'chats', userId)
  const docSnap = await getDoc(docRef)
  
  if (docSnap.exists()) {
    return docSnap.data().messages || []
  }
  
  return []
}

export async function saveChatHistory(userId, messages) {
  if (!userId) return
  
  const docRef = doc(db, 'chats', userId)
  await setDoc(docRef, { messages }, { merge: true })
}
