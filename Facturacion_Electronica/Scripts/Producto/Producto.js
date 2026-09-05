document.addEventListener("click", function (e) {
    // Evitar refresco si un elemento del menú es clickeado
    if (e.target.closest(".dropdown-item") || e.target.matches(".dropdown-btn")) {
        e.preventDefault();
    }

    const dropdowns = document.querySelectorAll(".dropdown");

    // Detectar si el clic fue en un botón
    const isButton = e.target.matches(".dropdown-btn");
    const dropdown = e.target.closest(".dropdown");

    // Cerrar todos los menús menos el actual
    dropdowns.forEach(d => {
        if (d !== dropdown) {
            d.classList.remove("show");
            const menu = d.querySelector(".dropdown-menu");
            if (menu) {
                menu.style.top = "30px";
                menu.style.bottom = "auto";
            }
        }
    });

    // Si clic en botón, abrir/cerrar
    if (isButton && dropdown) {
        dropdown.classList.toggle("show");

        // Ajustar menú hacia arriba si no hay espacio
        const menu = dropdown.querySelector(".dropdown-menu");
        if (dropdown.classList.contains("show") && menu) {
            const rect = menu.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

            if (rect.bottom > viewportHeight) {
                menu.style.top = "auto";
                menu.style.bottom = "100%";
            } else {
                menu.style.top = "30px";
                menu.style.bottom = "auto";
            }
        }
        return;
    }

    // Si clic en opción del menú, cerrar menú
    if (e.target.closest(".dropdown-item")) {
        if (dropdown) dropdown.classList.remove("show");
        return;
    }

    // Clic fuera, cerrar todo
    dropdowns.forEach(d => d.classList.remove("show"));
});