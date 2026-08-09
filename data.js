import { firebaseConfig, parentEmail, startingTotal } from "./firebase-config.js";

const useFirebase = firebaseConfig.apiKey !== "REPLACE_ME";
const demoKey = "soccer-million-challenge-demo";
const defaultData = { totalShots: Number(startingTotal || 0), dailyShots: {}, updatedAt: null };

let db, auth;
if (useFirebase) {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
  const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
  const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js");
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

function demoData() { return JSON.parse(localStorage.getItem(demoKey) || JSON.stringify(defaultData)); }
function saveDemo(data) { localStorage.setItem(demoKey, JSON.stringify(data)); }

export async function getChallenge() {
  if (!useFirebase) return demoData();
  const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
  const snapshot = await getDoc(doc(db, "challenge", "main"));
  return snapshot.exists() ? { ...defaultData, ...snapshot.data() } : defaultData;
}

export function subscribeChallenge(callback, onError) {
  if (!useFirebase) { callback(demoData()); window.addEventListener("storage", () => callback(demoData())); return () => {}; }
  let stop = () => {};
  import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js").then(({ doc, onSnapshot }) => {
    stop = onSnapshot(doc(db, "challenge", "main"), snap => callback(snap.exists() ? { ...defaultData, ...snap.data() } : defaultData), onError);
  }).catch(onError);
  return () => stop();
}

export async function saveTodayShots(shots, dateKey) {
  const current = await getChallenge();
  const oldShots = Number(current.dailyShots?.[dateKey] || 0);
  const next = { ...current, totalShots: Math.max(0, Number(current.totalShots || 0) - oldShots + shots), dailyShots: { ...current.dailyShots, [dateKey]: shots }, updatedAt: new Date().toISOString() };
  if (!useFirebase) { saveDemo(next); return next; }
  const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
  await setDoc(doc(db, "challenge", "main"), next);
  return next;
}

export async function setTotalShots(total) {
  const current = await getChallenge();
  const next = { ...current, totalShots: total, updatedAt: new Date().toISOString() };
  if (!useFirebase) { saveDemo(next); return next; }
  const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
  await setDoc(doc(db, "challenge", "main"), next);
  return next;
}

export async function unlockParent(pin) {
  if (!useFirebase) return true;
  if (!parentEmail || parentEmail === "parent@example.com") throw new Error("Add parentEmail to firebase-config.js first.");
  const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js");
  await signInWithEmailAndPassword(auth, parentEmail, pin);
  return true;
}

export async function lockParent() {
  if (!useFirebase) return;
  const { signOut } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js");
  await signOut(auth);
}

export { useFirebase };
