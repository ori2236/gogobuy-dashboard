const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
  });

  win.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.log("[did-fail-load]", { code, desc, url });
  });

  win.webContents.on("console-message", (_e, level, message) => {
    console.log("[renderer]", level, message);
  });

  const isDev = process.env.ELECTRON_DEV === "1";

  if (isDev) {
    const devUrl = "http://localhost:5173";
    console.log("Loading DEV:", devUrl);
    win.loadURL(devUrl);
  } else {
    const indexHtml = path.join(__dirname, "..", "dist", "index.html");
    console.log("Loading FILE:", indexHtml);
    win.loadFile(indexHtml);
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
