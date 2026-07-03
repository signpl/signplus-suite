const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("storage", {
  get: async (key) => {
    const raw = await ipcRenderer.invoke("storage-get", key);
    return raw ? { key, value: raw } : null;
  },
  set: async (key, value) => {
    const res = await ipcRenderer.invoke("storage-set", key, value);
    try {
      if (typeof window !== "undefined" && window && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent("sp-storage-changed", { detail: { key } }));
      }
    } catch (e) {
      // ignore
    }
    return { key, value };
  },
});

contextBridge.exposeInMainWorld("api", {
  exportExcel: (sheets, filename) => ipcRenderer.invoke("export-excel", sheets, filename),
  exportPdf: (html, filename) => ipcRenderer.invoke("export-pdf", html, filename),
  pickImage: () => ipcRenderer.invoke("pick-image"),
});

contextBridge.exposeInMainWorld("license", {
  status: () => ipcRenderer.invoke("license-status"),
  activate: (serial) => ipcRenderer.invoke("license-activate", serial),
  reset: () => ipcRenderer.invoke("license-reset"),
});

contextBridge.exposeInMainWorld("backup", {
  export: () => ipcRenderer.invoke("backup-export"),
  import: () => ipcRenderer.invoke("backup-import"),
});

contextBridge.exposeInMainWorld("system", {
  getStorageDir: () => ipcRenderer.invoke("get-storage-dir"),
});
