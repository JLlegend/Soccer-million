import { subscribeChallenge, useFirebase } from "./data.js";

const levels = ["Beginner", "Rookie", "Academy", "Striker", "Playmaker", "Finisher", "Sharpshooter", "Elite", "Champion", "Master", "Legend"];
const levelSize = 10000;
const achievements = [
  { goal: 100000, icon: "🏅", name: "MASTER" },
  { goal: 200000, icon: "👑", name: "LEGEND" },
  { goal: 1000000, icon: "🏆", name: "MILLION CLUB" }
];
const format = new Intl.NumberFormat("en-US");

function streak(dailyShots = {}) {
  let count = 0, day = new Date();
  while (Number(dailyShots[day.toISOString().slice(0, 10)] || 0) > 0) { count++; day.setDate(day.getDate() - 1); }
  return count;
}

function render(data) {
  const total = Number(data.totalShots || 0);
  const levelIndex = Math.min(levels.length - 1, Math.floor(total / levelSize));
  const nextGoal = (levelIndex + 1) * levelSize;
  document.body.className = `theme-${Math.min(5, Math.floor(total / 200000))}`;
  document.querySelector("#totalShots").textContent = format.format(total);
  document.querySelector("#levelNumber").textContent = levelIndex + 1;
  document.querySelector("#levelName").textContent = levels[levelIndex];
  document.querySelector("#shotsRemaining").textContent = format.format(Math.max(0, nextGoal - total));
  document.querySelector("#progressBar").style.width = `${(total % levelSize) / levelSize * 100}%`;
  const days = streak(data.dailyShots);
  document.querySelector("#streakDays").textContent = `${days} Day${days === 1 ? "" : "s"} Streak`;
  document.querySelector("#badges").innerHTML = achievements.map(a => `<article class="badge ${total >= a.goal ? "unlocked" : "locked"}"><span>${a.icon}</span><strong>${a.name}</strong><small>${format.format(a.goal)} shots</small></article>`).join("");
}

subscribeChallenge(render, () => document.querySelector("#connectionStatus").textContent = "Could not connect. Check Firebase setup.");
document.querySelector("#connectionStatus").textContent = useFirebase ? "Live sync enabled" : "Demo mode — add Firebase to share across devices";
if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js");
