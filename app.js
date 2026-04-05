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

  // Resetear sidebar al módulo inicial
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('activo'));
  document.querySelectorAll('.admin-sec').forEach(s => s.classList.remove('activa'));
  document.querySelector('.sidebar-item[data-admin-sec="asistencias"]').classList.add('activo');
  document.getElementById('admin-sec-asistencias').classList.add('activa');
  document.getElementById('admin-titulo-seccion').textContent = 'Asistencias';

  // Menú hamburguesa
  const btnMenu = document.getElementById('btn-menu-admin');
  const btnMenuNuevo = btnMenu.cloneNode(true);
  btnMenu.parentNode.replaceChild(btnMenuNuevo, btnMenu);
  btnMenuNuevo.addEventListener('click', () => {
    document.getElementById('sidebar-panel').classList.toggle('abierto');
    document.getElementById('sidebar-overlay').classList.toggle('visible');
  });
  document.getElementById('sidebar-overlay').addEventListener('click', () => {
    document.getElementById('sidebar-panel').classList.remove('abierto');
    document.getElementById('sidebar-overlay').classList.remove('visible');
  });

  // Navegación sidebar
  document.querySelectorAll('.sidebar-item').forEach(item => {
    const nuevoItem = item.cloneNode(true);
    item.parentNode.replaceChild(nuevoItem, item);
    nuevoItem.addEventListener('click', () => {
      const sec = nuevoItem.dataset.adminSec;
      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('activo'));
      nuevoItem.classList.add('activo');
      document.querySelectorAll('.admin-sec').forEach(s => s.classList.remove('activa'));
      document.getElementById('admin-sec-' + sec).classList.add('activa');
      document.getElementById('admin-titulo-seccion').textContent = nuevoItem.querySelector('span').textContent;
      document.getElementById('sidebar-panel').classList.remove('abierto');
      document.getElementById('sidebar-overlay').classList.remove('visible');
      if (sec === 'horarios') iniciarHorarios();
      if (sec === 'tareas-admin') iniciarTareasAdmin();
      if (sec === 'finanzas-admin') iniciarFinanzasAdmin();
      if (sec === 'insumos-admin') iniciarInsumosAdmin();
      if (sec === 'personal') cargarPersonal();
    });
  });

  // Navegación de fechas asistencias
  const btnPrev = document.getElementById('btn-fecha-prev');
  const btnNext = document.getElementById('btn-fecha-next');
  const btnPrevNuevo = btnPrev.cloneNode(true);
  const btnNextNuevo = btnNext.cloneNode(true);
  btnPrev.parentNode.replaceChild(btnPrevNuevo, btnPrev);
  btnNext.parentNode.replaceChild(btnNextNuevo, btnNext);
  btnPrevNuevo.addEventListener('click', () => {
    const d = new Date(adminFechaActual + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    adminFechaActual = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    cargarAsistenciasAdmin();
  });
  btnNextNuevo.addEventListener('click', () => {
    const d = new Date(adminFechaActual + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    adminFechaActual = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    cargarAsistenciasAdmin();
  });

  adminFechaActual = getFechaHoy();
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

// ===== MÓDULO: PERSONAL ADMIN =====
async function iniciarPersonal() {
  await cargarPersonal();
}

window.cargarPersonal = async function() {
  const { getDocs, collection } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const snap = await getDocs(collection(db, 'usuarios'));
  const usuarios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  usuarios.sort((a,b) => (a.nombre||'').localeCompare(b.nombre||''));

  const rolColores = {
    superadmin: 'color:var(--purple);background:var(--purple-bg)',
    admin: 'color:#5DAAE8;background:#001828',
    dueno: 'color:var(--amber);background:var(--amber-bg)',
    staff: 'color:var(--green-light);background:var(--green-bg)'
  };

  let html = '';
  usuarios.forEach(u => {
    const iniciales = (u.nombre||'XX').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    const activo = u.activo !== false;
    const rolCls = rolColores[u.rol] || rolColores.staff;
    html += '<div class="admin-staff-card" style="' + (!activo?'opacity:.5':'') + '">';
    html += '<div class="admin-card-top" style="cursor:default">';
    html += '<div class="avatar av-teal" style="' + (!activo?'filter:grayscale(1)':'') + '">' + iniciales + '</div>';
    html += '<div class="admin-card-info">';
    html += '<div class="admin-card-name">' + (u.nombre||'Sin nombre') + (activo?'':' <span style="font-size:10px;color:var(--text3)">(inactivo)</span>') + '</div>';
    html += '<div class="admin-card-sub">' + (u.area||'—') + ' · ' + (u.email||'—') + '</div>';
    html += '<div style="margin-top:4px"><span style="font-size:10px;padding:2px 8px;border-radius:20px;' + rolCls + '">' + (u.rol||'staff') + '</span></div>';
    html += '</div>';
    html += '<button class="btn-asignar-horario" onclick="abrirModalPersonal(\'' + u.id + '\')">Editar</button>';
    html += '</div></div>';
  });

  const lista = document.getElementById('personal-lista');
  if (lista) lista.innerHTML = html || '<div style="text-align:center;padding:24px;font-size:13px;color:var(--text3)">Sin personal registrado</div>';
};
window.cargarPersonal = cargarPersonal;

window.abrirModalPersonal = async (uid) => {
  const { getDoc, doc: fd } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const snap = await getDoc(fd(db, 'usuarios', uid));
  if (!snap.exists()) return;
  const u = snap.data();
  document.getElementById('mp-uid').value = uid;
  document.getElementById('mp-nombre').value = u.nombre || '';
  document.getElementById('mp-area').value = u.area || 'barra';
  document.getElementById('mp-rol').value = u.rol || 'staff';
  document.getElementById('mp-activo').value = u.activo !== false ? 'true' : 'false';
  document.getElementById('modal-personal').style.display = 'flex';
};

window.cerrarModalPersonal = () => {
  document.getElementById('modal-personal').style.display = 'none';
};

window.guardarPersonal = async () => {
  const uid = document.getElementById('mp-uid').value;
  const nombre = document.getElementById('mp-nombre').value.trim();
  const area = document.getElementById('mp-area').value;
  const rol = document.getElementById('mp-rol').value;
  const activo = document.getElementById('mp-activo').value === 'true';
  if (!nombre) { mostrarToast('Escribe el nombre', '#E24B4A'); return; }
  const { doc: fd, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  await updateDoc(fd(db, 'usuarios', uid), { nombre, area, rol, activo });
  cerrarModalPersonal();
  mostrarToast('Datos actualizados ✓');
  cargarPersonal();
};

// ===== MÓDULO: INSUMOS ADMIN =====
let insAdminEdits = {};
let insAdminGrupos = {};
let historialCards = {};

async function iniciarInsumosAdmin() {
  await cargarListaMaestra();
}

async function cargarListaMaestra() {
  const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const snap = await getDocs(query(collection(db, 'insumos'), where('activo','==',true)));
  const insumos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const prioOrden = { urgente:0, importante:1, normal:2 };
  const grupos = {};
  insumos.forEach(i => {
    const key = (i.categoria||'otro') + '::' + (i.subgrupo||'general');
    if (!grupos[key]) grupos[key] = { cat: i.categoria, sub: i.subgrupo, items: [] };
    grupos[key].items.push(i);
  });
  Object.values(grupos).forEach(g => { g.items.sort((a,b) => (prioOrden[a.prioridad]||2)-(prioOrden[b.prioridad]||2)); });
  const catLbl = { cocina:'Cocina', barra:'Barra', limpieza:'Limpieza', cristaleria:'Cristalería' };
  const prioBorder = { urgente:'var(--red)', importante:'var(--amber)', normal:'transparent' };
  let html = '';
  Object.keys(grupos).forEach(key => {
    const g = grupos[key];
    const isCol = insAdminGrupos[key];
    html += '<div style="margin-bottom:4px">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 4px;cursor:pointer;border-bottom:0.5px solid var(--border)" onclick="toggleGrupoAdmin(\'' + key + '\')">';
    html += '<span style="font-size:11px;font-weight:500;color:var(--text2);text-transform:uppercase;letter-spacing:.4px">' + (catLbl[g.cat]||g.cat) + ' · ' + g.sub + '</span>';
    html += '<span style="font-size:10px;color:var(--text3)">' + (isCol?'▶':'▼') + '</span></div>';
    if (!isCol) {
      html += '<div style="display:grid;grid-template-columns:1fr 70px 80px 32px;gap:4px;padding:4px 4px 2px;font-size:9px;color:var(--text3)">';
      html += '<span>Insumo</span><span style="text-align:center">Mín.</span><span style="text-align:center">Editar mín.</span><span></span></div>';
      g.items.forEach(i => {
        const isEdit = insAdminEdits[i.id];
        html += '<div style="display:grid;grid-template-columns:1fr 70px 80px 32px;gap:4px;align-items:center;padding:6px 4px;border-left:2px solid ' + (prioBorder[i.prioridad]||'transparent') + ';background:var(--bg2);border-radius:6px;margin-bottom:3px">';
        html += '<div style="font-size:12px;color:var(--text)">' + i.nombre + '</div>';
        if (!isEdit) {
          html += '<div style="font-size:11px;color:var(--text3);text-align:center">' + (i.minimo||'—') + '</div>';
          html += '<input class="edit-reg-inp" style="padding:4px;font-size:11px;text-align:center" value="' + (i.minimo||'') + '" onchange="editarMinimoInsumo(\'' + i.id + '\',this.value)" placeholder="Mín.">';
          html += '<div style="display:flex;align-items:center;justify-content:center"><div class="btn-admin-del" style="padding:3px 6px;font-size:10px" onclick="eliminarInsumo(\'' + i.id + '\')">✕</div></div>';
        }
        html += '</div>';
      });
    }
    html += '</div>';
  });
  const lista = document.getElementById('ia-lista-maestra');
  if (lista) lista.innerHTML = html || '<div style="text-align:center;padding:16px;font-size:13px;color:var(--text3)">Sin insumos</div>';
}

let historialFecha = getFechaHoy();

async function cargarHistorialInsumos() {
  const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const snap = await getDocs(query(collection(db, 'listas_mercado'), where('fecha','==',historialFecha)));
  const listas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  listas.sort((a,b) => b.timestamp > a.timestamp ? 1 : -1);
  const catLbl = { cocina:'Cocina', barra:'Barra', limpieza:'Limpieza', cristaleria:'Cristalería' };
  let html = '';
  if (!listas.length) { html = '<div style="text-align:center;padding:24px;font-size:13px;color:var(--text3)">Sin listas generadas aún</div>'; }
  listas.forEach(l => {
    const isAbierto = historialCards[l.id];
    const items = l.items || [];
    html += '<div class="admin-staff-card" style="margin-bottom:8px">';
    html += '<div class="admin-card-top" onclick="toggleHistorialCard(\'' + l.id + '\')">';
    html += '<div class="admin-card-info"><div class="admin-card-name">' + (l.fecha||'—') + '</div>';
    html += '<div class="admin-card-sub">' + (l.nombre||'Encargado desconocido') + ' · ' + items.length + ' items</div></div>';
    html += '<span style="font-size:10px;padding:3px 8px;border-radius:20px;background:var(--green-bg);color:var(--green-light)">' + items.length + ' items</span></div>';
    html += '<div class="admin-card-body' + (isAbierto?' abierto':'') + '">';
    const byCat = {};
    items.forEach(i => { const cl=catLbl[i.cat]||i.cat; if(!byCat[cl])byCat[cl]=[]; byCat[cl].push(i); });
    Object.keys(byCat).forEach(cl => {
      html += '<div style="font-size:10px;color:var(--green-light);font-weight:500;margin-top:6px;margin-bottom:3px">' + cl + '</div>';
      byCat[cl].forEach(i => { html += '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);padding:2px 0">- ' + i.nombre + '<span style="color:var(--green-light)">' + i.qty + '</span></div>'; });
    });
    html += '</div></div>';
  });
  const lista = document.getElementById('ia-historial-lista');
  if (lista) lista.innerHTML = html;
}

window.showTabInsAdmin = (tab) => {
  document.getElementById('tab-ia-lista').classList.toggle('activo', tab==='lista');
  document.getElementById('tab-ia-historial').classList.toggle('activo', tab==='historial');
  document.getElementById('panel-ia-lista').style.display = tab==='lista'?'flex':'none';
  document.getElementById('panel-ia-lista').style.flexDirection = tab==='lista'?'column':'';
  document.getElementById('panel-ia-historial').style.display = tab==='historial'?'flex':'none';
  document.getElementById('panel-ia-historial').style.flexDirection = tab==='historial'?'column':'';
  if (tab==='historial') {
    cargarHistorialInsumos();
    document.getElementById('btn-hist-ins-prev').addEventListener('click', () => {
      const d = new Date(historialFecha + 'T12:00:00');
      d.setDate(d.getDate()-1);
      historialFecha = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      actualizarLabelHistIns();
      cargarHistorialInsumos();
    });
    document.getElementById('btn-hist-ins-next').addEventListener('click', () => {
      const d = new Date(historialFecha + 'T12:00:00');
      d.setDate(d.getDate()+1);
      historialFecha = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      actualizarLabelHistIns();
      cargarHistorialInsumos();
    });
    actualizarLabelHistIns();
  }
};

function actualizarLabelHistIns() {
  const hoy = getFechaHoy();
  const d = new Date(historialFecha + 'T12:00:00');
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const label = document.getElementById('hist-ins-fecha-label');
  if (label) label.textContent = historialFecha===hoy ? 'Hoy' : dias[d.getDay()]+' '+d.getDate()+' '+meses[d.getMonth()];
}

window.toggleFormInsumo = () => {
  const f = document.getElementById('form-nuevo-insumo');
  const visible = f.style.display==='flex';
  f.style.display = visible?'none':'flex';
  f.style.flexDirection = 'column';
};

window.toggleGrupoAdmin = (key) => { insAdminGrupos[key]=!insAdminGrupos[key]; cargarListaMaestra(); };
window.toggleHistorialCard = (id) => { historialCards[id]=!historialCards[id]; cargarHistorialInsumos(); };

window.editarMinimoInsumo = async (id, val) => {
  if (!val.trim()) return;
  const { doc: fd, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  await updateDoc(fd(db, 'insumos', id), { minimo: val.trim() });
  mostrarToast('Mínimo actualizado ✓');
};

window.eliminarInsumo = async (id) => {
  if (!confirm('¿Eliminar este insumo de la lista maestra?')) return;
  const { doc: fd, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  await updateDoc(fd(db, 'insumos', id), { activo: false });
  mostrarToast('Insumo eliminado', '#E24B4A');
  cargarListaMaestra();
};

window.guardarNuevoInsumo = async () => {
  const nombre = document.getElementById('ni-nombre').value.trim();
  const cat = document.getElementById('ni-cat').value;
  const sub = document.getElementById('ni-sub').value.trim()||'general';
  const min = document.getElementById('ni-min').value.trim();
  const prio = document.getElementById('ni-prio').value;
  if (!nombre||!min) { mostrarToast('Completa nombre y mínimo', '#E24B4A'); return; }
  const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  await addDoc(collection(db, 'insumos'), { nombre, categoria:cat, subgrupo:sub, minimo:min, prioridad:prio, activo:true, creadoEn:new Date().toISOString() });
  document.getElementById('ni-nombre').value='';
  document.getElementById('ni-sub').value='';
  document.getElementById('ni-min').value='';
  toggleFormInsumo();
  mostrarToast('Insumo agregado ✓');
  cargarListaMaestra();
};

// ===== MÓDULO: FINANZAS ADMIN =====
let finAdminCardsAbiertos = {};
let finAdminEditsAbiertos = {};

async function iniciarFinanzasAdmin() {
  await cargarCobrosAdmin();
  await cargarDanosAdmin();

  if (usuariosStaff.length === 0) {
    const { getDocs, collection } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const snap = await getDocs(collection(db, 'usuarios'));
    usuariosStaff = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.rol === 'staff');
  }
  const sel = document.getElementById('fa-dano-staff');
  if (sel) {
    sel.innerHTML = '<option value="">Selecciona...</option>';
    usuariosStaff.forEach(u => { sel.innerHTML += '<option value="' + u.id + '">' + u.nombre + '</option>'; });
  }
}

async function cargarCobrosAdmin() {
  const { getDocs, collection } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  if (usuariosStaff.length === 0) {
    const snap = await getDocs(collection(db, 'usuarios'));
    usuariosStaff = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.rol === 'staff');
  }
  const snapFin = await getDocs(collection(db, 'finanzas'));
  const todos = snapFin.docs.map(d => ({ id: d.id, ...d.data() }));
  const porPersona = {};
  usuariosStaff.forEach(u => { porPersona[u.id] = { usuario: u, cobros: [] }; });
  todos.forEach(f => { if (porPersona[f.uid]) porPersona[f.uid].cobros.push(f); });

  const conPend = Object.values(porPersona).filter(p => p.cobros.some(c => !c.validado));
  const banner = document.getElementById('fa-banner-pend');
  if (banner) {
    if (conPend.length) {
      banner.innerHTML = '<div style="background:var(--amber-bg);border:0.5px solid #3a2c00;border-radius:10px;padding:10px 12px"><div style="font-size:12px;font-weight:500;color:var(--amber);margin-bottom:4px">⏳ Pendientes de validar (' + conPend.length + ' personas)</div>' +
        conPend.map(p => '<div style="font-size:11px;color:#7a5020;padding:2px 0">' + p.usuario.nombre + ' · ' + p.cobros.filter(c=>!c.validado).length + ' cobro(s)</div>').join('') + '</div>';
    } else banner.innerHTML = '';
  }

  let html = '';
  Object.values(porPersona).forEach(p => {
    const total = p.cobros.reduce((a, c) => a + (c.montofinal || 0), 0);
    const pend = p.cobros.filter(c => !c.validado).reduce((a, c) => a + (c.montofinal || 0), 0);
    const iniciales = (p.usuario.nombre||'XX').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    const isAbierto = finAdminCardsAbiertos[p.usuario.id];
    html += '<div class="admin-staff-card' + (pend > 0 ? ' tiene-pendiente' : '') + '">';
    html += '<div class="admin-card-top" onclick="toggleFinCard(\'' + p.usuario.id + '\')">';
    html += '<div class="avatar av-teal">' + iniciales + '</div>';
    html += '<div class="admin-card-info"><div class="admin-card-name">' + p.usuario.nombre + '</div><div class="admin-card-sub">' + (p.usuario.area||'—') + ' · ' + p.cobros.length + ' registros</div></div>';
    html += '<div style="font-size:14px;font-weight:500;color:var(--red)">S/ ' + total.toFixed(2) + '</div></div>';
    html += '<div class="admin-card-body' + (isAbierto ? ' abierto' : '') + '">';

    const consumos = p.cobros.filter(c => c.tipo === 'consumo');
    const danos = p.cobros.filter(c => c.tipo !== 'consumo');

    if (consumos.length) {
      html += '<div class="edit-reg-lbl" style="margin-top:4px">Consumos</div>';
      consumos.forEach(c => { html += renderCobroAdmin(c, p.usuario.id); });
    }
    if (danos.length) {
      html += '<div class="edit-reg-lbl" style="margin-top:4px">Daños y mermas</div>';
      danos.forEach(c => { html += renderCobroAdmin(c, p.usuario.id); });
    }
    if (!p.cobros.length) html += '<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px">Sin cobros</div>';

    const totalFin = p.cobros.reduce((a,c) => a+(c.montofinal||0), 0);
    if (p.cobros.length) html += '<div class="fin-total-row" style="margin-top:4px"><span>Total a descontar</span><span style="color:var(--red);font-weight:500">S/ ' + totalFin.toFixed(2) + '</span></div>';
    html += '</div></div>';
  });
  const lista = document.getElementById('fa-cobros-lista');
  if (lista) lista.innerHTML = html;
}

function renderCobroAdmin(c, uid) {
  const isEdit = finAdminEditsAbiertos[c.id];
  const subTxt = c.tipo === 'consumo' ? 'Consumo · ' + (c.descuento||0) + '% desc.' : 'Daño · valorizado por admin';
  let html = '<div class="cobro-item" style="margin-bottom:6px">';
  html += '<div class="cobro-top"><div><div class="cobro-desc">' + c.descripcion + '</div><div class="cobro-fecha">' + (c.fecha||'') + '</div></div>';
  html += '<div style="text-align:right"><div class="cobro-monto">S/ ' + (c.montofinal||0).toFixed(2) + '</div>';
  if (c.tipo==='consumo'&&c.descuento) html += '<div style="font-size:9px;color:var(--text3)">-' + c.descuento + '% desc.</div>';
  html += '</div></div>';
  html += '<div style="display:flex;align-items:center;justify-content:space-between">';
  html += '<span class="cobro-badge ' + (c.validado?'badge-ok':'badge-pend') + '">' + (c.validado?'Validado':'Pendiente') + '</span>';
  if (!isEdit) {
    html += '<div style="display:flex;gap:5px">';
    html += c.validado ? '<div class="btn-admin-val ya">✓ Validado</div>' : '<div class="btn-admin-val" onclick="validarCobroAdmin(\'' + c.id + '\',\'' + uid + '\')">✓ Validar</div>';
    html += '<div class="btn-admin-edit" onclick="editarCobroAdmin(\'' + c.id + '\')">Editar</div>';
    html += '</div>';
  }
  html += '</div>';
  if (isEdit) {
    html += '<div class="edit-reg-box"><div class="edit-reg-lbl">Descripción</div>';
    html += '<input class="edit-reg-inp" id="fae-desc-' + c.id + '" value="' + (c.descripcion||'') + '">';
    html += '<div style="display:flex;gap:8px;margin-top:6px"><div style="flex:1"><div class="edit-reg-lbl">Monto (S/)</div>';
    html += '<input class="edit-reg-inp" id="fae-monto-' + c.id + '" type="number" value="' + (c.monto||0) + '" inputmode="decimal"></div>';
    if (c.tipo==='consumo') { html += '<div style="flex:1"><div class="edit-reg-lbl">Descuento %</div><input class="edit-reg-inp" id="fae-desc2-' + c.id + '" type="number" value="' + (c.descuento||30) + '" inputmode="numeric"></div>'; }
    html += '</div><div class="edit-reg-btns" style="margin-top:6px">';
    html += '<button class="btn-edit-save" onclick="guardarCobroAdmin(\'' + c.id + '\',\'' + (c.tipo||'consumo') + '\')">Guardar</button>';
    html += '<button class="btn-edit-cancel" onclick="cancelarEditCobro(\'' + c.id + '\')">Cancelar</button></div></div>';
  }
  html += '</div>';
  return html;
}

window.toggleFinCard = (uid) => { finAdminCardsAbiertos[uid]=!finAdminCardsAbiertos[uid]; cargarCobrosAdmin(); };

window.validarCobroAdmin = async (cid, uid) => {
  const { doc: fd, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  await updateDoc(fd(db, 'finanzas', cid), { validado: true });
  mostrarToast('Cobro validado ✓');
  cargarCobrosAdmin();
};

window.editarCobroAdmin = (cid) => { finAdminEditsAbiertos[cid]=true; cargarCobrosAdmin(); };
window.cancelarEditCobro = (cid) => { finAdminEditsAbiertos[cid]=false; cargarCobrosAdmin(); };

window.guardarCobroAdmin = async (cid, tipo) => {
  const descEl = document.getElementById('fae-desc-' + cid);
  const montoEl = document.getElementById('fae-monto-' + cid);
  const desc2El = document.getElementById('fae-desc2-' + cid);
  if (!descEl||!montoEl) return;
  const monto = parseFloat(montoEl.value)||0;
  const descuento = desc2El ? parseInt(desc2El.value)||0 : 0;
  const montofinal = tipo==='consumo' ? monto*(1-descuento/100) : monto;
  const { doc: fd, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  await updateDoc(fd(db, 'finanzas', cid), { descripcion: descEl.value.trim(), monto, descuento, montofinal });
  finAdminEditsAbiertos[cid]=false;
  mostrarToast('Cobro actualizado ✓');
  cargarCobrosAdmin();
};

async function cargarDanosAdmin() {
  const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const snap = await getDocs(query(collection(db, 'finanzas'), where('tipo','==','daño')));
  const danos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const lista = document.getElementById('fa-danos-lista');
  if (!lista) return;
  if (!danos.length) { lista.innerHTML = '<div style="font-size:12px;color:var(--text3);text-align:center;padding:16px">Sin daños registrados</div>'; return; }
  lista.innerHTML = danos.map(d => '<div class="cobro-item" style="margin-bottom:6px"><div class="cobro-top"><div><div class="cobro-desc">' + d.descripcion + '</div><div class="cobro-fecha">' + d.nombre + ' · ' + d.fecha + '</div></div><div class="cobro-monto">S/ ' + (d.montofinal||0).toFixed(2) + '</div></div><span class="cobro-badge ' + (d.validado?'badge-ok':'badge-pend') + '">' + (d.validado?'Validado':'Pendiente') + '</span></div>').join('');
}

window.registrarDanoAdmin = async () => {
  const desc = document.getElementById('fa-dano-desc').value.trim();
  const monto = parseFloat(document.getElementById('fa-dano-monto').value)||0;
  const uid = document.getElementById('fa-dano-staff').value;
  if (!desc||!monto||!uid) { mostrarToast('Completa todos los campos', '#E24B4A'); return; }
  const u = usuariosStaff.find(x => x.id===uid);
  const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  await addDoc(collection(db, 'finanzas'), { uid, nombre: u?u.nombre:'', fecha: getFechaHoy(), tipo:'daño', descripcion: desc, monto, descuento:0, montofinal: monto, validado:false, timestamp: new Date() });
  document.getElementById('fa-dano-desc').value='';
  document.getElementById('fa-dano-monto').value='';
  mostrarToast('Daño registrado ✓');
  cargarDanosAdmin();
  cargarCobrosAdmin();
};

async function cargarResumenAdmin() {
  const { getDocs, collection } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const snap = await getDocs(collection(db, 'finanzas'));
  const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const totalGlobal = todos.reduce((a,f) => a+(f.montofinal||0), 0);
  const sinValidar = todos.filter(f=>!f.validado).reduce((a,f) => a+(f.montofinal||0), 0);
  const stats = document.getElementById('fa-stats-globales');
  if (stats) stats.innerHTML = '<div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--red)">S/ ' + totalGlobal.toFixed(2) + '</div><div class="admin-stat-lbl">Total a descontar</div></div><div class="admin-stat-card"><div class="admin-stat-num" style="color:var(--amber)">S/ ' + sinValidar.toFixed(2) + '</div><div class="admin-stat-lbl">Sin validar</div></div>';

  if (usuariosStaff.length === 0) {
    const snapU = await getDocs(collection(db, 'usuarios'));
    usuariosStaff = snapU.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.rol === 'staff');
  }
  let html = '';
  usuariosStaff.forEach(u => {
    const mis = todos.filter(f => f.uid === u.id);
    const total = mis.reduce((a,f)=>a+(f.montofinal||0),0);
    const pend = mis.filter(f=>!f.validado).reduce((a,f)=>a+(f.montofinal||0),0);
    const consumos = mis.filter(f=>f.tipo==='consumo').reduce((a,f)=>a+(f.montofinal||0),0);
    const danos = mis.filter(f=>f.tipo!=='consumo').reduce((a,f)=>a+(f.montofinal||0),0);
    const iniciales = (u.nombre||'XX').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    html += '<div class="admin-staff-card"><div class="admin-card-top" style="cursor:default"><div class="avatar av-teal">' + iniciales + '</div>';
    html += '<div class="admin-card-info"><div class="admin-card-name">' + u.nombre + '</div><div class="admin-card-sub">Consumos: S/ ' + consumos.toFixed(2) + ' · Daños: S/ ' + danos.toFixed(2) + '</div></div>';
    html += '<div style="font-size:14px;font-weight:500;color:var(--red)">S/ ' + total.toFixed(2) + '</div></div>';
    if (pend>0) html += '<div style="padding:0 12px 10px;font-size:11px;color:var(--amber)">S/ ' + pend.toFixed(2) + ' pendiente de validar</div>';
    html += '</div>';
  });
  const lista = document.getElementById('fa-resumen-lista');
  if (lista) lista.innerHTML = html;
}

window.showTabFinAdmin = (tab) => {
  ['cobros','dano','resumen'].forEach(t => {
    document.getElementById('tab-fa-' + t).classList.toggle('activo', t===tab);
    document.getElementById('panel-fa-' + t).style.display = t===tab ? 'flex' : 'none';
    document.getElementById('panel-fa-' + t).style.flexDirection = t===tab ? 'column' : '';
  });
  if (tab==='resumen') cargarResumenAdmin();
  if (tab==='dano') cargarDanosAdmin();
};

// ===== MÓDULO: TAREAS ADMIN =====
let tipoTareaActual = 'normal';
let tareasAdminCards = {};
let seguimientoCards = {};

async function iniciarTareasAdmin() {
  await cargarTareasConfig();
  await cargarSeguimiento();

  // Llenar select de urgente
  const sel = document.getElementById('sel-urgente-staff');
  if (sel && usuariosStaff.length === 0) {
    const { getDocs, collection } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const snap = await getDocs(collection(db, 'usuarios'));
    usuariosStaff = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.rol === 'staff');
  }
  const sel2 = document.getElementById('sel-urgente-staff');
  if (sel2) {
    sel2.innerHTML = '<option value="">Selecciona persona...</option>';
    usuariosStaff.forEach(u => {
      sel2.innerHTML += '<option value="' + u.id + '">' + u.nombre + '</option>';
    });
  }
}

async function cargarTareasConfig() {
  const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const snap = await getDocs(query(collection(db, 'tareas_config'), where('activo', '==', true)));
  const tareas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const tagCls = { cocina:'tag-cocina', barra:'tag-barra', sala:'tag-sala', banos:'tag-banos', general:'tag-general' };
  const tagLbl = { cocina:'cocina', barra:'barra', sala:'sala', banos:'baños', general:'general' };
  let html = '';
  tareas.forEach(t => {
    const tipoBadge = t.tipo === 'recurrente' ? '<span style="font-size:9px;padding:2px 6px;border-radius:20px;background:#2a1a00;color:var(--amber);border:0.5px solid #3a2400">↻ cada ' + (t.repHoras||2) + 'h</span>' :
      t.tipo === 'turno' ? '<span style="font-size:9px;padding:2px 6px;border-radius:20px;background:var(--purple-bg);color:var(--purple)">por turno</span>' : '';
    const compBadge = t.compartida ? '<span style="font-size:9px;padding:2px 6px;border-radius:20px;background:#001828;color:#5DAAE8">compartida</span>' : '';
    html += '<div class="tarea-config-card">';
    html += '<div class="tarea-config-top"><div class="tarea-config-nombre">' + t.nombre + '</div></div>';
    html += '<div class="tarea-config-meta"><span class="tag-area ' + (tagCls[t.area]||'tag-general') + '">' + (tagLbl[t.area]||t.area) + '</span>' + tipoBadge + compBadge + '</div>';
    html += '<div style="font-size:10px;color:var(--text3)">Turno: ' + (t.turno||'ambos') + '</div>';
    html += '<div class="tarea-config-btns">';
    html += '<button class="btn-admin-del" onclick="desactivarTarea(\'' + t.id + '\')">Eliminar</button>';
    html += '</div></div>';
  });
  document.getElementById('lista-tareas-config').innerHTML = html || '<div style="font-size:12px;color:var(--text3);text-align:center;padding:16px">Sin tareas configuradas</div>';
}

async function cargarSeguimiento() {
  const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  if (usuariosStaff.length === 0) {
    const snap = await getDocs(collection(db, 'usuarios'));
    usuariosStaff = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.rol === 'staff');
  }
  const snapConfig = await getDocs(query(collection(db, 'tareas_config'), where('activo', '==', true)));
  const config = snapConfig.docs.map(d => ({ id: d.id, ...d.data() }));
  const fecha = getFechaHoy();
  const snapDia = await getDocs(query(collection(db, 'tareas_dia'), where('fecha', '==', fecha)));
  const diaMap = {};
  snapDia.docs.forEach(d => { diaMap[d.data().uid] = d.data(); });

  let html = '';
  usuariosStaff.forEach(u => {
    const dia = diaMap[u.id] || {};
    const estados = dia.estados || {};
    const total = config.length;
    const hechas = config.filter(t => estados[t.id] === 'hecho' || estados[t.id] === 'yahay').length;
    const pct = total > 0 ? Math.round(hechas / total * 100) : 0;
    const color = pct >= 80 ? 'var(--green-light)' : pct >= 40 ? 'var(--amber)' : 'var(--red)';
    const iniciales = (u.nombre||'XX').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    const isAbierto = seguimientoCards[u.id];

    html += '<div class="seguimiento-card">';
    html += '<div class="seguimiento-top" onclick="toggleSeguimiento(\'' + u.id + '\')">';
    html += '<div class="avatar av-teal">' + iniciales + '</div>';
    html += '<div style="flex:1"><div style="font-size:13px;font-weight:500;color:var(--text)">' + u.nombre + '</div>';
    html += '<div style="font-size:11px;color:var(--text3)">' + (u.area||'—') + '</div>';
    html += '<div class="seg-prog"><div class="seg-prog-bar"><div class="seg-prog-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
    html += '<span style="font-size:10px;color:var(--text3)">' + hechas + '/' + total + '</span></div></div></div>';

    html += '<div class="seguimiento-body' + (isAbierto ? ' abierto' : '') + '">';
    config.forEach(t => {
      const est = estados[t.id] || 'pend';
      const estLbl = { hecho:'Hecho', yahay:'Ya había', nopudo:'No pudo', pend:'Pendiente' }[est] || 'Pendiente';
      const estCls = { hecho:'seg-ok', yahay:'seg-yh', nopudo:'seg-np', pend:'seg-pend' }[est] || 'seg-pend';
      html += '<div class="seg-tarea-row"><span class="seg-tarea-nombre">' + t.nombre + '</span><span class="seg-estado ' + estCls + '">' + estLbl + '</span></div>';
      if (est === 'nopudo' && dia['motivo_' + t.id]) {
        html += '<div style="font-size:10px;color:var(--red);font-style:italic;padding:2px 6px;background:var(--red-bg);border-radius:5px">"' + dia['motivo_' + t.id] + '"</div>';
      }
    });
    html += '</div></div>';
  });
  document.getElementById('seguimiento-lista').innerHTML = html || '<div style="text-align:center;padding:16px;font-size:13px;color:var(--text3)">Sin personal</div>';
}

window.showTabTareasAdmin = (tab) => {
  document.getElementById('tab-ta-gestion').classList.toggle('activo', tab === 'gestion');
  document.getElementById('tab-ta-seguimiento').classList.toggle('activo', tab === 'seguimiento');
  document.getElementById('panel-ta-gestion').style.display = tab === 'gestion' ? 'flex' : 'none';
  document.getElementById('panel-ta-seguimiento').style.display = tab === 'seguimiento' ? 'flex' : 'none';
  if (tab === 'seguimiento') cargarSeguimiento();
};

window.toggleFormTarea = () => {
  const f = document.getElementById('form-nueva-tarea');
  const visible = f.style.display === 'flex';
  f.style.display = visible ? 'none' : 'flex';
  f.style.flexDirection = 'column';
};

window.setTipoTarea = (tipo) => {
  tipoTareaActual = tipo;
  document.querySelectorAll('.tipo-tarea-btn').forEach(b => b.classList.toggle('activo', b.dataset.tipo === tipo));
  document.getElementById('nt-rep-wrap').style.display = tipo === 'recurrente' ? 'flex' : 'none';
  document.getElementById('nt-rep-wrap').style.flexDirection = 'column';
};

window.guardarNuevaTarea = async () => {
  const nombre = document.getElementById('nt-nombre').value.trim();
  if (!nombre) { mostrarToast('Escribe el nombre de la tarea', '#E24B4A'); return; }
  const area = document.getElementById('nt-area').value;
  const turno = document.getElementById('nt-turno').value;
  const compartida = document.getElementById('nt-compartida').checked;
  const repHoras = tipoTareaActual === 'recurrente' ? parseInt(document.getElementById('nt-rep-horas').value) || 2 : 0;
  const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  await addDoc(collection(db, 'tareas_config'), { nombre, area, turno, tipo: tipoTareaActual, repHoras, compartida, activo: true, creadoEn: new Date().toISOString() });
  mostrarToast('Tarea guardada ✓');
  toggleFormTarea();
  document.getElementById('nt-nombre').value = '';
  cargarTareasConfig();
};

window.desactivarTarea = async (id) => {
  if (!confirm('¿Eliminar esta tarea? Ya no aparecerá para el personal.')) return;
  const { doc: fd, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  await updateDoc(fd(db, 'tareas_config', id), { activo: false });
  mostrarToast('Tarea eliminada', '#E24B4A');
  cargarTareasConfig();
};

window.toggleSeguimiento = (uid) => {
  seguimientoCards[uid] = !seguimientoCards[uid];
  cargarSeguimiento();
};

window.asignarUrgente = async () => {
  const uid = document.getElementById('sel-urgente-staff').value;
  const tarea = document.getElementById('inp-urgente-tarea').value.trim();
  if (!uid || !tarea) { mostrarToast('Selecciona persona y escribe la tarea', '#E24B4A'); return; }
  const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  await addDoc(collection(db, 'tareas_urgentes'), { uid, tarea, fecha: getFechaHoy(), timestamp: new Date().toISOString(), completada: false });
  document.getElementById('inp-urgente-tarea').value = '';
  mostrarToast('Tarea urgente asignada ✓');
};

// ===== MÓDULO: HORARIOS ADMIN =====
let horarioFechaActual = getFechaHoy();
let semanaOffset = 0;
let usuariosStaff = [];
let horariosCache = {};

async function iniciarHorarios() {
  const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const snap = await getDocs(collection(db, 'usuarios'));
  usuariosStaff = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.rol === 'staff');

  const sel = document.getElementById('sel-persona-horario');
  usuariosStaff.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.nombre + ' · ' + (u.area || '—');
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => {
    if (sel.value) cargarSemanaPersona(sel.value);
  });

  document.getElementById('btn-semana-prev').addEventListener('click', () => {
    semanaOffset--;
    actualizarLabelSemana();
    if (sel.value) cargarSemanaPersona(sel.value);
  });
  document.getElementById('btn-semana-next').addEventListener('click', () => {
    semanaOffset++;
    actualizarLabelSemana();
    if (sel.value) cargarSemanaPersona(sel.value);
  });
  actualizarLabelSemana();

  document.getElementById('btn-horario-prev').addEventListener('click', () => {
    const d = new Date(horarioFechaActual + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    horarioFechaActual = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    cargarHorariosDia();
  });
  document.getElementById('btn-horario-next').addEventListener('click', () => {
    const d = new Date(horarioFechaActual + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    horarioFechaActual = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    cargarHorariosDia();
  });

  document.getElementById('modal-tipo-dia').addEventListener('change', function() {
    document.getElementById('modal-horas-wrap').style.display = this.value === 'trabajo' ? 'flex' : 'none';
    document.getElementById('modal-horas-wrap').style.flexDirection = 'column';
  });

  cargarHorariosDia();
}

function actualizarLabelSemana() {
  if (semanaOffset === 0) { document.getElementById('semana-label').textContent = 'Esta semana'; return; }
  if (semanaOffset === 1) { document.getElementById('semana-label').textContent = 'Próxima semana'; return; }
  if (semanaOffset === -1) { document.getElementById('semana-label').textContent = 'Semana pasada'; return; }
  document.getElementById('semana-label').textContent = semanaOffset > 0 ? '+' + semanaOffset + ' semanas' : semanaOffset + ' semanas';
}

async function cargarSemanaPersona(uid) {
  const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const hoy = new Date(getFechaHoy() + 'T12:00:00');
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - (hoy.getDay() === 0 ? 6 : hoy.getDay() - 1) + (semanaOffset * 7));

  const fechas = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    fechas.push(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'));
  }

  const snap = await getDocs(query(collection(db, 'horarios'), where('uid', '==', uid)));
  const hMap = {};
  snap.docs.forEach(d => { hMap[d.data().fecha] = { id: d.id, ...d.data() }; });

  const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  let html = '<div class="semana-grid">';
  fechas.forEach((fecha, i) => {
    const h = hMap[fecha];
    const tipoCls = h ? (h.tipo_dia === 'libre' ? 'badge-libre' : h.tipo_dia === 'permiso' ? 'badge-permiso' : 'badge-trabajo') : 'badge-libre';
    const tipoTxt = h ? h.tipo_dia.charAt(0).toUpperCase() + h.tipo_dia.slice(1) : 'Sin asignar';
    const horasTxt = h && h.tipo_dia === 'trabajo' ? (h.hora_entrada || '—') + ' → ' + (h.hora_salida || '—') : '';
    html += '<div class="semana-dia">';
    html += '<div class="semana-dia-nombre">' + dias[i] + '<div style="font-size:10px;color:var(--text3)">' + fecha.slice(5).replace('-','/') + '</div></div>';
    html += '<div class="semana-dia-info"><div class="semana-dia-tipo ' + tipoCls + '">' + tipoTxt + '</div>' + (horasTxt ? '<div class="semana-dia-horas">' + horasTxt + '</div>' : '') + '</div>';
    html += '<button class="btn-asignar-horario" onclick="abrirModalHorario(\'' + uid + '\',\'' + fecha + '\',' + JSON.stringify(h||null).replace(/"/g,'&quot;') + ')">Editar</button>';
    html += '</div>';
  });
  html += '</div>';
  document.getElementById('horarios-semana-wrap').innerHTML = html;
}

async function cargarHorariosDia() {
  const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
  const d = new Date(horarioFechaActual + 'T12:00:00');
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  document.getElementById('horario-dia-label').textContent = dias[d.getDay()] + ' ' + d.getDate() + ' ' + meses[d.getMonth()];

  const snap = await getDocs(query(collection(db, 'horarios'), where('fecha', '==', horarioFechaActual)));
  const hMap = {};
  snap.docs.forEach(doc => { hMap[doc.data().uid] = { id: doc.id, ...doc.data() }; });

  let html = '';
  usuariosStaff.forEach(u => {
    const h = hMap[u.id];
    const tipoCls = h ? (h.tipo_dia === 'libre' ? 'badge-libre' : h.tipo_dia === 'permiso' ? 'badge-permiso' : 'badge-trabajo') : '';
    const tipoTxt = h ? h.tipo_dia.charAt(0).toUpperCase() + h.tipo_dia.slice(1) : 'Sin asignar';
    const horasTxt = h && h.tipo_dia === 'trabajo' ? (h.hora_entrada || '—') + ' → ' + (h.hora_salida || '—') : '';
    html += '<div class="horario-dia-card">';
    html += '<div><div class="horario-dia-nombre">' + u.nombre + '</div><div style="font-size:11px;color:var(--text3)">' + (u.area||'—') + '</div></div>';
    html += '<div class="horario-dia-info"><div class="horario-dia-tipo ' + tipoCls + '">' + tipoTxt + '</div>' + (horasTxt ? '<div class="horario-dia-horas">' + horasTxt + '</div>' : '') + '</div>';
    html += '<button class="btn-asignar-horario" onclick="abrirModalHorario(\'' + u.id + '\',\'' + horarioFechaActual + '\',' + JSON.stringify(h||null).replace(/"/g,'&quot;') + ')">Editar</button>';
    html += '</div>';
  });
  document.getElementById('horarios-dia-lista').innerHTML = html || '<div style="text-align:center;padding:24px;font-size:13px;color:var(--text3)">Sin personal</div>';
}

window.showTabHorarios = (tab) => {
  document.getElementById('tab-horarios-persona').classList.toggle('activo', tab === 'persona');
  document.getElementById('tab-horarios-dia').classList.toggle('activo', tab === 'dia');
  document.getElementById('panel-horarios-persona').style.display = tab === 'persona' ? 'flex' : 'none';
  document.getElementById('panel-horarios-persona').style.flexDirection = tab === 'persona' ? 'column' : '';
  document.getElementById('panel-horarios-dia').style.display = tab === 'dia' ? 'flex' : 'none';
  document.getElementById('panel-horarios-dia').style.flexDirection = tab === 'dia' ? 'column' : '';
};

window.abrirModalHorario = (uid, fecha, horarioExistente) => {
  document.getElementById('modal-uid').value = uid;
  document.getElementById('modal-fecha').value = fecha;
  const d = new Date(fecha + 'T12:00:00');
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const u = usuariosStaff.find(x => x.id === uid);
  document.getElementById('modal-horario-titulo').textContent = (u ? u.nombre : '') + ' — ' + dias[d.getDay()] + ' ' + fecha.slice(8) + '/' + fecha.slice(5,7);
  if (horarioExistente) {
    document.getElementById('modal-tipo-dia').value = horarioExistente.tipo_dia || 'trabajo';
    document.getElementById('modal-hora-entrada').value = horarioExistente.hora_entrada || '08:00';
    document.getElementById('modal-hora-salida').value = horarioExistente.hora_salida || '13:00';
    document.getElementById('modal-turno').value = horarioExistente.turno || 'mañana';
  } else {
    document.getElementById('modal-tipo-dia').value = 'trabajo';
    document.getElementById('modal-hora-entrada').value = '08:00';
    document.getElementById('modal-hora-salida').value = '13:00';
    document.getElementById('modal-turno').value = 'mañana';
  }
  document.getElementById('modal-horas-wrap').style.display = document.getElementById('modal-tipo-dia').value === 'trabajo' ? 'flex' : 'none';
  document.getElementById('modal-horas-wrap').style.flexDirection = 'column';
  document.getElementById('modal-horario').style.display = 'flex';
};

window.cerrarModalHorario = () => {
  document.getElementById('modal-horario').style.display = 'none';
};

window.guardarHorario = async () => {
  const uid = document.getElementById('modal-uid').value;
  const fecha = document.getElementById('modal-fecha').value;
  const tipo_dia = document.getElementById('modal-tipo-dia').value;
  const hora_entrada = document.getElementById('modal-hora-entrada').value;
  const hora_salida = document.getElementById('modal-hora-salida').value;
  const turno = document.getElementById('modal-turno').value;
  const { getDocs, collection, query, where, addDoc, updateDoc, doc: fd } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

  const snap = await getDocs(query(collection(db, 'horarios'), where('uid','==',uid), where('fecha','==',fecha)));
  const datos = { uid, fecha, tipo_dia, turno, ultimaActualizacion: new Date().toISOString() };
  if (tipo_dia === 'trabajo') { datos.hora_entrada = hora_entrada; datos.hora_salida = hora_salida; }
  else { datos.hora_entrada = ''; datos.hora_salida = ''; }

  if (!snap.empty) {
    await updateDoc(fd(db, 'horarios', snap.docs[0].id), datos);
  } else {
    await addDoc(collection(db, 'horarios'), datos);
  }

  cerrarModalHorario();
  mostrarToast('Horario guardado ✓');
  const tabActivo = document.getElementById('tab-horarios-persona').classList.contains('activo') ? 'persona' : 'dia';
  if (tabActivo === 'persona') cargarSemanaPersona(uid);
  else cargarHorariosDia();
};

// ===== LOGOUT =====
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) btnLogout.addEventListener('click', () => signOut(auth));

const btnLogoutStaff = document.getElementById('btn-logout-staff');
if (btnLogoutStaff) btnLogoutStaff.addEventListener('click', () => signOut(auth));
