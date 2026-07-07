const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("storage", {
  get: async (key) => {
    const raw = await ipcRenderer.invoke("storage-get", key);
    return raw ? { key, value: raw } : null;
  },
  set: async (key, value) => {
    const res = await ipcRenderer.invoke("storage-set", key, value);
    // 렌더러 컨텍스트에서 실행되므로 window 객체는 항상 존재한다고 가정할 수 있으나,
    // 만약을 위해 확인 후 이벤트를 발생시킵니다.
    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("sp-storage-changed", { detail: { key } }));
    }
    return { key, value };
  },
});

contextBridge.exposeInMainWorld("api", {
  exportExcel: (sheets, filename) => ipcRenderer.invoke("export-excel", sheets, filename),
  exportPdf: (html, filename) => ipcRenderer.invoke("export-pdf", html, filename),
  pickImage: () => ipcRenderer.invoke("pick-image"),
  pickDrawingFile: () => ipcRenderer.invoke("drawing-pick-file"),
  readDrawingPath: (filePath) => ipcRenderer.invoke("drawing-read-path", filePath),
  exportDrawingDxf: (shapes, heightMM, filename) => ipcRenderer.invoke("drawing-export-dxf", shapes, heightMM, filename),
  openCommunity: () => ipcRenderer.invoke("open-signplus-community"),
  getPathForFile: (file) => webUtils.getPathForFile(file),
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
