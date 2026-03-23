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
