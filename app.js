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


// aqui registramos el service worker
// esto permite instalar la PWA

if("serviceWorker" in navigator){

navigator.serviceWorker.register("service-worker.js")

}
