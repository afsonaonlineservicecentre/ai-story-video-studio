const $ = id => document.getElementById(id);
let currentScenes = [];
let voiceList = [];

function loadVoices() {
  if (!("speechSynthesis" in window)) return;
  voiceList = speechSynthesis.getVoices();
}

if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function splitStory(text) {
  return text.replace(/\r/g, "")
    .split(/(?<=[.!?।])\s+|\n+/)
    .map(s => s.trim()).filter(Boolean);
}

function makeScenes() {
  const story = $("story").value.trim();
  if (!story) return alert("আগে গল্প লিখুন।");

  const parts = splitStory(story);
  const minutes = Number($("duration").value);
  const count = Math.max(3, Math.min(12, parts.length));

  currentScenes = Array.from({length: count}, (_, i) => {
    const start = Math.floor(i * parts.length / count);
    const end = Math.max(start + 1, Math.floor((i + 1) * parts.length / count));
    return {
      title: `দৃশ্য ${i + 1}`,
      text: parts.slice(start, end).join(" "),
      style: $("style").value,
      seconds: Math.round(minutes * 60 / count)
    };
  });

  render();
  showSceneImages();
}

function render() {
  $("results").hidden = false;
  $("scenes").innerHTML = "";

  currentScenes.forEach((scene, i) => {
    const card = document.createElement("article");
    card.className = "scene";

    const title = document.createElement("h3");
    title.textContent = `${scene.title} · ${scene.seconds} সেকেন্ড`;

    const text = document.createElement("p");
    text.textContent = scene.text;

    const style = document.createElement("p");
    style.textContent = `স্টাইল: ${scene.style}`;

    const play = document.createElement("button");
    play.textContent = "এই দৃশ্য শুনুন";
    play.onclick = () => speak(scene.text);

    card.append(title, text, style, play);
    $("scenes").append(card);
  });
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    return alert("আপনার ব্রাউজারে ভয়েস সুবিধা নেই।");
  }

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const lang = $("lang").value;

  utterance.lang = lang === "bn" ? "bn-BD" :
                   lang === "hi" ? "hi-IN" : "en-US";

  const wanted = $("voice").value;
  const matching = voiceList.filter(v =>
    v.lang.toLowerCase().startsWith(lang)
  );

  const chosen = matching.find(v =>
    wanted === "male"
      ? /male|man|boy/i.test(v.name)
      : /female|woman|girl/i.test(v.name)
  ) || matching[0];

  if (chosen) utterance.voice = chosen;
  speechSynthesis.speak(utterance);
}


function speakAll() {
  if (!currentScenes.length) {
    alert("আগে দৃশ্য তৈরি করুন।");
    return;
  }

  if (!("speechSynthesis" in window)) {
    alert("এই ব্রাউজারে ভয়েস সুবিধা নেই।");
    return;
  }

  speechSynthesis.cancel();

  let index = 0;

  function playNext() {
    if (index >= currentScenes.length) return;

    const utterance = new SpeechSynthesisUtterance(
      currentScenes[index].text
    );

    const lang = $("lang").value;

    utterance.lang = lang === "bn" ? "bn-BD" :
                     lang === "hi" ? "hi-IN" : "en-US";

    utterance.rate = 0.9;

    utterance.onend = () => {
      index++;
      playNext();
    };

    utterance.onerror = (event) => {
      alert("ভয়েস চালাতে সমস্যা হচ্ছে: " + event.error);
    };

    speechSynthesis.speak(utterance);
  }

  playNext();
}


$("make").addEventListener("click", makeScenes);

$("clear").addEventListener("click", () => {
  $("story").value = "";
  $("results").hidden = true;
  currentScenes = [];
  speechSynthesis.cancel();
});

$("download").addEventListener("click", () => {
  const content = currentScenes.map(s =>
    `${s.title}\n${s.text}\nসময়: ${s.seconds} সেকেন্ড\nস্টাইল: ${s.style}`
  ).join("\n\n");

  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "story-scenes.txt";
  link.click();
  URL.revokeObjectURL(link.href);
});

loadVoices();
function showSceneImages() {
  const container = document.getElementById("video-images");

  if (!container || !currentScenes || !currentScenes.length) return;

  container.innerHTML = "<h2>দৃশ্যের ছবির ধারণা</h2>";

  currentScenes.forEach((scene, index) => {
    const card = document.createElement("div");
    card.className = "scene-card";

    const title = document.createElement("h3");
    title.textContent = "দৃশ্য " + (index + 1);

    const prompt = document.createElement("p");
    prompt.textContent =
      scene.text + " — " + $("style").value + " style illustration";

    const copy = document.createElement("button");
    copy.textContent = "ছবির বর্ণনা কপি করুন";
    copy.onclick = () => {
      navigator.clipboard.writeText(prompt.textContent);
      alert("ছবির বর্ণনা কপি হয়েছে!");
    };

    card.append(title, prompt, copy);
    container.appendChild(card);
  });
}
