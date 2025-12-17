async function processMessages(user) {
    const userMessages = document.getElementById("userMessages");
    while(userMessages.hasChildNodes()) {
        userMessages.lastChild.remove();
    }

    if (user.messages == null) await client.fetchMessages(user.userId);
    if (user.messages == null) return;
    if (user.userId != selectedUser.userId) return;
    const sortedMessages = sortMessagesOldestFirst(user.messages);
    sortedMessages.forEach(msg => {
        createMessageItem(msg, true);
    });
}

function sortMessagesOldestFirst(messages) {
    return [...messages].sort((a, b) =>
        new Date(a.sendTime) - new Date(b.sendTime)
    );
}

async function sendMessage(content) {
    document.getElementById("userMessageInput").value = "";
    let message = await client.sendMessage(selectedUser.userId, content)
    await createMessageItem(message);
}

function createMessageItem(message, scroll = true) {
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
        userMessageItem.querySelectorAll("p")[0].textContent = client.stripTags(message.content);
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
        userWorldItem.querySelector("img").src = content.thumbnailUrl;
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

    if (scroll) {
        userMessages.scrollTo({ top: userMessages.scrollHeight, behavior: "smooth" });
    }
}

async function scrollMessageList() {
    const userMessages = document.getElementById("userMessages");
    userMessages.scrollTo({ top: userMessages.scrollHeight, behavior: "smooth" });
}