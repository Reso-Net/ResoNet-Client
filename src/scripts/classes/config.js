const fs = require("fs");
const os = require('os');
const path = require("path");

class Config {
    defaultConfig = {
        "user": {
            "username": "",
            "password": "",
            "rememberMe": true,
            "autoLogin": false,
            "use2fa": false
        },
        "appVisuals": {
            "color": "#efece7",
            "primaryColor": "#3498db",
            "secondaryColor": "#2b2f35",
            "tertiaryColor": "#171a1d",
            "padding": "8px",
            "gap": "8px",
            "borderRadius": "8px"
        },
        "resoniteColors": {
            "socialable": "#61d1fa",
            "online": "#59eb5c",
            "busy": "#ff7676",
            "away": "#f8f770",
            "headless": "#BA64F2",
            "offline": "#171a1d"
        }
    }

    loadedConfig;

    getUserDataPath(appName = 'resonet-client') {
        const platform = os.platform();

        if (platform === 'win32') {
            return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), appName);
        }

        if (platform === 'darwin') {
            return path.join(os.homedir(), 'Library', 'Application Support', appName);
        }

        return path.join(os.homedir(), '.config', appName);
    }

    loadConfig() {
        const configDir = this.getUserDataPath();
        const configPath = path.join(configDir, 'config.json');

        console.log(configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        let config = { ...this.defaultConfig };

        if (fs.existsSync(configPath)) {
            try {
                const raw = fs.readFileSync(configPath, 'utf-8');
                const parsed = JSON.parse(raw);
                config = { ...this.defaultConfig, ...parsed };
            } catch (err) {
                console.warn('Warning: Failed to parse config file. Using defaults.', err);
            }
        } else {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        }

        this.loadedConfig = config;
    }

    resetConfig() {
        this.loadedConfig = this.defaultConfig;
    }

    saveConfig() {
        const configDir = this.getUserDataPath();
        const configPath = path.join(configDir, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(this.loadedConfig, null, 2));
    }
}
module.exports = Config;