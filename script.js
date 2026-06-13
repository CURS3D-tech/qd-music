const form = document.querySelector("#downloadForm");
const urlInput = document.querySelector("#urlInput");
const linkHint = document.querySelector("#linkHint");
const statusPill = document.querySelector("#statusPill");
const meterFill = document.querySelector("#meterFill");
const jobTitle = document.querySelector("#jobTitle");
const jobText = document.querySelector("#jobText");
const resultBox = document.querySelector("#resultBox");
const resultName = document.querySelector("#resultName");
const pasteButton = document.querySelector("#pasteButton");
const fakeDownloadButton = document.querySelector("#fakeDownloadButton");
const previewCard = document.querySelector("#previewCard");
const previewThumb = document.querySelector("#previewThumb");
const previewTitle = document.querySelector("#previewTitle");
const previewArtist = document.querySelector("#previewArtist");
const audioButton = document.querySelector("#audioButton");
const videoButton = document.querySelector("#videoButton");

const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[A-Za-z0-9_-]{6,}/i;
const backendEndpoint = window.QD_MUSIC_DOWNLOAD_ENDPOINT || "";
let preview = null;
let lookupTimer = 0;

function setState({ label, width, title, text, result }) {
  statusPill.textContent = label;
  meterFill.style.width = width;
  jobTitle.textContent = title;
  jobText.textContent = text;
  resultBox.hidden = !result;

  if (result) {
    resultName.textContent = result;
  }
}

function normalizeUrl(value) {
  if (!/^https?:\/\//i.test(value)) {
    return `https://${value}`;
  }

  return value;
}

function getVideoId(value) {
  try {
    const url = new URL(normalizeUrl(value));

    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.split("/").filter(Boolean)[1] || "";
    }

    return url.searchParams.get("v") || "";
  } catch {
    return "";
  }
}

function titleCaseFromId(id) {
  return id ? `YouTube video ${id}` : "QD Music export";
}

function cleanFileName(value) {
  return (value || "qd-music-export")
    .trim()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9-_ .()]/gi, "")
    .replace(/\s+/g, " ")
    .slice(0, 110)
    .trim()
    .replace(/[. ]+$/g, "") || "qd-music-export";
}

function splitArtistAndTitle(title, author) {
  const separators = [" - ", " – ", " — ", " | "];
  const separator = separators.find((item) => title.includes(item));

  if (separator) {
    const [artist, ...rest] = title.split(separator);
    const track = rest.join(separator).trim();

    if (artist.trim() && track) {
      return { artist: artist.trim(), title: track };
    }
  }

  return { artist: author || "QD Music", title };
}

function fileNameFor(mode) {
  const artist = preview?.artist || "QD Music";
  const title = preview?.title || "export";
  const extension = mode === "audio" ? "mp3" : "mp4";
  return `${cleanFileName(`${artist} - ${title}`)}.${extension}`;
}

function setPreview(data) {
  preview = data;
  previewTitle.textContent = data.title;
  previewArtist.textContent = data.artist;
  previewThumb.src = data.thumbnail;
  previewThumb.alt = `${data.title} preview thumbnail`;
  previewCard.hidden = false;
  audioButton.disabled = false;
  videoButton.disabled = false;
  linkHint.classList.remove("is-error");
  linkHint.textContent = "Preview ready. Choose audio or video to start the browser download.";
  setState({
    label: "Preview ready",
    width: "58%",
    title: data.title,
    text: `${data.artist} is ready. QD Music will name the file from this preview.`
  });
}

function clearPreview() {
  preview = null;
  previewCard.hidden = true;
  previewThumb.removeAttribute("src");
  audioButton.disabled = true;
  videoButton.disabled = true;
}

async function loadPreview(value) {
  const id = getVideoId(value);

  if (!youtubePattern.test(value) || !id) {
    clearPreview();
    linkHint.textContent = "Paste a standard YouTube watch, shorts, or youtu.be link.";
    linkHint.classList.add("is-error");
    setState({
      label: "Needs link",
      width: "18%",
      title: "Paste a link",
      text: "QD Music needs a valid YouTube URL before it can show a preview."
    });
    return;
  }

  linkHint.classList.remove("is-error");
  linkHint.textContent = "Looking up the preview...";
  setState({
    label: "Loading preview",
    width: "34%",
    title: "Reading link",
    text: "QD Music is checking public preview metadata so the file name can match the artist and title."
  });

  const fallback = {
    artist: "QD Music",
    title: titleCaseFromId(id),
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    url: normalizeUrl(value)
  };

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3500);
    const oembed = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(normalizeUrl(value))}`;
    const response = await fetch(oembed, { signal: controller.signal });
    window.clearTimeout(timeout);

    if (!response.ok) {
      throw new Error("Preview unavailable");
    }

    const meta = await response.json();
    const parts = splitArtistAndTitle(meta.title || fallback.title, meta.author_name);
    setPreview({
      artist: parts.artist,
      title: parts.title,
      thumbnail: meta.thumbnail_url || fallback.thumbnail,
      url: fallback.url
    });
  } catch {
    setPreview(fallback);
    linkHint.textContent = "Preview loaded from the video ID. A backend can improve title and artist matching.";
  }
}

function downloadBlob(fileName, mode) {
  const content = [
    "QD Music demo download",
    `Requested file: ${fileName}`,
    `Type: ${mode}`,
    `Source: ${preview?.url || urlInput.value.trim()}`,
    "",
    "Connect QD_MUSIC_DOWNLOAD_ENDPOINT to a compliant backend to return the real authorized media file."
  ].join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function startDownload(mode) {
  if (!preview) {
    loadPreview(urlInput.value.trim());
    return;
  }

  const file = fileNameFor(mode);
  setState({
    label: "Downloading",
    width: "100%",
    title: "Browser download started",
    text: backendEndpoint
      ? "QD Music sent this request to your download backend."
      : "QD Music started a local demo download. Add a backend endpoint to return the real authorized media file.",
    result: file
  });

  if (backendEndpoint) {
    const downloadUrl = new URL(backendEndpoint, window.location.href);
    downloadUrl.searchParams.set("url", preview.url);
    downloadUrl.searchParams.set("mode", mode);
    downloadUrl.searchParams.set("filename", file);
    const link = document.createElement("a");
    link.href = downloadUrl.toString();
    link.download = file;
    link.click();
    return;
  }

  downloadBlob(file, mode);
}

urlInput.addEventListener("input", () => {
  const value = urlInput.value.trim();
  window.clearTimeout(lookupTimer);

  if (!value) {
    clearPreview();
    linkHint.classList.remove("is-error");
    linkHint.textContent = "Paste a link to preview the track before choosing audio or video.";
    setState({
      label: "Ready",
      width: "12%",
      title: "Paste a link",
      text: "QD Music will show a preview, copy the artist and file name when metadata is available, then let you choose audio or video."
    });
    return;
  }

  lookupTimer = window.setTimeout(() => loadPreview(value), 450);
});

pasteButton.addEventListener("click", async () => {
  if (!navigator.clipboard) {
    linkHint.textContent = "Clipboard access is not available in this browser.";
    linkHint.classList.add("is-error");
    return;
  }

  const text = await navigator.clipboard.readText();
  urlInput.value = text;
  urlInput.dispatchEvent(new Event("input"));
  urlInput.focus();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  loadPreview(urlInput.value.trim());
});

audioButton.addEventListener("click", () => startDownload("audio"));
videoButton.addEventListener("click", () => startDownload("video"));

fakeDownloadButton.addEventListener("click", () => {
  const extension = resultName.textContent.endsWith(".mp4") ? "video" : "audio";
  downloadBlob(resultName.textContent, extension);
});
