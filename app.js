const state = {
  targetYuan: 55000,
  savedYuan: 0,
  monthsLeft: 24,
  yuanRate: 13,
  monthlyIncome: 15000,
  currency: "yuan",
  tasks: {}
};

const els = {
  targetYuan: document.querySelector("#targetYuan"),
  savedYuan: document.querySelector("#savedYuan"),
  monthsLeft: document.querySelector("#monthsLeft"),
  yuanRate: document.querySelector("#yuanRate"),
  monthlyIncome: document.querySelector("#monthlyIncome"),
  incomeDisplay: document.querySelector("#incomeDisplay"),
  targetDisplay: document.querySelector("#targetDisplay"),
  targetRubDisplay: document.querySelector("#targetRubDisplay"),
  monthsDisplay: document.querySelector("#monthsDisplay"),
  monthlyNeeded: document.querySelector("#monthlyNeeded"),
  monthlyNeededRub: document.querySelector("#monthlyNeededRub"),
  progressRing: document.querySelector("#progressRing"),
  progressPercent: document.querySelector("#progressPercent"),
  remainingText: document.querySelector("#remainingText"),
  incomeText: document.querySelector("#incomeText"),
  minimumRub: document.querySelector("#minimumRub"),
  currentRub: document.querySelector("#currentRub"),
  gapRub: document.querySelector("#gapRub"),
  paceStatus: document.querySelector("#paceStatus"),
  monthPlan: document.querySelector("#monthPlan"),
  doneCount: document.querySelector("#doneCount"),
  toast: document.querySelector("#toast"),
  savePlan: document.querySelector("#savePlan"),
  copyPitch: document.querySelector("#copyPitch")
};

const planRows = [
  ["Неделя 1", "Собрать сайт-визитку", "цель: первый скрин в портфолио"],
  ["Неделя 2", "Сделать Telegram-бота заявок", "цель: демо для клиента"],
  ["Неделя 3", "Написать 20 людям с демо", "цель: 1 ответ"],
  ["Неделя 4", "Закрыть первый маленький заказ", "цель: 3 000 ₽"]
];

function formatRub(value) {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

function formatYuan(value) {
  return `${Math.round(value).toLocaleString("ru-RU")} ¥`;
}

function pluralMonths(value) {
  const number = Math.abs(value) % 100;
  const last = number % 10;
  if (number > 10 && number < 20) return "месяцев";
  if (last > 1 && last < 5) return "месяца";
  if (last === 1) return "месяц";
  return "месяцев";
}

function clampNumber(value, fallback, min, max = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function readInputs() {
  state.targetYuan = clampNumber(els.targetYuan.value, 55000, 1000);
  state.savedYuan = clampNumber(els.savedYuan.value, 0, 0);
  state.monthsLeft = clampNumber(els.monthsLeft.value, 24, 1, 60);
  state.yuanRate = clampNumber(els.yuanRate.value, 13, 1);
  state.monthlyIncome = clampNumber(els.monthlyIncome.value, 0, 0, 80000);
}

function getComputedPlan() {
  const remainingYuan = Math.max(state.targetYuan - state.savedYuan, 0);
  const monthlyYuan = remainingYuan / state.monthsLeft;
  const monthlyRub = monthlyYuan * state.yuanRate;
  const incomeYuan = state.monthlyIncome / state.yuanRate;
  const progress = state.targetYuan === 0 ? 0 : Math.min(state.savedYuan / state.targetYuan, 1);
  const gapRub = Math.max(monthlyRub - state.monthlyIncome, 0);
  return { remainingYuan, monthlyYuan, monthlyRub, incomeYuan, progress, gapRub };
}

function render() {
  readInputs();
  const plan = getComputedPlan();
  const progressDeg = Math.round(plan.progress * 360);
  const progressPercent = Math.round(plan.progress * 100);
  const onPace = state.monthlyIncome >= plan.monthlyRub;

  els.incomeDisplay.textContent = formatRub(state.monthlyIncome);
  els.targetDisplay.textContent = state.currency === "yuan"
    ? formatYuan(state.targetYuan)
    : formatRub(state.targetYuan * state.yuanRate);
  els.targetRubDisplay.textContent = `примерно ${formatRub(state.targetYuan * state.yuanRate)}`;
  els.monthsDisplay.textContent = `${state.monthsLeft} ${pluralMonths(state.monthsLeft)}`;
  els.monthlyNeeded.textContent = state.currency === "yuan"
    ? formatYuan(plan.monthlyYuan)
    : formatRub(plan.monthlyRub);
  els.monthlyNeededRub.textContent = formatRub(plan.monthlyRub);
  els.progressRing.style.background = `conic-gradient(var(--red) ${progressDeg}deg, #e9eeeb ${progressDeg}deg)`;
  els.progressPercent.textContent = `${progressPercent}%`;
  els.remainingText.textContent = plan.remainingYuan === 0
    ? "Цель закрыта. Теперь можно собирать запас."
    : `Осталось накопить ${formatYuan(plan.remainingYuan)}.`;
  els.incomeText.textContent = `При ${formatRub(state.monthlyIncome)} в месяц это ${formatYuan(plan.incomeYuan)}.`;
  els.minimumRub.textContent = formatRub(plan.monthlyRub);
  els.currentRub.textContent = formatRub(state.monthlyIncome);
  els.gapRub.textContent = formatRub(plan.gapRub);
  els.paceStatus.textContent = onPace ? "темп нормальный" : "надо ускориться";
  els.paceStatus.style.color = onPace ? "var(--jade)" : "var(--red)";

  renderDoneCount();
}

function renderPlanRows() {
  els.monthPlan.innerHTML = planRows
    .map(([week, title, note]) => `
      <div class="plan-row">
        <time>${week}</time>
        <strong>${title}</strong>
        <span>${note}</span>
      </div>
    `)
    .join("");
}

function renderDoneCount() {
  const total = document.querySelectorAll(".task input").length;
  const done = document.querySelectorAll(".task input:checked").length;
  els.doneCount.textContent = `${done} / ${total} готово`;
}

function saveState() {
  readInputs();
  const tasks = {};
  document.querySelectorAll(".task input").forEach((input) => {
    tasks[input.dataset.task] = input.checked;
  });
  localStorage.setItem("china-plan-state", JSON.stringify({ ...state, tasks }));
  showToast("План сохранён");
}

function loadState() {
  const saved = localStorage.getItem("china-plan-state");
  if (!saved) return;

  try {
    Object.assign(state, JSON.parse(saved));
    els.targetYuan.value = state.targetYuan;
    els.savedYuan.value = state.savedYuan;
    els.monthsLeft.value = state.monthsLeft;
    els.yuanRate.value = state.yuanRate;
    els.monthlyIncome.value = state.monthlyIncome;
    document.querySelectorAll(".task input").forEach((input) => {
      input.checked = Boolean(state.tasks?.[input.dataset.task]);
    });
    document.querySelectorAll(".segment").forEach((button) => {
      button.classList.toggle("active", button.dataset.currency === state.currency);
    });
  } catch {
    localStorage.removeItem("china-plan-state");
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 1800);
}

function copyPitch() {
  const text = document.querySelector("#clientPitch").textContent.trim();
  navigator.clipboard?.writeText(text)
    .then(() => showToast("Текст скопирован"))
    .catch(() => showToast("Не получилось скопировать"));
}

document.querySelectorAll("input").forEach((input) => {
  input.addEventListener("input", render);
});

document.querySelectorAll(".task input").forEach((input) => {
  input.addEventListener("change", () => {
    renderDoneCount();
    saveState();
  });
});

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    state.currency = button.dataset.currency;
    document.querySelectorAll(".segment").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    render();
  });
});

els.savePlan.addEventListener("click", saveState);
els.copyPitch.addEventListener("click", copyPitch);

renderPlanRows();
loadState();
render();
