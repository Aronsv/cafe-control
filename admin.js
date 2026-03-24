// =============================
// SECCION 1 - IMPORT FIREBASE
// =============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"

import {
getFirestore,
collection,
onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"


// =============================
// SECCION 2 - CONFIG FIREBASE
// =============================

const firebaseConfig = {

apiKey: "TU_APIKEY",
authDomain: "TU_AUTHDOMAIN",
projectId: "TU_PROJECTID",
storageBucket: "TU_STORAGE",
messagingSenderId: "TU_SENDER",
appId: "TU_APP"

}

const app = initializeApp(firebaseConfig)

const db = getFirestore(app)


// =============================
// SECCION 3 - ELEMENTOS HTML
// =============================

const lista = document.getElementById("listaUsuarios")


// =============================
// SECCION 4 - ESCUCHAR USUARIOS
// =============================

onSnapshot(collection(db,"users"),(snapshot)=>{
  
console.log("usuarios detectados:", snapshot.size)

lista.innerHTML=""

snapshot.forEach(doc=>{

const data = doc.data()

let estadoIcono="⚪"

if(data.estado==="trabajando") estadoIcono="🟢"

if(data.estado==="break") estadoIcono="☕"

const fila = document.createElement("div")

fila.className="filaUsuario"

fila.innerHTML=`

${data.email}

<span>${estadoIcono}</span>

`

lista.appendChild(fila)

})

})
