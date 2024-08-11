const ResoNetLib = require('resonet-lib');
const fs = require('fs').promises;
const path = require('path');

let client;
let config; 

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
        await client.start().finally(() => {
            hideLoginScreen();
            showToast(`Success fully logged into ${client.data.userId}`)
        }).catch((error) => {
            showLoginScreen();
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

function showToast(message, duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

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