
// ===============================
// HAMBURGER MENU FUNCTIONALITY
// ===============================

const menuButton = document.querySelector("#menu-button");
const navigation = document.querySelector("#navigation");

menuButton.addEventListener("click", () => {

    navigation.classList.toggle("open");

    const isOpen = navigation.classList.contains("open");

    // Change hamburger icon to X
    menuButton.textContent = isOpen ? "✕" : "☰";

    // Update accessibility attributes
    menuButton.setAttribute("aria-expanded", isOpen);

    menuButton.setAttribute(
        "aria-label",
        isOpen ? "Close navigation menu" : "Open navigation menu"
    );

});


// ===============================
// DYNAMIC COPYRIGHT YEAR
// ===============================

const currentYear = new Date().getFullYear();

document.querySelector("#currentyear").textContent = currentYear;


// ===============================
// LAST MODIFIED DATE
// ===============================

const lastModified = document.querySelector("#lastModified");

lastModified.textContent = document.lastModified;
