let selectedUser;
let typingTimer;
const typingTimeout = 500;

function sortUsers() {
    console.log("Sorting contacts...");

    const status = ["Sociable", "Online", "Busy", "Away", "Headless", "Offline"]; 
    const users = Array.from(userList.querySelectorAll(".userItem"));

    users.sort((a, b) => {
        const statusA = a.getAttribute("status") || "";
        const statusB = b.getAttribute("status") || "";

        const indexA = status.indexOf(statusA);
        const indexB = status.indexOf(statusB);

        const safeIndexA = indexA === -1 ? status.length : indexA;
        const safeIndexB = indexB === -1 ? status.length : indexB;

        if (safeIndexA !== safeIndexB) {
            return safeIndexA - safeIndexB;
        }

        const nameA = (a.getAttribute("username") || a.textContent || "").toLowerCase();
        const nameB = (b.getAttribute("username") || b.textContent || "").toLowerCase();

        return nameA.localeCompare(nameB);
    });

    userList.innerHTML = "";
    users.forEach(user => userList.appendChild(user));
}

async function searchUsers(query) {   
    query = query.trim().toLowerCase();
    if (query == "") {
        filterUsers(query);
        return;
    }

    clearTimeout(typingTimer); 
    typingTimer = setTimeout(async () => {
        const existingNonContacts = Array.from(userList.querySelectorAll(".userItem[iscontact='false']"));
        existingNonContacts.forEach(el => { el.remove(); });

        await client.searchUsers(query);
        client.data.users.forEach(user => {
            const username = user.username.trim().toLowerCase();

            if (username.includes(query)) {
                createUser(user);
            }
        });

        filterUsers(query);
    }, typingTimeout);
}

async function filterUsers(query) {
    const normalizedQuery = query.trim().toLowerCase();

    const users = Array.from(userList.querySelectorAll(".userItem"));

    users.forEach(user => {
        const isContact = user.getAttribute("iscontact") === "true";
        const username = user.getAttribute("username")?.trim().toLowerCase() || "";

        if (isContact) {
            user.classList.toggle("hidden", !username.includes(normalizedQuery));
        } else {
            user.remove();
        }
    });
}

async function createUser(user) {
    const existingUserItem = document.getElementById(user.userId)
    if (existingUserItem != null) return;

    let userItemFragment = userItemTemplate.content.cloneNode(true);
    let userItem = userItemFragment.querySelector(".userItem");
    
    userItem.id = `${user.userId}`;
    userItem.setAttribute("username", user.username);
    userItem.setAttribute("status", "Offline");
    userItem.setAttribute("isContact", user.currentContact != null);
    
    const userProfilePicture = userItem.querySelector(".profilePicture");
    let pfp = client.formatAssetUrl(user.currentUser?.profile?.iconUrl) ?? "./resources/contact.svg";
    userProfilePicture.src = pfp;
    
    const userStatus = userItem.querySelector(".status");
    userStatus.textContent = `${user.username}` 

    document.getElementById("userList").appendChild(userItemFragment);
    await client.requestUserUpdate(user.userId);
}

async function updateUserStatus(status) {
    let onlineStatus = status.sessionType == "Headless" ? "Headless" : status.onlineStatus;
    const userItem = document.getElementById(status.userId);
    if (userItem == null) return;

    userItem.setAttribute("status", onlineStatus);
    
    const userStatus = userItem.querySelector(".status");
    let session = await client.fetchUserSession(status.userId);
    let sessionName = JSON.stringify(session);
    if (session?.name != null) {
        sessionName = client.stripTags(session.name);
    } else {
        switch(session?.accessLevel) {
            case "Private":
                sessionName = "a Private World";
                break;
            case "LAN":
                sessionName = "a Lan World";
                break;
            case "Contacts":
                sessionName = "a Contacts Only World";
                break;
            case "ContactsPlus":
                sessionName = "a Contacts Plus World";
                break;
            case "RegisteredUsers":
                sessionName = "a RegisteredUsers World";
                break;
            case "Anyone":
                sessionName = "a Anyone World";
                break;
            default:
            case "Unkown":
                sessionName = "a Unknown World";
                break;
        }
    }

    userStatus.textContent = `${userItem.getAttribute("username")}\nIn ${sessionName}`; 
}

async function selectUser(userId) {
    selectedUser = await client.fetchUser(userId);

    const userProfile = document.querySelector("#userProfile");
    const profilePicture = userProfile.querySelector(".profilePicture");
    let pfp = client.formatAssetUrl(selectedUser.currentUser?.profile?.iconUrl) ?? "./resources/contact.svg";
    profilePicture.src = pfp;

    const profileInfo = userProfile.querySelector("p");
    let string = `${selectedUser.username}(${selectedUser.userId})\n${selectedUser.currentUser.registrationDate}`;
    profileInfo.textContent = string;

    if (userId == client.data.userId) userProfile.querySelector("#actions").classList.add("hidden");
    else userProfile.querySelector("#actions").classList.remove("hidden");

    document.getElementById(userId).style.filter = "";

    processBadges(selectedUser);
    processSessions(selectedUser);
    processMessages(selectedUser);
}

function processBadges(user) {
    const profileBadges = document.getElementById("badges");
    while (profileBadges.hasChildNodes()) {
        profileBadges.removeChild(profileBadges.lastChild);
    }

    switch (user.currentStatus?.sessionType) {
        case "Bot":
            createBadge("./resources/robot.svg", false);
            break;

        case "ChatClient":
            createBadge("./resources/3p.svg", false);
            break;
            
        case "GraphicalClient":
            createBadge("./resources/computer.svg", false);
            break;

        case "Headless":
            createBadge("./resources/terminal.svg", false);
            break;

        default:
        case "Unknown":
            createBadge("./resources/no_accounts.svg", false)
            break;
    }
    
    if (!profileBadges.hasChildNodes()) {
        document.getElementById("badges").classList.add("hidden");
        return;
    }
    else document.getElementById("badges").classList.remove("hidden");
    
    if (client.data.badges == null) return;
    
    // Fix after
    const badges = user.currentUser?.tags
    if (badges == null) return;
    badges.forEach(badge => {
        if (badge.startsWith("custom 3D badge")) return;
        if (badge.startsWith("custom badge")) {
            badge = badge.split(":")[1];
            createBadge(badge);
        } else {
            badge = client.data.badges[badge];
            if (badge == null) return; 
            createBadge(badge);
        } 
    });
}

function processSessions(contact) {
    const sessionsIds = contact.currentSessions;
    const userWorlds = document.getElementById("userWorlds");
    while (userWorlds.hasChildNodes()) {
        userWorlds.removeChild(userWorlds.lastChild);
    }

    if (sessionsIds == null || sessionsIds.length == 0) { 
        document.getElementById("userWorlds").classList.add("hidden");
        return;
    }
    else document.getElementById("userWorlds").classList.remove("hidden");
    for (let index = 0; index < sessionsIds.length; index++) {
        const session = client.fetchSession(sessionsIds[index]);
        let userWorldItemFragment = userWorldItemTemplate.content.cloneNode(true);
        let userWorldItem = userWorldItemFragment.querySelector(".userWorldItem");
        let isPresent = session.sessionUsers.find(user => user.userID === contact.contactUserId)?.isPresent;

        userWorldItem.style.backgroundColor = isPresent ? "var(--online)" : "var(--away)";
        userWorldItem.setAttribute("name", client.stripTags(session.name));
        userWorldItem.setAttribute("sessionId", session.sessionId);
        userWorldItem.querySelector("img").src = session.thumbnailUrl ?? "./resources/public.svg";
        userWorldItem.querySelectorAll("p")[0].textContent = client.stripTags(session.name);
        userWorldItem.querySelectorAll("p")[1].textContent = session.hostUsername + ` (${session.joinedUsers}/${session.maxUsers})`
        userWorldItem.querySelectorAll("p")[1].style.opacity = "50%";
        
        userWorlds.appendChild(userWorldItem);
    }
}

function createBadge(badgeUrl, format = true) {
    const profileBadges = document.getElementById("badges");
    const newBadge = document.createElement("img");
    newBadge.classList.add("profileBadge");
    const formattedBadgeUrl = format ? client.formatAssetUrl(badgeUrl) : badgeUrl;
    newBadge.src = formattedBadgeUrl;
    profileBadges.appendChild(newBadge);
}

async function addRemoveContact() {
    console.log("Not implemented yet");
}

async function blockContact() {
    console.log("Not implemented yet");
}

async function blockAvatar() {
    console.log("Not implemented yet");
}

async function blockMutual() {
    console.log("Not implemented yet");
}

async function processMessages(user) {
    const userMessages = document.getElementById("userMessages");
    while(userMessages.hasChildNodes()) {
        userMessages.lastChild.remove();
    }

    if (user.messages == null) await client.fetchMessages(user.userId);
    if (user.messages == null) return;
    if (user.userId != selectedUser.userId) return;

    for (let index = 0; index < user.messages.length; index++) {
        const message = user.messages[index];
        await createMessageItem(message);
    }
}

async function sendMessage(content) {
    document.getElementById("userMessageInput").value = "";
    let message = await client.sendMessage(selectedUser.userId, content)
    createMessageItem(message);
}

function createMessageItem(message) {
    const userMessages = document.getElementById("userMessages");
    let itemFramgment;

    if (message.messageType == "Text") itemFramgment = textMessageItemTemplate.content.cloneNode(true);
    else if (message.messageType == "Sound") itemFramgment = audioMessageItemTemplate.content.cloneNode(true);
    else if (message.messageType == "Object") itemFramgment = objectMessageItemTemplate.content.cloneNode(true);
    else if (message.messageType == "SessionInvite") itemFramgment = sessionInviteMessageItemTemplate.content.cloneNode(true);
    else if (message.messageType == "InviteRequest") itemFramgment = inviteRequestMessageItemTemplate.content.cloneNode(true);
    else itemFramgment = textMessageItemTemplate.content.cloneNode(true);

    let userMessageItem = itemFramgment.querySelector(".userMessageItem");

    if (message.messageType == "Text") 
        userMessageItem.querySelectorAll("p")[0].textContent = message.content;
    else if (message.messageType == "Sound") {       
        let content = JSON.parse(message.content);
        let audio = userMessageItem.querySelector("audio");
        let button = userMessageItem.querySelector("button");
            
        audio.src = client.formatAssetUrl(content.assetUri);
        button.addEventListener("click", () => {
        if (audio.paused) {
            audio.play();
            button.textContent = "Pause";
        } else {
            audio.pause();
            button.textContent = "Play";
        }
        });

        audio.addEventListener("ended", () => {
            button.textContent = "Play";
        });

        userMessageItem.querySelectorAll("p")[0].textContent = client.stripTags(content.name)
    } 
    else if (message.messageType == "Object") {
        let image = userMessageItem.querySelector("img");
        let content = JSON.parse(message.content);

        image.src = client.formatAssetUrl(content.thumbnailUri);
        userMessageItem.querySelectorAll("p")[0].textContent = client.stripTags(content.name);
    } 
    else if (message.messageType == "SessionInvite") {
        let content = JSON.parse(message.content);
        let userWorldItemFragment = userWorldItemTemplate.content.cloneNode(true);
        let userWorldItem = userWorldItemFragment.querySelector(".userWorldItem");

        userWorldItem.setAttribute("name", client.stripTags(content.name));
        userWorldItem.setAttribute("sessionId", content.sessionId);
        userWorldItem.querySelector("img").src = content.thumbnailUrl ?? "./resources/public.svg";
        userWorldItem.querySelectorAll("p")[0].textContent = client.stripTags(content.name);
        userWorldItem.querySelectorAll("p")[1].textContent = content.hostUsername + ` (${content.joinedUsers}/${content.maxUsers})`
        userWorldItem.querySelectorAll("p")[1].style.opacity = "50%";

        userMessageItem.querySelector("div").appendChild(userWorldItem)
    } else if (message.messageType == "InviteRequest") {
        let content = JSON.parse(message.content);
        userMessageItem.querySelectorAll("p")[0].textContent = `${content.usernameToInvite} wants to join ${content.forSessionName}`;
    }
    else
        userMessageItem.querySelectorAll("p")[0].textContent = "MESSAGE TYPE UNSUPPORTED: " + message.messageType;

    userMessageItem.lastElementChild.textContent = new Date(message.sendTime).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit", year: "numeric", hour12: true, timeZone: "UTC" });
    userMessageItem.setAttribute("ismine", message.senderId == client.data.userId);
    userMessages.appendChild(userMessageItem);

    userMessages.scrollTo({
        top: userMessages.scrollHeight,
        behavior: "smooth"
    });
}