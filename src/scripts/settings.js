function generateSettingsMenu() {
    const settings = document.getElementById("settings");

    while(settings.hasChildNodes()) {
        settings.lastChild.remove();
    }

    const accountSettings = document.createElement("div");
    accountSettings.className = "settings";
    accountSettings.textContent = "User";
    for (const [key, value] of Object.entries(config.loadedConfig.user)) {
        let settingItem = createSettingItem(["user", key], value, config.loadedConfig);
        if (settingItem == null) continue;
        accountSettings.appendChild(settingItem);
    }
    settings.appendChild(accountSettings);

    const appVisualsettings = document.createElement("div");
    appVisualsettings.className = "settings";
    appVisualsettings.textContent = "App Visuals";
    for (const [key, value] of Object.entries(config.loadedConfig.appVisuals)) {
        let settingItem = createSettingItem(["appVisuals", key], value, config.loadedConfig);
        if (settingItem == null) continue;
        appVisualsettings.appendChild(settingItem);
    }
    settings.appendChild(appVisualsettings);

    const resoniteColorSettings = document.createElement("div");
    resoniteColorSettings.className = "settings";
    resoniteColorSettings.textContent = "Resonite Colors";
    for (const [key, value] of Object.entries(config.loadedConfig.resoniteColors)) {
        let settingItem = createSettingItem(["resoniteColors", key], value, config.loadedConfig);
        if (settingItem == null) continue;
        resoniteColorSettings.appendChild(settingItem);
    }
    settings.appendChild(resoniteColorSettings);
}

function createSettingItem(pathArray, value, config) {
    let settingItemFragment = settingItemTemplate.content.cloneNode(true);
    let settingItem = settingItemFragment.querySelector(".settingItem");

    let settingLabel = settingItem.querySelector("label");
    settingLabel.textContent = pathArray.join('.');

    let settingInput = settingItem.querySelector("input");
    settingInput.name = pathArray.join('.');

    // Boolean input
    if (typeof value === "boolean") {
        settingInput.type = "checkbox";
        settingInput.checked = value;

        settingInput.addEventListener("change", () => {
            setNestedValue(config, settingInput.name, settingInput.checked);
        });

        return settingItem;
    } 
    // Generic text input
    else if (typeof(value) == "string" && !value.startsWith("#")) {
        settingInput.type = "text";
        settingInput.value = value;

        if (pathArray[pathArray.length - 1] == "password") 
            settingInput.type = "password";

        settingInput.addEventListener("input", () => {
            setNestedValue(config, settingInput.name, settingInput.value);
            applyStylePreferences();
        });
        
        return settingItem;
    } 
    // Color input
    else if (typeof value === "string" && value.startsWith("#")) {
        settingInput.type = "color";
        settingInput.value = value;

        settingInput.addEventListener("input", () => {
            setNestedValue(config, settingInput.name, settingInput.value);
            document.documentElement.style.setProperty(`--${pathArray[pathArray.length - 1]}`, getNestedValue(config, pathArray)); 
        });

        return settingItem;
    } else {
        return null;
    }
}

function setNestedValue(obj, path, value) {
    if (typeof path === 'string') {
        path = path.split('.');
    }

    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (!(key in current)) {
            current[key] = {};
        }

        current = current[key];
    }

    current[path[path.length - 1]] = value;
}

function getNestedValue(obj, path) {
    if (typeof path === 'string') {
        path = path.split('.');
    }

    let current = obj;
    for (let i = 0; i < path.length; i++) {
        if (current == null || typeof current !== 'object') {
            return undefined;
        }
        current = current[path[i]];
    }
    return current;
}

function applyStylePreferences() {
    const root = document.documentElement;
    root.style.setProperty('--color', config.loadedConfig.appVisuals.color); 
    root.style.setProperty('--primaryColor', config.loadedConfig.appVisuals.primaryColor);
    root.style.setProperty('--secondaryColor', config.loadedConfig.appVisuals.secondaryColor);
    root.style.setProperty('--tertiaryColor', config.loadedConfig.appVisuals.tertiaryColor);
    root.style.setProperty('--padding', config.loadedConfig.appVisuals.padding);
    root.style.setProperty('--gap', config.loadedConfig.appVisuals.gap);
    root.style.setProperty('--borderRadius', config.loadedConfig.appVisuals.borderRadius);

    root.style.setProperty('--socialable', config.loadedConfig.resoniteColors.socialable);
    root.style.setProperty('--online', config.loadedConfig.resoniteColors.online);
    root.style.setProperty('--busy', config.loadedConfig.resoniteColors.busy);
    root.style.setProperty('--away', config.loadedConfig.resoniteColors.away);
    root.style.setProperty('--headless', config.loadedConfig.resoniteColors.headless);
    root.style.setProperty('--offline', config.loadedConfig.resoniteColors.offline);
}

function updateSettingsVisuals() {
    const settings = document.querySelectorAll(".settingItem");
    settings.forEach(setting => {
        const settingInput = setting.querySelector("input");
        const value = getNestedValue(config.loadedConfig, settingInput.name);
        if (settingInput.type == "checkbox") settingInput.checked = value;
        else settingInput.value = value;
    });
}

function updateConfigFromSettings() {
    const settings = document.querySelectorAll(".settingItem");
    settings.forEach(setting => {
        const settingInput = setting.querySelector("input");
        let value;
        if (settingInput.type == "checkbox") value = settingInput.checked;
        else value = settingInput.value;

        setNestedValue(config.loadedConfig, settingInput.name, value);
    });
}