const CHAT_FAQS = [
  {
    patterns: ["why.*trend.*down", "why.*going down", "trend.*decreasing", "is (the )?trend going down"],
    answer: "A trend can fall for several reasons, including seasonality, policy changes, economic activity, weather, or improved monitoring. Check the year range and the displayed units before assigning a cause; a short decline does not prove a long-term reversal."
  },
  {
    patterns: ["why.*trend.*up", "why.*going up", "trend.*increasing", "is (the )?trend going up"],
    answer: "An upward trend may reflect persistent warming, higher emissions, stronger rainfall variability, or a change in the way the metric is measured. The first check is whether the change is large relative to prior years and supported across several observations."
  },
  {
    patterns: ["what.*metric|what.*mean|units?|how.*read|explain"],
    answer: "Read the metric title, unit, and year together. Trend cards show an annual value or index; the chart shows the sequence over time. Compare changes against the baseline or earlier years shown in the dashboard, not against unrelated regions or indicators."
  },
  {
    patterns: ["data.*reliable|accuracy|source|limitations?|uncertainty"],
    answer: "Use the dashboard source and time coverage as the starting point. Live feeds can be incomplete or revised, while fallback values are for continuity rather than official reporting. Confirm important findings against the named data provider or a primary scientific source."
  },
  {
    patterns: ["what.*do|next steps?|how.*help|action"],
    answer: "Start by comparing the latest value with the last few years and the full period. Then test whether nearby indicators move together; this helps separate a local fluctuation from a persistent pattern. Use the result to target one evidence-based question, not a single decisive cause."
  }
];

const STARTERS = [
  "Why is the trend going down?",
  "Why is the trend going up?",
  "What does this metric mean?",
  "What should I watch next?"
];

let chatBusy = false;
const chartInstances = new Map();

function buildSnapshot() {
  const cards = [...document.querySelectorAll(".signal-card")].map((card) => {
    const title = card.querySelector("h3")?.textContent?.trim();
    const value = card.querySelector(".metric-value")?.textContent?.trim();
    const unit = card.querySelector(".metric-unit")?.textContent?.trim();
    const year = card.querySelector(".slider-year:last-child")?.textContent?.trim();
    return title && value ? `${title}: ${value} ${unit || ""} (${year || "latest year"})` : null;
  }).filter(Boolean);
  return {
    page: document.title,
    heading: document.querySelector(".context-panel h1")?.innerText?.replace(/\n/g, " ").trim(),
    metrics: cards
  };
}

function matchesFaq(question) {
  const normalized = question.toLowerCase();
  return CHAT_FAQS.find((item) => item.patterns.some((pattern) => new RegExp(pattern, "i").test(normalized)));
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function createChatUi() {
  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "chat-launcher";
  launcher.id = "chatLauncher";
  launcher.setAttribute("aria-controls", "chatPanel");
  launcher.setAttribute("aria-expanded", "false");
  launcher.innerHTML = '<span class="chat-launcher-mark" aria-hidden="true"></span><span>Ask the trend assistant</span>';

  const panel = document.createElement("section");
  panel.className = "chat-panel";
  panel.id = "chatPanel";
  panel.setAttribute("aria-label", "Earth trends assistant");
  panel.setAttribute("aria-hidden", "true");
  panel.innerHTML = `
    <header class="chat-header">
      <div class="chat-title"><span class="chat-launcher-mark" aria-hidden="true"></span><div><strong>Trend Assistant</strong><small>EARTH SIGNALS / CONCISE</small></div></div>
      <button class="chat-close" type="button" aria-label="Close assistant">×</button>
    </header>
    <div class="chat-messages" id="chatMessages" aria-live="polite"></div>
    <div class="chat-starters" id="chatStarters"></div>
    <form class="chat-form" id="chatForm">
      <input class="chat-input" id="chatInput" name="question" maxlength="1200" autocomplete="off" placeholder="Ask about this trend…" aria-label="Ask a question" />
      <button class="chat-send" id="chatSend" type="submit" aria-label="Send question">↑</button>
    </form>`;

  document.body.append(launcher, panel);

  launcher.addEventListener("click", () => {
    const open = panel.classList.toggle("open");
    launcher.setAttribute("aria-expanded", String(open));
    panel.setAttribute("aria-hidden", String(!open));
    if (open) {
      document.getElementById("chatInput").focus();
      if (!document.querySelector(".chat-message")) addAssistantMessage("Ask a question or choose a starter below.");
    }
  });
  panel.querySelector(".chat-close").addEventListener("click", () => {
    panel.classList.remove("open");
    launcher.setAttribute("aria-expanded", "false");
    panel.setAttribute("aria-hidden", "true");
  });

  const starters = document.getElementById("chatStarters");
  STARTERS.forEach((text) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chat-starter";
    button.textContent = text;
    button.addEventListener("click", () => submitQuestion(text));
    starters.append(button);
  });

  document.getElementById("chatForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("chatInput");
    await submitQuestion(input.value);
    input.value = "";
  });
}

function addMessage(text, role = "assistant", chartSpec = null) {
  const messages = document.getElementById("chatMessages");
  const message = document.createElement("div");
  message.className = `chat-message ${role}`;

  const parts = text.split(/```chart\s*([\s\S]*?)```/i);
  const copy = document.createElement("div");
  copy.innerHTML = escapeHtml(parts[0].trim()).replace(/\n/g, "<br>");
  message.append(copy);

  let parsedChart = chartSpec;
  if (parts[1]) {
    try { parsedChart = JSON.parse(parts[1]); } catch (_) {}
  }

  if (parsedChart && Array.isArray(parsedChart.labels) && Array.isArray(parsedChart.values) && window.Chart) {
    const wrap = document.createElement("div");
    wrap.className = "chat-chart-wrap";
    const canvas = document.createElement("canvas");
    wrap.append(canvas);
    message.append(wrap);
    const id = `chat-chart-${chartInstances.size}`;
    canvas.id = id;
    requestAnimationFrame(() => {
      const chart = new Chart(canvas, {
        type: "line",
        data: {
          labels: parsedChart.labels,
          datasets: [{
            data: parsedChart.values,
            borderColor: "#e45d3c",
            backgroundColor: "rgba(228,93,60,.10)",
            borderWidth: 2,
            pointRadius: 2,
            fill: true,
            tension: 0.35
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => ` ${context.raw}${parsedChart.unit ? ` ${parsedChart.unit}` : ""}` } } },
          scales: { x: { grid: { display: false }, ticks: { color: "#89968f", font: { size: 8 } } }, y: { grid: { color: "#edf0eb" }, ticks: { color: "#89968f", font: { size: 8 } } } }
        }
      });
      chartInstances.set(id, chart);
    });
  }

  messages.append(message);
  messages.scrollTop = messages.scrollHeight;
  return message;
}

function addAssistantMessage(text) {
  return addMessage(text, "assistant");
}

async function submitQuestion(question) {
  const text = question.trim();
  if (!text || chatBusy) return;
  addMessage(text, "user");
  document.getElementById("chatStarters").style.display = "none";
  const faq = matchesFaq(text);
  if (faq) {
    addAssistantMessage(faq.answer);
    return;
  }

  chatBusy = true;
  const send = document.getElementById("chatSend");
  send.disabled = true;
  const snapshot = buildSnapshot();
  const thinking = addAssistantMessage("Checking the trend…");
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, page: `${snapshot.page}. ${snapshot.heading || ""}. Metrics: ${snapshot.metrics.join("; ")}` })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "The assistant is temporarily unavailable.");
    thinking.remove();
    addAssistantMessage(payload.answer);
  } catch (error) {
    thinking.remove();
    addMessage(error.message, "error");
  } finally {
    chatBusy = false;
    send.disabled = false;
  }
}

createChatUi();
