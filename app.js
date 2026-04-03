import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, getDocs, query, where, orderBy, limit, serverTimestamp, updateDoc, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyB-L09L2xGVWtsJO1XE3CCj6F5p4XN2VPo", authDomain: "cafe-control-c05bb.firebaseapp.com", projectId: "cafe-control-c05bb", storageBucket: "cafe-control-c05bb.firebasestorage.app", messagingSenderId: "874681908082", appId: "1:874681908082:web:e8e87dd3d5a070deb47beb" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let estadoActual = "inicio";
let datosUsuario = null;
let usersCache = [];
let attendanceCache = [];

// --- NAVEGACION ---
onAuthStateChanged(auth, async (user) => {
    if (!user) { show('login'); return; }
    const d = await getDoc(doc(db, "users", user.uid));
    if (d.exists()) {
        datosUsuario = { id: user.uid, ...d.data() };
        estadoActual = datosUsuario.estado || "inicio";
        if (datosUsuario.role === "admin") { show('admin'); listenAdmin(); }
        else { show('staff'); updateStaffUI(); }
    }
});

function show(view) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(view + 'View').classList.remove('hidden');
}

// --- STAFF LOGIC ---
async function action(tipo) {
    const user = auth.currentUser;
    const q = query(collection(db, "attendance"), where("userId", "==", user.uid), orderBy("horaServidor", "desc"), limit(1));
    const snap = await getDocs(q);
    let nTurno = datosUsuario.turno || "Turno 1";

    if (!snap.empty && snap.docs[0].data().tipo === "salida" && tipo === "ingreso") {
        nTurno = "Turno " + (parseInt(nTurno.split(" ")[1]) + 1);
    }

    await addDoc(collection(db, "attendance"), { userId: user.uid, nombre: datosUsuario.nombre, tipo, turno: nTurno, horaServidor: serverTimestamp(), validado: false });
    await updateDoc(doc(db, "users", user.uid), { estado: tipo, turno: nTurno });
    estadoActual = tipo;
    updateStaffUI();
}

function updateStaffUI() {
    const btnA = document.getElementById("btnAsistencia");
    const btnB = document.getElementById("btnBreak");
    const msg = document.getElementById("mensajeStaff");
    
    let st = estadoActual;
    if (st === "salida") st = "inicio";
    if (st === "ingreso" || st === "regreso") st = "trabajando";

    btnA.className = "btn"; btnB.className = "btn";
    btnA.disabled = false; btnB.disabled = false;

    if (st === "inicio") {
        msg.innerText = "Jornada no iniciada"; btnA.innerText = "Registrar Ingreso"; btnA.classList.add("btn-green"); btnB.disabled = true;
    } else if (st === "trabajando") {
        msg.innerText = "En turno"; btnA.innerText = "Registrar Salida"; btnA.classList.add("btn-red"); btnB.innerText = "Iniciar Break"; btnB.classList.add("btn-orange");
    } else if (st === "break") {
        msg.innerText = "En Break"; btnA.innerText = "Vuelve para salir"; btnA.disabled = true; btnB.innerText = "Fin Break"; btnB.classList.add("btn-orange");
    }
}

// --- ADMIN LOGIC ---
function listenAdmin() {
    onSnapshot(collection(db, "users"), snap => {
        usersCache = snap.docs.map(d => ({id: d.id, ...d.data()}));
        draw();
    });
    onSnapshot(collection(db, "attendance"), snap => {
        attendanceCache = snap.docs.map(d => ({id: d.id, ...d.data()}));
        draw();
    });
}

function draw() {
    const list = document.getElementById("adminHistoryList");
    const staff = usersCache.filter(u => u.role !== 'admin');
    const counts = { trabajando: 0, break: 0, inicio: 0 };

    list.innerHTML = staff.map(u => {
        let est = u.estado || 'inicio';
        if (est === 'ingreso' || est === 'regreso') est = 'trabajando';
        if (est === 'salida') est = 'inicio';
        counts[est]++;

        const regs = attendanceCache.filter(r => r.userId === u.id).sort((a,b) => (b.horaServidor?.seconds || 0) - (a.horaServidor?.seconds || 0));

        return `
            <div class="employee-block" id="b-${u.id}">
                <div class="employee-summary" onclick="document.getElementById('b-${u.id}').classList.toggle('open')">
                    <strong>${u.nombre}</strong><span>${u.turno || 'T1'}</span><span>${est}</span><span>${regs.filter(r=>r.tipo==='break').length}</span><span>Historial ▼</span>
                </div>
                <div class="employee-details hidden">
                   ${regs.map(r => `
                        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                            <span>${r.tipo} - ${r.horaServidor ? new Date(r.horaServidor.seconds*1000).toLocaleTimeString() : '...'}</span>
                            <div>
                                <button onclick="window.v('${r.id}')">${r.validado ? '✅' : 'Validar'}</button>
                                <button onclick="window.e('${r.id}', '${u.id}')">Eliminar</button>
                            </div>
                        </div>
                   `).join('')}
                </div>
            </div>
        `;
    }).join("");

    document.getElementById("countTrabajando").innerText = counts.trabajando;
    document.getElementById("countBreak").innerText = counts.break;
    document.getElementById("countTotal").innerText = staff.length;
}

// --- GLOBAL ACTIONS ---
window.v = async (id) => await updateDoc(doc(db, "attendance", id), { validado: true });
window.e = async (id, uid) => { 
    if(confirm("¿Borrar?")) {
        await deleteDoc(doc(db, "attendance", id));
        const q = query(collection(db, "attendance"), where("userId", "==", uid), orderBy("horaServidor", "desc"), limit(1));
        const s = await getDocs(q);
        await updateDoc(doc(db, "users", uid), { estado: s.empty ? "inicio" : s.docs[0].data().tipo });
    }
};

// --- EVENTS ---
document.getElementById("btnAsistencia").onclick = () => { if(estadoActual === "inicio") action("ingreso"); else if(estadoActual !== "break") action("salida"); };
document.getElementById("btnBreak").onclick = () => { if(estadoActual === "break") action("regreso"); else action("break"); };
document.getElementById("btnLogin").onclick = async () => {
    try { await signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value); } catch(e) { alert("Error"); }
};
document.getElementById("btnToggleSidebar").onclick = () => { document.getElementById("sidebar").classList.add("collapsed"); document.getElementById("btnOpenSidebar").classList.remove("hidden"); };
document.getElementById("btnOpenSidebar").onclick = () => { document.getElementById("sidebar").classList.remove("collapsed"); document.getElementById("btnOpenSidebar").classList.add("hidden"); };
document.getElementById("btnLogoutStaff").onclick = () => signOut(auth);
document.getElementById("btnLogoutAdmin").onclick = () => signOut(auth);
