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
    // Reset de clases para evitar conflictos
    btnAsistencia.classList.remove("btn-green", "btn-red");
    btnBreak.classList.remove("btn-orange");
    btnAsistencia.disabled = false; // Aseguramos que empiece habilitado

    if (estadoActual === "inicio" || estadoActual === "salida") {
        mensajeStaff.innerText = "Tu jornada aún no ha comenzado";
        btnAsistencia.innerText = "Registrar ingreso";
        btnAsistencia.classList.add("btn-green");
        btnBreak.disabled = true;
    } 
    else if (estadoActual === "ingreso" || estadoActual === "regreso" || estadoActual === "trabajando") {
        mensajeStaff.innerText = "En jornada de trabajo";
        btnAsistencia.innerText = "Registrar salida";
        btnAsistencia.classList.add("btn-red");
        btnBreak.innerText = "Iniciar break";
        btnBreak.classList.add("btn-orange");
        btnBreak.disabled = false;
    } 
    else if (estadoActual === "break") {
        mensajeStaff.innerText = "Estás en descanso (Break)";
        btnAsistencia.innerText = "Regresa del break para salir";
        btnAsistencia.disabled = true; // Aquí sí se bloquea porque está almorzando/descansando
        btnBreak.innerText = "Finalizar break";
        btnBreak.classList.add("btn-orange");
        btnBreak.disabled = false;
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
