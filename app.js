// =============================
// IMPORTAR FIREBASE
// =============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"

import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"


// =============================
// CONFIGURACION FIREBASE
// =============================

const firebaseConfig = {
  apiKey: "AIzaSyB-L09L2xGVWtsJO1XE3CCj6F5p4XN2VPo",
  authDomain: "cafe-control-c05bb.firebaseapp.com",
  projectId: "cafe-control-c05bb",
  storageBucket: "cafe-control-c05bb.firebasestorage.app",
  messagingSenderId: "874681908082",
  appId: "1:874681908082:web:e8e87dd3d5a070deb47beb"
};


// iniciar firebase
const app = initializeApp(firebaseConfig)


// iniciar firestore
const db = getFirestore(app)


// iniciar auth
const auth = getAuth(app)


// =============================
// ELEMENTOS HTML
// =============================

const btnLogin = document.getElementById("btnLogin")

const email = document.getElementById("email")
const password = document.getElementById("password")

const loginDiv = document.getElementById("login")
const appDiv = document.getElementById("app")

const boton = document.getElementById("btnAsistencia")


// =============================
// ESTADO DEL TRABAJADOR
// =============================

let estado = "ingreso"


// =============================
// LOGIN
// =============================

btnLogin.onclick = async () => {

try{

await signInWithEmailAndPassword(
auth,
email.value,
password.value
)

}catch(error){

alert("Error login: " + error.message)

}

}


// =============================
// DETECTAR SESION ACTIVA
// =============================

onAuthStateChanged(auth, (user) => {

if(user){

loginDiv.style.display = "none"
appDiv.style.display = "block"

}else{

loginDiv.style.display = "block"
appDiv.style.display = "none"

}

})


// =============================
// REGISTRAR ASISTENCIA
// =============================

boton.onclick = async () => {

let tipo = estado


// hora actual
const ahora = new Date()

const hora = ahora.toLocaleTimeString()

const fecha = ahora.toLocaleDateString()


// guardar en firestore
await addDoc(collection(db, "attendance"), {

userId: auth.currentUser.uid,
email: auth.currentUser.email,
tipo: tipo,
hora: hora,
fecha: fecha

})


// =============================
// CAMBIO DE ESTADO
// =============================

if(estado === "ingreso"){

estado = "break"
boton.innerText = "INICIAR BREAK"

}else if(estado === "break"){

estado = "regreso"
boton.innerText = "REGRESAR DEL BREAK"

}else if(estado === "regreso"){

estado = "salida"
boton.innerText = "REGISTRAR SALIDA"

}else{

estado = "ingreso"
boton.innerText = "REGISTRAR INGRESO"

}

}


// =============================
// PWA SERVICE WORKER
// =============================

if("serviceWorker" in navigator){

navigator.serviceWorker.register("service-worker.js")

}

// =============================
// MOSTRAR CONTRASEÑA
// =============================

const togglePassword = document.getElementById("togglePassword")

togglePassword.onclick = () => {

if(password.type === "password"){

password.type = "text"

}else{

password.type = "password"

}

}
