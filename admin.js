// ===============================
// SECCION 1 - IMPORT FIREBASE
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  onSnapshot
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
// SECCION 3 - ELEMENTOS HTML
// ===============================

const adminLoginBox = document.getElementById("adminLoginBox")
const adminAppBox = document.getElementById("adminAppBox")

const adminEmail = document.getElementById("adminEmail")
const adminPassword = document.getElementById("adminPassword")
const btnAdminLogin = document.getElementById("btnAdminLogin")
const btnAdminLogout = document.getElementById("btnAdminLogout")
const adminLoginMsg = document.getElementById("adminLoginMsg")

const countTrabajando = document.getElementById("countTrabajando")
const countBreak = document.getElementById("countBreak")
const countInicio = document.getElementById("countInicio")
const countTotal = document.getElementById("countTotal")

const adminTableBody = document.getElementById("adminTableBody")

const arcTrabajando = document.getElementById("arcTrabajando")
const arcBreak = document.getElementById("arcBreak")
const arcInicio = document.getElementById("arcInicio")


// ===============================
// SECCION 4 - LOGIN ADMIN
// ===============================

btnAdminLogin.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(
      auth,
      adminEmail.value.trim(),
      adminPassword.value
    )
  } catch (error) {
    adminLoginMsg.innerText = "Error: " + error.message
  }
})

btnAdminLogout.addEventListener("click", async () => {
  await signOut(auth)
})


// ===============================
// SECCION 5 - VERIFICAR ROL
// ===============================

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    adminLoginBox.classList.remove("hidden")
    adminAppBox.classList.add("hidden")
    return
  }

  const userRef = doc(db, "users", user.uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    adminLoginBox.classList.remove("hidden")
    adminAppBox.classList.add("hidden")
    adminLoginMsg.innerText = "Tu usuario no tiene perfil en users."
    return
  }

  const userData = userSnap.data()

  if (userData.role !== "admin") {
    adminLoginBox.classList.remove("hidden")
    adminAppBox.classList.add("hidden")
    adminLoginMsg.innerText = "No tienes permisos de administrador."
    await signOut(auth)
    return
  }

  adminLoginBox.classList.add("hidden")
  adminAppBox.classList.remove("hidden")

  iniciarDashboard()
})


// ===============================
// SECCION 6 - INICIAR DASHBOARD
// ===============================

function iniciarDashboard() {
  escucharUsuarios()
}


// ===============================
// SECCION 7 - ESCUCHAR USUARIOS
// ===============================

function escucharUsuarios() {
  const usersQuery = query(collection(db, "users"))

  onSnapshot(usersQuery, async (usersSnapshot) => {
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


// ===============================
// SECCION 8 - RENDER DASHBOARD
// ===============================

async function renderDashboard(users) {
  const attendanceSnapshot = await getDocs(collection(db, "attendance"))

  const attendance = []
  attendanceSnapshot.forEach((docItem) => {
    attendance.push({
      id: docItem.id,
      ...docItem.data()
    })
  })

  const trabajadores = users.filter(user => user.activo !== false)

  const enTurno = trabajadores.filter(user => user.estado === "trabajando").length
  const enBreak = trabajadores.filter(user => user.estado === "break").length
  const pendientes = trabajadores.filter(user => user.estado === "inicio").length
  const total = trabajadores.length

  countTrabajando.innerText = enTurno
  countBreak.innerText = enBreak
  countInicio.innerText = pendientes
  countTotal.innerText = total

  actualizarDonut(enTurno, enBreak, pendientes, total)

  renderTabla(trabajadores, attendance)
}


// ===============================
// SECCION 9 - DONUT
// ===============================

function actualizarDonut(enTurno, enBreak, pendientes, total) {
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
// SECCION 10 - TABLA
// ===============================

function renderTabla(users, attendance) {
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

function renderEstado(estado) {
  if (estado === "trabajando") {
    return `
      <span class="status-pill status-trabajando">
        <span class="status-dot"></span>
        EN TURNO
      </span>
    `
  }

  if (estado === "break") {
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
// SECCION 11 - CALCULO DE STATS
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
// SECCION 12 - HELPERS
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
