import { adminPin } from "./firebase-config.js";
import { approveSubmission, getChallenge, saveLevelGifts, saveStreakGift, saveTodayShots, setTotalShots, subscribePendingSubmissions, unlockParent, lockParent, useFirebase } from "./data.js";

const dateKey = new Date().toISOString().slice(0, 10);
const format = new Intl.NumberFormat("en-US");
const $ = s => document.querySelector(s);
$("#todayDate").textContent = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

$("#pinForm").addEventListener("submit", async event => {
  event.preventDefault();
  const message = $("#pinMessage"); message.textContent = "Checking…";
  try {
    if (useFirebase) await unlockParent($("#pinInput").value);
    else if ($("#pinInput").value !== adminPin) throw new Error("incorrect");
    sessionStorage.setItem("soccer-parent-unlocked", "yes"); showEditor();
  } catch (error) {
    const explanations = {
      "auth/invalid-credential": "This PIN does not match the parent Firebase account.",
      "auth/invalid-login-credentials": "This PIN does not match the parent Firebase account.",
      "auth/user-not-found": "The parent email in firebase-config.js is not registered in Firebase Authentication.",
      "auth/operation-not-allowed": "Enable Email/Password in Firebase Authentication → Sign-in method.",
      "auth/too-many-requests": "Too many attempts. Please wait a moment and try again."
    };
    message.textContent = explanations[error?.code] || "Parent login could not be verified. Check Firebase Authentication settings.";
  }
});
$("#lockButton").onclick = async () => { await lockParent(); sessionStorage.removeItem("soccer-parent-unlocked"); location.reload(); };
$("#shotsForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("#saveButton"), message = $("#saveMessage"), value = Number($("#shotsInput").value);
  if (!Number.isInteger(value) || value < 0) return message.textContent = "Enter a whole number of shots.";
  button.disabled = true; message.textContent = "Saving…";
  try { const updated = await saveTodayShots(value, dateKey); $("#adminTotal").textContent = format.format(updated.totalShots); $("#totalInput").value = updated.totalShots; message.textContent = useFirebase ? "Saved and synced." : "Saved in this browser (demo mode)."; }
  catch { message.textContent = "Could not save. Check Firebase setup and rules."; }
  button.disabled = false;
});
$("#totalForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("#totalButton"), message = $("#totalMessage"), value = Number($("#totalInput").value);
  if (!Number.isInteger(value) || value < 0) return message.textContent = "Enter a whole number of shots.";
  button.disabled = true; message.textContent = "Saving…";
  try { const updated = await setTotalShots(value); $("#adminTotal").textContent = format.format(updated.totalShots); message.textContent = "Total corrected and synced."; }
  catch { message.textContent = "Could not save the total. Check Firebase setup and rules."; }
  button.disabled = false;
});
$("#giftForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("#giftButton"), message = $("#giftMessage"), value = $("#giftInput").value.trim();
  button.disabled = true; message.textContent = "Saving…";
  try { await saveStreakGift(value); message.textContent = "10-day gift saved."; }
  catch { message.textContent = "Could not save the gift."; }
  button.disabled = false;
});
$("#levelGiftForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("#levelGiftButton"), message = $("#levelGiftMessage");
  const gifts = Object.fromEntries([...document.querySelectorAll("[data-level-gift]")].map(input => [input.dataset.levelGift, input.value.trim()]));
  button.disabled = true; message.textContent = "Saving…";
  try { await saveLevelGifts(gifts); message.textContent = "Level gifts saved."; }
  catch { message.textContent = "Could not save level gifts."; }
  button.disabled = false;
});
function renderPending(items) {
  const list = $("#pendingSubmissions");
  if (!items.length) { list.innerHTML = `<p class="muted">No shots waiting for approval.</p>`; return; }
  list.innerHTML = items.map(item => `<article class="pending-item"><div><strong>${format.format(item.shots)} shots</strong><p>${item.dateKey || "Today"}</p></div><button data-approve="${item.id || item.submittedAt}">Approve</button></article>`).join("");
  list.querySelectorAll("[data-approve]").forEach(button => button.onclick = async () => {
    const item = items.find(entry => String(entry.id || entry.submittedAt) === button.dataset.approve); const message = $("#approvalMessage");
    button.disabled = true; message.textContent = "Approving…";
    try { await approveSubmission(item); message.textContent = `${format.format(item.shots)} shots approved and added.`; }
    catch (error) { message.textContent = error?.message || "Could not approve this submission."; button.disabled = false; }
  });
}
async function showEditor() {
  $("#pinPanel").hidden = true; $("#editorPanel").hidden = false;
  const challenge = await getChallenge();
  $("#shotsInput").value = challenge.dailyShots?.[dateKey] || "";
  $("#adminTotal").textContent = format.format(challenge.totalShots || 0);
  $("#totalInput").value = challenge.totalShots || 0;
  $("#giftInput").value = challenge.streakGift || "";
  document.querySelectorAll("[data-level-gift]").forEach(input => input.value = challenge.levelGifts?.[input.dataset.levelGift] || "");
  subscribePendingSubmissions(renderPending, () => $("#approvalMessage").textContent = "Could not load submissions.");
}
if (sessionStorage.getItem("soccer-parent-unlocked") === "yes") showEditor();
