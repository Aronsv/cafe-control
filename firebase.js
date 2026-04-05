import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, orderBy, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
 
const firebaseConfig = {
  apiKey: "AIzaSyB-L09L2xGVWtsJO1XE3CCj6F5p4XN2VPo",
  authDomain: "cafe-control-c05bb.firebaseapp.com",
  projectId: "cafe-control-c05bb",
  storageBucket: "cafe-control-c05bb.firebasestorage.app",
  messagingSenderId: "874681908082",
  appId: "1:874681908082:web:e8e87dd3d5a070deb47beb"
};
 
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
 
// ===== AUTH =====
export const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const onAuth = (cb) => onAuthStateChanged(auth, cb);
 
// ===== USUARIOS =====
export const getUsuario = async (uid) => {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};
 
export const crearUsuario = async (uid, datos) => {
  await setDoc(doc(db, 'usuarios', uid), datos);
};
 
// ===== ASISTENCIAS =====
export const getFechaHoy = () => {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
};
 
export const getAsistenciaHoy = async (uid) => {
  const fecha = getFechaHoy();
  const snap = await getDoc(doc(db, 'asistencias', `${uid}_${fecha}`));
  return snap.exists() ? snap.data() : null;
};
 
export const guardarRegistro = async (uid, tipo, observacion) => {
  const fecha = getFechaHoy();
  const docRef = doc(db, 'asistencias', `${uid}_${fecha}`);
  const snap = await getDoc(docRef);
  const ahora = new Date();
  const hora = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`;
 
  const nuevoRegistro = {
    tipo,
    hora,
    observacion: observacion || '',
    timestamp: serverTimestamp(),
    validado: false
  };
 
  if (snap.exists()) {
    const data = snap.data();
    const registros = data.registros || [];
    registros.push(nuevoRegistro);
    await updateDoc(docRef, { registros, ultimaActualizacion: serverTimestamp() });
  } else {
    await setDoc(docRef, {
      uid,
      fecha,
      registros: [nuevoRegistro],
      ultimaActualizacion: serverTimestamp()
    });
  }
};
 
export const escucharAsistenciaHoy = (uid, cb) => {
  const fecha = getFechaHoy();
  return onSnapshot(doc(db, 'asistencias', `${uid}_${fecha}`), (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
};
 