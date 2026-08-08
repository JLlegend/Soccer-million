import { adminPin } from "./firebase-config.js";
import { getChallenge, saveTodayShots, unlockParent, lockParent, useFirebase } from "./data.js";

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
  } catch { message.textContent = "That PIN isn't correct, or parent authentication is not configured."; }
});
$("#lockButton").onclick = async () => { await lockParent(); sessionStorage.removeItem("soccer-parent-unlocked"); location.reload(); };
$("#shotsForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("#saveButton"), message = $("#saveMessage"), value = Number($("#shotsInput").value);
  if (!Number.isInteger(value) || value < 0) return message.textContent = "Enter a whole number of shots.";
  button.disabled = true; message.textContent = "Saving…";
  try { const updated = await saveTodayShots(value, dateKey); $("#adminTotal").textContent = format.format(updated.totalShots); message.textContent = useFirebase ? "Saved and synced." : "Saved in this browser (demo mode)."; }
  catch { message.textContent = "Could not save. Check Firebase setup and rules."; }
  button.disabled = false;
});
async function showEditor() {
  $("#pinPanel").hidden = true; $("#editorPanel").hidden = false;
  const challenge = await getChallenge();
  $("#shotsInput").value = challenge.dailyShots?.[dateKey] || "";
  $("#adminTotal").textContent = format.format(challenge.totalShots || 0);
}
if (sessionStorage.getItem("soccer-parent-unlocked") === "yes") showEditor();
