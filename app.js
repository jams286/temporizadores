(() => {
  const CLAVE = "temporizadores.v1";
  const TITULO = document.title;

  const $ = (id) => document.getElementById(id);
  const lista = $("lista");
  const vacio = $("vacio");
  const plantilla = $("plantilla");
  const campoNombre = $("nombre");
  const campoMin = $("minutos");
  const campoSeg = $("segundos");
  const avisoSonido = $("activar-sonido");

  // Cada temporizador: { id, nombre, duracion, fin, restante, estado, sonando }
  //   estado: "corriendo" (usa fin) | "pausado" (usa restante) | "terminado"
  let temporizadores = cargar();

  // ---------- Persistencia ----------

  function cargar() {
    try {
      const datos = JSON.parse(localStorage.getItem(CLAVE));
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  }

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(temporizadores));
    } catch {
      /* sin almacenamiento: siguen funcionando mientras la página esté abierta */
    }
  }

  // ---------- Sonido ----------

  let audio = null;

  function prepararAudio() {
    if (!audio) {
      const Contexto = window.AudioContext || window.webkitAudioContext;
      if (!Contexto) return;
      audio = new Contexto();
    }
    if (audio.state === "suspended") audio.resume();
  }

  function pitido(cuando, frecuencia) {
    const osc = audio.createOscillator();
    const vol = audio.createGain();
    osc.type = "square";
    osc.frequency.value = frecuencia;
    vol.gain.setValueAtTime(0.0001, cuando);
    vol.gain.exponentialRampToValueAtTime(0.35, cuando + 0.01);
    vol.gain.exponentialRampToValueAtTime(0.0001, cuando + 0.18);
    osc.connect(vol).connect(audio.destination);
    osc.start(cuando);
    osc.stop(cuando + 0.2);
  }

  function sonarAlarma() {
    if (!audio || audio.state !== "running") return;
    const t = audio.currentTime;
    [0, 0.25, 0.5].forEach((d) => pitido(t + d, 1760));
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }

  function actualizarAvisoSonido() {
    const hayActivos = temporizadores.some((t) => t.estado === "corriendo" || t.sonando);
    const sinSonido = !audio || audio.state !== "running";
    avisoSonido.hidden = !(hayActivos && sinSonido);
  }

  // Cualquier toque desbloquea el audio (los navegadores lo exigen)
  document.addEventListener("pointerdown", () => {
    prepararAudio();
    setTimeout(actualizarAvisoSonido, 50);
  });
  avisoSonido.addEventListener("click", () => {
    prepararAudio();
    setTimeout(actualizarAvisoSonido, 50);
  });

  // ---------- Pantalla encendida ----------
  // Wake Lock solo existe en HTTPS; por http simplemente no hace nada.

  let bloqueo = null;

  async function mantenerPantalla() {
    const activos = temporizadores.some((t) => t.estado === "corriendo" || t.sonando);
    if (!("wakeLock" in navigator)) return;
    if (activos && !bloqueo && document.visibilityState === "visible") {
      try {
        bloqueo = await navigator.wakeLock.request("screen");
        bloqueo.addEventListener("release", () => {
          bloqueo = null;
        });
      } catch {
        bloqueo = null; // p. ej. batería baja: se reintenta en el próximo cambio
      }
    } else if (!activos && bloqueo) {
      bloqueo.release();
      bloqueo = null;
    }
  }

  // El navegador suelta el bloqueo al ocultar la pestaña; se pide de nuevo al volver
  document.addEventListener("visibilitychange", mantenerPantalla);

  // ---------- Lógica ----------

  function restanteDe(t, ahora = Date.now()) {
    if (t.estado === "corriendo") return Math.max(0, t.fin - ahora);
    if (t.estado === "pausado") return t.restante;
    return 0;
  }

  function crear(nombre, segundos) {
    if (!(segundos > 0)) return;
    const duracion = segundos * 1000;
    temporizadores.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nombre: nombre || `Temporizador ${formatoCorto(segundos)}`,
      duracion,
      fin: Date.now() + duracion,
      restante: duracion,
      estado: "corriendo",
      sonando: false,
    });
    campoNombre.value = "";
    guardar();
    dibujar();
  }

  function accion(id, que) {
    const t = temporizadores.find((x) => x.id === id);
    if (!t) return;
    const ahora = Date.now();

    if (que === "quitar") {
      temporizadores = temporizadores.filter((x) => x.id !== id);
    } else if (que === "pausa") {
      if (t.estado === "corriendo") {
        t.restante = restanteDe(t, ahora);
        t.estado = "pausado";
      } else if (t.estado === "pausado") {
        t.fin = ahora + t.restante;
        t.estado = "corriendo";
      }
    } else if (que === "mas") {
      if (t.estado === "corriendo") t.fin += 60000;
      else if (t.estado === "pausado") t.restante += 60000;
      else {
        t.fin = ahora + 60000;
        t.estado = "corriendo";
        t.sonando = false;
      }
      t.duracion += 60000;
    } else if (que === "detener") {
      t.sonando = false;
    } else if (que === "repetir") {
      t.fin = ahora + t.duracion;
      t.estado = "corriendo";
      t.sonando = false;
    }
    guardar();
    dibujar();
  }

  // ---------- Formato ----------

  function formatoReloj(ms) {
    const total = Math.ceil(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const dos = (n) => String(n).padStart(2, "0");
    return h ? `${h}:${dos(m)}:${dos(s)}` : `${dos(m)}:${dos(s)}`;
  }

  function formatoCorto(segundos) {
    if (segundos % 3600 === 0) return `${segundos / 3600} h`;
    if (segundos % 60 === 0) return `${segundos / 60} min`;
    if (segundos < 60) return `${segundos} s`;
    return `${Math.floor(segundos / 60)} min ${segundos % 60} s`;
  }

  // ---------- Dibujo ----------

  function dibujar() {
    const existentes = new Map([...lista.children].map((li) => [li.dataset.id, li]));

    temporizadores.forEach((t, i) => {
      let li = existentes.get(t.id);
      if (!li) {
        li = plantilla.content.firstElementChild.cloneNode(true);
        li.dataset.id = t.id;
      }
      existentes.delete(t.id);
      if (lista.children[i] !== li) lista.insertBefore(li, lista.children[i] || null);

      li.querySelector(".t-nombre").textContent = t.nombre;
      li.classList.toggle("pausado", t.estado === "pausado");
      li.classList.toggle("terminado", t.estado === "terminado");
      li.classList.toggle("sonando", !!t.sonando);

      const pausa = li.querySelector('[data-accion="pausa"]');
      pausa.textContent = t.estado === "pausado" ? "Seguir" : "Pausa";
      pausa.hidden = t.estado === "terminado";
      li.querySelector('[data-accion="mas"]').hidden = !!t.sonando;
      li.querySelector('[data-accion="detener"]').hidden = !t.sonando;
      li.querySelector('[data-accion="repetir"]').hidden = t.estado !== "terminado" || !!t.sonando;
    });

    existentes.forEach((li) => li.remove());
    vacio.hidden = temporizadores.length > 0;
    actualizarTiempos();
    actualizarAvisoSonido();
    mantenerPantalla();
  }

  function actualizarTiempos() {
    const ahora = Date.now();
    for (const li of lista.children) {
      const t = temporizadores.find((x) => x.id === li.dataset.id);
      if (!t) continue;
      const restante = restanteDe(t, ahora);
      li.querySelector(".t-tiempo").textContent = t.estado === "terminado" ? "¡Listo!" : formatoReloj(restante);
      const avance = t.duracion ? 1 - restante / t.duracion : 1;
      li.querySelector(".t-progreso").style.width = `${Math.min(100, avance * 100)}%`;
    }
  }

  // ---------- Ciclo ----------

  let ultimoPitido = 0;

  function tic() {
    const ahora = Date.now();
    let cambio = false;

    for (const t of temporizadores) {
      if (t.estado === "corriendo" && t.fin <= ahora) {
        t.estado = "terminado";
        t.sonando = true;
        cambio = true;
      }
    }
    if (cambio) {
      guardar();
      dibujar();
    } else {
      actualizarTiempos();
    }

    const sonando = temporizadores.filter((t) => t.sonando);
    if (sonando.length) {
      document.title = `⏰ ¡${sonando[0].nombre} listo!`;
      if (ahora - ultimoPitido >= 1000) {
        ultimoPitido = ahora;
        sonarAlarma();
      }
    } else {
      const proximo = temporizadores
        .filter((t) => t.estado === "corriendo")
        .sort((a, b) => a.fin - b.fin)[0];
      document.title = proximo ? `${formatoReloj(restanteDe(proximo, ahora))} · ${proximo.nombre}` : TITULO;
    }
  }

  // ---------- Eventos ----------

  document.querySelector(".rapidos").addEventListener("click", (e) => {
    const boton = e.target.closest("button[data-min]");
    if (!boton) return;
    crear(campoNombre.value.trim(), Number(boton.dataset.min) * 60);
  });

  $("personalizado").addEventListener("submit", (e) => {
    e.preventDefault();
    const min = Math.max(0, Math.floor(Number(campoMin.value) || 0));
    const seg = Math.max(0, Math.floor(Number(campoSeg.value) || 0));
    const total = min * 60 + seg;
    if (!total) {
      campoMin.focus();
      return;
    }
    crear(campoNombre.value.trim(), total);
    campoMin.value = "";
    campoSeg.value = "";
  });

  lista.addEventListener("click", (e) => {
    const boton = e.target.closest("button[data-accion]");
    if (!boton) return;
    accion(boton.closest(".temporizador").dataset.id, boton.dataset.accion);
  });

  // Los que terminaron mientras la página estaba cerrada siguen sonando al volver
  dibujar();
  tic();
  setInterval(tic, 250);
})();
