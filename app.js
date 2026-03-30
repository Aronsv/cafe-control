// ===============================
// SECCION 1 - IMPORT FIREBASE
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"


// ===============================
// SECCION 2 - CONFIG FIREBASE
// ===============================

const firebaseConfig = {
  apiKey: "AIzaSyB-L09L2xGVWtsJO1XE3CCj6F5p4XN2VPo",
  authDomain: "cafe-control-c05bb.firebaseapp.com",
  projectId: "cafe-control-c05bb",
  storageBucket: "cafe-control-c05bb.firebasestorage.app",
  messagingSenderId: "874681908082",
  appId: "1:874681908082:web:e8e87dd3d5a070deb47beb"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)


// ===============================
// SECCION 3 - VARIABLES
// ===============================

let estado = "inicio"
let nombreEmpleado = ""
let turnoEmpleado = ""
let roleUsuario = ""
let dashboardUnsubscribeUsers = null
let dashboardUnsubscribeAttendance = null
let usersCache = []
let attendanceCache = []


// ===============================
// SECCION 4 - ELEMENTOS HTML
// ===============================

// login
const loginView = document.getElementById("loginView")
const emailInput = document.getElementById("email")
const passwordInput = document.getElementById("password")
const togglePassword = document.getElementById("togglePassword")
const btnLogin = document.getElementById("btnLogin")
const resetPassword = document.getElementById("resetPassword")
const loginMsg = document.getElementById("loginMsg")

// staff
const staffView = document.getElementById("staffView")
const mensajeStaff = document.getElementById("mensajeStaff")
const btnAsistencia = document.getElementById("btnAsistencia")
const btnBreak = document.getElementById("btnBreak")
const btnLogoutStaff = document.getElementById("btnLogoutStaff")

// admin
const adminView = document.getElementById("adminView")
const btnLogoutAdmin = document.getElementById("btnLogoutAdmin")
const countTrabajando = document.getElementById("countTrabajando")
const countBreak = document.getElementById("countBreak")
const countInicio = document.getElementById("countInicio")
const countTotal = document.getElementById("countTotal")
const adminHistoryList = document.getElementById("adminHistoryList")
const arcTrabajando = document.getElementById("arcTrabajando")
const arcBreak = document.getElementById("arcBreak")
const arcInicio = document.getElementById("arcInicio")


// ===============================
// SECCION 5 - HELPERS DE VISTA
// ===============================

function ocultarTodasLasVistas() {
  if (loginView) loginView.classList.add("hidden")
  if (staffView) staffView.classList.add("hidden")
  if (adminView) adminView.classList.add("hidden")
}

function mostrarVista(nombreVista) {
  ocultarTodasLasVistas()

  if (nombreVista === "login" && loginView) loginView.classList.remove("hidden")
  if (nombreVista === "staff" && staffView) staffView.classList.remove("hidden")
  if (nombreVista === "admin" && adminView) adminView.classList.remove("hidden")
}

function detenerDashboard() {
  if (dashboardUnsubscribeUsers) {
    dashboardUnsubscribeUsers()
    dashboardUnsubscribeUsers = null
  }

  if (dashboardUnsubscribeAttendance) {
    dashboardUnsubscribeAttendance()
    dashboardUnsubscribeAttendance = null
  }

  usersCache = []
  attendanceCache = []
}


// ===============================
// SECCION 6 - LOGIN
// ===============================

if (btnLogin) {
  btnLogin.addEventListener("click", async () => {
    try {
      if (loginMsg) loginMsg.innerText = ""

      await signInWithEmailAndPassword(
        auth,
        emailInput.value.trim(),
        passwordInput.value
      )
    } catch (error) {
      if (loginMsg) loginMsg.innerText = "Error: " + error.message
    }
  })
}

if (togglePassword) {
  togglePassword.addEventListener("click", () => {
    if (!passwordInput) return

    passwordInput.type =
      passwordInput.type === "password" ? "text" : "password"
  })
}

if (resetPassword) {
  resetPassword.addEventListener("click", async () => {
    try {
      const correo = emailInput.value.trim()

      if (!correo) {
        if (loginMsg) loginMsg.innerText = "Escribe tu correo primero."
        return
      }

      await sendPasswordResetEmail(auth, correo)

      if (loginMsg) {
        loginMsg.innerText = "Te enviamos un correo para recuperar tu contraseña."
      }
    } catch (error) {
      if (loginMsg) loginMsg.innerText = "Error: " + error.message
    }
  })
}


// ===============================
// SECCION 7 - SESION ACTIVA
// ===============================

onAuthStateChanged(auth, async (user) => {
  try {
    detenerDashboard()

    if (!user) {
      mostrarVista("login")
      return
    }

    const ref = doc(db, "users", user.uid)
    const snap = await getDoc(ref)

    if (!snap.exists()) {
      mostrarVista("login")
      if (loginMsg) loginMsg.innerText = "Tu usuario no tiene perfil en Firestore."
      await signOut(auth)
      return
    }

    const data = snap.data()

    nombreEmpleado = data.nombre || ""
    turnoEmpleado = data.turno || ""
    estado = data.estado || "inicio"
    roleUsuario = data.role || "staff"

    if (roleUsuario === "admin") {
      mostrarVista("admin")
      iniciarDashboard()
      return
    }

    mostrarVista("staff")
    actualizarUIStaff()

  } catch (error) {
    console.error(error)
    mostrarVista("login")
    if (loginMsg) loginMsg.innerText = "No se pudo cargar tu sesión."
  }
})


// ===============================
// SECCION 8 - UI STAFF
// ===============================

function actualizarUIStaff() {
  if (!btnAsistencia || !btnBreak || !mensajeStaff) return

  btnAsistencia.className = "btn"
  btnBreak.className = "btn"

  if (estado === "inicio") {
    mensajeStaff.innerText = "Tu jornada aún no ha comenzado"

    btnAsistencia.innerText = "Registrar ingreso"
    btnAsistencia.classList.add("btn-green-main")
    btnAsistencia.disabled = false

    btnBreak.innerText = "Iniciar break"
    btnBreak.classList.add("btn-green-soft")
    btnBreak.disabled = true
  }

  else if (estado === "trabajando") {
    mensajeStaff.innerText = "Jornada en curso"

    btnAsistencia.innerText = "Registrar salida"
    btnAsistencia.classList.add("btn-green-main")
    btnAsistencia.disabled = false

    btnBreak.innerText = "Iniciar break"
    btnBreak.classList.add("btn-green-soft")
    btnBreak.disabled = false
  }

  else if (estado === "break") {
    mensajeStaff.innerText = "Estás en tu tiempo de descanso"

    btnAsistencia.innerText = "Registrar salida"
    btnAsistencia.classList.add("btn-green-main")
    btnAsistencia.disabled = false

    btnBreak.innerText = "Regresar del break"
    btnBreak.classList.add("btn-red")
    btnBreak.disabled = false
  }
}


// ===============================
// SECCION 9 - REGISTRAR HISTORIAL
// ===============================

async function registrar(tipoRegistro) {
  const user = auth.currentUser
  if (!user) return

  await addDoc(collection(db, "attendance"), {
    userId: user.uid,
    nombre: nombreEmpleado || user.email,
    turno: turnoEmpleado || "",
    tipo: tipoRegistro,
    horaServidor: serverTimestamp(),
    validado: false
  })
}


// ===============================
// SECCION 10 - GUARDAR ESTADO
// ===============================

async function guardarEstado(nuevoEstado) {
  const user = auth.currentUser
  if (!user) return

  await setDoc(
    doc(db, "users", user.uid),
    {
      userId: user.uid,
      estado: nuevoEstado
    },
    { merge: true }
  )

  estado = nuevoEstado
}


// ===============================
// SECCION 11 - BOTONES STAFF
// ===============================

if (btnAsistencia) {
  btnAsistencia.addEventListener("click", async () => {
    if (staffView?.classList.contains("hidden")) return

    if (estado === "inicio") {
      await registrar("ingreso")
      await guardarEstado("trabajando")
      actualizarUIStaff()
      return
    }

    if (estado === "trabajando") {
      await registrar("salida")
      await guardarEstado("inicio")
      actualizarUIStaff()
      return
    }

    if (estado === "break" && mensajeStaff) {
      mensajeStaff.innerText = "Primero debes regresar de tu break"
    }
  })
}

if (btnBreak) {
  btnBreak.addEventListener("click", async () => {
    if (staffView?.classList.contains("hidden")) return
    if (btnBreak.disabled) return

    if (estado === "trabajando") {
      await registrar("break")
      await guardarEstado("break")
      actualizarUIStaff()
      return
    }

    if (estado === "break") {
      await registrar("regreso")
      await guardarEstado("trabajando")
      actualizarUIStaff()
      return
    }

    if (mensajeStaff) mensajeStaff.innerText = "Tu jornada aún no ha comenzado"
  })
}

if (btnLogoutStaff) {
  btnLogoutStaff.addEventListener("click", async () => {
    await signOut(auth)
  })
}

if (btnLogoutAdmin) {
  btnLogoutAdmin.addEventListener("click", async () => {
    await signOut(auth)
  })
}


// ===============================
// SECCION 12 - DASHBOARD ADMIN
// ===============================

function iniciarDashboard() {
  const usersQuery = query(collection(db, "users"))
  const attendanceQuery = query(collection(db, "attendance"))

  dashboardUnsubscribeUsers = onSnapshot(usersQuery, (usersSnapshot) => {
    usersCache = usersSnapshot.docs.map(docItem => ({
      id: docItem.id,
      ...docItem.data()
    }))

    renderDashboardAdmin()
  })

  dashboardUnsubscribeAttendance = onSnapshot(attendanceQuery, (attendanceSnapshot) => {
    attendanceCache = attendanceSnapshot.docs.map(docItem => ({
      id: docItem.id,
      ...docItem.data()
    }))

    renderDashboardAdmin()
  })
}

function renderDashboardAdmin() {
  if (!adminHistoryList) return

  const trabajadores = usersCache.filter(user => user.activo !== false && user.role !== "admin")

  const enTurno = trabajadores.filter(user => user.estado === "trabajando").length
  const enBreak = trabajadores.filter(user => user.estado === "break").length
  const pendientes = trabajadores.filter(user => user.estado === "inicio").length
  const total = trabajadores.length

  if (countTrabajando) countTrabajando.innerText = enTurno
  if (countBreak) countBreak.innerText = enBreak
  if (countInicio) countInicio.innerText = pendientes
  if (countTotal) countTotal.innerText = total

  actualizarDonut(enTurno, enBreak, pendientes, total)
  renderHistorialAdmin(trabajadores)
}


// ===============================
// SECCION 13 - DONUT
// ===============================

function actualizarDonut(enTurno, enBreak, pendientes, total) {
  if (!arcTrabajando || !arcBreak || !arcInicio) return

  if (total === 0) {
    setSegment(arcTrabajando, 0, 0)
    setSegment(arcBreak, 0, 0)
    setSegment(arcInicio, 0, 0)
    return
  }

  const p1 = (enTurno / total) * 100
  const p2 = (enBreak / total) * 100
  const p3 = (pendientes / total) * 100

  setSegment(arcTrabajando, p1, 0)
  setSegment(arcBreak, p2, p1)
  setSegment(arcInicio, p3, p1 + p2)
}

function setSegment(el, value, offset) {
  el.style.strokeDasharray = `${value} ${100 - value}`
  el.style.strokeDashoffset = `${-offset}`
}


// ===============================
// SECCION 14 - HISTORIAL ADMIN
// ===============================

function renderHistorialAdmin(users) {
  if (!adminHistoryList) return

  if (users.length === 0) {
    adminHistoryList.innerHTML = `<div class="empty-state">No hay trabajadores para mostrar.</div>`
    return
  }

  const bloques = users.map(user => {
    const registrosHoy = obtenerRegistrosDeHoy(user.userId || user.id)
    const stats = calcularResumenUsuario(user, registrosHoy)

    const detalleHtml = registrosHoy.length === 0
      ? `<div class="detail-row"><div class="detail-label">Sin registros hoy</div><div class="detail-status">-</div><div class="detail-actions"></div></div>`
      : registrosHoy.map(registro => {
          const estadoValidacion = obtenerEstadoValidacion(registro)

          return `
            <div class="detail-row">
              <div class="detail-label">
                - ${traducirTipo(registro.tipo)}: ${obtenerHoraMostrada(registro)}
              </div>

              <div class="detail-status ${estadoValidacion.clase}">
                ${estadoValidacion.texto}
              </div>

              <div class="detail-actions">
                <button class="btn-mini btn-accept" data-action="accept" data-id="${registro.id}" data-user="${registro.userId}">
                  Aceptar
                </button>

                <button class="btn-mini btn-edit" data-action="edit" data-id="${registro.id}" data-user="${registro.userId}">
                  Editar
                </button>

                <button class="btn-mini btn-delete" data-action="delete" data-id="${registro.id}" data-user="${registro.userId}">
                  Borrar
                </button>
              </div>
            </div>
          `
        }).join("")

    return `
      <div class="employee-block">
        <div class="employee-summary">
          <div>${user.nombre || user.email || "Sin nombre"}</div>
          <div>${user.turno || "-"}</div>
          <div>${renderEstado(user.estado)}</div>
          <div>${stats.breakCount}</div>
          <div>${stats.breakDuration}</div>
          <div>${stats.totalHours}</div>
          <div>${stats.lastRecord}</div>
          <div class="${stats.obsClass}">${stats.observacion}</div>
        </div>

        <div class="employee-details">
          ${detalleHtml}
        </div>
      </div>
    `
  })

  adminHistoryList.innerHTML = bloques.join("")
}

if (adminHistoryList) {
  adminHistoryList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]")
    if (!button) return

    const action = button.dataset.action
    const recordId = button.dataset.id
    const userId = button.dataset.user

    if (!recordId) return

    if (action === "accept") {
      await aceptarRegistro(recordId)
      return
    }

    if (action === "edit") {
      await editarRegistro(recordId)
      return
    }

    if (action === "delete") {
      await borrarRegistro(recordId, userId)
      return
    }
  })
}


// ===============================
// SECCION 15 - ACCIONES ADMIN
// ===============================

async function aceptarRegistro(recordId) {
  const currentUser = auth.currentUser
  if (!currentUser) return

  await updateDoc(doc(db, "attendance", recordId), {
    validado: true,
    validadoPor: currentUser.email || currentUser.uid,
    validadoEn: serverTimestamp()
  })
}

async function editarRegistro(recordId) {
  const currentUser = auth.currentUser
  if (!currentUser) return

  const registro = attendanceCache.find(item => item.id === recordId)
  if (!registro) return

  const horaActual = registro.horaEditada || obtenerHoraMostrada(registro)
  const nuevaHora = prompt("Ingresa la nueva hora en formato HH:MM o HH:MM:SS", horaActual)

  if (!nuevaHora) return

  const horaNormalizada = normalizarHoraManual(nuevaHora)
  if (!horaNormalizada) {
    alert("Formato inválido. Usa HH:MM o HH:MM:SS")
    return
  }

  await updateDoc(doc(db, "attendance", recordId), {
    horaEditada: horaNormalizada,
    validado: true,
    editadoPor: currentUser.email || currentUser.uid,
    editadoEn: serverTimestamp()
  })
}

async function borrarRegistro(recordId, userId) {
  const confirmar = confirm("¿Seguro que deseas borrar este registro?")
  if (!confirmar) return

  await deleteDoc(doc(db, "attendance", recordId))

  if (userId) {
    await recalcularEstadoUsuario(userId)
  }
}

async function recalcularEstadoUsuario(userId) {
  const registrosHoy = obtenerRegistrosDeHoy(userId)

  let nuevoEstado = "inicio"

  registrosHoy.forEach(registro => {
    if (registro.tipo === "ingreso") nuevoEstado = "trabajando"
    if (registro.tipo === "break") nuevoEstado = "break"
    if (registro.tipo === "regreso") nuevoEstado = "trabajando"
    if (registro.tipo === "salida") nuevoEstado = "inicio"
  })

  await setDoc(
    doc(db, "users", userId),
    { estado: nuevoEstado },
    { merge: true }
  )
}


// ===============================
// SECCION 16 - RENDER ESTADO
// ===============================

function renderEstado(estadoActual) {
  if (estadoActual === "trabajando") {
    return `
      <span class="status-pill status-trabajando">
        <span class="status-dot"></span>
        EN TURNO
      </span>
    `
  }

  if (estadoActual === "break") {
    return `
      <span class="status-pill status-break">
        <span class="status-dot"></span>
        EN BREAK
      </span>
    `
  }

  return `
    <span class="status-pill status-inicio">
      <span class="status-dot"></span>
      INACTIVO
    </span>
  `
}

function traducirTipo(tipo) {
  if (tipo === "ingreso") return "Ingreso"
  if (tipo === "break") return "Inicio break"
  if (tipo === "regreso") return "Fin break"
  if (tipo === "salida") return "Salida"
  return tipo
}

function obtenerEstadoValidacion(registro) {
  if (registro.horaEditada) {
    return {
      texto: "EDITADO",
      clase: "badge-edited"
    }
  }

  if (registro.validado) {
    return {
      texto: "VALIDADO",
      clase: "badge-valid"
    }
  }

  return {
    texto: "PENDIENTE",
    clase: "badge-pending"
  }
}


// ===============================
// SECCION 17 - CALCULO DE TIEMPOS
// ===============================

function obtenerRegistrosDeHoy(userId) {
  const hoy = claveFechaLocal(new Date())

  return attendanceCache
    .filter(item => item.userId === userId)
    .filter(item => {
      const fechaBase = obtenerFechaBase(item)
      if (!fechaBase) return false
      return claveFechaLocal(fechaBase) === hoy
    })
    .sort((a, b) => {
      const ta = obtenerFechaEfectiva(a)?.getTime() || 0
      const tb = obtenerFechaEfectiva(b)?.getTime() || 0
      return ta - tb
    })
}

function calcularResumenUsuario(user, registrosHoy) {
  let breakCount = 0
  let totalBreakMs = 0
  let totalTrabajoMs = 0
  let lastRecord = "-"
  let observacion = "-"
  let obsClass = "obs-normal"

  let inicioTrabajo = null
  let inicioBreak = null

  registrosHoy.forEach(registro => {
    const fecha = obtenerFechaEfectiva(registro)
    if (!fecha) return

    lastRecord = formatearFechaHora(fecha)

    if (registro.tipo === "ingreso") {
      if (!inicioTrabajo) {
        inicioTrabajo = fecha
      }
    }

    else if (registro.tipo === "break") {
      breakCount += 1

      if (inicioTrabajo) {
        totalTrabajoMs += fecha - inicioTrabajo
        inicioTrabajo = null
      }

      if (!inicioBreak) {
        inicioBreak = fecha
      }
    }

    else if (registro.tipo === "regreso") {
      if (inicioBreak) {
        totalBreakMs += fecha - inicioBreak
        inicioBreak = null
      }

      if (!inicioTrabajo) {
        inicioTrabajo = fecha
      }
    }

    else if (registro.tipo === "salida") {
      if (inicioTrabajo) {
        totalTrabajoMs += fecha - inicioTrabajo
        inicioTrabajo = null
      }

      if (inicioBreak) {
        totalBreakMs += fecha - inicioBreak
        inicioBreak = null
      }
    }
  })

  if (user.estado === "break" && inicioBreak) {
    const mins = Math.floor((new Date() - inicioBreak) / 60000)

    if (mins >= 30) {
      observacion = "⚠ Break prolongado"
      obsClass = "obs-warning"
    } else {
      observacion = "En descanso"
    }
  }

  if (user.estado === "inicio" && registrosHoy.length === 0) {
    observacion = "Sin registros hoy"
  }

  if (registrosHoy.some(item => !item.validado && !item.horaEditada)) {
    observacion = "Pendiente validar"
    obsClass = "obs-warning"
  }

  return {
    breakCount,
    breakDuration: formatearDuracion(totalBreakMs),
    totalHours: formatearDuracion(totalTrabajoMs),
    lastRecord,
    observacion,
    obsClass
  }
}


// ===============================
// SECCION 18 - FECHAS Y HORAS
// ===============================

function obtenerFechaBase(registro) {
  if (registro.horaServidor?.toDate) {
    return registro.horaServidor.toDate()
  }

  return null
}

function obtenerFechaEfectiva(registro) {
  const base = obtenerFechaBase(registro)
  if (!base) return null

  if (!registro.horaEditada) return base

  const partes = registro.horaEditada.split(":")
  if (partes.length < 2) return base

  const horas = Number(partes[0])
  const minutos = Number(partes[1])
  const segundos = Number(partes[2] || 0)

  const clon = new Date(base)
  clon.setHours(horas, minutos, segundos, 0)

  return clon
}

function obtenerHoraMostrada(registro) {
  if (registro.horaEditada) {
    return registro.horaEditada
  }

  const fecha = obtenerFechaBase(registro)
  if (!fecha) return "-"

  return fecha.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })
}

function normalizarHoraManual(valor) {
  const limpio = valor.trim()
  const patron = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/
  const match = limpio.match(patron)

  if (!match) return null

  const h = match[1].padStart(2, "0")
  const m = match[2].padStart(2, "0")
  const s = (match[3] || "00").padStart(2, "0")

  return `${h}:${m}:${s}`
}

function claveFechaLocal(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function formatearDuracion(ms) {
  if (!ms || ms <= 0) return "-"

  const minutos = Math.floor(ms / 60000)

  if (minutos < 60) {
    return `${minutos} min`
  }

  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60

  return `${horas}h ${mins}min`
}

function formatearFechaHora(date) {
  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  })
}
