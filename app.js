alert("JavaScript চালু হয়েছে!");
const $ = id => document.getElementById(id);

let currentScenes = [];
let voiceList = [];

const WORKER_URL =
  "https://super-breeze-d500story-ai-backend-v2.yusufrahamankhan9883.workers.dev/";

function loadVoices() {
  if (!("speechSynthesis" in window)) return;
  voiceList = speechSynthesis.getVoices();
}

if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function splitStory(text) {
  return text
    .replace(/\r/g, "")
    .replace(/([.!?।])\s+/g, "$1\n")
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function makeScenes() {
  const story = $("story").value.trim();

  if (!story) {
    alert("আগে গল্প লিখুন।");
    return;
  }

  const parts = splitStory(story);
  const minutes = Number($("duration").value);
  const count = Math.min(12, Math.max(3, parts.length));

  currentScenes = Array.from({ length: count }, (_, i) => {
    const start = Math.floor(i * parts.length / count);
    const end = Math.max(
      start + 1,
      Math.floor((i + 1) * parts.length / count)
    );

    return {
      title: `দৃশ্য ${i + 1}`,
      text: parts.slice(start, end).join(" "),
      style: $("style").value,
      seconds: Math.round(minutes * 60 / count),
      imageUrl: null
    };
  });

  render();
  showSceneImages();
}

function render() {
  $("results").hidden = false;
  $("scenes").innerHTML = "";

  currentScenes.forEach(scene => {
    const card = document.createElement("article");
    card.className = "scene";

    const title = document.createElement("h3");
    title.textContent =
      `${scene.title} · ${scene.seconds} সেকেন্ড`;

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
    alert("আপনার ব্রাউজারে ভয়েস সুবিধা নেই।");
    return;
  }

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const lang = $("lang").value;

  utterance.lang =
    lang === "bn" ? "bn-BD" :
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

    utterance.lang =
      lang === "bn" ? "bn-BD" :
      lang === "hi" ? "hi-IN" : "en-US";

    utterance.rate = 0.9;

    utterance.onend = () => {
      index++;
      playNext();
    };

    utterance.onerror = event => {
      alert("ভয়েস চালাতে সমস্যা হচ্ছে: " + event.error);
    };

    speechSynthesis.speak(utterance);
  }

  playNext();
}

function downloadScript() {
  const content = currentScenes.map(scene =>
    `${scene.title}\n${scene.text}\nসময়: ${scene.seconds} সেকেন্ড\nস্টাইল: ${scene.style}`
  ).join("\n\n");

  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "story-scenes.txt";
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function showSceneImages() {
  const container = $("video-images");

  if (!container || !currentScenes.length) return;

  container.innerHTML = "<h2>AI দিয়ে দৃশ্যের ছবি তৈরি</h2>";

  const styleMap = {
    "সিনেমাটিক":
      "cinematic, dramatic lighting, movie scene, high detail",
    "কার্টুন":
      "colorful cartoon illustration, expressive characters",
    "অ্যানিমে":
      "anime art style, detailed background, beautiful colors",
    "বাস্তবধর্মী":
      "photorealistic, realistic lighting, highly detailed",
    "ফ্যান্টাসি":
      "fantasy art, magical atmosphere, beautiful scenery"
  };

  for (let index = 0; index < currentScenes.length; index++) {
    const scene = currentScenes[index];

    const card = document.createElement("div");
    card.className = "scene-card";

    const title = document.createElement("h3");
    title.textContent = "দৃশ্য " + (index + 1);

    const status = document.createElement("p");
    status.textContent = "ছবি তৈরি হচ্ছে...";

    card.append(title, status);
    container.append(card);

    const prompt =
      (styleMap[scene.style] || "beautiful illustration") +
      ". Create an image showing: " +
      scene.text +
      ". Consistent characters, 16:9 landscape composition, no text.";

    try {
      const response = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Server error: " + response.status);
      }

      const blob = await response.blob();

      if (!blob.size || !blob.type.startsWith("image/")) {
        throw new Error("সঠিক ছবির ডেটা পাওয়া যায়নি।");
      }

      const imageURL = URL.createObjectURL(blob);
      scene.imageUrl = imageURL;

      const img = document.createElement("img");
      img.src = imageURL;
      img.alt = scene.title;
      img.style.width = "100%";
      img.style.height = "auto";
      img.style.borderRadius = "12px";

      status.textContent = "ছবি তৈরি হয়েছে!";

      const download = document.createElement("a");
      download.href = imageURL;
      download.download = `scene-${index + 1}.png`;
      download.textContent = "ছবি ডাউনলোড করুন";
      download.style.display = "inline-block";
      download.style.margin = "12px";

      card.append(img, download);

    } catch (error) {
      status.textContent =
        "ছবি তৈরি হয়নি: " + error.message;
    }
  }
}

$("make").addEventListener("click", makeScenes);

$("clear").addEventListener("click", () => {
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }

  currentScenes.forEach(scene => {
    if (scene.imageUrl) {
      URL.revokeObjectURL(scene.imageUrl);
    }
  });

  $("story").value = "";
  $("results").hidden = true;
  $("scenes").innerHTML = "";
  $("video-images").innerHTML = "";
  currentScenes = [];
});

$("download").addEventListener("click", downloadScript);

loadVoices();

const videoButton = $("create-video");

if (videoButton) {
  videoButton.addEventListener("click", async () => {
    const status = $("video-status");

    if (!currentScenes.length) {
      alert("আগে দৃশ্য তৈরি করুন।");
      return;
    }

    if (
      !window.MediaRecorder ||
      !HTMLCanvasElement.prototype.captureStream
    ) {
      status.textContent =
        "এই ব্রাউজারে ভিডিও তৈরি সমর্থিত নয়।";
      return;
    }

    videoButton.disabled = true;
    status.textContent = "ভিডিও তৈরি হচ্ছে...";

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;

      const ctx = canvas.getContext("2d");
      const stream = canvas.captureStream(24);

      const mimeType =
        MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];

      recorder.ondataavailable = event => {
        if (event.data.size) chunks.push(event.data);
      };

      const finished = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = () =>
          reject(new Error("ভিডিও রেকর্ডিং ব্যর্থ হয়েছে।"));
      });

      recorder.start();

      for (let i = 0; i < currentScenes.length; i++) {
        const scene = currentScenes[i];

        ctx.fillStyle = "#101322";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (scene.imageUrl) {
          const img = new Image();
          img.src = scene.imageUrl;

          await new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });

          if (img.complete && img.naturalWidth) {
            const scale = Math.max(
              canvas.width / img.width,
              canvas.height / img.height
            );

            const width = img.width * scale;
            const height = img.height * scale;

            ctx.drawImage(
              img,
              (canvas.width - width) / 2,
              (canvas.height - height) / 2,
              width,
              height
            );
          }
        }

        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 570, canvas.width, 150);

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = "bold 34px sans-serif";
        ctx.fillText(scene.title, 640, 615);

        ctx.font = "25px sans-serif";

        const words = scene.text.split(/\s+/);
        let line = "";
        let y = 660;

        for (const word of words) {
          const test = line + word + " ";

          if (ctx.measureText(test).width > 1100) {
            ctx.fillText(line, 640, y);
            line = word + " ";
            y += 35;
          } else {
            line = test;
          }
        }

        ctx.fillText(line, 640, y);

        await new Promise(resolve =>
          setTimeout(resolve, 3000)
        );
      }

      recorder.stop();
      await finished;

      const videoBlob = new Blob(chunks, {
        type: "video/webm"
      });

      const url = URL.createObjectURL(videoBlob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "my-story-video.webm";
      link.click();

      setTimeout(() => URL.revokeObjectURL(url), 10000);

      status.textContent =
        "WebM ভিডিও ডাউনলোড হয়েছে!";

      stream.getTracks().forEach(track => track.stop());

    } catch (error) {
      status.textContent =
        "ভিডিও তৈরি হয়নি: " + error.message;
    } finally {
      videoButton.disabled = false;
    }
  });
}
setTimeout(() => {
  loadVoices();

  const bengaliVoices = voiceList.filter(v =>
    v.lang.toLowerCase().startsWith("bn")
  );

  alert(
    bengaliVoices.length
      ? bengaliVoices.map(v => v.name + " (" + v.lang + ")").join("\n")
      : "বাংলা ভয়েস পাওয়া যায়নি"
  );
}, 2000);
