/* ---------- photo titles ---------- */
const photoInput = document.getElementById("photoInput");
const photoDrop = document.getElementById("photoDrop");
const pinBoard = document.getElementById("pinBoard");

const TITLE_FIRST = {
  warm: ["Golden", "Honey", "Amber", "Sunset", "Peach"],
  cool: ["Midnight", "Blue Hour", "Chrome", "Frost", "Lunar"],
  neutral: ["Soft", "Cloud", "Velvet", "Quiet", "Paper"],
};

const TITLE_SECOND = {
  bright: ["Daydream", "Sparkle", "Flash", "Glow", "Halo"],
  deep: ["Muse", "Diary", "Reverie", "Echo", "Nocturne"],
};

const CHARM_POOL = {
  warm: ["gold locket", "sun charm", "amber bead"],
  cool: ["moon pin", "navy thread", "blue stone", "steel lace"],
  neutral: ["pearl pin", "silk ribbon", "sticker stack"],
  bright: ["glitter clip", "star stud"],
  deep: ["velvet tag", "ink drop"],
};

function pick(list, seed) {
  return list[seed % list.length];
}

function analyzeImage(img) {
  const canvas = document.createElement("canvas");
  const size = 32;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count += 1;
  }
  r /= count; g /= count; b /= count;

  const brightness = (r + g + b) / 3;
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);

  return {
    temp: r > b + 12 ? "warm" : b > r + 12 ? "cool" : "neutral",
    light: brightness > 128 ? "bright" : "deep",
    vivid: saturation > 40 ? "vivid" : "muted",
    seed: Math.round(r * 7 + g * 13 + b * 31),
  };
}

function buildPin(src, aura) {
  const pin = document.createElement("article");
  pin.className = "pin";

  const title =
    pick(TITLE_FIRST[aura.temp], aura.seed) +
    " " +
    pick(TITLE_SECOND[aura.light], aura.seed >> 3);

  const charmA = pick(CHARM_POOL[aura.temp], aura.seed >> 2);
  const charmB = pick(CHARM_POOL[aura.light], aura.seed >> 4);

  pin.innerHTML = `
    <div class="pin-image"><img alt="${title}"></div>
    <div class="pin-copy">
      <p>${aura.light} / ${aura.temp} / ${aura.vivid}</p>
      <h3></h3>
      <div class="charms"><span></span><span></span></div>
    </div>
  `;
  pin.querySelector("img").src = src;
  pin.querySelector("h3").textContent = title;
  const [a, b] = pin.querySelectorAll(".charms span");
  a.textContent = charmA;
  b.textContent = charmB;
  return pin;
}

function handleFiles(files) {
  Array.from(files).forEach((file) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const aura = analyzeImage(img);
        pinBoard.prepend(buildPin(reader.result, aura));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

photoInput.addEventListener("change", () => handleFiles(photoInput.files));

["dragenter", "dragover"].forEach((evt) =>
  photoDrop.addEventListener(evt, (e) => {
    e.preventDefault();
    photoDrop.classList.add("is-dragging");
  })
);
["dragleave", "drop"].forEach((evt) =>
  photoDrop.addEventListener(evt, (e) => {
    e.preventDefault();
    photoDrop.classList.remove("is-dragging");
  })
);
photoDrop.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));

/* ---------- music: search any song, any artist ---------- */
const songSearch = document.getElementById("songSearch");
const songQuery = document.getElementById("songQuery");
const songResults = document.getElementById("songResults");
const songStatus = document.getElementById("songStatus");
const playButton = document.getElementById("playSound");
const volumeControl = document.getElementById("volumeControl");
const record = document.getElementById("record");
const trackTitle = document.getElementById("trackTitle");
const trackDescription = document.getElementById("trackDescription");
const musicSticker = document.getElementById("musicSticker");
const audioInput = document.getElementById("audioInput");

const audio = new Audio();
audio.volume = Number(volumeControl.value);

function setPlayingState(playing) {
  record.classList.toggle("is-paused", !playing);
  playButton.textContent = playing ? "Pause" : "Play";
  playButton.setAttribute("aria-pressed", String(playing));
}

audio.addEventListener("play", () => setPlayingState(true));
audio.addEventListener("pause", () => setPlayingState(false));
audio.addEventListener("ended", () => setPlayingState(false));

function setNowPlaying(title, description) {
  trackTitle.textContent = title;
  trackDescription.textContent = description;
  musicSticker.textContent = "\u266a " + title;
}

async function searchSongs(term) {
  songStatus.textContent = "searching...";
  songResults.innerHTML = "";
  try {
    const url =
      "https://itunes.apple.com/search?media=music&entity=song&limit=15&term=" +
      encodeURIComponent(term);
    const response = await fetch(url);
    if (!response.ok) throw new Error("search failed");
    const data = await response.json();
    const tracks = (data.results || []).filter((t) => t.previewUrl);

    if (!tracks.length) {
      songStatus.textContent = "no songs found, try another name.";
      return;
    }

    songStatus.textContent = `${tracks.length} songs found — tap one to play.`;
    tracks.forEach((track) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "song-result";

      const img = document.createElement("img");
      img.src = track.artworkUrl100 || track.artworkUrl60 || "";
      img.alt = "";

      const meta = document.createElement("span");
      meta.className = "song-result-meta";
      const name = document.createElement("strong");
      name.textContent = track.trackName;
      const artist = document.createElement("small");
      artist.textContent = track.artistName;
      meta.append(name, artist);

      button.append(img, meta);
      button.addEventListener("click", () => {
        songResults
          .querySelectorAll(".song-result.is-active")
          .forEach((el) => el.classList.remove("is-active"));
        button.classList.add("is-active");
        audio.src = track.previewUrl;
        setNowPlaying(track.trackName, `by ${track.artistName}`);
        audio.play().catch(() => {
          songStatus.textContent = "tap Play to start the sound.";
        });
      });

      li.appendChild(button);
      songResults.appendChild(li);
    });
  } catch (err) {
    songStatus.textContent = "search hiccup — check your connection and try again.";
  }
}

songSearch.addEventListener("submit", (e) => {
  e.preventDefault();
  const term = songQuery.value.trim();
  if (term) searchSongs(term);
});

playButton.addEventListener("click", () => {
  if (!audio.src) {
    songStatus.textContent = "search a song first, then tap a result.";
    songQuery.focus();
    return;
  }
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
});

volumeControl.addEventListener("input", () => {
  audio.volume = Number(volumeControl.value);
});

audioInput.addEventListener("change", () => {
  const file = audioInput.files[0];
  if (!file) return;
  audio.src = URL.createObjectURL(file);
  setNowPlaying(file.name.replace(/\.[^.]+$/, ""), "your own soundtrack");
  audio.play().catch(() => {});
});

/* ---------- share ---------- */
const shareLink = document.getElementById("shareLink");
const copyLink = document.getElementById("copyLink");
const nativeShare = document.getElementById("nativeShare");
const openBoardLink = document.getElementById("openBoardLink");
const shareStatus = document.getElementById("shareStatus");

const boardUrl = window.location.href.split("#")[0];
shareLink.value = boardUrl;
openBoardLink.href = boardUrl;

copyLink.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(boardUrl);
    shareStatus.textContent = "link copied — send it to a friend!";
  } catch (err) {
    shareLink.select();
    document.execCommand("copy");
    shareStatus.textContent = "link selected — press Ctrl+C to copy.";
  }
});

nativeShare.addEventListener("click", async () => {
  if (navigator.share) {
    try {
      await navigator.share({ title: "Aura Board", url: boardUrl });
      shareStatus.textContent = "shared!";
    } catch (err) {
      shareStatus.textContent = "share closed.";
    }
  } else {
    shareStatus.textContent = "share sheet not available here — copy the link instead.";
  }
});
