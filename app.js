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
