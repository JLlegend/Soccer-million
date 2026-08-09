import { subscribeChallenge, useFirebase } from "./data.js";

const levels = ["Beginner", "Rookie", "Academy", "Striker", "Playmaker", "Finisher", "Sharpshooter", "Elite", "Champion", "Master", "Legend"];
const levelSize = 10000;
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
  const upcoming = levels.slice(levelIndex + 1, levelIndex + 5).map((name, offset) => ({
    name,
    level: levelIndex + offset + 2,
    goal: (levelIndex + offset + 1) * levelSize,
    remaining: (levelIndex + offset + 1) * levelSize - total
  }));
  document.querySelector("#achievementsHeading").textContent = "NEXT 4 LEVELS";
  document.querySelector("#badges").innerHTML = upcoming.map(next => `<article class="badge next-badge"><span>⚽</span><strong>LEVEL ${next.level}</strong><b>${next.name}</b><small>${format.format(next.goal)} shots</small><em>${format.format(next.remaining)} to go</em></article>`).join("");
}

subscribeChallenge(render, () => document.querySelector("#connectionStatus").textContent = "Could not connect. Check Firebase setup.");
document.querySelector("#connectionStatus").textContent = useFirebase ? "Live sync enabled" : "Demo mode — add Firebase to share across devices";
if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js");
