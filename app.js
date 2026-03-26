// ===============================
// SECCION 1 - IMPORT FIREBASE
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
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
// SECCION 3 - VARIABLES GLOBALES
// ===============================

let estado = "inicio"
let nombreEmpleado = ""
let turnoEmpleado = ""


// ===============================
// SECCION 4 - ELEMENTOS HTML
// ===============================

const loginBox = document.getElementById("loginBox")
const appBox = document.getElementById("appBox")

const emailInput = document.getElementById("email")
const passwordInput = document.getElementById("password")

const btnLogin = document.getElementById("btnLogin")
const btnAsistencia = document.getElementById("btnAsistencia")
const btnBreak = document.getElementById("btnBreak")
const btnLogout = document.getElementById("btnLogout")
const mensaje = document.getElementById("mensaje")


// ===============================
// SECCION 5 - LOGIN
// ===============================

btnLogin.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(
      auth,
      emailInput.value.trim(),
      passwordInput.value
    )
  } catch (error) {
    alert("Error login: " + error.message)
  }
})


// ===============================
// SECCION 6 - SESION ACTIVA
// - Mantiene la sesion al recargar
// - Carga el estado real del usuario
// ===============================

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginBox.classList.add("hidden")
    appBox.classList.remove("hidden")
    await cargarDatosUsuario()
    actualizarUI()
  } else {
    loginBox.classList.remove("hidden")
    appBox.classList.add("hidden")
  }
})


// ===============================
// SECCION 7 - CARGAR DATOS USUARIO
// - Lee nombre, estado y turno desde users/{uid}
// ===============================

async function cargarDatosUsuario() {
  const user = auth.currentUser
  if (!user) return

  const ref = doc(db, "users", user.uid)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    nombreEmpleado = ""
    turnoEmpleado = ""
    estado = "inicio"
    return
  }

  const data = snap.data()

  nombreEmpleado = data.nombre || ""
  turnoEmpleado = data.turno || ""
  estado = data.estado || "inicio"
}


// ===============================
// SECCION 8 - ACTUALIZAR INTERFAZ
// - Aqui se controla texto, color y bloqueo real
// ===============================

function actualizarUI() {
  // limpiar estados visuales previos
  btnAsistencia.className = "btn"
  btnBreak.className = "btn"

  if (estado === "inicio") {
    mensaje.innerText = "Tu jornada aún no ha comenzado"

    btnAsistencia.innerText = "Registrar ingreso"
    btnAsistencia.classList.add("btn-green-main")
    btnAsistencia.disabled = false

    btnBreak.innerText = "Iniciar break"
    btnBreak.classList.add("btn-green-soft")
    btnBreak.disabled = true
  }

  else if (estado === "trabajando") {
    mensaje.innerText = "Jornada en curso"

    btnAsistencia.innerText = "Registrar salida"
    btnAsistencia.classList.add("btn-green-main")
    btnAsistencia.disabled = false

    btnBreak.innerText = "Iniciar break"
    btnBreak.classList.add("btn-green-soft")
    btnBreak.disabled = false
  }

  else if (estado === "break") {
    mensaje.innerText = "Estás en tu tiempo de descanso"

    btnAsistencia.innerText = "Registrar salida"
    btnAsistencia.classList.add("btn-green-main")
    btnAsistencia.disabled = false

    btnBreak.innerText = "Regresar del break"
    btnBreak.classList.add("btn-red")
    btnBreak.disabled = false
  }
}


// ===============================
// SECCION 9 - REGISTRAR HISTORIAL
// - Guarda cada evento en attendance
// - Usa hora del servidor
// ===============================

async function registrar(tipoRegistro) {
  const user = auth.currentUser
  if (!user) return

  await addDoc(collection(db, "attendance"), {
    userId: user.uid,
    nombre: nombreEmpleado || user.email,
    turno: turnoEmpleado || "",
    tipo: tipoRegistro,
    horaServidor: serverTimestamp(),
    validado: false
  })
}


// ===============================
// SECCION 10 - GUARDAR ESTADO
// - Actualiza users/{uid}
// - Usa merge para no borrar nombre o turno
// ===============================

async function guardarEstado(nuevoEstado) {
  const user = auth.currentUser
  if (!user) return

  await setDoc(
    doc(db, "users", user.uid),
    {
      userId: user.uid,
      estado: nuevoEstado
    },
    { merge: true }
  )

  estado = nuevoEstado
}


// ===============================
// SECCION 11 - BOTON ASISTENCIA
// ===============================

btnAsistencia.addEventListener("click", async () => {
  if (estado === "inicio") {
    await registrar("ingreso")
    await guardarEstado("trabajando")
    actualizarUI()
    return
  }

  if (estado === "trabajando") {
    await registrar("salida")
    await guardarEstado("inicio")
    actualizarUI()
    return
  }

  if (estado === "break") {
    mensaje.innerText = "Primero debes regresar de tu break"
    return
  }
})


// ===============================
// SECCION 12 - BOTON BREAK
// - Bloqueo real: si esta disabled, no hace nada
// ===============================

btnBreak.addEventListener("click", async () => {
  if (btnBreak.disabled) {
    return
  }

  if (estado === "trabajando") {
    await registrar("break")
    await guardarEstado("break")
    actualizarUI()
    return
  }

  if (estado === "break") {
    await registrar("regreso")
    await guardarEstado("trabajando")
    actualizarUI()
    return
  }

  mensaje.innerText = "Tu jornada aún no ha comenzado"
})


// ===============================
// SECCION 13 - CERRAR SESION
// ===============================

btnLogout.addEventListener("click", async () => {
  await signOut(auth)
})
