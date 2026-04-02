// ===============================
// SECCION 1 - IMPORT FIREBASE
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  query,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"


// ===============================
// SECCION 2 - CONFIG FIREBASE
// ===============================

const firebaseConfig = {
  apiKey: "AIzaSyB-L09L2xGVWtsJO1XE3CCj6F5p4XN2VPo",
  authDomain: "cafe-control-c05bb.firebaseapp.com",
  projectId: "cafe-control-c05bb",
  storageBucket: "cafe-control-c05bb.firebasestorage.app",
  messagingSenderId: "874681908082",
  appId: "1:874681908082:web:e8e87dd3d5a070deb47beb"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)


// ===============================
// VARIABLES
// ===============================

let estado = "inicio"
let nombreEmpleado = ""
let turnoEmpleado = ""
let roleUsuario = ""
let usersCache = []
let attendanceCache = []


// ===============================
// ELEMENTOS HTML
// ===============================

const loginView = document.getElementById("loginView")
const staffView = document.getElementById("staffView")
const adminView = document.getElementById("adminView")

const emailInput = document.getElementById("email")
const passwordInput = document.getElementById("password")
const btnLogin = document.getElementById("btnLogin")
const togglePassword = document.getElementById("togglePassword")
const resetPassword = document.getElementById("resetPassword")

const btnAsistencia = document.getElementById("btnAsistencia")
const btnBreak = document.getElementById("btnBreak")
const btnLogout = document.getElementById("btnLogout")

const mensaje = document.getElementById("mensajeStaff")

const adminHistoryList = document.getElementById("adminHistoryList")


// ===============================
// LOGIN
// ===============================

if (btnLogin) {
  btnLogin.onclick = async () => {
    try {
      await signInWithEmailAndPassword(
        auth,
        emailInput.value,
        passwordInput.value
      )
    } catch (error) {
      alert("Error login: " + error.message)
    }
  }
}

// mostrar contraseña
if (togglePassword) {
  togglePassword.onclick = () => {
    passwordInput.type =
      passwordInput.type === "password" ? "text" : "password"
  }
}

// recuperar contraseña
if (resetPassword) {
  resetPassword.onclick = async () => {
    if (!emailInput.value) {
      alert("Escribe tu correo primero")
      return
    }

    await sendPasswordResetEmail(auth, emailInput.value)
    alert("Correo enviado")
  }
}


// ===============================
// SESION
// ===============================

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    mostrar("login")
    return
  }

  const snap = await getDoc(doc(db, "users", user.uid))

  if (!snap.exists()) {
    alert("Usuario no registrado")
    await signOut(auth)
    return
  }

  const data = snap.data()

  nombreEmpleado = data.nombre || ""
  turnoEmpleado = data.turno || ""
  estado = data.estado || "inicio"
  roleUsuario = data.role || "staff"

  if (roleUsuario === "admin") {
    mostrar("admin")
    iniciarAdmin()
  } else {
    mostrar("staff")
    actualizarUI()
  }

})


// ===============================
// MOSTRAR VISTAS
// ===============================

function mostrar(tipo) {

  loginView?.classList.add("hidden")
  staffView?.classList.add("hidden")
  adminView?.classList.add("hidden")

  if (tipo === "login") loginView?.classList.remove("hidden")
  if (tipo === "staff") staffView?.classList.remove("hidden")
  if (tipo === "admin") adminView?.classList.remove("hidden")

}


// ===============================
// UI STAFF
// ===============================

function actualizarUI() {

  if (!btnAsistencia || !btnBreak || !mensaje) return

  btnBreak.disabled = false

  if (estado === "inicio") {

    mensaje.innerText = "Tu jornada aún no ha comenzado"

    btnAsistencia.innerText = "Registrar ingreso"
    btnBreak.innerText = "Iniciar break"
    btnBreak.disabled = true

  }

  else if (estado === "trabajando") {

    mensaje.innerText = "Jornada en curso"

    btnAsistencia.innerText = "Registrar salida"
    btnBreak.innerText = "Iniciar break"

  }

  else if (estado === "break") {

    mensaje.innerText = "Estás en descanso"

    btnAsistencia.innerText = "Registrar salida"
    btnBreak.innerText = "Regresar del break"

  }

}

// ===============================
// REGISTRAR
// ===============================

async function registrar(tipo) {
  const user = auth.currentUser;
  
  // Buscamos el último registro para manejar turnos
  const q = query(
    collection(db, "attendance"),
    where("userId", "==", user.uid),
    orderBy("horaServidor", "desc"),
    limit(1)
  );
  
  const snap = await getDocs(q);
  let turnoActual = turnoEmpleado || "Turno 1";

  // Lógica de incremento de turno: Si el último registro fue 'salida', este ingreso es un nuevo turno
  if (!snap.empty) {
    const ultimo = snap.docs[0].data();
    if (ultimo.tipo === "salida" && tipo === "ingreso") {
      const num = parseInt(ultimo.turno.split(" ")[1]) + 1;
      turnoActual = `Turno ${num}`;
    } else {
      turnoActual = ultimo.turno;
    }
  }

  const docRef = await addDoc(collection(db, "attendance"), {
    userId: user.uid,
    nombre: nombreEmpleado,
    turno: turnoActual,
    tipo: tipo, // "ingreso", "break", "regreso", "salida"
    horaServidor: serverTimestamp(),
    validado: false,
    observacion: ""
  });
  
  return turnoActual;
}


// ===============================
// GUARDAR ESTADO
// ===============================

async function guardarEstado(nuevoEstado) {

  await setDoc(
    doc(db, "users", auth.currentUser.uid),
    { estado: nuevoEstado },
    { merge: true }
  )

  estado = nuevoEstado

}


// ===============================
// BOTONES
// ===============================

if (btnAsistencia) {
  btnAsistencia.onclick = async () => {
    btnAsistencia.disabled = true; // Evitar doble click
    
    if (estado === "inicio") {
      const nuevoTurno = await registrar("ingreso");
      // Actualizamos el turno en el perfil del usuario también
      await updateDoc(doc(db, "users", auth.currentUser.uid), { 
        estado: "trabajando",
        turno: nuevoTurno 
      });
      estado = "trabajando";
    } 
    else if (estado === "trabajando") {
      await registrar("salida");
      await guardarEstado("inicio");
    }
    
    btnAsistencia.disabled = false;
    actualizarUI();
  };
}

if (btnBreak) {
  btnBreak.onclick = async () => {
    if (estado === "trabajando") {
      await registrar("break");
      await guardarEstado("break");
    } 
    else if (estado === "break") {
      await registrar("regreso");
      await guardarEstado("trabajando");
    }
    actualizarUI();
  };
}

// ===============================
// LOGOUT
// ===============================

if (btnLogout) {
  btnLogout.onclick = () => signOut(auth)
}


// ===============================
// ADMIN DASHBOARD
// ===============================

function iniciarAdmin() {

  onSnapshot(collection(db, "users"), snap => {

    usersCache = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))

    renderAdmin()

  })

  onSnapshot(collection(db, "attendance"), snap => {

    attendanceCache = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }))

    renderAdmin()

  })

}


// ===============================
// RENDER ADMIN
// ===============================

function renderAdmin() {

  if (!adminHistoryList) return

  const html = usersCache.map(user => {

    const registros = attendanceCache.filter(r => r.userId === user.userId)

    const lista = registros.map(r => `
      <div>
        ${r.tipo} - ${r.horaEditada || "hora"}
        <button onclick="editar('${r.id}')">Editar</button>
        <button onclick="borrar('${r.id}')">Borrar</button>
        <button onclick="validar('${r.id}')">OK</button>
      </div>
    `).join("")

    return `
      <div>
        <h3>${user.nombre}</h3>
        ${lista}
      </div>
    `

  }).join("")

  adminHistoryList.innerHTML = html

}


// ===============================
// ADMIN ACCIONES
// ===============================

window.validar = async (id) => {

  await updateDoc(doc(db, "attendance", id), {
    validado: true,
    validadoEn: serverTimestamp()
  })

}

window.editar = async (id) => {

  const nueva = prompt("Nueva hora HH:MM")
  if (!nueva) return

  await updateDoc(doc(db, "attendance", id), {
    horaEditada: nueva
  })

}

window.borrar = async (id) => {

  if (!confirm("¿Borrar?")) return

  await deleteDoc(doc(db, "attendance", id))

}
