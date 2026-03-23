import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

const app = initializeApp(firebaseConfig);
let estado = "fuera"

const boton = document.getElementById("btnIngreso")

boton.onclick = () => {

if(estado === "fuera"){

boton.innerText = "REGISTRAR SALIDA"
estado = "trabajando"

}else{

boton.innerText = "REGISTRAR INGRESO"
estado = "fuera"

}

}
if('serviceWorker' in navigator){

navigator.serviceWorker.register('/service-worker.js')

}
