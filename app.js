import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, doc, getDoc, getDocs, query, 
    where, orderBy, limit, serverTimestamp, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-L09L2xGVWtsJO1XE3CCj6F5p4XN2VPo",
  authDomain: "cafe-control-c05bb.firebaseapp.com",
  projectId: "cafe-control-c05bb",
  storageBucket: "cafe-control-c05bb.firebasestorage.app",
  messagingSenderId: "874681908082",
  appId: "1:874681908082:web:e8e87dd3d5a070deb47beb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variables de estado
let estadoActual = "inicio";
let datosUsuario = null;

// Elementos UI
const views = { login: document.getElementById("loginView"), staff: document.getElementById("staffView"), admin: document.getElementById("adminView") };
const btnAsistencia = document.getElementById("btnAsistencia");
const btnBreak = document.getElementById("btnBreak");
const mensajeStaff = document.getElementById("mensajeStaff");

// --- LOGICA DE SESIÓN ---
onAuthStateChanged(auth, async (user) => {
    if (!user) { switchView('login'); return; }
    
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
        datosUsuario = docSnap.data();
        estadoActual = datosUsuario.estado || "inicio";
        if (datosUsuario.role === "admin") {
            switchView('admin');
        } else {
            switchView('staff');
            actualizarInterfaz();
        }
    }
});

function switchView(viewName) {
    Object.keys(views).forEach(v => views[v]?.classList.add("hidden"));
    views[viewName]?.classList.remove("hidden");
}

// --- LOGICA DE ASISTENCIA ---
async function registrarAccion(tipo) {
    const user = auth.currentUser;
    const obs = document.getElementById("obsDia").value;

    // Buscar último turno para incrementarlo si es necesario
    const q = query(collection(db, "attendance"), where("userId", "==", user.uid), orderBy("horaServidor", "desc"), limit(1));
    const snap = await getDocs(q);
    let nTurno = datosUsuario.turno || "Turno 1";

    if (!snap.empty && snap.docs[0].data().tipo === "salida" && tipo === "ingreso") {
        const num = parseInt(nTurno.split(" ")[1]) + 1;
        nTurno = `Turno ${num}`;
    }

    await addDoc(collection(db, "attendance"), {
        userId: user.uid,
        nombre: datosUsuario.nombre,
        tipo: tipo,
        turno: nTurno,
        horaServidor: serverTimestamp(),
        observacion: obs,
        validado: false
    });

    await updateDoc(doc(db, "users", user.uid), { estado: tipo, turno: nTurno });
    estadoActual = tipo;
    document.getElementById("obsDia").value = ""; // Limpiar obs
    actualizarInterfaz();
}

function actualizarInterfaz() {
    // 1. Normalizar el estado: Si en Firebase dice "salida" o "regreso", 
    // lo traducimos a los estados que la interfaz entiende.
    if (estadoActual === "salida") estadoActual = "inicio";
    if (estadoActual === "regreso" || estadoActual === "ingreso") estadoActual = "trabajando";

    // 2. Limpiar estilos previos
    btnAsistencia.classList.remove("btn-green", "btn-red");
    btnBreak.classList.remove("btn-orange");
    btnAsistencia.disabled = false;
    btnBreak.disabled = false;

    // 3. Aplicar lógica de botones según el estado normalizado
    if (estadoActual === "inicio") {
        mensajeStaff.innerText = "Tu jornada aún no ha comenzado";
        btnAsistencia.innerText = "Registrar ingreso";
        btnAsistencia.classList.add("btn-green");
        btnBreak.disabled = true; // No hay break si no has entrado
    } 
    else if (estadoActual === "trabajando") {
        mensajeStaff.innerText = "En jornada de trabajo";
        btnAsistencia.innerText = "Registrar salida";
        btnAsistencia.classList.add("btn-red");
        btnBreak.innerText = "Iniciar break";
        btnBreak.classList.add("btn-orange");
    } 
    else if (estadoActual === "break") {
        mensajeStaff.innerText = "Estás en descanso (Break)";
        btnAsistencia.innerText = "Regresa del break para salir";
        btnAsistencia.disabled = true; // Bloqueo de seguridad
        btnBreak.innerText = "Finalizar break";
        btnBreak.classList.add("btn-orange");
    }
}

// --- EVENTOS ---
btnAsistencia.onclick = () => {
    if (estadoActual === "inicio") registrarAccion("ingreso");
    else if (estadoActual !== "break") registrarAccion("salida");
};

btnBreak.onclick = () => {
    if (estadoActual === "break") registrarAccion("regreso");
    else registrarAccion("break");
};

document.getElementById("btnLogin").onclick = async () => {
    const e = document.getElementById("email").value;
    const p = document.getElementById("password").value;
    try { await signInWithEmailAndPassword(auth, e, p); } catch(e) { alert("Error: " + e.message); }
};

document.getElementById("btnLogoutStaff").onclick = () => signOut(auth);
document.getElementById("btnLogoutAdmin").onclick = () => signOut(auth);

// Variable para controlar qué pestaña interna está abierta (por defecto Asistencia)
let activeSubTab = "asistencia";

function renderAdmin() {
  if (!adminHistoryList) return;

  const html = usersCache.filter(u => u.role !== 'admin').map(user => {
    const registros = attendanceCache.filter(r => r.userId === user.id)
      .sort((a, b) => b.horaServidor?.seconds - a.horaServidor?.seconds);

    return `
      <div class="employee-block" id="block-${user.id}">
        <div class="employee-summary" onclick="document.getElementById('block-${user.id}').classList.toggle('open')">
          <strong>${user.nombre}</strong>
          <span>${user.turno || 'Sin Turno'}</span>
          <span class="status-pill status-${user.estado || 'inicio'}">${(user.estado || 'INICIO').toUpperCase()}</span>
          <span>${registros.filter(r => r.tipo === 'break').length} Breaks</span>
          <span>▼</span>
        </div>
        
        <div class="employee-details">
          <div class="admin-tabs-nav">
            <button class="tab-link active" onclick="switchSubTab(this, 'asistencia', '${user.id}')">Asistencia</button>
            <button class="tab-link" onclick="switchSubTab(this, 'tareas', '${user.id}')">Tareas</button>
            <button class="tab-link" onclick="switchSubTab(this, 'finanzas', '${user.id}')">Finanzas</button>
          </div>

          <div class="sub-tab-content" id="content-${user.id}">
            ${renderAsistenciaTab(registros)}
          </div>
        </div>
      </div>
    `;
  }).join("");

  adminHistoryList.innerHTML = html;
}

// Función para cambiar entre Asistencia, Tareas y Finanzas dentro del empleado
window.switchSubTab = (btn, tab, userId) => {
  const parent = btn.parentElement;
  parent.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
  btn.classList.add('active');
  
  const contentDiv = document.getElementById(`content-${userId}`);
  const registros = attendanceCache.filter(r => r.userId === userId);

  if (tab === 'asistencia') contentDiv.innerHTML = renderAsistenciaTab(registros);
  if (tab === 'tareas') contentDiv.innerHTML = `<p>Próximamente: Módulo de Tareas</p>`;
  if (tab === 'finanzas') contentDiv.innerHTML = renderFinanzasTab(userId);
};

function renderAsistenciaTab(regs) {
  return regs.map(r => `
    <div class="detail-row">
      <span>${r.tipo.toUpperCase()} - ${r.horaServidor ? new Date(r.horaServidor.seconds * 1000).toLocaleTimeString() : '...'}</span>
      <button class="btn-mini btn-accept" onclick="validar('${r.id}')">Validar ✅</button>
    </div>
  `).join("");
}

function renderFinanzasTab(userId) {
  return `
    <div class="finance-grid">
      <div class="finance-box">
        <h4>Reportes del Staff</h4>
        <p class="empty-msg">Sin consumos reportados hoy.</p>
      </div>
      <div class="finance-box">
        <h4>Control Manual (Adelantos/Cobros)</h4>
        <button class="btn btn-brown" style="height:40px; font-size:12px;" onclick="agregarMontoManual('${userId}')">+ Agregar Monto</button>
      </div>
    </div>
  `;
}
