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
  iniciarTareas();
  if (unsuscribeAsistencia) unsuscribeAsistencia();
  unsuscribeAsistencia = onSnapshot(
    doc(db, 'asistencias', usuarioActual.uid + '_' + getFechaHoy()),
    (snap) => renderAsistencia(snap.exists() ? snap.data() : null)
  );
}
 
function iniciarAdmin() {
  mostrarPantalla('admin');
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

// ===== LOGOUT =====
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) btnLogout.addEventListener('click', () => signOut(auth));

const btnLogoutStaff = document.getElementById('btn-logout-staff');
if (btnLogoutStaff) btnLogoutStaff.addEventListener('click', () => signOut(auth));
