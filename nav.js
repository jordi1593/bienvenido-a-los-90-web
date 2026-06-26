// Menú hamburguesa del nav superior, compartido por la home y las páginas de episodio.
(function () {
  const toggle = document.getElementById("navToggle");
  const links = document.querySelector(".topnav-links");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  links.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
})();
