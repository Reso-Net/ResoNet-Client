const ResoNetLib = require('resonet-lib');
const config = require('./config.json');

let client;

document.addEventListener('DOMContentLoaded', async () => {  
    setupLoginScreen();
});

function setupLoginScreen() {
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const login = document.getElementById("login");

    if (config.rememberMe == true) {
        username.value = config.username;
        password.value = config.password;
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

            const contentP = document.getElementById("content.p");
            contentP.innerText = `Welcome ${client.data.userId}`;
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