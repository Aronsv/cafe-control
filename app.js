import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, doc, getDoc, getDocs, query, 
    where, orderBy, limit, serverTimestamp, updateDoc, onSnapshot 
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
let usersCache = [];
let attendanceCache = [];

// Elementos UI
const views = { login: document.getElementById("loginView"), staff: document.getElementById("staffView"), admin: document.getElementById("adminView") };
const btnAsistencia = document.getElementById("btnAsistencia");
const btnBreak = document.getElementById("btnBreak");
const mensajeStaff = document.getElementById("mensajeStaff");
const adminHistoryList = document.getElementById("adminHistoryList");

// --- LOGICA DE SESIÓN ---
onAuthStateChanged(auth, async (user) => {
    if (!user) { switchView('login'); return; }
    
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
        datosUsuario = docSnap.data();
        estadoActual = datosUsuario.estado || "inicio";
        if (datosUsuario.role === "admin") {
            switchView('admin');
            iniciarEscuchasAdmin(); // <-- ESTO ES LO QUE FALTABA
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
    document.getElementById("obsDia").value = ""; 
    actualizarInterfaz();
}

function actualizarInterfaz() {
    if (estadoActual === "salida") estadoActual = "inicio";
    if (estadoActual === "regreso" || estadoActual === "ingreso") estadoActual = "trabajando";

    btnAsistencia.classList.remove("btn-green", "btn-red");
    btnBreak.classList.remove("btn-orange");
    btnAsistencia.disabled = false;
    btnBreak.disabled = false;

    if (estadoActual === "inicio") {
        mensajeStaff.innerText = "Tu jornada aún no ha comenzado";
        btnAsistencia.innerText = "Registrar ingreso";
        btnAsistencia.classList.add("btn-green");
        btnBreak.disabled = true;
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
        btnAsistencia.disabled = true;
        btnBreak.innerText = "Finalizar break";
        btnBreak.classList.add("btn-orange");
    }
}

// --- EVENTOS ---
if(btnAsistencia) {
    btnAsistencia.onclick = () => {
        if (estadoActual === "inicio") registrarAccion("ingreso");
        else if (estadoActual !== "break") registrarAccion("salida");
    };
}

if(btnBreak) {
    btnBreak.onclick = () => {
        if (estadoActual === "break") registrarAccion("regreso");
        else registrarAccion("break");
    };
}

document.getElementById("btnLogin").onclick = async () => {
    const e = document.getElementById("email").value;
    const p = document.getElementById("password").value;
    try { await signInWithEmailAndPassword(auth, e, p); } catch(err) { alert("Error: " + err.message); }
};

document.getElementById("btnLogoutStaff").onclick = () => signOut(auth);
document.getElementById("btnLogoutAdmin").onclick = () => signOut(auth);

// ===============================
// SECCIÓN 10 - LÓGICA ADMIN (CONEXIÓN REAL)
// ===============================

function iniciarEscuchasAdmin() {
    // 1. Escuchar Usuarios
    onSnapshot(collection(db, "users"), (snap) => {
        usersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        actualizarContadores();
        renderAdmin();
    });

    // 2. Escuchar Asistencia
    onSnapshot(collection(db, "attendance"), (snap) => {
        attendanceCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderAdmin();
    });
}

function actualizarContadores() {
    const counts = { trabajando: 0, break: 0, inicio: 0 };
    usersCache.forEach(u => {
        if (u.role !== 'admin') {
            let est = u.estado || 'inicio';
            if (est === 'ingreso' || est === 'regreso') est = 'trabajando';
            if (est === 'salida') est = 'inicio';
            counts[est]++;
        }
    });

    document.getElementById("countTrabajando").innerText = counts.trabajando;
    document.getElementById("countBreak").innerText = counts.break;
    
    // Gráfico Donut
    const total = usersCache.filter(u => u.role !== 'admin').length || 1;
    document.getElementById("arcTrabajando").style.strokeDasharray = `${(counts.trabajando / total) * 100} 100`;
    document.getElementById("arcBreak").style.strokeDasharray = `${(counts.break / total) * 100} 100`;
}

function renderAdmin() {
    if (!adminHistoryList) return;
    const staffUsers = usersCache.filter(u => u.role !== 'admin');

    adminHistoryList.innerHTML = staffUsers.map(user => {
        const registros = attendanceCache.filter(r => r.userId === user.id)
            .sort((a, b) => (b.horaServidor?.seconds || 0) - (a.horaServidor?.seconds || 0));

        let estPill = user.estado || 'inicio';
        if (estPill === 'ingreso' || estPill === 'regreso') estPill = 'trabajando';
        if (estPill === 'salida') estPill = 'inicio';

        return `
            <div class="employee-block" id="block-${user.id}">
                <div class="employee-summary" onclick="document.getElementById('block-${user.id}').classList.toggle('open')">
                    <strong>${user.nombre || 'Staff'}</strong>
                    <span>${user.turno || 'Turno 1'}</span>
                    <span class="status-pill status-${estPill}">
                        <span class="status-dot"></span> ${estPill.toUpperCase()}
                    </span>
                    <span>${registros.filter(r => r.tipo === 'break').length} Breaks</span>
                    <span>${registros.length > 0 ? 'Ver Historial' : 'Sin datos'}</span>
                </div>
                <div class="employee-details">
                    <div class="admin-tabs-nav">
                        <button class="tab-link active" onclick="event.stopPropagation(); switchSubTab(this, 'asistencia', '${user.id}')">Asistencia</button>
                        <button class="tab-link" onclick="event.stopPropagation(); switchSubTab(this, 'tareas', '${user.id}')">Tareas</button>
                        <button class="tab-link" onclick="event.stopPropagation(); switchSubTab(this, 'finanzas', '${user.id}')">Finanzas</button>
                    </div>
                    <div class="sub-tab-content" id="content-${user.id}">
                        ${renderAsistenciaTab(registros)}
                    </div>
                </div>
            </div>
        `;
    }).join("") || '<div class="empty-state">No hay empleados.</div>';
}

window.switchSubTab = (btn, tab, userId) => {
    const parent = btn.parentElement;
    parent.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
    btn.classList.add('active');
    
    const contentDiv = document.getElementById(`content-${userId}`);
    const registros = attendanceCache.filter(r => r.userId === userId);

    if (tab === 'asistencia') contentDiv.innerHTML = renderAsistenciaTab(registros);
    if (tab === 'tareas') contentDiv.innerHTML = `<p>Módulo de Tareas en construcción</p>`;
    if (tab === 'finanzas') contentDiv.innerHTML = renderFinanzasTab(userId);
};

function renderAsistenciaTab(regs) {
    return regs.map(r => `
        <div class="detail-row" style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
            <span>${r.tipo.toUpperCase()} - ${r.horaServidor ? new Date(r.horaServidor.seconds * 1000).toLocaleTimeString() : '...'}</span>
            <button class="btn-mini btn-accept" onclick="alert('Validado')">Validar ✅</button>
        </div>
    `).join("") || '<p>Sin registros hoy</p>';
}

function renderFinanzasTab(userId) {
    return `
        <div class="finance-grid">
            <div class="finance-box"><h4>Reportes Staff</h4><p>Sin datos</p></div>
            <div class="finance-box"><h4>Manual</h4><button class="btn btn-brown" style="height:35px">Agregar</button></div>
        </div>
    `;
}
