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
      await setDoc(docRef, { uid: usuarioActual.uid, fecha, registros: [nuevoReg], ultimaActualizacion: serverTimestamp() });
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

// LOGOUT
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) btnLogout.addEventListener('click', () => signOut(auth));
