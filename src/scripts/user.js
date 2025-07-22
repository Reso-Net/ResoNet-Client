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

async function createUserItem(user) {
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
    //userItem.style.filter = await client.fetchUnreadMessages(user.userId).length > 0 ? "brightness(5)" : "";
}

async function updateUserItem(status) {
    const userItem = document.getElementById(status?.userId ?? "");
    if (userItem == null) return;
    
    let onlineStatus = status?.sessionType == "Headless" ? "Headless" : status?.onlineStatus ?? "Offline";

    userItem.setAttribute("status", onlineStatus);
    
    const userStatus = userItem.querySelector(".status");
    let session = await client.fetchUserSession(status.userId);
    
    let sessionName = "";
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
    if (selectedUser != null && selectedUser.userId == userId) return; 

    await client.requestUserUpdate(userId);

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

    userProfile.querySelector("#actions").querySelectorAll("button")[0].innerHTML = selectedUser.currentContact.isAccepted ? "Remove Contact" : "Add Contact";

    document.getElementById(userId).style.filter = "";

    processBadges(selectedUser);
    processSessions(selectedUser);
    processMessages(selectedUser);
}

function processSelectedUserSessionItems(session) {
    let items = document.getElementById("userWorlds").querySelectorAll(`[sessionid="${session.sessionId}"]`);
    let isPresent = session.sessionUsers.find(user => user.userID === selectedUser.userId)?.isPresent;
    if (items.length == 0) {
        let userWorldItemFragment = userWorldItemTemplate.content.cloneNode(true);
        let userWorldItem = userWorldItemFragment.querySelector(".userWorldItem");
        
        userWorldItem.style.backgroundColor = isPresent ? "var(--online)" : "var(--away)";
        userWorldItem.setAttribute("name", client.stripTags(session.name));
        userWorldItem.setAttribute("sessionid", session.sessionId);
        userWorldItem.querySelector("img").src = session.thumbnailUrl ?? "./resources/public.svg";
        userWorldItem.querySelectorAll("p")[0].textContent = client.stripTags(session.name);
        userWorldItem.querySelectorAll("p")[1].textContent = session.hostUsername + ` (${session.joinedUsers}/${session.maxUsers})`
        userWorldItem.querySelectorAll("p")[1].style.opacity = "50%";
        
        userWorlds.appendChild(userWorldItem);
    } else {
        items.forEach(userWorldItem => {
            userWorldItem.style.backgroundColor = isPresent ? "var(--online)" : "var(--away)";
            userWorldItem.setAttribute("name", client.stripTags(session.name));
            userWorldItem.querySelector("img").src = session.thumbnailUrl ?? "./resources/public.svg";
            userWorldItem.querySelectorAll("p")[0].textContent = client.stripTags(session.name);
            userWorldItem.querySelectorAll("p")[1].textContent = session.hostUsername + ` (${session.joinedUsers}/${session.maxUsers})`
            userWorldItem.querySelectorAll("p")[1].style.opacity = "50%";
        });
    }
}

async function removeSessionItemFromSelectedUser(sessionId) {
    let userWorlds = document.getElementById("userWorlds");
    userWorlds.childNodes.forEach(node => { if (node.getAttribute("sessionid") == sessionId) node.remove(); });
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
    
    if (client.data.badges == null) return;
    
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

function processSessions(user) {
    const sessionsIds = user.currentSessions;
    const userWorlds = document.getElementById("userWorlds");
    while (userWorlds.hasChildNodes()) {
        userWorlds.removeChild(userWorlds.lastChild);
    }

    if (sessionsIds == null || sessionsIds.length == 0) return;
    
    for (let index = 0; index < sessionsIds.length; index++) {
        const session = client.fetchSession(sessionsIds[index]);
        processSelectedUserSessionItems(session);
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
    if (selectedUser.currentContact.isAccepted) await client.removeContact(selectedUser.userId);
    else await client.addContact(selectedUser.userId);
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