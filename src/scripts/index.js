var panels;
var pageButtons;
var userItemTemplate;
var userLists;

const status = [ "social", "online", "busy", "away", "offline" ];

document.addEventListener("DOMContentLoaded", async (event) => {
    panels = document.querySelectorAll('.panel');
    pageButtons = document.querySelectorAll('.pButton');
    userItemTemplate = document.getElementById('userItemTemplate');
    userLists = document.querySelectorAll('.userList');

    pageButtons.forEach(button => {
        button.addEventListener('click', () => {
            swapPanel(button.getAttribute('name'));
        });

    });

    const userSearchInput = document.getElementById("userSearchInput");
    userSearchInput.addEventListener('input', (event) => {
        console.log(userSearchInput.value);
    })

    for (let index = 0; index < 16; index++) {
        var userItemFragment = userItemTemplate.content.cloneNode(true);
        var userItem = userItemFragment.querySelector('.userItem');
        userItem.id = `U-User${index}`;
        userItem.setAttribute('status', getState());
        userItem.setAttribute('isContact', false);

        const userInfo = userItem.querySelector('#userInfo');
        userInfo.textContent = getPerson();

        const userProfilePicture = userItem.querySelector('#userProfilePicture');
        
        document.getElementById('contactsList').appendChild(userItemFragment);
    }

    sortContacts();

    swapPanel('contacts');
    await attemptLogin();
});

function swapPanel(panelName) {
    panels.forEach(panel => {
        panel.classList.add('hidden');
        panel.classList.remove('active');
        if (panel.getAttribute('name') === panelName) {
            panel.classList.remove('hidden');
            panel.classList.add('active');
        }
    });
}

function getPerson() {
  const names = [
    "Liam Johnson", "Olivia Smith", "Noah Williams", "Emma Brown",
    "Elijah Jones", "Ava Garcia", "William Davis", "Sophia Martinez",
    "James Hernandez", "Isabella Wilson", "Benjamin Anderson", "Mia Thomas",
    "Lucas Taylor", "Charlotte Moore", "Henry Jackson", "Amelia Martin"
  ];

  const locations = [
    "New York, USA", "London, UK", "Toronto, Canada", "Sydney, Australia",
    "Berlin, Germany", "Tokyo, Japan", "Paris, France", "Cape Town, South Africa",
    "Barcelona, Spain", "Dubai, UAE", "Amsterdam, Netherlands", "São Paulo, Brazil",
    "Seoul, South Korea", "Bangkok, Thailand", "Rome, Italy", "Mumbai, India"
  ];

  const randomName = names[Math.floor(Math.random() * names.length)];
  const randomLocation = locations[Math.floor(Math.random() * locations.length)];

  return `${randomName}\n${randomLocation}`;
}

function getState() {
    return status[Math.floor(Math.random() * status.length)];
}

function sortContacts() {
    console.log("Sorting contacts...");
    const contactsList = document.getElementById('contactsList');
    const users = Array.from(contactsList.querySelectorAll('.userItem'));

    users.sort((a, b) => {
        const statusA = a.getAttribute('status') || '';
        const statusB = b.getAttribute('status') || '';

        const indexA = status.indexOf(statusA);
        const indexB = status.indexOf(statusB);

        const safeIndexA = indexA === -1 ? status.length : indexA;
        const safeIndexB = indexB === -1 ? status.length : indexB;

        return safeIndexA - safeIndexB;
    });

    contactsList.innerHTML = '';
    users.forEach(user => contactsList.appendChild(user));
}

function searchUsers(query) {
    
}