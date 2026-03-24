// firebase app
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"

// firestore
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

// autenticacion
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"


// configuracion firebase
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


// elementos html
const btnLogin = document.getElementById("btnLogin")
const email = document.getElementById("email")
const password = document.getElementById("password")

const loginDiv = document.getElementById("login")
const appDiv = document.getElementById("app")

const boton = document.getElementById("btnAsistencia")


// estado asistencia
let estado = "fuera"


// login
btnLogin.onclick = async () => {

await signInWithEmailAndPassword(
auth,
email.value,
password.value
)

}


// detectar usuario logueado
onAuthStateChanged(auth, (user) => {

if(user){

loginDiv.style.display = "none"
appDiv.style.display = "block"

}else{

loginDiv.style.display = "block"
appDiv.style.display = "none"

}

})


// registrar asistencia
boton.onclick = async () => {

let tipo = ""

if(estado === "fuera"){

tipo = "ingreso"
boton.innerText = "REGISTRAR SALIDA"
estado = "trabajando"

}else{

tipo = "salida"
boton.innerText = "REGISTRAR INGRESO"
estado = "fuera"

}

const ahora = new Date()

const hora = ahora.toLocaleTimeString()
const fecha = ahora.toLocaleDateString()

await addDoc(collection(db, "attendance"), {

userId: auth.currentUser.uid,
email: auth.currentUser.email,
tipo: tipo,
hora: hora,
fecha: fecha

})

}


// registrar service worker
if("serviceWorker" in navigator){

navigator.serviceWorker.register("service-worker.js")

}
