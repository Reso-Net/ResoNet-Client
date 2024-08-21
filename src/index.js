const ResoNetLib = require('resonet-lib');
const fs = require('fs').promises;
const path = require('path');

let client;
let contacts = {};
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

    document.getElementById("refreshSessions").addEventListener('click', async () => {
        await listWorlds();
    });
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
            showToast(LogLevels.SUCCESS, `Successfully logged into ${client.data.userId}`);
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
    const sessionsContainer = document.getElementById('sessions');
    const hideEmtpySessions = document.getElementById("hideEmptySessions");
    
    while (sessionsContainer.firstChild) { 
        sessionsContainer.removeChild(sessionsContainer.firstChild); 
    }

    let sessions = client.data.sessions;
    sessions.sort((a, b) => b.activeUsers - a.activeUsers);

    sessions.forEach(session => {
        if (hideEmtpySessions.checked && session.activeUsers == 0) {
            return;
        }

        const sessionItem = document.createElement('div');
        sessionItem.className = 'session';
        sessionItem.id = session.sessionId;
    
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.id = "SessionThumbnailContainer";

        const thumbnail = document.createElement('img');
        thumbnail.id = "SessionThumbnail";
        thumbnail.src = session.thumbnailUrl ?? "./resources/nothumbnail.png";

        if (session.thumbnailUrl) {
            const copyThumbnail = document.createElement('img');
            copyThumbnail.id = "copy";
            copyThumbnail.className = "interactableButton";
            copyThumbnail.src = "./resources/content_copy.svg";
            copyThumbnail.style.maxWidth = copyThumbnail.style.maxHeight = copyThumbnail.style.minWidth = copyThumbnail.style.minHeight = "24px";
            copyThumbnail.addEventListener('click', () => {
                navigator.clipboard.writeText(thumbnail.src);
                showToast(LogLevels.LOG, "Copied session thumbnail to clipboard");
            });
            thumbnailContainer.appendChild(copyThumbnail);

            const previewThumbnail = document.createElement('img');
            previewThumbnail.id = "preview";
            previewThumbnail.className = "interactableButton";
            previewThumbnail.src = "./resources/3d_rotation.svg";
            previewThumbnail.style.maxWidth = previewThumbnail.style.maxHeight = previewThumbnail.style.minWidth = previewThumbnail.style.minHeight = "24px";
            previewThumbnail.addEventListener('click', () => {
                show360Viewer(thumbnail.src);
                showToast(LogLevels.LOG, "Opening thumbnail in 3D viewer");
            });
            thumbnailContainer.appendChild(previewThumbnail);
        }

        thumbnailContainer.appendChild(thumbnail);
        sessionItem.appendChild(thumbnailContainer);

        const name = document.createElement('p');
        name.id = "SessionName";
        name.innerHTML = `${sanatizeString(session.name)}, ${session.activeUsers}/${session.maxUsers}`;
        sessionItem.appendChild(name);
        
        const users = document.createElement('p');
        users.id = "SessionUsers";
        const sessionUsers = session.sessionUsers;
        var string = "";
        for (let index = 0; index < sessionUsers.length; index++) {
            const user = sessionUsers[index];
            const isContact = client.data.contacts.some(contact => user.userID === contact.id);

            if (isContact && user.isPresent == true) {
                string += `<span style='color: #2ee860'>${sanatizeString(user.username)}</span>`;
            } else if (isContact && user.isPresent == false) {
                string += `<span style='color: #2fa84f'>${sanatizeString(user.username)}</span>`;
            } else if (user.isPresent == false) {
                string += `<span style='color: #b8b8b8'>${sanatizeString(user.username)}</span>`;
            } else {
                string += `${sanatizeString(user.username)}`;
            }
            
            if (index != sessionUsers.length - 1) {
                string += ", ";
            }
        }
        users.innerHTML = `${string}`;
        sessionItem.appendChild(users);

        sessionsContainer.appendChild(sessionItem);
    });
}

function show360Viewer(thumbnail) {
    const viewer = document.getElementById("viewer");
    viewer.style.visibility = "visible";
    viewer.style.display = "flex";
    
    updateThumbnail(thumbnail);
    
    document.getElementById("body").className = "non-select"

    //viewer.querySelector("#thumbnailViewerThumbnail").src = thumbnail;
}

function close360Viewer() {
    const viewer = document.getElementById("viewer");
    viewer.style.visibility = "hidden";
    viewer.style.display = "none";

    document.getElementById("body").className = "select"
}

// Unused as of now
async function updateSessionItem(session) {
    const sessionItem = document.getElementById(session.sessionId);
    sessionItem.querySelector("#SessionThumbnail").src = session.thumbnailUrl ?? "./resources/nothumbnail.png";
    sessionItem.querySelector("#SessionName").innerHTML = `${sanatizeString(session.name)}, ${session.activeUsers}/${session.maxUsers}`;
    
    const sessionUsers = session.sessionUsers;
    var string = "";
    for (let index = 0; index < sessionUsers.length; index++) {
        const element = sessionUsers[index];
        const isContact = client.data.contacts.some(contact => element.userID === contact.id);
        
        if (isContact && element.isPresent == true) {
            string += `<span style='color: #2ee860'>${element.username}</span>`;
        } else if (isContact && element.isPresent == false) {
            string += `<span style='color: #2fa84f'>${element.username}</span>`;
        } else if (element.isPresent == false) {
            string += `<span style='color: #b8b8b8'>${element.username}</span>`;
        } else {
            string += `${element.username}`;
        }
        
        if (index != sessionUsers.length - 1) {
            string += ", ";
        }
    }
    sessionItem.querySelector("#SessionUsers").innerHTML = `${sanatizeString(string)}`;
}

function sanatizeString(string) {
    return string.replace(/<.*?>/g, '').trim();
}