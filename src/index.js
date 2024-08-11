const ResoNetLib = require('resonet-lib');
const fs = require('fs').promises;
const path = require('path');

let client;
let config; 

const LogLevels = {
    SUCCESS: "success",
    LOG: "log",
    WARNING: "warning",
    ERROR: "error",
    UNKNOWN: "unknown",
}

document.addEventListener('DOMContentLoaded', async () => {  
    await tryLoadConfig().then(json => {
        config = json;
    });

    await setupLoginScreen();
});

async function tryLoadConfig() {
    const configFilePath = path.join(__dirname, 'config.json');
    console.log("Looking for config in directory", configFilePath);

    const data = await fs.readFile(configFilePath, 'utf8');
    const json = JSON.parse(data);
    return json;
}

async function setupLoginScreen() {
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const login = document.getElementById("login");

    if (config && config.rememberMe) {
        username.value = config.username;
        password.value = config.password;
    } else {
        console.error("Failed reading rememberMe value in config");
    }

    login.addEventListener('click', async () => {
        login.disabled = true;
        config.username = username.value;
        config.password = password.value;

        const loginData = {
            "username": `${username.value}`,
            "password": `${password.value}`,
            "totp": ""
        }

        client = new ResoNetLib(loginData);
        await client.start().then(() => {
            hideLoginScreen();
            showToast(LogLevels.SUCCESS, `Success fully logged into ${client.data.userId}`)
        }).catch((error) => {
            showLoginScreen();
            showToast(LogLevels.ERROR, `Failed logging in: ${error}`)
            console.error(error);
        });
    });

    showLoginScreen();
}

function showLoginScreen() {
    const container = document.getElementById("loginContainer");
    container.style.visibility = "visible";
    container.style.display = "flex";
    
    const login = document.getElementById("login");
    login.disabled = false;

    const content = document.getElementById("content");
    content.style.visibility = "hidden";
    content.style.display = "none";
}

function hideLoginScreen() {
    const container = document.getElementById("loginContainer");
    container.style.visibility = "hidden";
    container.style.display = "none";

    const content = document.getElementById("content");
    content.style.visibility = "visible";
    content.style.display = "flex";
}

function showToast(logLevel = LogLevels.UNKNOWN, message, duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';

    // Create icon container
    const icon = document.createElement('img');
    icon.className = 'icon';

    // Create message container
    const messageContainer = document.createElement('div');
    messageContainer.textContent = message;

    // Awful code please fix
    if (logLevel == LogLevels.SUCCESS) {
        icon.src = "./resources/check_circle.svg";
        toast.style.backgroundColor = "#DEF2D6";
        toast.style.borderColor = "#586C50";
        toast.style.color = "#586C50";
    } else if (logLevel == LogLevels.LOG) {
        icon.src = "./resources/info.svg";
        toast.style.backgroundColor = "#CCE8F4";
        toast.style.borderColor = "#4F81A4";
        toast.style.color = "#4F81A4";
    } else if (logLevel == LogLevels.WARNING) {
        icon.src = "./resources/warning.svg";
        toast.style.backgroundColor = "#F8F3D6";
        toast.style.borderColor = "#8F723A";
        toast.style.color = "#8F723A";
    } else if (logLevel == LogLevels.ERROR) {
        icon.src = "./resources/error.svg";
        toast.style.backgroundColor = "#EBC8C4";
        toast.style.borderColor = "#B64242";
        toast.style.color = "#B64242";
    } else if (logLevel == LogLevels.UNKNOWN) {
        icon.src = "./resources/help.svg";
        toast.style.backgroundColor = "#FAFAFA";
        toast.style.borderColor = "#FFFFFF";
        toast.style.color = "#FFFFFF";
    } else {
        icon.src = "./resources/help.svg";
        toast.style.backgroundColor = "#FAFAFA";
        toast.style.borderColor = "#FFFFFF";
        toast.style.color = "#FFFFFF";
    }

    toast.appendChild(icon);
    toast.appendChild(messageContainer);

    toastContainer.appendChild(toast);

    // Trigger the show animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove the toast after the specified duration
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, duration);
}