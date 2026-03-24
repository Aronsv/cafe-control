// =============================
// SECCION 1 - IMPORT FIREBASE
// =============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"

import {
getAuth,
signInWithEmailAndPassword,
signOut,
onAuthStateChanged,
sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

import {
getFirestore,
collection,
addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

import {
doc,
setDoc,
getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"


// =============================
// SECCION 2 - CONFIG FIREBASE
// =============================

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


// =============================
// SECCION 3 - ELEMENTOS HTML
// =============================

const loginBox = document.getElementById("loginBox")
const appBox = document.getElementById("appBox")

const email = document.getElementById("email")
const password = document.getElementById("password")

const btnLogin = document.getElementById("btnLogin")
const btnLogout = document.getElementById("btnLogout")

const btnAsistencia = document.getElementById("btnAsistencia")
const btnBreak = document.getElementById("btnBreak")

const mensaje = document.getElementById("mensaje")

const resetPassword = document.getElementById("resetPassword")


// =============================
// SECCION 4 - ESTADO
// =============================

let estado = "inicio"


// =============================
// SECCION 5 - LOGIN
// =============================

btnLogin.onclick = async () => {

try{

await signInWithEmailAndPassword(
auth,
email.value,
password.value
)

}catch(error){

alert(error.message)

}

}


// =============================
// SECCION 6 - SESION
// =============================

onAuthStateChanged(auth,(user)=>{

if(user){

loginBox.classList.add("hidden")
appBox.classList.remove("hidden")

cargarEstado()

}else{

loginBox.classList.remove("hidden")
appBox.classList.add("hidden")

}

})


// =============================
// SECCION 7 - LOGOUT
// =============================

btnLogout.onclick = ()=>{

signOut(auth)

}


// =============================
// SECCION 8 - RECUPERAR PASSWORD
// =============================

resetPassword.onclick = async()=>{

if(email.value===""){

alert("Escribe tu correo primero")
return

}

await sendPasswordResetEmail(auth,email.value)

alert("Correo enviado")

}


// =============================
// SECCION 9 - REGISTRAR EVENTO
// =============================

async function registrar(tipo){

const ahora = new Date()

await addDoc(collection(db,"attendance"),{

email:auth.currentUser.email,
userId:auth.currentUser.uid,

tipo:tipo,

hora:ahora.toLocaleTimeString(),
fecha:ahora.toLocaleDateString()

})

}

// =============================
// GUARDAR ESTADO ACTUAL
// =============================

async function guardarEstado(nuevoEstado){

await setDoc(
doc(db,"users",auth.currentUser.uid),
{
email:auth.currentUser.email,
estado:nuevoEstado
}
)

}


// =============================
// SECCION 10 - BOTON ASISTENCIA
// =============================

btnAsistencia.onclick = async()=>{

if(estado==="inicio"){

await guardarEstado("trabajando")

estado="trabajando"

mensaje.innerText="Tu jornada ha comenzado"

btnAsistencia.innerText="Registrar salida"

btnBreak.className="btn-verde"

}

else if(estado==="trabajando"){

await guardarEstado("inicio")

estado="inicio"

mensaje.innerText="Tu jornada ha finalizado"

btnAsistencia.innerText="Registrar ingreso"

btnBreak.className="btn-disabled"

}

}


// =============================
// SECCION 11 - BOTON BREAK
// =============================

btnBreak.onclick = async()=>{

if(estado==="trabajando"){

await guardarEstado("break")

estado="break"

mensaje.innerText="Disfruta tu tiempo de break"

btnBreak.innerText="Regresar de break"

btnBreak.className="btn-rojo"

}

else if(estado==="break"){

await guardarEstado("trabajando")

estado="trabajando"

mensaje.innerText="Has regresado a tu jornada"

btnBreak.innerText="Iniciar break"

btnBreak.className="btn-verde"

}

}
// =============================
// CARGAR ESTADO AL INICIAR
// =============================

async function cargarEstado(){

const ref = doc(db,"users",auth.currentUser.uid)

const snap = await getDoc(ref)

if(!snap.exists()){

estado="inicio"
actualizarUI()

return

}

estado = snap.data().estado

actualizarUI()

}

// =============================
// ACTUALIZAR UI SEGUN ESTADO
// =============================

function actualizarUI(){

if(estado==="inicio"){

mensaje.innerText="Tu jornada aún no ha comenzado"

btnAsistencia.innerText="Registrar ingreso"

btnBreak.innerText="Iniciar break"

btnBreak.className="btn-disabled"

}

else if(estado==="trabajando"){

mensaje.innerText="Tu jornada ha comenzado"

btnAsistencia.innerText="Registrar salida"

btnBreak.innerText="Iniciar break"

btnBreak.className="btn-verde"

}

else if(estado==="break"){

mensaje.innerText="Disfruta tu tiempo de break"

btnAsistencia.innerText="Registrar salida"

btnBreak.innerText="Regresar de break"

btnBreak.className="btn-rojo"

}

}
