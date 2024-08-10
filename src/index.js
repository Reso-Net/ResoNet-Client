const ResoNetLib = require('resonet-lib');

let client;
let config;

document.addEventListener('DOMContentLoaded', async () => {  
    // Change this to look for a config if one isn't found it it doesn't need to exist/it makes one
    setupLoginScreen();
});

function setupLoginScreen() {
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const login = document.getElementById("login");

    if (config != null) {
        if (config.rememberMe == true) {
            username.value = config.username;
            password.value = config.password;
        }
    }

    login.addEventListener('click', async () => {
        login.disabled = true;
        
        let loginData = {
            "username": `${username.value}`,
            "password": `${password.value}`,
            "totp": "",
            "rememberMe": false
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