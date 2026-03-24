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
  apiKey: "AIzaSyB-L09L2xGVWtsJO1XE3CCj6F5p4XN2VPo",
  authDomain: "cafe-control-c05bb.firebaseapp.com",
  projectId: "cafe-control-c05bb",
  storageBucket: "cafe-control-c05bb.firebasestorage.app",
  messagingSenderId: "874681908082",
  appId: "1:874681908082:web:e8e87dd3d5a070deb47beb"
};

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
