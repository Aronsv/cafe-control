// ===============================
// IMPORT FIREBASE
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"

import { 
getAuth,
signInWithEmailAndPassword,
onAuthStateChanged
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
// CONFIG FIREBASE
// ===============================

const firebaseConfig = {
  apiKey: "AIzaSyB-L09L2xGVWtsJO1XE3CCj6F5p4XN2VPo",
  authDomain: "cafe-control-c05bb.firebaseapp.com",
  projectId: "cafe-control-c05bb",
  storageBucket: "cafe-control-c05bb.firebasestorage.app",
  messagingSenderId: "874681908082",
  appId: "1:874681908082:web:e8e87dd3d5a070deb47beb"
};

const app = initializeApp(firebaseConfig)

const auth = getAuth(app)

const db = getFirestore(app)


// ===============================
// VARIABLES
// ===============================

let estado = "inicio"
let nombreEmpleado = ""


// ===============================
// ELEMENTOS HTML
// ===============================

const loginBox = document.getElementById("loginBox")
const appBox = document.getElementById("appBox")

const emailInput = document.getElementById("email")
const passInput = document.getElementById("password")

const btnLogin = document.getElementById("btnLogin")

const btnAsistencia = document.getElementById("btnAsistencia")
const btnBreak = document.getElementById("btnBreak")

const mensaje = document.getElementById("mensaje")


// ===============================
// LOGIN
// ===============================

btnLogin.addEventListener("click", async () => {

try {

await signInWithEmailAndPassword(
auth,
emailInput.value,
passInput.value
)

} catch (error) {

alert("Error login: " + error.message)

}

})


// ===============================
// SESION ACTIVA
// ===============================

onAuthStateChanged(auth, async (user) => {

if (user) {

loginBox.style.display = "none"
appBox.style.display = "block"

await cargarEstado()

} else {

loginBox.style.display = "block"
appBox.style.display = "none"

}

})


// ===============================
// CARGAR ESTADO
// ===============================

async function cargarEstado() {

const ref = doc(db, "users", auth.currentUser.uid)

const snap = await getDoc(ref)

if (!snap.exists()) {

estado = "inicio"
actualizarUI()
return

}

const data = snap.data()

estado = data.estado
nombreEmpleado = data.nombre || ""

actualizarUI()

}


// ===============================
// ACTUALIZAR UI
// ===============================

function actualizarUI() {

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

btnBreak.disabled = false

}

else if (estado === "break") {

mensaje.innerText = "Estás en tu tiempo de descanso"

btnAsistencia.innerText = "Registrar salida"

btnBreak.innerText = "Regresar del break"

btnBreak.disabled = false

}

}


// ===============================
// REGISTRAR HISTORIAL
// ===============================

async function registrar(tipoRegistro) {

await addDoc(collection(db, "attendance"), {

userId: auth.currentUser.uid,
nombre: nombreEmpleado,
tipo: tipoRegistro,
horaServidor: serverTimestamp(),
validado: false

})

}


// ===============================
// GUARDAR ESTADO
// ===============================

async function guardarEstado(nuevoEstado) {

await setDoc(
doc(db, "users", auth.currentUser.uid),
{
estado: nuevoEstado
},
{ merge: true }
)

estado = nuevoEstado

actualizarUI()

}


// ===============================
// BOTON ASISTENCIA
// ===============================

btnAsistencia.addEventListener("click", async () => {

if (estado === "inicio") {

await registrar("ingreso")
await guardarEstado("trabajando")

}

else if (estado === "trabajando") {

await registrar("salida")
await guardarEstado("inicio")

}

else if (estado === "break") {

mensaje.innerText = "Primero debes regresar de tu break"

}

})


// ===============================
// BOTON BREAK
// ===============================

btnBreak.addEventListener("click", async () => {

if (estado === "trabajando") {

await registrar("break")
await guardarEstado("break")

}

else if (estado === "break") {

await registrar("regreso")
await guardarEstado("trabajando")

}

else {

mensaje.innerText = "Tu jornada aún no ha comenzado"

}

})
const btnLogout = document.getElementById("btnLogout")
btnLogout.addEventListener("click", async () => {

await signOut(auth)

})
