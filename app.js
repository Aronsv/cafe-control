import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, doc, getDoc, getDocs, query, 
    where, orderBy, limit, serverTimestamp, updateDoc, onSnapshot, deleteDoc 
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

let estadoActual = "inicio";
let datosUsuario = null;
let usersCache = [];
let attendanceCache = [];

const views = { login: document.getElementById("loginView"), staff: document.getElementById("staffView"), admin: document.getElementById("adminView") };
const btnAsistencia = document.getElementById("btnAsistencia");
const btnBreak = document.getElementById("btnBreak");
const mensajeStaff = document.getElementById("mensajeStaff");
const adminHistoryList = document.getElementById("adminHistoryList");

// ===============================
// SESIÓN Y VISTAS
// ===============================
onAuthStateChanged(auth, async (user) => {
    if (!user) { switchView('login'); return; }
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
        datosUsuario = docSnap.data();
        estadoActual = datosUsuario.estado || "inicio";
        if (datosUsuario.role === "admin") {
            switchView('admin');
            iniciarEscuchasAdmin();
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

// ===============================
// LÓGICA DE ASISTENCIA STAFF
// ===============================
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
        userId: user.uid, nombre: datosUsuario.nombre, tipo: tipo,
        turno: nTurno, horaServidor: serverTimestamp(), observacion: obs, validado: false
    });

    await updateDoc(doc(db, "users", user.uid), { estado: tipo, turno: nTurno });
    estadoActual = tipo;
    document.getElementById("obsDia").value = ""; 
    actualizarInterfaz();
}

function actualizarInterfaz() {
    let uiEstado = estadoActual;
    if (uiEstado === "salida") uiEstado = "inicio";
    if (uiEstado === "regreso" || uiEstado === "ingreso") uiEstado = "trabajando";

    btnAsistencia.classList.remove("btn-green", "btn-red");
    btnBreak.classList.remove("btn-orange");
    btnAsistencia.disabled = false; btnBreak.disabled = false;

    if (uiEstado === "inicio") {
        mensajeStaff.innerText = "Tu jornada aún no ha comenzado";
        btnAsistencia.innerText = "Registrar ingreso"; btnAsistencia.classList.add("btn-green"); btnBreak.disabled = true;
    } else if (uiEstado === "trabajando") {
        mensajeStaff.innerText = "En jornada de trabajo";
        btnAsistencia.innerText = "Registrar salida"; btnAsistencia.classList.add("btn-red"); btnBreak.innerText = "Iniciar break"; btnBreak.classList.add("btn-orange");
    } else if (uiEstado === "break") {
        mensajeStaff.innerText = "Estás en descanso (Break)";
        btnAsistencia.innerText = "Regresa del break para salir"; btnAsistencia.disabled = true; btnBreak.innerText = "Finalizar break"; btnBreak.classList.add("btn-orange");
    }
}

// ===============================
// LÓGICA ADMIN (ESTADO EN VIVO)
// ===============================
function iniciarEscuchasAdmin() {
    onSnapshot(collection(db, "users"), (snap) => {
        usersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        actualizarContadores(); renderAdmin();
    });
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
    document.getElementById("countInicio").innerText = counts.inicio;
    
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
                    <span class="status-pill status-${estPill}">${estPill.toUpperCase()}</span>
                    <span>${registros.filter(r => r.tipo === 'break').length} Breaks</span>
                    <span>Ver Historial ▼</span>
                </div>
                <div class="employee-details">
                    <div class="admin-tabs-nav">
                        <button class="tab-link active" onclick="event.stopPropagation(); switchSubTab(this, 'asistencia', '${user.id}')">Asistencia</button>
                        <button class="tab-link" onclick="event.stopPropagation(); switchSubTab(this, 'tareas', '${user.id}')">Tareas</button>
                        <button class="tab-link" onclick="event.stopPropagation(); switchSubTab(this, 'finanzas', '${user.id}')">Finanzas</button>
                    </div>
                    <div class="sub-tab-content" id="content-${user.id}">
                        ${renderAsistenciaTab(registros, user.id)}
                    </div>
                </div>
            </div>
        `;
    }).join("") || '<div class="empty-state">No hay empleados.</div>';
}

function renderAsistenciaTab(regs, userId) {
    return regs.map(r => `
        <div class="admin-actions-row">
            <span>${r.tipo.toUpperCase()} - ${r.horaServidor ? new Date(r.horaServidor.seconds * 1000).toLocaleTimeString() : '...'}</span>
            <div class="detail-actions">
                ${!r.validado ? `<button class="btn-mini btn-valid" onclick="validarRegistro('${r.id}')">Validar ✅</button>` : '<span>✅ Validado</span>'}
                <button class="btn-mini btn-edit" onclick="editarRegistro('${r.id}')">Editar</button>
                <button class="btn-mini btn-delete" onclick="borrarRegistro('${r.id}', '${userId}')">Borrar</button>
            </div>
        </div>
    `).join("") || '<p>Sin registros hoy</p>';
}

// ===============================
// FUNCIONES GLOBALES (AUDITORÍA)
// ===============================
window.validarRegistro = async (id) => {
    await updateDoc(doc(db, "attendance", id), { validado: true });
    alert("Registro Validado ✅");
};

window.borrarRegistro = async (id, userId) => {
    if (!confirm("¿Borrar este registro? El estado del staff se recalculará.")) return;
    await deleteDoc(doc(db, "attendance", id));
    const q = query(collection(db, "attendance"), where("userId", "==", userId), orderBy("horaServidor", "desc"), limit(1));
    const snap = await getDocs(q);
    const nuevoEstado = snap.empty ? "inicio" : snap.docs[0].data().tipo;
    await updateDoc(doc(db, "users", userId), { estado: nuevoEstado });
};

window.editarRegistro = async (id) => {
    const nueva = prompt("Nueva hora (HH:MM:SS)");
    if (nueva) await updateDoc(doc(db, "attendance", id), { horaManual: nueva, editado: true });
};

window.switchSubTab = (btn, tab, userId) => {
    const parent = btn.parentElement; parent.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active')); btn.classList.add('active');
    const contentDiv = document.getElementById(`content-${userId}`);
    const registros = attendanceCache.filter(r => r.userId === userId);
    if (tab === 'asistencia') contentDiv.innerHTML = renderAsistenciaTab(registros, userId);
    else contentDiv.innerHTML = `<p>Módulo ${tab} próximamente</p>`;
};

// --- BARRA LATERAL ---
document.getElementById("btnToggleSidebar")?.addEventListener("click", () => {
    document.getElementById("sidebar").classList.add("collapsed");
    document.getElementById("btnOpenSidebar").classList.remove("hidden");
});
document.getElementById("btnOpenSidebar")?.addEventListener("click", () => {
    document.getElementById("sidebar").classList.remove("collapsed");
    document.getElementById("btnOpenSidebar").classList.add("hidden");
});

// --- EVENTOS LOGIN ---
if(btnLogin) btnLogin.onclick = async () => {
    const e = document.getElementById("email").value; const p = document.getElementById("password").value;
    try { await signInWithEmailAndPassword(auth, e, p); } catch(err) { alert("Error: " + err.message); }
};
if(btnAsistencia) btnAsistencia.onclick = () => { if (estadoActual === "inicio") registrarAccion("ingreso"); else if (estadoActual !== "break") registrarAccion("salida"); };
if(btnBreak) btnBreak.onclick = () => { if (estadoActual === "break") registrarAccion("regreso"); else registrarAccion("break"); };
document.getElementById("btnLogoutStaff").onclick = () => signOut(auth);
document.getElementById("btnLogoutAdmin").onclick = () => signOut(auth);
