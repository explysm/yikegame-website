const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// This function creates the main window of the application.
const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        title: 'YikeGame Website',
        // Configure webPreferences for security and to integrate with Node.js
        webPreferences: {
            nodeIntegration: false, // Prevents renderer process from using Node.js
            contextIsolation: true, // Isolates the Electron APIs from your website code
            preload: path.join(__dirname, 'preload.js'), // Recommended for security
            sandbox: true // Run the renderer process in a sandboxed environment
        }
    });

    // Load your local website's index.html file from the "website" folder.
    mainWindow.loadFile(path.join(__dirname, 'website', 'index.html'));

    // Uncomment the line below to automatically open the Developer Tools.
    // This is useful for debugging your web content just like in a browser.
    // mainWindow.webContents.openDevTools();
};

// Set up the application menu.
const createMenu = () => {
    const isMac = process.platform === 'darwin';
    const template = [
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : []),
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forcereload' },
                { role: 'toggledevtools' },
                { type: 'separator' },
                { role: 'resetzoom' },
                { role: 'zoomin' },
                { role: 'zoomout' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
};

// When Electron is ready, create the window and the menu.
app.whenReady().then(() => {
    createWindow();
    createMenu();

    // Re-create the window when the dock icon is clicked (macOS behavior)
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit the app when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

