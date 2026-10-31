const $ = id => document.getElementById(id);
let currentScenes = [];

function splitStory(text) {
  return text.replace(/\r/g, "")
    .split(/(?<=[.!?।])\s+|\n+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function makeScenes() {
  const story = $("story").value.trim();
  if (!story) {
    alert("আগে আপনার গল্প লিখুন।");
    return;
  }

  const parts = splitStory(story);
  const target = $("duration").value === "10" ? 10 : 5;
  const count = Math.max(3, Math.min(12, parts.length));

  currentScenes = Array.from({length: count}, (_, i) => {
    const start = Math.floor(i * parts.length / count);
    const end = Math.max(start + 1, Math.floor((i + 1) * parts.length / count));
    return {
      title: `দৃশ্য ${i + 1}`,
      text: parts.slice(start, end).join(" "),
      style: $("style").value,
      seconds: Math.round(target * 60 / count)
    };
  });

  render();
}

function render() {
  $("results").hidden = false;
  $("scenes").innerHTML = "";

  currentScenes.forEach(s => {
    const el = document.createElement("article");
    el.className = "scene";

    const h = document.createElement("h3");
    h.textContent = `${s.title} · প্রায় ${s.seconds} সেকেন্ড`;

    const p = document.createElement("p");
    p.textContent = s.text;

    const meta = document.createElement("p");
    meta.textContent = `স্টাইল: ${s.style}`;

    const b = document.createElement("button");
    b.textContent = "এই দৃশ্যটি শুনুন";
    b.onclick = () => speak(s.text);

    el.append(h, p, meta, b);
    $("scenes").append(el);
  });
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    alert("এই ব্রাউজারে Text-to-Speech নেই।");
    return;
  }

  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const lang = $("lang").value;
  u.lang = lang === "bn" ? "bn-BD" : lang === "hi" ? "hi-IN" : "en-US";

  const voices = speechSynthesis.getVoices();
  const matching = voices.filter(v => v.lang.toLowerCase().startsWith(lang));
  const chosen = matching.find(v => v.name.toLowerCase().includes($("voice").value)) || matching[0];
  if (chosen) u.voice = chosen;

  speechSynthesis.speak(u);
}

$("make").addEventListener("click", makeScenes);

$("clear").addEventListener("click", () => {
  $("story").value = "";
  $("results").hidden = true;
  currentScenes = [];
  speechSynthesis.cancel();
});

$("download").addEventListener("click", () => {
  const text = currentScenes.map(s =>
    `${s.title} (${s.seconds} সেকেন্ড)\n${s.text}\nস্টাইল: ${s.style}`
  ).join("\n\n");

  const blob = new Blob([text], {type: "text/plain;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "story-scenes.txt";
  a.click();
  URL.revokeObjectURL(a.href);
});
                            
