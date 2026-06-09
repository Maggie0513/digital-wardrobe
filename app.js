const SUPABASE_URL = "https://aagmmhlhoieevltbsmpq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZ21taGxob2llZXZsdGJzbXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5Njg5NjQsImV4cCI6MjA5NjU0NDk2NH0.LSPHn0hQ52m1sK7mRapZV2amGDqfyCO5ard-4dJ8JAQ";
const BUCKET_NAME = "clothes-images";
const TABLE_NAME = "clothes";

const ALL_CATEGORY = "\u5168\u90e8";
const MAX_IMAGE_WIDTH = 900;
const IMAGE_QUALITY = 0.7;
const OUTPUT_TYPE = "image/webp";

let supabaseClient = null;
let activeCategory = ALL_CATEGORY;
let compressedImage = null;
let clothesCache = [];

const categoryButtons = document.querySelectorAll(".filter-chip");
const closetGrid = document.getElementById("closet-grid");
const itemCount = document.getElementById("item-count");
const photoInput = document.getElementById("photo-input");
const photoPreview = document.getElementById("photo-preview");
const imageNote = document.getElementById("image-note");
const form = document.getElementById("closet-form");
const submitButton = document.getElementById("submit-button");
const cancelButton = document.getElementById("cancel-button");
const appStatus = document.getElementById("app-status");

function setupSupabase() {
  if (!window.supabase || !window.supabase.createClient) {
    setStatus("Supabase \u5957\u4ef6\u5c1a\u672a\u8f09\u5165\uff0c\u4f46\u4f60\u4ecd\u53ef\u4ee5\u5207\u63db\u5230\u65b0\u589e\u8868\u55ae\u3002", true);
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function isConfigured() {
  return Boolean(supabaseClient)
    && !SUPABASE_URL.includes("YOUR_")
    && !SUPABASE_ANON_KEY.includes("YOUR_");
}

function setStatus(message, isError = false) {
  appStatus.textContent = message;
  appStatus.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("\u7121\u6cd5\u8b80\u53d6\u5716\u7247"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("\u5716\u7247\u683c\u5f0f\u7121\u6cd5\u4f7f\u7528"));
      image.onload = () => {
        const ratio = Math.min(MAX_IMAGE_WIDTH / image.width, 1);
        const width = Math.round(image.width * ratio);
        const height = Math.round(image.height * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("\u7121\u6cd5\u58d3\u7e2e\u5716\u7247"));
            return;
          }

          const dataUrl = canvas.toDataURL(OUTPUT_TYPE, IMAGE_QUALITY);
          resolve({
            blob,
            dataUrl,
            width,
            originalSize: file.size,
            compressedSize: blob.size
          });
        }, OUTPUT_TYPE, IMAGE_QUALITY);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handlePhotoChange(event) {
  const file = event.target.files[0];
  compressedImage = null;

  if (!file) {
    photoPreview.innerHTML = "<span>\u9078\u64c7\u7167\u7247</span>";
    imageNote.textContent = "\u5efa\u8b70\u4f7f\u7528\u6e05\u695a\u7684\u55ae\u54c1\u7167\u7247\uff0c\u6703\u58d3\u7e2e\u6210 WebP \u518d\u4e0a\u50b3\u3002";
    return;
  }

  imageNote.textContent = "\u5716\u7247\u58d3\u7e2e\u4e2d...";

  try {
    compressedImage = await compressImage(file);
    photoPreview.innerHTML = `<img src="${compressedImage.dataUrl}" alt="\u8863\u7269\u9810\u89bd">`;
    imageNote.textContent = `WebP \u5df2\u58d3\u7e2e\uff1a${formatSize(compressedImage.originalSize)} \u2192 ${formatSize(compressedImage.compressedSize)}\uff0c${compressedImage.width}px \u5bec`;
  } catch (error) {
    imageNote.textContent = error.message;
    photoInput.value = "";
  }
}

async function fetchClothes() {
  if (!isConfigured()) {
    renderItems([]);
    return;
  }

  setStatus("\u6b63\u5728\u8f09\u5165\u8863\u6ac3...");
  const { data, error } = await supabaseClient
    .from(TABLE_NAME)
    .select("id,name,category,color,note,image_url,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    setStatus(`\u8f09\u5165\u5931\u6557\uff1a${error.message}`, true);
    renderItems([]);
    return;
  }

  clothesCache = data || [];
  setStatus(clothesCache.length ? "" : "\u8863\u6ac3\u9084\u662f\u7a7a\u7684\uff0c\u5148\u65b0\u589e\u7b2c\u4e00\u4ef6\u8863\u7269\u3002");
  renderItems(clothesCache);
}

function renderItems(items = clothesCache) {
  const filtered = activeCategory === ALL_CATEGORY
    ? items
    : items.filter((item) => item.category === activeCategory);

  itemCount.textContent = items.length;
  closetGrid.innerHTML = "";

  if (!filtered.length) {
    const message = activeCategory === ALL_CATEGORY
      ? "\u8863\u6ac3\u9084\u662f\u7a7a\u7684\uff0c\u5148\u65b0\u589e\u7b2c\u4e00\u4ef6\u8863\u7269\u3002"
      : "\u9019\u500b\u5206\u985e\u76ee\u524d\u6c92\u6709\u8863\u7269\u3002";
    closetGrid.innerHTML = `<div class="empty-state">${message}</div>`;
    return;
  }

  const template = document.getElementById("card-template");
  filtered.forEach((item) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector(".card-image").innerHTML = `<img src="${item.image_url}" alt="${item.name}" loading="lazy">`;
    card.querySelector("h3").textContent = item.name;
    card.querySelector(".card-body p").textContent = `${item.category} · ${item.color}`;
    card.querySelector(".card-note").textContent = item.note || " ";
    card.querySelector(".delete-button").addEventListener("click", () => deleteClothing(item.id));
    closetGrid.append(card);
  });
}

async function uploadImage(id, blob) {
  const path = `${id}.webp`;
  const { error } = await supabaseClient.storage
    .from(BUCKET_NAME)
    .upload(path, blob, {
      contentType: OUTPUT_TYPE,
      cacheControl: "31536000",
      upsert: false
    });

  if (error) {
    throw new Error(`Storage \u4e0a\u50b3\u5931\u6557\uff1a${error.message}`);
  }

  const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

async function createClothing(formData) {
  const id = crypto.randomUUID();
  const imageUrl = await uploadImage(id, compressedImage.blob);
  const record = {
    id,
    name: formData.name.trim(),
    category: formData.category,
    color: formData.color.trim(),
    note: formData.note.trim(),
    image_url: imageUrl,
    created_at: new Date().toISOString()
  };

  const { error } = await supabaseClient.from(TABLE_NAME).insert(record);
  if (error) {
    throw new Error(`\u8cc7\u6599\u5132\u5b58\u5931\u6557\uff1a${error.message}`);
  }
}

async function deleteClothing(id) {
  if (!isConfigured()) {
    setStatus("\u8acb\u5148\u78ba\u8a8d Supabase \u5957\u4ef6\u5df2\u8f09\u5165\u3002", true);
    return;
  }

  setStatus("\u6b63\u5728\u522a\u9664...");
  const { error } = await supabaseClient.from(TABLE_NAME).delete().eq("id", id);

  if (error) {
    setStatus(`\u522a\u9664\u5931\u6557\uff1a${error.message}`, true);
    return;
  }

  await fetchClothes();
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === pageId);
  });
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === pageId);
  });
  window.scrollTo({ top: 0, behavior: "auto" });
}

function resetForm() {
  form.reset();
  compressedImage = null;
  photoPreview.innerHTML = "<span>\u9078\u64c7\u7167\u7247</span>";
  imageNote.textContent = "\u5efa\u8b70\u4f7f\u7528\u6e05\u695a\u7684\u55ae\u54c1\u7167\u7247\uff0c\u6703\u58d3\u7e2e\u6210 WebP \u518d\u4e0a\u50b3\u3002";
}

function setupEvents() {
  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      categoryButtons.forEach((chip) => chip.classList.toggle("active", chip === button));
      renderItems();
    });
  });

  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => {
      showPage(button.dataset.page);
    });
  });

  cancelButton.addEventListener("click", () => {
    resetForm();
    showPage("closet-page");
  });

  photoInput.addEventListener("change", handlePhotoChange);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isConfigured()) {
      imageNote.textContent = "\u8acb\u78ba\u8a8d Supabase \u5957\u4ef6\u5df2\u8f09\u5165\uff0c\u6216\u6aa2\u67e5\u7db2\u8def\u9023\u7dda\u3002";
      return;
    }

    if (!compressedImage) {
      imageNote.textContent = "\u8acb\u5148\u9078\u64c7\u7167\u7247\u3002";
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "\u4e0a\u50b3\u4e2d...";
    imageNote.textContent = "\u6b63\u5728\u4e0a\u50b3 Storage \u4e26\u5132\u5b58\u8cc7\u6599...";

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      await createClothing(data);
      resetForm();
      activeCategory = ALL_CATEGORY;
      categoryButtons.forEach((chip) => {
        chip.classList.toggle("active", chip.dataset.category === ALL_CATEGORY);
      });
      showPage("closet-page");
      await fetchClothes();
    } catch (error) {
      imageNote.textContent = error.message;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "\u5132\u5b58";
    }
  });
}

setupEvents();
setupSupabase();
fetchClothes();
