console.log("We have loaded!");

document.addEventListener("DOMContentLoaded", (event) => {
    const buttons = document.querySelectorAll('.pButton');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            console.log("Clicked!");
        });
    });
});
