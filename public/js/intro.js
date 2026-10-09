// Fine dell'intro: alla fine dell'animazione (o al tocco) la tendina sale e non si rivede fino alla prossima visita.
(function () {
  var root = document.documentElement;
  var splash = document.getElementById("splash");
  if (!splash) return;
  if (!root.classList.contains("intro")) {
    splash.remove();
    return;
  }
  var done = false;
  function end() {
    if (done) return;
    done = true;
    try {
      sessionStorage.setItem("rf-intro", "1");
    } catch (e) {}
    root.classList.add("intro--out");
    setTimeout(function () {
      root.classList.remove("intro", "intro--out");
      splash.remove();
    }, 650);
  }
  splash.addEventListener("click", end);
  addEventListener("keydown", end, { once: true });
  setTimeout(end, 2700);
})();
