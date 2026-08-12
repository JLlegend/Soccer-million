import { submitGoal, submitShots, subscribeChallenge, subscribeLatestGoal, useFirebase } from "./data.js";

const levels = [
  { name: "Beginner", target: 10000, image: "beginner" },
  { name: "Rookie", target: 20000, image: "rookie" },
  { name: "Academy", target: 30000, image: "academy" },
  { name: "Striker", target: 40000, image: "striker" },
  { name: "Playmaker", target: 50000, image: "playmaker" },
  { name: "Finisher", target: 70000, image: "finisher" },
  { name: "Sharpshooter", target: 100000, image: "sharpshooter" },
  { name: "Elite", target: 150000, image: "elite" },
  { name: "Champion", target: 200000, image: "champion" },
  { name: "Master", target: 500000, image: "master" },
  { name: "Legend", target: 1000000, image: "legend" }
];
const format = new Intl.NumberFormat("en-US");

function streak(dailyShots = {}) {
  let count = 0, day = new Date();
  while (Number(dailyShots[day.toISOString().slice(0, 10)] || 0) > 0) { count++; day.setDate(day.getDate() - 1); }
  return count;
}

function render(data) {
  const total = Number(data.totalShots || 0);
  const foundLevel = levels.findIndex(level => total < level.target);
  const levelIndex = foundLevel === -1 ? levels.length - 1 : foundLevel;
  const level = levels[levelIndex];
  const priorTarget = levelIndex === 0 ? 0 : levels[levelIndex - 1].target;
  const remaining = Math.max(0, level.target - total);
  const nextLevel = levels[levelIndex + 1];
  document.body.className = `theme-${Math.min(5, Math.floor(total / 200000))}`;
  document.body.style.setProperty("--pitch-image", `url("assets/levels/${level.image}.webp")`);
  document.querySelector("#totalShots").textContent = format.format(total);
  document.querySelector("#levelNumber").textContent = levelIndex + 1;
  document.querySelector("#levelName").textContent = level.name;
  document.querySelector("#nextLevelName").textContent = nextLevel?.name || "MILLION CLUB";
  document.querySelector("#shotsRemaining").textContent = format.format(remaining);
  document.querySelector("#progressBar").style.width = `${Math.min(100, Math.max(0, (total - priorTarget) / (level.target - priorTarget) * 100))}%`;
  const days = streak(data.dailyShots);
  document.querySelector("#streakDays").textContent = `${days} Day${days === 1 ? "" : "s"} Streak`;
  const giftUnlocked = days >= 10;
  const gift = data.streakGift || "A special surprise from your parent!";
  document.querySelector("#streakGift").classList.toggle("locked-gift", !giftUnlocked);
  document.querySelector("#streakGift").classList.toggle("unlocked-gift", giftUnlocked);
  document.querySelector("#giftStatus").textContent = giftUnlocked ? "You unlocked a gift!" : `${Math.max(0, 10 - days)} more day${10 - days === 1 ? "" : "s"} to unlock a gift.`;
  document.querySelector("#giftText").textContent = giftUnlocked ? gift : "Practice today to keep your streak alive.";
  const upcoming = levels.slice(levelIndex + 1, levelIndex + 5).map((next, offset) => ({
    name: next.name,
    level: levelIndex + offset + 2,
    goal: next.target,
    remaining: next.target - total
  }));
  document.querySelector("#achievementsHeading").textContent = "NEXT 4 LEVELS";
  document.querySelector("#badges").innerHTML = upcoming.map(next => `<article class="badge next-badge"><span>⚽</span><strong>LEVEL ${next.level}</strong><b>${next.name}</b><small>${format.format(next.goal)} shots</small><em>${format.format(next.remaining)} to go</em></article>`).join("");
  document.querySelector("#levelGiftBoxes").innerHTML = upcoming.map(next => `<div class="level-gift-box"><span>🎁</span><small>LEVEL ${next.level} REWARD</small></div>`).join("");
}

subscribeChallenge(render, () => document.querySelector("#connectionStatus").textContent = "Could not connect. Check Firebase setup.");
subscribeLatestGoal(goal => {
  document.querySelector("#currentGoal").textContent = goal ? `“${goal}”` : "Write the dream you are training for.";
}, () => {});
document.querySelector("#submissionForm").addEventListener("submit", async event => {
  event.preventDefault();
  const value = Number(document.querySelector("#submissionInput").value);
  const button = document.querySelector("#submissionButton"), message = document.querySelector("#submissionMessage");
  if (!Number.isInteger(value) || value < 1) return message.textContent = "Enter a whole number of shots.";
  button.disabled = true; message.textContent = "Sending…";
  try { await submitShots(value); document.querySelector("#submissionInput").value = ""; message.textContent = "Sent! Your parent can approve it now."; }
  catch { message.textContent = "Could not send. Please try again."; }
  button.disabled = false;
});
document.querySelector("#goalForm").addEventListener("submit", async event => {
  event.preventDefault();
  const value = document.querySelector("#goalInput").value.trim();
  const button = document.querySelector("#goalButton"), message = document.querySelector("#goalMessage");
  if (!value) return message.textContent = "Write your goal first.";
  button.disabled = true; message.textContent = "Saving…";
  try { await submitGoal(value); message.textContent = "Your dream is on the field!"; }
  catch { message.textContent = "Could not save your goal. Please try again."; }
  button.disabled = false;
});
document.querySelector("#connectionStatus").textContent = useFirebase ? "Live sync enabled" : "Demo mode — add Firebase to share across devices";
if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js");
