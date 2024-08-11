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

let pages;
let tabs;

document.addEventListener('DOMContentLoaded', async () => {  
    pages = document.querySelectorAll('#navbar a');
    tabs = document.querySelectorAll('.tab');

    const switchTab = (tabId) => {
        pages.forEach(page => {
            page.classList.add('hidden');
            page.classList.remove('active');
            if (page.getAttribute('data-page') === tabId) {
                page.classList.remove('hidden');
                page.classList.add('active');
            }
        });

        tabs.forEach(tab => {
            tab.classList.add('hidden');
            tab.classList.remove('active');
            if (tab.id === tabId) {
                tab.classList.remove('hidden');
                tab.classList.add('active');
            }
        });
    };

    pages.forEach(page => {
        page.addEventListener('click', (event) => {
            event.preventDefault();
            const tabId = event.target.closest('a').getAttribute('data-page');
            switchTab(tabId);
        });
    });

    switchTab("home");

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
        showToast(LogLevels.WARNING, "Failed reading rememberMe, can't auto populate login page")
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

function showToast(logLevel = LogLevels.UNKNOWN, message = null, duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';

    const icon = document.createElement('img');
    icon.className = 'icon';

    const messageContainer = document.createElement('div');
    if (message == null) messageContainer.textContent = "Undefined";
    else messageContainer.textContent = message;

    // Awful code please fix
    // Move this to css to be used later
    if (logLevel == LogLevels.SUCCESS) {
        icon.src = "./resources/check_circle.svg";
        toast.style.backgroundColor = "#DEF2D6";
        toast.style.borderColor = "#586C50";
    } else if (logLevel == LogLevels.LOG) {
        icon.src = "./resources/info.svg";
        toast.style.backgroundColor = "#CCE8F4";
        toast.style.borderColor = "#4F81A4";
    } else if (logLevel == LogLevels.WARNING) {
        icon.src = "./resources/warning.svg";
        toast.style.backgroundColor = "#F8F3D6";
        toast.style.borderColor = "#8F723A";
    } else if (logLevel == LogLevels.ERROR) {
        icon.src = "./resources/error.svg";
        toast.style.backgroundColor = "#EBC8C4";
        toast.style.borderColor = "#B64242";
    } else if (logLevel == LogLevels.UNKNOWN) {
        icon.src = "./resources/help.svg";
        toast.style.backgroundColor = "#FAFAFA";
        toast.style.borderColor = "#FFFFFF";
    } else {
        icon.src = "./resources/help.svg";
        toast.style.backgroundColor = "#FAFAFA";
        toast.style.borderColor = "#FFFFFF";
    }

    toast.appendChild(icon);
    toast.appendChild(messageContainer);

    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, duration);
}

async function listWorlds() {
    // Fetch current sessions
    let sessions = await client.fetchSessions();
    while (sessions.firstChild) { 
        sessions.removeChild(sessions.firstChild); 
    }

    sessions.forEach(session => {
        const sessionsContainer = document.getElementById('sessions');
        const sessionItem = document.createElement('div');
        sessionItem.className = 'session';
    
        const sessionThumbnail = document.createElement('img');
        sessionThumbnail.src = session.thumbnailUrl ?? "./resources/point.png";
        sessionItem.appendChild(sessionThumbnail);
    
        const sessionInformation = document.createElement('p');
        let string = `Name: ${sanatizeString(session.name)}<br>`;
        string += `Host: ${session.hostUsername}<br>`;
        string += `Users: ${session.activeUsers}/${session.maxUsers}`;
        sessionInformation.innerHTML = string;
        sessionItem.appendChild(sessionInformation);
    
        sessionsContainer.appendChild(sessionItem);
    });
}

function sanatizeString(string) {
    return string.replace(/<.*?>/g, '');
}