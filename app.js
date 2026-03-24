// importamos firebase desde su CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"

import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"


// configuracion de tu proyecto firebase
// reemplaza estos valores con los tuyos

const firebaseConfig = {
  apiKey: "AIzaSyB-L09L2xGVWtsJO1XE3CCj6F5p4XN2VPo",
  authDomain: "cafe-control-c05bb.firebaseapp.com",
  projectId: "cafe-control-c05bb",
  storageBucket: "cafe-control-c05bb.firebasestorage.app",
  messagingSenderId: "874681908082",
  appId: "1:874681908082:web:e8e87dd3d5a070deb47beb"
};


// iniciamos firebase
const app = initializeApp(firebaseConfig)


// iniciamos la base de datos firestore
const db = getFirestore(app)
// estado inicial del trabajador
let estado = "fuera"

// obtenemos el boton del html
const boton = document.getElementById("btnAsistencia")

// evento cuando se presiona el boton
boton.onclick = () => {

    // si el trabajador esta fuera
    if(estado === "fuera"){

        boton.innerText = "REGISTRAR SALIDA"

        estado = "trabajando"

    }else{

        boton.innerText = "REGISTRAR INGRESO"

        estado = "fuera"

    }

}

// obtener hora actual

const ahora = new Date()

const hora = ahora.toLocaleTimeString()

const fecha = ahora.toLocaleDateString()


// guardar en firebase

try{

await addDoc(collection(db, "attendance"), {

usuario: "prueba",
tipo: tipo,
hora: hora,
fecha: fecha

})

console.log("asistencia guardada")

}catch(error){

console.error("error guardando", error)

}

// registrar service worker para la PWA

if("serviceWorker" in navigator){

navigator.serviceWorker.register("service-worker.js")

}
