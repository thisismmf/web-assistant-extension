import { load, save, StorageKeys } from "./storage.js";

const defaultLinks = [
  {
    id: "mail",
    title: "Gmail",
    url: "https://mail.google.com",
    icon: "✉️",
  },
  {
    id: "calendar",
    title: "Google Calendar",
    url: "https://calendar.google.com",
    icon: "📅",
  },
  {
    id: "github",
    title: "GitHub",
    url: "https://github.com",
    icon: "🐙",
  },
  {
    id: "drive",
    title: "Google Drive",
    url: "https://drive.google.com",
    icon: "☁️",
  },
  {
    id: "translate",
    title: "Google Translate",
    url: "https://translate.google.com",
    icon: "🔤",
  },
  {
    id: "dastyar",
    title: "Dastyar",
    url: "https://dastyar.io",
    icon: "🧠",
  },
];

export class QuickAccessManager {
  constructor(gridEl, formEl, templateEl) {
    this.gridEl = gridEl;
    this.formEl = formEl;
    this.template = templateEl;
    this.cancelBtn = document.getElementById("quick-link-cancel");
    this.idInput = document.getElementById("quick-link-id");
    this.titleInput = document.getElementById("quick-link-title");
    this.urlInput = document.getElementById("quick-link-url");
    this.iconInput = document.getElementById("quick-link-icon");

    this.links = load(StorageKeys.QUICK_LINKS, defaultLinks);
    if (!this.links.length) {
      this.links = [...defaultLinks];
      this.persist();
    }

    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.formEl.addEventListener("submit", (event) => {
      event.preventDefault();
      this.handleSubmit();
    });
    this.cancelBtn.addEventListener("click", () => this.resetForm());
    this.gridEl.addEventListener("click", (event) => {
      const card = event.target.closest(".quick-link-card");
      if (!card) return;
      const id = card.dataset.id;

      if (event.target.matches("button.delete")) {
        this.deleteLink(id);
      } else if (event.target.matches("button.edit")) {
        this.populateForm(id);
      }
    });
  }

  handleSubmit() {
    const title = this.titleInput.value.trim();
    const url = this.urlInput.value.trim();
    let icon = this.iconInput.value.trim();

    if (!title || !url) return;
    if (!isValidUrl(url)) {
      alert("لطفاً یک آدرس معتبر وارد کنید.");
      return;
    }

    if (!icon) {
      icon = title.trim().slice(0, 2).toUpperCase();
    }

    const existingId = this.idInput.value;

    if (existingId) {
      this.links = this.links.map((link) =>
        link.id === existingId ? { ...link, title, url, icon } : link,
      );
    } else {
      this.links.unshift({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        title,
        url,
        icon,
      });
    }
    this.persist();
    this.render();
    this.resetForm();
  }

  populateForm(id) {
    const link = this.links.find((item) => item.id === id);
    if (!link) return;
    this.idInput.value = link.id;
    this.titleInput.value = link.title;
    this.urlInput.value = link.url;
    this.iconInput.value = link.icon;
    this.titleInput.focus();
  }

  resetForm() {
    this.formEl.reset();
    this.idInput.value = "";
  }

  deleteLink(id) {
    const link = this.links.find((item) => item.id === id);
    if (!link) return;
    if (!confirm(`حذف میانبر "${link.title}"؟`)) return;
    this.links = this.links.filter((item) => item.id !== id);
    this.persist();
    this.render();
  }

  persist() {
    save(StorageKeys.QUICK_LINKS, this.links);
  }

  render() {
    this.gridEl.innerHTML = "";
    if (!this.links.length) {
      const hint = document.createElement("p");
      hint.className = "empty-placeholder";
      hint.textContent =
        "هنوز میانبری ساخته نشده است. فرم زیر را تکمیل کنید.";
      this.gridEl.appendChild(hint);
      return;
    }

    const fragment = document.createDocumentFragment();
    this.links.forEach((link) => {
      const node = this.template.content.cloneNode(true);
      const card = node.querySelector(".quick-link-card");
      card.dataset.id = link.id;
      node.querySelector(".icon").textContent = link.icon;
      node.querySelector(".title").textContent = link.title;
      const anchor = node.querySelector(".url");
      anchor.href = link.url;
      anchor.textContent = "باز کردن";
      fragment.appendChild(node);
    });
    this.gridEl.appendChild(fragment);
  }
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
