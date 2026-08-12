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
function demoSubmissions() { return JSON.parse(localStorage.getItem(`${demoKey}-submissions`) || "[]"); }
function saveDemoSubmissions(items) { localStorage.setItem(`${demoKey}-submissions`, JSON.stringify(items)); }
function demoGoals() { return JSON.parse(localStorage.getItem(`${demoKey}-goals`) || "[]"); }
function saveDemoGoals(items) { localStorage.setItem(`${demoKey}-goals`, JSON.stringify(items)); }

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

export async function submitShots(shots) {
  const submission = { shots, dateKey: new Date().toISOString().slice(0, 10), submittedAt: new Date().toISOString(), status: "pending" };
  if (!useFirebase) { const items = [submission, ...demoSubmissions()]; saveDemoSubmissions(items); return submission; }
  const { addDoc, collection, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
  await addDoc(collection(db, "submissions"), { ...submission, submittedAt: serverTimestamp() });
  return submission;
}

export function subscribePendingSubmissions(callback, onError) {
  if (!useFirebase) { callback(demoSubmissions().filter(item => item.status === "pending")); window.addEventListener("storage", () => callback(demoSubmissions().filter(item => item.status === "pending"))); return () => {}; }
  let stop = () => {};
  import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js").then(({ collection, onSnapshot }) => {
    stop = onSnapshot(collection(db, "submissions"), snapshot => callback(snapshot.docs.map(item => ({ id: item.id, ...item.data() })).filter(item => item.status === "pending").sort((a, b) => String(b.submittedAt?.toDate?.() || b.submittedAt || "").localeCompare(String(a.submittedAt?.toDate?.() || a.submittedAt || "")))), onError);
  }).catch(onError);
  return () => stop();
}

export async function approveSubmission(submission) {
  if (!useFirebase) {
    const current = demoData(); const dailyShots = { ...current.dailyShots, [submission.dateKey]: Number(current.dailyShots?.[submission.dateKey] || 0) + submission.shots };
    saveDemo({ ...current, dailyShots, totalShots: Number(current.totalShots || 0) + submission.shots, updatedAt: new Date().toISOString() });
    saveDemoSubmissions(demoSubmissions().map(item => item === submission ? { ...item, status: "approved" } : item)); return;
  }
  const { doc, runTransaction, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
  await runTransaction(db, async transaction => {
    const challengeRef = doc(db, "challenge", "main"); const submissionRef = doc(db, "submissions", submission.id);
    const [challengeSnap, submissionSnap] = await Promise.all([transaction.get(challengeRef), transaction.get(submissionRef)]);
    if (!submissionSnap.exists() || submissionSnap.data().status !== "pending") throw new Error("This submission was already reviewed.");
    const current = challengeSnap.exists() ? { ...defaultData, ...challengeSnap.data() } : defaultData;
    const dateKey = submissionSnap.data().dateKey; const shots = Number(submissionSnap.data().shots);
    const dailyShots = { ...current.dailyShots, [dateKey]: Number(current.dailyShots?.[dateKey] || 0) + shots };
    transaction.set(challengeRef, { ...current, dailyShots, totalShots: Number(current.totalShots || 0) + shots, updatedAt: serverTimestamp() });
    transaction.update(submissionRef, { status: "approved", approvedAt: serverTimestamp() });
  });
}

export async function deleteSubmission(submission) {
  if (!useFirebase) { saveDemoSubmissions(demoSubmissions().filter(item => item !== submission)); return; }
  const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
  await deleteDoc(doc(db, "submissions", submission.id));
}

export async function submitGoal(text) {
  const goal = { text, submittedAt: new Date().toISOString() };
  if (!useFirebase) { saveDemoGoals([goal, ...demoGoals()]); return goal; }
  const { addDoc, collection, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
  await addDoc(collection(db, "goals"), { ...goal, submittedAt: serverTimestamp() });
  return goal;
}

export function subscribeLatestGoal(callback, onError) {
  if (!useFirebase) { callback(demoGoals()[0]?.text || ""); window.addEventListener("storage", () => callback(demoGoals()[0]?.text || "")); return () => {}; }
  let stop = () => {};
  import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js").then(({ collection, limit, onSnapshot, orderBy, query }) => {
    stop = onSnapshot(query(collection(db, "goals"), orderBy("submittedAt", "desc"), limit(1)), snapshot => callback(snapshot.docs[0]?.data().text || ""), onError);
  }).catch(onError);
  return () => stop();
}

export async function saveStreakGift(text) {
  const current = await getChallenge(); const next = { ...current, streakGift: text, updatedAt: new Date().toISOString() };
  if (!useFirebase) { saveDemo(next); return next; }
  const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
  await setDoc(doc(db, "challenge", "main"), next); return next;
}

export async function saveLevelGifts(levelGifts) {
  const current = await getChallenge(); const next = { ...current, levelGifts, updatedAt: new Date().toISOString() };
  if (!useFirebase) { saveDemo(next); return next; }
  const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");
  await setDoc(doc(db, "challenge", "main"), next); return next;
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
