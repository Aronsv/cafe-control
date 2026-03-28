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
  serverTimestamp
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
let dashboardUnsubscribe = null


// ===============================
// SECCION 4 - ELEMENTOS HTML
// ===============================

const loginView = document.getElementById("loginView")
const emailInput = document.getElementById("email")
const passwordInput = document.getElementById("password")
const togglePassword = document.getElementById("togglePassword")
const btnLogin = document.getElementById("btnLogin")
const resetPassword = document.getElementById("resetPassword")
const loginMsg = document.getElementById("loginMsg")

const staffView = document.getElementById("staffView")
const mensajeStaff = document.getElementById("mensajeStaff")
const btnAsistencia = document.getElementById("btnAsistencia")
const btnBreak = document.getElementById("btnBreak")
const btnLogoutStaff = document.getElementById("btnLogoutStaff")

const adminView = document.getElementById("adminView")
const btnLogoutAdmin = document.getElementById("btnLogoutAdmin")
const countTrabajando = document.getElementById("countTrabajando")
const countBreak = document.getElementById("countBreak")
const countInicio = document.getElementById("countInicio")
const countTotal = document.getElementById("countTotal")
const adminTableBody = document.getElementById("adminTableBody")
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
    if (dashboardUnsubscribe) {
      dashboardUnsubscribe()
      dashboardUnsubscribe = null
    }

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

  dashboardUnsubscribe = onSnapshot(usersQuery, async (usersSnapshot) => {
    const users = []

    usersSnapshot.forEach((docItem) => {
      users.push({
        id: docItem.id,
        ...docItem.data()
      })
    })

    await renderDashboard(users)
  })
}

async function renderDashboard(users) {
  if (!adminTableBody) return

  const attendanceSnapshot = await getDocs(collection(db, "attendance"))

  const attendance = []
  attendanceSnapshot.forEach((docItem) => {
    attendance.push({
      id: docItem.id,
      ...docItem.data()
    })
  })

  const trabajadores = users.filter(user => user.activo !== false && user.role !== "admin")

  const enTurno = trabajadores.filter(user => user.estado === "trabajando").length
  const enBreak = trabajadores.filter(user => user.estado === "break").length
  const pendientes = trabajadores.filter(user => user.estado === "inicio").length
  const total = trabajadores.length

  if (countTrabajando) countTrabajando.innerText = enTurno
  if (countBreak) countBreak.innerText = enBreak
  if (countInicio) countInicio.innerText = pendientes
  if (countTotal) countTotal.innerText = total

  actualizarDonut(enTurno, enBreak, pendientes, total)
  renderTablaAdmin(trabajadores, attendance)
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
// SECCION 14 - TABLA ADMIN
// ===============================

function renderTablaAdmin(users, attendance) {
  if (!adminTableBody) return

  if (users.length === 0) {
    adminTableBody.innerHTML = `<div class="empty-state">No hay trabajadores para mostrar.</div>`
    return
  }

  const rows = users.map(user => {
    const stats = calcularStatsUsuario(user, attendance)

    return `
      <div class="table-row">
        <div>${user.nombre || user.email || "Sin nombre"}</div>
        <div>${user.turno || "-"}</div>
        <div>${renderEstado(user.estado)}</div>
        <div>${stats.breakCount}</div>
        <div>${stats.breakDuration}</div>
        <div>${stats.lastRecord}</div>
        <div class="${stats.obsClass}">${stats.observacion}</div>
      </div>
    `
  })

  adminTableBody.innerHTML = rows.join("")
}

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


// ===============================
// SECCION 15 - CALCULO STATS
// ===============================

function calcularStatsUsuario(user, attendance) {
  const registros = attendance
    .filter(item => item.userId === user.userId || item.userId === user.id)
    .sort((a, b) => {
      const ta = a.horaServidor?.seconds || 0
      const tb = b.horaServidor?.seconds || 0
      return ta - tb
    })

  let breakCount = 0
  let totalBreakMs = 0
  let lastBreakStart = null
  let lastRecord = "-"
  let observacion = "-"
  let obsClass = "obs-normal"

  registros.forEach(registro => {
    if (registro.tipo === "break") {
      breakCount += 1
      if (registro.horaServidor?.toDate) {
        lastBreakStart = registro.horaServidor.toDate()
      }
    }

    if (registro.tipo === "regreso") {
      if (lastBreakStart && registro.horaServidor?.toDate) {
        const regresoDate = registro.horaServidor.toDate()
        totalBreakMs += regresoDate - lastBreakStart
        lastBreakStart = null
      }
    }

    if (registro.horaServidor?.toDate) {
      lastRecord = formatearFechaHora(registro.horaServidor.toDate())
    }
  })

  if (user.estado === "break" && lastBreakStart) {
    const mins = Math.floor((new Date() - lastBreakStart) / 60000)

    if (mins >= 30) {
      observacion = "⚠ Break prolongado"
      obsClass = "obs-warning"
    } else {
      observacion = "En descanso"
    }
  }

  if (user.estado === "inicio" && registros.length === 0) {
    observacion = "Sin registros hoy"
  }

  return {
    breakCount,
    breakDuration: formatearDuracion(totalBreakMs),
    lastRecord,
    observacion,
    obsClass
  }
}


// ===============================
// SECCION 16 - HELPERS
// ===============================

function formatearDuracion(ms) {
  if (!ms || ms <= 0) return "-"

  const minutos = Math.floor(ms / 60000)

  if (minutos < 60) {
    return `${minutos} min`
  }

  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60

  return `${horas}h ${mins}m`
}

function formatearFechaHora(date) {
  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  })
}
