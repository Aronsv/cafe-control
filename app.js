import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
 
const app = initializeApp({
  apiKey: "AIzaSyB-L09L2xGVWtsJO1XE3CCj6F5p4XN2VPo",
  authDomain: "cafe-control-c05bb.firebaseapp.com",
  projectId: "cafe-control-c05bb",
  storageBucket: "cafe-control-c05bb.firebasestorage.app",
  messagingSenderId: "874681908082",
  appId: "1:874681908082:web:e8e87dd3d5a070deb47beb"
});
 
const auth = getAuth(app);
const db = getFirestore(app);
 
let usuarioActual = null;
let datosUsuario = null;
let unsuscribeAsistencia = null;
 
const MENSAJES = {
  libre: [
    ['Aún no ingresas a turno', 'Cuando llegues, registra tu ingreso'],
    ['¿Listo para el turno?', 'Registra tu ingreso cuando llegues'],
  ],
  trabajando: [
    ['¡Volviendo a la chamba!', 'Dale que tú puedes'],
    ['En modo bestia', 'Sigue así, vas genial'],
    ['¡Arriba ese ánimo!', 'Ya llevas un buen rato trabajando'],
  ],
  break: [
    ['Recuperando energías...', 'Recuerda: máximo 15 min de break'],
    ['Cargando pilas...', 'Vuelve pronto'],
  ],
  salida1: [['¡Buen primer turno!', 'Si tienes segundo turno, regístralo cuando vuelvas']],
  salida2: [
    ['Jornada completada', 'Descansa bien, hasta mañana'],
    ['¡Lo lograste, crack!', 'Buen trabajo hoy'],
  ]
};
 
function mensajeRandom(clave) {
  const lista = MENSAJES[clave] || MENSAJES.libre;
  return lista[Math.floor(Math.random() * lista.length)];
}
 
const $ = (id) => document.getElementById(id);
 
function mostrarPantalla(id) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
  const el = document.getElementById('pantalla-' + id);
  if (el) el.classList.add('activa');
}
 
function getFechaHoy() {
  const h = new Date();
  return h.getFullYear() + '-' + String(h.getMonth()+1).padStart(2,'0') + '-' + String(h.getDate()).padStart(2,'0');
}
 
function getHoraAhora() {
  const h = new Date();
  return String(h.getHours()).padStart(2,'0') + ':' + String(h.getMinutes()).padStart(2,'0');
}
 
function actualizarReloj() {
  const el = $('reloj');
  const fe = $('fecha-hoy');
  if (!el) return;
  const ahora = new Date();
  el.textContent = String(ahora.getHours()).padStart(2,'0') + ':' + String(ahora.getMinutes()).padStart(2,'0');
  if (fe) {
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    fe.textContent = dias[ahora.getDay()] + ', ' + ahora.getDate() + ' de ' + meses[ahora.getMonth()] + ' ' + ahora.getFullYear();
  }
}
actualizarReloj();
setInterval(actualizarReloj, 10000);
 
$('btn-login').addEventListener('click', async () => {
  const email = $('login-email').value.trim();
  const password = $('login-password').value.trim();
  $('login-error').textContent = '';
 
  if (!email || !password) {
    $('login-error').textContent = 'Completa el correo y la contraseña';
    return;
  }
 
  $('btn-login').disabled = true;
  $('btn-login').textContent = 'Ingresando...';
 
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    $('btn-login').disabled = false;
    $('btn-login').textContent = 'Ingresar';
    const errores = {
      'auth/invalid-credential': 'Correo o contraseña incorrectos',
      'auth/wrong-password': 'Correo o contraseña incorrectos',
      'auth/user-not-found': 'Correo o contraseña incorrectos',
      'auth/invalid-email': 'El correo no es válido',
      'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
    };
    $('login-error').textContent = errores[err.code] || 'Error al ingresar. Intenta de nuevo.';
  }
});
 
$('login-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('btn-login').click();
});
 
onAuthStateChanged(auth, async (user) => {
  $('btn-login').disabled = false;
  $('btn-login').textContent = 'Ingresar';
 
  if (!user) {
    usuarioActual = null;
    datosUsuario = null;
    if (unsuscribeAsistencia) { unsuscribeAsistencia(); unsuscribeAsistencia = null; }
    mostrarPantalla('login');
    return;
  }
 
  usuarioActual = user;
 
  try {
    const snap = await getDoc(doc(db, 'usuarios', user.uid));
    if (!snap.exists()) {
      $('login-error').textContent = 'Tu cuenta no está configurada. Contacta al administrador.';
      await signOut(auth);
      return;
    }
    datosUsuario = { id: snap.id, ...snap.data() };
  } catch (err) {
    console.error('Error al obtener usuario:', err);
    $('login-error').textContent = 'Error de conexión. Intenta de nuevo.';
    await signOut(auth);
    return;
  }
 
  const rol = datosUsuario.rol;
  if (rol === 'admin' || rol === 'superadmin' || rol === 'dueno') {
    iniciarAdmin();
  } else {
    iniciarStaff();
  }
});
 
function iniciarStaff() {
  const iniciales = (datosUsuario.nombre || 'XX').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
  $('staff-avatar').textContent = iniciales;
  $('staff-nombre').textContent = datosUsuario.nombre || 'Sin nombre';
  $('staff-area').textContent = datosUsuario.area || '—';
  mostrarPantalla('asistencia');
  iniciarNav();
  iniciarTema();
  iniciarTareas();
  iniciarInsumos();
  iniciarFinanzas();
  iniciarHistorial();
  if (unsuscribeAsistencia) unsuscribeAsistencia();
  unsuscribeAsistencia = onSnapshot(
    doc(db, 'asistencias', usuarioActual.uid + '_' + getFechaHoy()),
    (snap) => renderAsistencia(snap.exists() ? snap.data() : null)
  );
}
 
function iniciarNav() {
  document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const dest = item.dataset.pantalla;
      mostrarPantalla(dest);
      document.querySelectorAll('.bottom-nav .nav-item').forEach(n => {
        n.classList.toggle('activo', n.dataset.pantalla === dest);
      });
    });
  });
}
 
function renderAsistencia(data) {
  const registros = data ? data.registros || [] : [];
  const breaks = registros.filter(r => r.tipo === 'Inicio break').length;
  const turnos = registros.filter(r => r.tipo.indexOf('Ingreso') === 0).length;
  const ultimo = registros[registros.length - 1];
 
  $('break-num').textContent = breaks;
 
  let estado = 'libre';
  if (ultimo) {
    if (ultimo.tipo.indexOf('Ingreso') === 0) estado = 'trabajando';
    else if (ultimo.tipo === 'Inicio break') estado = 'break';
    else if (ultimo.tipo === 'Vuelta break') estado = 'trabajando';
    else if (ultimo.tipo.indexOf('Salida') === 0 && turnos < 2) estado = 'libre';
    else if (ultimo.tipo.indexOf('Salida') === 0 && turnos >= 2) estado = 'cerrado';
  }
 
  const badges = { libre: turnos === 1 ? 'T1 listo' : 'Sin turno', trabajando: 'Turno ' + turnos, break: 'En break', cerrado: 'Jornada completa' };
  $('turno-badge').textContent = badges[estado] || 'Sin turno';
 
  const claveMsg = estado === 'cerrado' ? 'salida2' : estado;
  const msg = mensajeRandom(claveMsg);
  $('msg-estado').textContent = msg[0];
  $('msg-sub').textContent = msg[1];
 
  renderBotones(estado, breaks, turnos);
  renderHistorial(registros);
}
 
function renderBotones(estado, breaks, turnos) {
  const area = $('area-botones');
  if (estado === 'libre') {
    area.innerHTML = '<button class="btn-asistencia btn-ingreso" id="btn-ingreso">' + (turnos === 0 ? 'Nuevo ingreso' : 'Ingreso turno 2') + '</button>';
    $('btn-ingreso').onclick = () => registrar('ingreso');
  } else if (estado === 'trabajando') {
    const pb = breaks < 2;
    area.innerHTML = '<div class="btn-row-doble"><button class="btn-asistencia ' + (pb ? 'btn-break' : 'btn-disabled') + '" id="btn-break" ' + (!pb ? 'disabled' : '') + '>Iniciar break</button><button class="btn-asistencia btn-salida" id="btn-salida">Registrar salida</button></div>';
    if (pb) $('btn-break').onclick = () => registrar('break');
    $('btn-salida').onclick = () => registrar('salida');
  } else if (estado === 'break') {
    area.innerHTML = '<button class="btn-asistencia btn-vuelta" id="btn-vuelta">Volver al turno</button>';
    $('btn-vuelta').onclick = () => registrar('vuelta');
  } else if (estado === 'cerrado') {
    area.innerHTML = '<button class="btn-asistencia btn-disabled" disabled>Jornada completa</button>';
  }
}
 
async function registrar(tipo) {
  const obs = $('obs-input').value.trim();
  const histItems = document.querySelectorAll('.hist-item').length;
  const labels = {
    ingreso: histItems === 0 ? 'Ingreso T1' : 'Ingreso T2',
    break: 'Inicio break',
    vuelta: 'Vuelta break',
    salida: $('turno-badge').textContent.indexOf('2') >= 0 ? 'Salida T2' : 'Salida T1'
  };
  const tipoLabel = labels[tipo];
  const fecha = getFechaHoy();
  const docRef = doc(db, 'asistencias', usuarioActual.uid + '_' + fecha);
  try {
    const snap = await getDoc(docRef);
    const nuevoReg = { tipo: tipoLabel, hora: getHoraAhora(), observacion: obs, validado: false, timestamp: new Date().toISOString() };
    if (snap.exists()) {
      const regs = snap.data().registros || [];
      regs.push(nuevoReg);
      await updateDoc(docRef, { registros: regs, ultimaActualizacion: new Date().toISOString() });
    } else {
      await setDoc(docRef, { uid: usuarioActual.uid, fecha, registros: [nuevoReg], ultimaActualizacion: new Date().toISOString() });
    }
    $('obs-input').value = '';
  } catch (err) {
    console.error('Error registrando:', err);
    alert('Error al registrar. Intenta de nuevo.');
  }
}
 
function renderHistorial(registros) {
  const lista = $('historial-hoy');
  lista.innerHTML = registros.map(r =>
    '<div class="hist-item"><div class="hist-item-row"><span class="hist-tipo">' + r.tipo + (r.validado ? ' ✓' : '') + '</span><span class="hist-hora">' + r.hora + '</span></div>' + (r.observacion ? '<div class="hist-obs">"' + r.observacion + '"</div>' : '') + '</div>'
  ).join('');
}
 
$('btn-ver-historial').addEventListener('click', () => {
  const lista = $('historial-hoy');
  const visible = lista.style.display === 'flex';
  lista.style.display = visible ? 'none' : 'flex';
  lista.style.flexDirection = 'column';
  $('btn-ver-historial').querySelector('span').textContent = visible ? '▼' : '▲';
});

// ===== MÓDULO: TAREAS =====
let tareasConfig = [];
let tareasDia = {};
let catActualTareas = 'todas';
let nopudeAbierto = {};
let msgLibreAbierto = false;
let unsuscribeTareas = null;

const TAG_CLASES = {
  cocina: 'tag-cocina', barra: 'tag-barra', sala: 'tag-sala',
  banos: 'tag-banos', general: 'tag-general'
};
const TAG_LABELS = {
  cocina: 'cocina', barra: 'barra', sala: 'sala',
  banos: 'baños', general: 'general'
};

async function iniciarTareas() {
  document.getElementById('tareas-nombre-staff').textContent = datosUsuario.nombre || '—';

  const { getDocs, collection, query, where, setDoc, doc: firestoreDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

  const snap = await getDocs(query(collection(db, 'tareas_config'), where('activo', '==', true)));
  tareasConfig = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const fecha = getFechaHoy();
  if (unsuscribeTareas) unsuscribeTareas();
  unsuscribeTareas = onSnapshot(
    firestoreDoc(db, 'tareas_dia', usuarioActual.uid + '_' + fecha),
    (snap) => {
      tareasDia = snap.exists() ? snap.data().estados || {} : {};
      renderTareas();
    }
  );

  document.getElementById('btn-msg-libre').addEventListener('click', () => {
    msgLibreAbierto = !msgLibreAbierto;
    document.getElementById('msg-libre-body').style.display = msgLibreAbierto ? 'flex' : 'none';
    document.getElementById('msg-libre-body').style.flexDirection = 'column';
    document.getElementById('msg-libre-arrow').textContent = msgLibreAbierto ? '▲' : '▼';
  });

  document.getElementById('btn-msg-libre-send').addEventListener('click', async () => {
    const msg = document.getElementById('msg-libre-input').value.trim();
    if (!msg) return;
    const fecha = getFechaHoy();
    const { setDoc, doc: fd } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    await setDoc(fd(db, 'mensajes_turno', usuarioActual.uid + '_' + fecha), {
      uid: usuarioActual.uid,
      nombre: datosUsuario.nombre,
      fecha,
      mensaje: msg,
      timestamp: new Date().toISOString()
    });
    document.getElementById('msg-libre-input').value = '';
    msgLibreAbierto = false;
    document.getElementById('msg-libre-body').style.display = 'none';
    document.getElementById('msg-libre-arrow').textContent = '▼';
    alert('Mensaje enviado al siguiente turno y al admin.');
  });

  document.querySelectorAll('.chip-area').forEach(chip => {
    chip.addEventListener('click', () => {
      catActualTareas = chip.dataset.cat;
      document.querySelectorAll('.chip-area').forEach(c => c.classList.remove('activo'));
      chip.classList.add('activo');
      renderTareas();
    });
  });
}

function getTareasFiltradas() {
  if (catActualTareas === 'todas') return tareasConfig;
  if (catActualTareas === 'general') return tareasConfig.filter(t => t.area === 'general');
  return tareasConfig.filter(t => t.area === catActualTareas);
}

function renderTareas() {
  const lista = document.getElementById('tareas-lista');
  const tareas = getTareasFiltradas();
  const pendientes = tareas.filter(t => {
    const est = tareasDia[t.id];
    return !est || est === 'pendiente';
  });
  const total = tareas.length;
  const hechas = total - pendientes.length;
  const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;

  document.getElementById('tareas-progreso').textContent = hechas + '/' + total;
  document.getElementById('tareas-prog-fill').style.width = pct + '%';

  if (pendientes.length === 0 && total > 0) {
    lista.innerHTML = '<div class="todo-listo"><div class="todo-listo-icon">🎉</div><div class="todo-listo-txt">¡Todo listo en este turno!</div><div class="todo-listo-sub">Buen trabajo</div></div>';
    return;
  }

  const secciones = [
    { key: 'urgente', badge: 'URGENTE AHORA', cls: 'sec-urgente' },
    { key: 'traspaso', badge: 'TURNO ANTERIOR', cls: 'sec-traspaso' },
    { key: 'recurrente', badge: 'CADA 2-3H', cls: 'sec-recurrente' },
    { key: 'normal', badge: 'TAREAS DEL TURNO', cls: 'sec-turno' },
  ];

  let html = '';
  secciones.forEach(sec => {
    const items = pendientes.filter(t => {
      if (sec.key === 'normal') return t.tipo === 'normal' || t.tipo === 'turno';
      return t.tipo === sec.key;
    });
    if (!items.length) return;
    html += '<div class="sec-badge ' + sec.cls + '">' + sec.badge + '</div>';
    items.forEach(t => {
      const isNpOpen = nopudeAbierto[t.id];
      const tagCls = TAG_CLASES[t.area] || 'tag-general';
      const tagLbl = TAG_LABELS[t.area] || t.area;
      html += '<div class="tarea-card" id="tarea-' + t.id + '">';
      html += '<div class="tarea-top"><div class="tarea-chk" onclick="marcarTarea(\'' + t.id + '\')"></div>';
      html += '<div class="tarea-body"><div class="tarea-nombre">' + t.nombre + '</div>';
      html += '<div class="tarea-meta"><span class="tag-area ' + tagCls + '">' + tagLbl + '</span>';
      if (t.compartida) html += '<span style="font-size:10px;color:var(--purple)">compartida</span>';
      html += '</div>';
      if (t.tipo === 'recurrente') html += '<div class="tarea-prox-ok">↻ cada ' + t.repHoras + 'h</div>';
      html += '</div></div>';
      html += '<div class="tarea-btns">';
      html += '<div class="btn-yahay" onclick="marcarYahay(\'' + t.id + '\')">Ya hay / no aplica</div>';
      html += '<div class="btn-nopude" onclick="toggleNopude(\'' + t.id + '\')">No pude</div>';
      html += '</div>';
      if (isNpOpen) {
        html += '<div class="nopude-box">';
        html += '<textarea class="nopude-inp" id="np-' + t.id + '" rows="2" placeholder="¿Por qué no pudiste? El admin lo verá..."></textarea>';
        html += '<button class="btn-nopude-send" onclick="enviarNopude(\'' + t.id + '\')">Enviar y dejar pendiente</button>';
        html += '</div>';
      }
      html += '</div>';
    });
  });

  lista.innerHTML = html;
}

window.marcarTarea = async (id) => {
  const el = document.getElementById('tarea-' + id);
  if (el) el.classList.add('desapareciendo');
  setTimeout(async () => {
    const t = tareasConfig.find(x => x.id === id);
    if (!t) return;
    const { setDoc, doc: fd } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const fecha = getFechaHoy();
    const docRef = fd(db, 'tareas_dia', usuarioActual.uid + '_' + fecha);
    const nuevos = Object.assign({}, tareasDia);
    nuevos[id] = 'hecho';
    await setDoc(docRef, { uid: usuarioActual.uid, fecha, estados: nuevos }, { merge: true });
    if (t.tipo === 'recurrente' && t.repHoras > 0) {
      setTimeout(async () => {
        const { setDoc: sd, doc: fd2 } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const n2 = Object.assign({}, tareasDia);
        delete n2[id];
        await sd(fd2(db, 'tareas_dia', usuarioActual.uid + '_' + getFechaHoy()), { uid: usuarioActual.uid, fecha: getFechaHoy(), estados: n2 }, { merge: true });
      }, t.repHoras * 3600000);
    }
  }, 280);
};

window.marcarYahay = async (id) => {
  const el = document.getElementById('tarea-' + id);
  if (el) el.classList.add('desapareciendo');
  setTimeout(async () => {
    const { setDoc, doc: fd } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const fecha = getFechaHoy();
    const nuevos = Object.assign({}, tareasDia);
    nuevos[id] = 'yahay';
    await setDoc(fd(db, 'tareas_dia', usuarioActual.uid + '_' + fecha), { uid: usuarioActual.uid, fecha, estados: nuevos }, { merge: true });
  }, 280);
};

window.toggleNopude = (id) => {
  nopudeAbierto[id] = !nopudeAbierto[id];
  renderTareas();
};

window.enviarNopude = async (id) => {
  const el = document.getElementById('np-' + id);
  if (!el || !el.value.trim()) return;
  const motivo = el.value.trim();
  const { setDoc, doc: fd } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const fecha = getFechaHoy();
  const nuevos = Object.assign({}, tareasDia);
  nuevos[id] = 'nopudo';
  await setDoc(fd(db, 'tareas_dia', usuarioActual.uid + '_' + fecha), { uid: usuarioActual.uid, fecha, estados: nuevos, ['motivo_' + id]: motivo }, { merge: true });
  nopudeAbierto[id] = false;
  alert('Motivo enviado al admin. La tarea quedará pendiente para el siguiente turno.');
};

// ===== MÓDULO: INSUMOS =====
let insumosData = [];
let catActualIns = 'todos';
let insumosSeleccionados = {};
let gruposColapsados = {};

async function iniciarInsumos() {
  const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const snap = await getDocs(query(collection(db, 'insumos'), where('activo', '==', true)));
  insumosData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  insumosSeleccionados = {};
  renderInsumos();

  document.querySelectorAll('[data-cat-ins]').forEach(chip => {
    chip.addEventListener('click', () => {
      catActualIns = chip.dataset.catIns;
      document.querySelectorAll('[data-cat-ins]').forEach(c => c.classList.remove('activo'));
      chip.classList.add('activo');
      renderInsumos();
    });
  });

  document.getElementById('btn-toggle-resumen').addEventListener('click', () => {
    const body = document.getElementById('resumen-whatsapp');
    const arrow = document.getElementById('resumen-pie-arrow');
    const visible = body.style.display === 'flex';
    body.style.display = visible ? 'none' : 'flex';
    body.style.flexDirection = visible ? '' : 'column';
    arrow.textContent = visible ? '▼' : '▲';
  });

  document.getElementById('btn-copiar-lista').addEventListener('click', () => {
    copiarLista();
  });
}

function getInsumosFiltrados() {
  if (catActualIns === 'todos') return insumosData;
  return insumosData.filter(i => i.categoria === catActualIns);
}

function renderInsumos() {
  const lista = document.getElementById('insumos-lista');
  const items = getInsumosFiltrados();
  const prioOrden = { urgente: 0, importante: 1, normal: 2 };
  const grupos = {};

  items.forEach(i => {
    const key = i.categoria + '::' + i.subgrupo;
    if (!grupos[key]) grupos[key] = { cat: i.categoria, sub: i.subgrupo, items: [] };
    grupos[key].items.push(i);
  });

  Object.values(grupos).forEach(g => {
    g.items.sort((a, b) => (prioOrden[a.prioridad] || 2) - (prioOrden[b.prioridad] || 2));
  });

  const catLabels = { cocina: 'Cocina', barra: 'Barra', limpieza: 'Limpieza', cristaleria: 'Cristalería' };
  let html = '';

  Object.keys(grupos).forEach(key => {
    const g = grupos[key];
    const isCol = gruposColapsados[key];
    html += '<div class="insumo-grupo-header" onclick="toggleGrupoIns(\'' + key + '\')">';
    html += '<span class="insumo-grupo-nombre">' + (catLabels[g.cat] || g.cat) + ' · ' + g.sub + '</span>';
    html += '<span class="insumo-grupo-arrow">' + (isCol ? '▶' : '▼') + '</span></div>';
    if (!isCol) {
      html += '<div class="col-headers-ins"><span class="col-h-ins">Producto</span><span class="col-h-ins">Mín.</span><span class="col-h-ins">Pedir</span><span class="col-h-ins"></span></div>';
      g.items.forEach(i => {
        const sel = insumosSeleccionados[i.id];
        const qty = sel ? sel.qty : '';
        html += '<div class="insumo-row ' + (i.prioridad || 'normal') + (qty ? ' seleccionado' : '') + '">';
        html += '<div class="insumo-nombre">' + i.nombre + '</div>';
        html += '<div class="insumo-min">' + i.minimo + '</div>';
       html += '<input class="insumo-qty-inp' + (qty ? ' tiene-valor' : '') + '" type="number" inputmode="numeric" pattern="[0-9]*" value="' + qty + '" placeholder="—" data-id="' + i.id + '" oninput="setQtyIns(\'' + i.id + '\',this.value)">';
        html += '<div class="insumo-chk' + (qty ? ' on' : '') + '" onclick="toggleChkIns(\'' + i.id + '\')"></div>';
        html += '</div>';
      });
    }
  });

  lista.innerHTML = html;
}

window.toggleGrupoIns = (key) => {
  gruposColapsados[key] = !gruposColapsados[key];
  renderInsumos();
};

window.setQtyIns = (id, val) => {
  const ins = insumosData.find(i => i.id === id);
  if (!ins) return;
  if (val.trim()) {
    insumosSeleccionados[id] = { nombre: ins.nombre, qty: val.trim(), cat: ins.categoria };
  } else {
    delete insumosSeleccionados[id];
  }
  const inp = document.querySelector('[data-id="' + id + '"]');
  if (inp) {
    inp.classList.toggle('tiene-valor', !!val.trim());
    const chk = inp.nextElementSibling;
    if (chk) chk.classList.toggle('on', !!val.trim());
  }
  actualizarResumen();
};

window.toggleChkIns = (id) => {
  const ins = insumosData.find(i => i.id === id);
  if (!ins) return;
  if (insumosSeleccionados[id]) {
    delete insumosSeleccionados[id];
  } else {
    insumosSeleccionados[id] = { nombre: ins.nombre, qty: '', cat: ins.categoria };
  }
  renderInsumos();
  actualizarResumen();
};

function actualizarResumen() {
  const sel = Object.values(insumosSeleccionados).filter(i => i.qty);
  const contador = document.getElementById('insumos-contador');
  const label = document.getElementById('resumen-pie-label');
  if (contador) contador.textContent = sel.length + ' seleccionado' + (sel.length !== 1 ? 's' : '');
  if (label) label.textContent = 'Lista para WhatsApp (' + sel.length + ' item' + (sel.length !== 1 ? 's' : '') + ')';
  if (!sel.length) return;
  const catLabels = { cocina: 'Cocina', barra: 'Barra', limpieza: 'Limpieza', cristaleria: 'Cristalería' };
  const byCat = {};
  sel.forEach(i => {
    const cl = catLabels[i.cat] || i.cat;
    if (!byCat[cl]) byCat[cl] = [];
    byCat[cl].push('- ' + i.nombre + ': ' + i.qty);
  });
  let html = '';
  Object.keys(byCat).forEach(cl => {
    html += '<div class="resumen-cat">' + cl + '</div>';
    byCat[cl].forEach(line => { html += '<div class="resumen-item">' + line + '</div>'; });
  });
  document.getElementById('resumen-items').innerHTML = html;
}

async function copiarLista() {
  const sel = Object.values(insumosSeleccionados).filter(i => i.qty);
  if (!sel.length) return;
  const catLabels = { cocina: 'Cocina', barra: 'Barra', limpieza: 'Limpieza', cristaleria: 'Cristalería' };
  let txt = 'Lista de compras\n';
  const byCat = {};
  sel.forEach(i => {
    const cl = catLabels[i.cat] || i.cat;
    if (!byCat[cl]) byCat[cl] = [];
    byCat[cl].push('- ' + i.nombre + ': ' + i.qty);
  });
  Object.keys(byCat).forEach(cl => {
    txt += '\n' + cl + '\n';
    byCat[cl].forEach(line => { txt += line + '\n'; });
  });

  const fecha = getFechaHoy();
  const { setDoc, doc: fd } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  await setDoc(fd(db, 'listas_mercado', usuarioActual.uid + '_' + fecha + '_' + Date.now()), {
    uid: usuarioActual.uid,
    nombre: datosUsuario.nombre,
    fecha,
    timestamp: new Date().toISOString(),
    items: sel
  });

  try {
    await navigator.clipboard.writeText(txt);
    mostrarToast('Lista copiada y guardada ✓');
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    mostrarToast('Lista copiada y guardada ✓');
  }
}

// ===== MÓDULO: FINANZAS =====
async function iniciarFinanzas() {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const ahora = new Date();
  const elMes = document.getElementById('finanzas-mes');
  if (elMes) elMes.textContent = meses[ahora.getMonth()] + ' ' + ahora.getFullYear();

  await cargarFinanzas();

  document.getElementById('btn-reg-consumo').addEventListener('click', async () => {
    const desc = document.getElementById('inp-consumo').value.trim();
    if (!desc) return;
    await registrarFinanza('consumo', desc, 0, 30);
    document.getElementById('inp-consumo').value = '';
    mostrarToast('Consumo registrado ✓');
  });

  document.getElementById('btn-reg-dano').addEventListener('click', async () => {
    const desc = document.getElementById('inp-dano').value.trim();
    if (!desc) return;
    await registrarFinanza('daño', desc, 0, 0);
    document.getElementById('inp-dano').value = '';
    mostrarToast('Daño registrado ✓', '#E24B4A');
  });
}

async function registrarFinanza(tipo, descripcion, monto, descuento) {
  const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  await addDoc(collection(db, 'finanzas'), {
    uid: usuarioActual.uid,
    nombre: datosUsuario.nombre,
    fecha: getFechaHoy(),
    tipo,
    descripcion,
    monto,
    descuento,
    montofinal: monto * (1 - descuento / 100),
    validado: false,
    timestamp: new Date()
  });
  await cargarFinanzas();
}

async function cargarFinanzas() {
  const { getDocs, collection, query, where, orderBy } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const snap = await getDocs(query(
    collection(db, 'finanzas'),
    where('uid', '==', usuarioActual.uid)
  ));
  const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const hoy = getFechaHoy();
  const deHoy = todos.filter(f => f.fecha === hoy);
  const delMes = todos;

  renderFinanzasHoy(deHoy);
  renderFinanzasMes(delMes);

  const totalMes = delMes.reduce((a, f) => a + (f.montofinal || 0), 0);
  const totalEl = document.getElementById('finanzas-total');
  if (totalEl) totalEl.textContent = 'S/ ' + totalMes.toFixed(2);
}

function renderFinanzasHoy(lista) {
  const el = document.getElementById('finanzas-lista-hoy');
  const totalEl = document.getElementById('fin-total-hoy');
  const montoEl = document.getElementById('fin-total-hoy-monto');
  if (!lista.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px 0">Sin registros hoy</div>'; totalEl.style.display='none'; return; }
  const total = lista.reduce((a, f) => a + (f.montofinal || 0), 0);
  el.innerHTML = lista.map(f => renderCobroItem(f)).join('');
  totalEl.style.display = 'flex';
  montoEl.textContent = 'S/ ' + total.toFixed(2);
}

function renderFinanzasMes(lista) {
  const el = document.getElementById('finanzas-lista-mes');
  const totalEl = document.getElementById('fin-total-mes');
  const montoEl = document.getElementById('fin-total-mes-monto');
  if (!lista.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px 0">Sin cobros este mes</div>'; totalEl.style.display='none'; return; }
  const total = lista.reduce((a, f) => a + (f.montofinal || 0), 0);
  el.innerHTML = lista.map(f => renderCobroItem(f)).join('');
  totalEl.style.display = 'flex';
  montoEl.textContent = 'S/ ' + total.toFixed(2);
}

function renderCobroItem(f) {
  const esBadge = f.validado ? '<span class="cobro-badge badge-ok">Descontado</span>' : '<span class="cobro-badge badge-pend">Pendiente</span>';
  const subTxt = f.tipo === 'consumo' ? 'Consumo · ' + f.descuento + '% desc. aplicado' : 'Daño · valorizado por admin';
  return '<div class="cobro-item"><div class="cobro-top"><div><div class="cobro-desc">' + f.descripcion + '</div><div class="cobro-fecha">' + f.fecha + '</div></div><div class="cobro-monto">S/ ' + (f.montofinal || 0).toFixed(2) + '</div></div><div class="cobro-sub">' + subTxt + '</div>' + esBadge + '</div>';
}

window.showTabFin = (tab) => {
  document.getElementById('tab-registros').classList.toggle('activo', tab === 'registros');
  document.getElementById('tab-cobros').classList.toggle('activo', tab === 'cobros');
  document.getElementById('panel-registros').style.display = tab === 'registros' ? 'flex' : 'none';
  document.getElementById('panel-cobros').style.display = tab === 'cobros' ? 'flex' : 'none';
};

// ===== MÓDULO: HISTORIAL ASISTENCIAS (CALENDARIO) =====
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calFiltroActivo = null;
let calDatos = {};

async function iniciarHistorial() {
  await cargarCalendario();
  document.getElementById('cal-prev').addEventListener('click', () => { calMonth--; if(calMonth<0){calMonth=11;calYear--;} cargarCalendario(); });
  document.getElementById('cal-next').addEventListener('click', () => { calMonth++; if(calMonth>11){calMonth=0;calYear++;} cargarCalendario(); });
  renderCalendario();
  }

async function cargarCalendario() {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('cal-mes-label').textContent = meses[calMonth] + ' ' + calYear;

  const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const mesStr = calYear + '-' + String(calMonth+1).padStart(2,'0');
  const snapHorarios = await getDocs(query(collection(db, 'horarios'), where('uid','==',usuarioActual.uid)));
    calDatos = {};
    snapHorarios.docs.forEach(d => {
      const h = d.data();
      if (h.fecha && h.fecha.startsWith(mesStr)) {
        if (h.tipo_dia === 'libre') calDatos[h.fecha] = 'libre';
        if (h.tipo_dia === 'permiso') calDatos[h.fecha] = 'permiso';
      }
    });
    const snap = await getDocs(query(collection(db, 'asistencias'), where('uid','==',usuarioActual.uid)));
  const promesas = snap.docs.map(async d => {
    const data = d.data();
    if (data.fecha && data.fecha.startsWith(mesStr)) {
      const estado = data.estado || await calcularEstadoConHorario(usuarioActual.uid, data.fecha, data.registros || []);
      calDatos[data.fecha] = estado;
    }
  });
  await Promise.all(promesas);
  renderCalendario();
}

async function calcularEstadoConHorario(uid, fecha, registros) {
  const { getDoc, doc: fd } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

  const snap = await getDocs(query(
    collection(db, 'horarios'),
    where('uid', '==', uid),
    where('fecha', '==', fecha)
  ));

  if (!snap.empty) {
    const horario = snap.docs[0].data();
    if (horario.tipo_dia === 'libre') return 'libre';
    if (horario.tipo_dia === 'permiso') return 'permiso';
    if (horario.tipo_dia === 'trabajo') {
      const ingreso = registros.find(r => r.tipo && r.tipo.startsWith('Ingreso'));
      if (!ingreso) return 'falta';
      const horaEntrada = horario.hora_entrada || '08:00';
      const [he, me] = horaEntrada.split(':').map(Number);
      const limiteMin = he * 60 + me + 10;
      const [hi, mi] = (ingreso.hora || '00:00').split(':').map(Number);
      const ingresoMin = hi * 60 + mi;
      return ingresoMin > limiteMin ? 'tardanza' : 'atiempo';
    }
  }

  if (!registros.length) return null;
  const ingreso = registros.find(r => r.tipo && r.tipo.startsWith('Ingreso'));
  if (!ingreso) return null;
  const [hi, mi] = (ingreso.hora || '00:00').split(':').map(Number);
  const ingresoMin = hi * 60 + mi;
  return ingresoMin > 8 * 60 + 10 ? 'tardanza' : 'atiempo';
}

function calcularEstado(registros) {
  if (!registros.length) return null;
  const ingreso = registros.find(r => r.tipo && r.tipo.startsWith('Ingreso'));
  if (!ingreso) return null;
  const [hi, mi] = (ingreso.hora || '00:00').split(':').map(Number);
  return (hi * 60 + mi) > 8 * 60 + 10 ? 'tardanza' : 'atiempo';
}

function renderCalendario() {
  const grid = document.getElementById('cal-grid');
  const hoy = new Date();
  const primer = new Date(calYear, calMonth, 1).getDay();
  const offset = primer === 0 ? 6 : primer - 1;
  const dias = new Date(calYear, calMonth + 1, 0).getDate();
  let html = '';
  let cnt = { atiempo: 0, tardanza: 0, falta: 0, permiso: 0 };

  for (let i = 0; i < offset; i++) html += '<div></div>';

  for (let d = 1; d <= dias; d++) {
    const fecha = calYear + '-' + String(calMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    const estado = calDatos[fecha] || null;
    const esHoy = hoy.getFullYear()===calYear && hoy.getMonth()===calMonth && hoy.getDate()===d;
    const esPasado = new Date(calYear, calMonth, d) <= hoy;
    let cls = 'cal-dia';
    if (estado) { cls += ' ' + estado; if (cnt[estado] !== undefined) cnt[estado]++; }
    else if (esPasado) cls += ' libre';
    if (esHoy) cls += ' hoy';
    if (calFiltroActivo && estado !== calFiltroActivo && !(calFiltroActivo === 'libre' && !estado && esPasado)) cls += ' atenuado';
    html += '<div class="' + cls + '">' + d + '</div>';
  }
  grid.innerHTML = html;

  document.getElementById('resumen-cal').innerHTML =
    '<div class="resumen-cal-titulo">Resumen del mes</div>' +
    '<div class="resumen-cal-row">' +
    '<div class="resumen-cal-item"><div class="resumen-cal-num" style="color:#5DCAA5">' + cnt.atiempo + '</div><div class="resumen-cal-lbl">A tiempo</div></div>' +
    '<div class="resumen-cal-item"><div class="resumen-cal-num" style="color:#EF9F27">' + cnt.tardanza + '</div><div class="resumen-cal-lbl">Tardanzas</div></div>' +
    '<div class="resumen-cal-item"><div class="resumen-cal-num" style="color:#E24B4A">' + cnt.falta + '</div><div class="resumen-cal-lbl">Faltas</div></div>' +
    '<div class="resumen-cal-item"><div class="resumen-cal-num" style="color:#7F77DD">' + cnt.permiso + '</div><div class="resumen-cal-lbl">Permisos</div></div>' +
    '</div>';
}

window.toggleCalFiltro = (estado, el) => {
  if (calFiltroActivo === estado) {
    calFiltroActivo = null;
    document.querySelectorAll('.cal-chip').forEach(c => c.classList.add('on'));
  } else {
    calFiltroActivo = estado;
    document.querySelectorAll('.cal-chip').forEach(c => c.classList.toggle('on', c.dataset.estado === estado));
  }
  renderCalendario();
};

// ===== TOAST =====
function mostrarToast(msg, color) {
  let toast = document.getElementById('toast-global');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-global';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.background = color || '#1D9E75';
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3000);
}

// ===== TEMA CLARO/OSCURO =====
function iniciarTema() {
  const temaGuardado = localStorage.getItem('tema') || 'oscuro';
  if (temaGuardado === 'claro') document.body.classList.add('tema-claro');
  const btn = document.getElementById('btn-tema');
  if (!btn) return;
  btn.textContent = temaGuardado === 'claro' ? '🌙' : '☀️';
  btn.addEventListener('click', () => {
    const esClaro = document.body.classList.toggle('tema-claro');
    localStorage.setItem('tema', esClaro ? 'claro' : 'oscuro');
    btn.textContent = esClaro ? '🌙' : '☀️';
  });
}

// ===== PANEL ADMIN =====
let adminFechaActual = getFechaHoy();
let adminCardsAbiertas = {};
let adminEditsAbiertos = {};

function iniciarAdmin() {
  mostrarPantalla('admin');

  const nombre = datosUsuario.nombre || 'Admin';
  const rol = datosUsuario.rol || 'admin';
  document.getElementById('sidebar-nombre').textContent = nombre;
  document.getElementById('sidebar-role').textContent = rol;
  document.getElementById('admin-role-badge').textContent = rol;

  // Menú hamburguesa
  document.getElementById('btn-menu-admin').addEventListener('click', () => {
    document.getElementById('sidebar-panel').classList.toggle('abierto');
    document.getElementById('sidebar-overlay').classList.toggle('visible');
  });
  document.getElementById('sidebar-overlay').addEventListener('click', () => {
    document.getElementById('sidebar-panel').classList.remove('abierto');
    document.getElementById('sidebar-overlay').classList.remove('visible');
  });

  // Navegación sidebar
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      const sec = item.dataset.adminSec;
      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('activo'));
      item.classList.add('activo');
      document.querySelectorAll('.admin-sec').forEach(s => s.classList.remove('activa'));
      document.getElementById('admin-sec-' + sec).classList.add('activa');
      document.getElementById('admin-titulo-seccion').textContent = item.querySelector('span').textContent;
      document.getElementById('sidebar-panel').classList.remove('abierto');
      document.getElementById('sidebar-overlay').classList.remove('visible');
    });
  });

  // Navegación de fechas
  document.getElementById('btn-fecha-prev').addEventListener('click', () => {
    const d = new Date(adminFechaActual);
    d.setDate(d.getDate() - 1);
    adminFechaActual = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    cargarAsistenciasAdmin();
  });
  document.getElementById('btn-fecha-next').addEventListener('click', () => {
    const d = new Date(adminFechaActual);
    d.setDate(d.getDate() + 1);
    adminFechaActual = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    cargarAsistenciasAdmin();
  });

  cargarAsistenciasAdmin();
}

async function cargarAsistenciasAdmin() {
  const hoy = getFechaHoy();
  const esHoy = adminFechaActual === hoy;
  const d = new Date(adminFechaActual + 'T12:00:00');
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  document.getElementById('admin-fecha-label').textContent = esHoy ? 'Hoy' : dias[d.getDay()] + ' ' + d.getDate() + ' ' + meses[d.getMonth()];

  const { getDocs, collection, query, where, getDoc, doc: fd, updateDoc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

  // Cargar todos los usuarios
  const snapUsers = await getDocs(collection(db, 'usuarios'));
  const usuarios = snapUsers.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.rol === 'staff');

  // Cargar asistencias de esa fecha
  const snapAsist = await getDocs(query(collection(db, 'asistencias'), where('fecha', '==', adminFechaActual)));
  const asistMap = {};
  snapAsist.docs.forEach(d => { asistMap[d.data().uid] = { id: d.id, ...d.data() }; });

  // Stats
  let trabajando = 0, tardanza = 0, sinMarcar = 0, enBreak = 0;
  usuarios.forEach(u => {
    const a = asistMap[u.id];
    if (!a || !a.registros || !a.registros.length) { sinMarcar++; return; }
    const ultimo = a.registros[a.registros.length - 1];
    if (ultimo.tipo === 'Inicio break') enBreak++;
    else trabajando++;
    const ingreso = a.registros.find(r => r.tipo && r.tipo.startsWith('Ingreso'));
    if (ingreso) {
      const [h, m] = (ingreso.hora || '00:00').split(':').map(Number);
      if (h * 60 + m > 8 * 60 + 10) tardanza++;
    }
  });

  document.getElementById('admin-stats-hoy').innerHTML =
    '<div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--green-light)">' + trabajando + '</div><div class="admin-stat-lbl">Trabajando</div></div>' +
    '<div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--amber)">' + tardanza + '</div><div class="admin-stat-lbl">Tardanza</div></div>' +
    '<div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--red)">' + sinMarcar + '</div><div class="admin-stat-lbl">Sin marcar</div></div>' +
    '<div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--purple)">' + enBreak + '</div><div class="admin-stat-lbl">En break</div></div>';

  renderListaAsistencias(usuarios, asistMap);
}

function renderListaAsistencias(usuarios, asistMap) {
  const lista = document.getElementById('admin-asist-lista');
  let html = '';

  usuarios.forEach(u => {
    const a = asistMap[u.id];
    const registros = a ? a.registros || [] : [];
    const tienePend = registros.some(r => !r.validado);
    const tieneAlerta = !registros.length;
    const iniciales = (u.nombre || 'XX').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
    const isAbierto = adminCardsAbiertas[u.id];

    let estadoBadge = '<span style="font-size:10px;padding:3px 8px;border-radius:20px;background:var(--bg3);color:var(--text3)">Sin marcar</span>';
    if (registros.length) {
      const ultimo = registros[registros.length-1];
      if (ultimo.tipo === 'Inicio break') estadoBadge = '<span style="font-size:10px;padding:3px 8px;border-radius:20px;background:var(--purple-bg);color:var(--purple)">En break</span>';
      else if (ultimo.tipo.startsWith('Salida')) estadoBadge = '<span style="font-size:10px;padding:3px 8px;border-radius:20px;background:var(--green-bg);color:var(--green-light)">Salió</span>';
      else estadoBadge = '<span style="font-size:10px;padding:3px 8px;border-radius:20px;background:var(--green-bg);color:var(--green-light)">Trabajando</span>';
    }

    html += '<div class="admin-staff-card' + (tieneAlerta ? ' tiene-alerta' : tienePend ? ' tiene-pendiente' : '') + '">';
    html += '<div class="admin-card-top" onclick="toggleAdminCard(\'' + u.id + '\')">';
    html += '<div class="avatar av-teal">' + iniciales + '</div>';
    html += '<div class="admin-card-info"><div class="admin-card-name">' + u.nombre + '</div><div class="admin-card-sub">' + (u.area || '—') + '</div></div>';
    html += estadoBadge + '</div>';

    html += '<div class="admin-card-body' + (isAbierto ? ' abierto' : '') + '">';
    if (tieneAlerta) html += '<div class="alerta-admin">⚠ Sin registros este día</div>';
    html += '<button class="btn-admin-val" style="width:100%;margin-bottom:6px" onclick="agregarRegAdmin(\'' + u.id + '\')">+ Agregar registro</button>';
    if (!registros.length) {
      html += '<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px 0">Sin registros</div>';
    } else {
      registros.forEach((r, idx) => {
        const editAbierto = adminEditsAbiertos[u.id + '_' + idx];
        html += '<div class="reg-admin-bloque">';
        html += '<div class="reg-admin-top"><div class="reg-admin-tipo">' + r.tipo + (r.validado ? ' <span style="font-size:9px;color:var(--green-light)">✓</span>' : '') + '</div><span class="reg-admin-hora">' + r.hora + '</span></div>';
        if (r.observacion) html += '<div class="reg-admin-obs">"' + r.observacion + '"</div>';
        if (!editAbierto) {
          html += '<div class="reg-admin-actions">';
          html += r.validado
            ? '<div class="btn-admin-val ya">✓ Validado</div>'
            : '<div class="btn-admin-val" onclick="validarRegAdmin(\'' + u.id + '\',' + idx + ')">✓ Validar</div>';
          html += '<div class="btn-admin-edit" onclick="abrirEditAdmin(\'' + u.id + '\',' + idx + ')">Editar</div>';
          html += '<div class="btn-admin-del" onclick="borrarRegAdmin(\'' + u.id + '\',' + idx + ')">✕</div>';
          html += '</div>';
        } else {
          html += '<div class="edit-reg-box">';
          html += '<div class="edit-reg-lbl">Hora</div>';
          html += '<input class="edit-reg-inp" id="edit-hora-' + u.id + '-' + idx + '" type="time" value="' + r.hora + '">';
          html += '<div class="edit-reg-lbl" style="margin-top:4px">Observación</div>';
          html += '<input class="edit-reg-inp" id="edit-obs-' + u.id + '-' + idx + '" type="text" value="' + (r.observacion||'') + '" placeholder="Agregar nota...">';
          html += '<div class="edit-reg-btns">';
          html += '<button class="btn-edit-save" onclick="guardarEditAdmin(\'' + u.id + '\',' + idx + ')">Guardar</button>';
          html += '<button class="btn-edit-cancel" onclick="cancelarEditAdmin(\'' + u.id + '\',' + idx + ')">Cancelar</button>';
          html += '</div></div>';
        }
        html += '</div>';
      });
    }
    html += '</div></div>';
  });

  lista.innerHTML = html || '<div style="text-align:center;padding:24px;font-size:13px;color:var(--text3)">Sin personal registrado</div>';
}

window.agregarRegAdmin = async (uid) => {
  const tipo = prompt('Tipo de registro:\n1. Ingreso T1\n2. Inicio break\n3. Vuelta break\n4. Salida T1\n5. Ingreso T2\n6. Salida T2\n\nEscribe el número:');
  const tipos = {'1':'Ingreso T1','2':'Inicio break','3':'Vuelta break','4':'Salida T1','5':'Ingreso T2','6':'Salida T2'};
  if (!tipo || !tipos[tipo]) return;
  const hora = prompt('Hora del registro (formato HH:MM):', '08:00');
  if (!hora) return;
  const obs = prompt('Observación (opcional, Enter para omitir):', '') || '';
  const { getDoc, doc: fd, updateDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const docRef = fd(db, 'asistencias', uid + '_' + adminFechaActual);
  const snap = await getDoc(docRef);
  const nuevoReg = { tipo: tipos[tipo], hora, observacion: obs, validado: true, timestamp: new Date().toISOString() };
  if (snap.exists()) {
    const regs = snap.data().registros || [];
    regs.push(nuevoReg);
    regs.sort((a, b) => a.hora.localeCompare(b.hora));
    await updateDoc(docRef, { registros: regs, ultimaActualizacion: new Date().toISOString() });
  } else {
    await setDoc(docRef, { uid, fecha: adminFechaActual, registros: [nuevoReg], ultimaActualizacion: new Date().toISOString() });
  }
  mostrarToast('Registro agregado ✓');
  cargarAsistenciasAdmin();
};

window.toggleAdminCard = (uid) => {
  adminCardsAbiertas[uid] = !adminCardsAbiertas[uid];
  cargarAsistenciasAdmin();
};

window.validarRegAdmin = async (uid, idx) => {
  const { getDoc, doc: fd, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const docRef = fd(db, 'asistencias', uid + '_' + adminFechaActual);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  const regs = snap.data().registros || [];
  regs[idx].validado = true;
  await updateDoc(docRef, { registros: regs });
  mostrarToast('Registro validado ✓');
  cargarAsistenciasAdmin();
};

window.abrirEditAdmin = (uid, idx) => {
  adminEditsAbiertos[uid + '_' + idx] = true;
  cargarAsistenciasAdmin();
};

window.cancelarEditAdmin = (uid, idx) => {
  adminEditsAbiertos[uid + '_' + idx] = false;
  cargarAsistenciasAdmin();
};

window.guardarEditAdmin = async (uid, idx) => {
  const horaEl = document.getElementById('edit-hora-' + uid + '-' + idx);
  const obsEl = document.getElementById('edit-obs-' + uid + '-' + idx);
  if (!horaEl) return;
  const { getDoc, doc: fd, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const docRef = fd(db, 'asistencias', uid + '_' + adminFechaActual);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  const regs = snap.data().registros || [];
  regs[idx].hora = horaEl.value;
  regs[idx].observacion = obsEl ? obsEl.value.trim() : regs[idx].observacion;
  await updateDoc(docRef, { registros: regs });
  adminEditsAbiertos[uid + '_' + idx] = false;
  mostrarToast('Registro actualizado ✓');
  cargarAsistenciasAdmin();
};

window.borrarRegAdmin = async (uid, idx) => {
  if (!confirm('¿Borrar este registro?')) return;
  const { getDoc, doc: fd, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const docRef = fd(db, 'asistencias', uid + '_' + adminFechaActual);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  const regs = snap.data().registros || [];
  regs.splice(idx, 1);
  await updateDoc(docRef, { registros: regs });
  mostrarToast('Registro eliminado', '#E24B4A');
  cargarAsistenciasAdmin();
};

// ===== LOGOUT =====
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) btnLogout.addEventListener('click', () => signOut(auth));

const btnLogoutStaff = document.getElementById('btn-logout-staff');
if (btnLogoutStaff) btnLogoutStaff.addEventListener('click', () => signOut(auth));
