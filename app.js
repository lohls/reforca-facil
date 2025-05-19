import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAd5cgJEySC1Bscw-wA6dKFYkNbl6Id8Yk",
  authDomain: "reforcafacil.firebaseapp.com",
  projectId: "reforcafacil",
  storageBucket: "reforcafacil.appspot.com",
  messagingSenderId: "102077819181",
  appId: "1:102077819181:web:a7af642adcf015ae594ba4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let aulaEmEdicaoId = null;

// Elementos HTML
const formCadastro = document.getElementById('formCadastro');
const formLogin = document.getElementById('formLogin');
const btnLogout = document.getElementById('btnLogout');
const authSection = document.getElementById('authSection');
const cadastroAulaForm = document.getElementById('cadastroAulaForm');
const cadastroAula = document.getElementById('cadastroAula');
const listaAulasSection = document.getElementById('listaAulasSection');
const listaAulas = document.getElementById('listaAulas');
const inscricaoSection = document.getElementById('inscricaoSection');
const inscricoesSection = document.getElementById('inscricoesSection');
const listaInscricoes = document.getElementById('listaInscricoes');
const selectAula = document.getElementById('selectAula');
const mensagemInscricao = document.getElementById('mensagemInscricao');
const formInscricao = document.getElementById('formInscricao');

// Cadastro de usuário
formCadastro.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('emailCadastro').value.trim();
  const senha = document.getElementById('senhaCadastro').value.trim();
  const tipoUsuario = document.querySelector('input[name="tipoUsuario"]:checked').value;
  const rmp = document.getElementById('rmp').value.trim();

  if (tipoUsuario === 'professor') {
    if (!rmp) {
      alert("Informe seu RMP para cadastro como professor.");
      return;
    }
    if (!/^RMP\d{6}$/.test(rmp)) {
      alert("Formato inválido de RMP. Use o formato: RMP123456");
      return;
    }

    // Verifica se já existe professor com esse RMP
    const usuariosRef = collection(db, "usuarios");
    const snapshot = await getDocs(query(usuariosRef, where("tipoUsuario", "==", "professor"), where("rmp", "==", rmp)));

    if (!snapshot.empty) {
      alert("Este RMP já está em uso.");
      return;
    }
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    const dataUsuario = {
      email,
      tipoUsuario
    };

    if (tipoUsuario === "professor") {
      dataUsuario.rmp = rmp;
    }

    await setDoc(doc(db, "usuarios", user.uid), dataUsuario);

    alert('Usuário cadastrado com sucesso!');
    formCadastro.reset();
    document.getElementById('campoRMP').style.display = 'none';
  } catch (error) {
    alert('Erro no cadastro: ' + error.message);
  }
});

// Login
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('emailLogin').value.trim();
  const senha = document.getElementById('senhaLogin').value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    formLogin.reset();
  } catch (error) {
    alert('Erro no login: ' + error.message);
  }
});

// Logout
btnLogout.addEventListener('click', async () => {
  await signOut(auth);
});

// Cadastrar nova aula (professor)
cadastroAulaForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const materia = document.getElementById('materia').value.trim();
  const data = document.getElementById('data').value.trim();
  const hora = document.getElementById('hora').value.trim();
  const professor = document.getElementById('professor').value.trim();

  const user = auth.currentUser;
  if (!user) {
    alert("Você precisa estar logado.");
    return;
  }

  try {
    if (aulaEmEdicaoId) {
      // Atualizar aula existente
      const aulaRef = doc(db, "aulas", aulaEmEdicaoId);
      await updateDoc(aulaRef, {
        materia,
        data,
        hora,
        professor
      });
      alert('Aula atualizada com sucesso!');
      aulaEmEdicaoId = null;
    } else {
      // Criar nova aula
      await addDoc(collection(db, "aulas"), {
        materia,
        data,
        hora,
        professor,
        professorUID: user.uid
      });
      alert('Aula cadastrada com sucesso!');
    }

    cadastroAulaForm.reset();
    carregarAulas();

  } catch (error) {
    alert('Erro ao salvar aula: ' + error.message);
  }
});

// Inscrição do aluno
formInscricao.addEventListener('submit', async (e) => {
  e.preventDefault();

  const aulaId = selectAula.value;
  const nomeAluno = document.getElementById('nomeAluno').value.trim();
  const emailAluno = document.getElementById('emailAluno').value.trim();

  if (!aulaId) {
    alert('Escolha uma aula.');
    return;
  }

  try {
    const inscricoesRef = collection(db, "inscricoes");
    const inscricaoExistente = query(inscricoesRef, where("aulaId", "==", aulaId), where("emailAluno", "==", emailAluno));
    const inscricaoSnapshot = await getDocs(inscricaoExistente);

    if (!inscricaoSnapshot.empty) {
      alert("Você já está inscrito nesta aula.");
      return;
    }

    await addDoc(inscricoesRef, {
      aulaId,
      nomeAluno,
      emailAluno,
      timestamp: new Date()
    });

    mensagemInscricao.textContent = 'Inscrição realizada com sucesso!';
    formInscricao.reset();
  } catch (error) {
    alert('Erro na inscrição: ' + error.message);
  }
});

// Carregar lista de aulas
async function carregarAulas() {
  listaAulas.innerHTML = '';
  const user = auth.currentUser;

  try {
    const querySnapshot = await getDocs(collection(db, "aulas"));

    querySnapshot.forEach((docSnap) => {
      const aula = docSnap.data();
      const li = document.createElement('li');

      li.textContent = `${aula.materia} - ${aula.data} - ${aula.hora} - ${aula.professor}`;

      if (user && aula.professorUID === user.uid) {
        // Botões de editar e excluir só aparecem para professor dono da aula
        const editarBtn = document.createElement('button');
        editarBtn.textContent = 'Editar';
        editarBtn.classList.add('botao-estilizado');
        editarBtn.onclick = () => editarAula(docSnap.id);
        li.appendChild(editarBtn);

        const excluirBtn = document.createElement('button');
        excluirBtn.textContent = 'Excluir';
        excluirBtn.classList.add('botao-estilizado');
        excluirBtn.style.marginLeft = '10px';
        excluirBtn.onclick = () => excluirAula(docSnap.id);
        li.appendChild(excluirBtn);
      }

      listaAulas.appendChild(li);
    });
  } catch (error) {
    alert('Erro ao carregar aulas: ' + error.message);
  }
}

// Editar aula
async function editarAula(id) {
  try {
    const aulaRef = doc(db, "aulas", id);
    const aulaSnap = await getDoc(aulaRef);

    if (aulaSnap.exists()) {
      const aula = aulaSnap.data();

      document.getElementById('materia').value = aula.materia;
      document.getElementById('data').value = aula.data;
      document.getElementById('hora').value = aula.hora;
      document.getElementById('professor').value = aula.professor;

      aulaEmEdicaoId = id;
      alert("Modo de edição ativado.");
    }
  } catch (error) {
    alert('Erro ao carregar aula para edição: ' + error.message);
  }
}

// Excluir aula
async function excluirAula(id) {
  if (!confirm("Tem certeza que deseja excluir esta aula?")) return;

  try {
    await deleteDoc(doc(db, "aulas", id));
    alert('Aula excluída com sucesso!');
    carregarAulas();
  } catch (error) {
    alert('Erro ao excluir aula: ' + error.message);
  }
}

// Carregar aulas no select do aluno para inscrição
async function carregarAulasNoSelect() {
  selectAula.innerHTML = '<option value="">-- Escolha uma aula --</option>';

  try {
    const querySnapshot = await getDocs(collection(db, "aulas"));

    querySnapshot.forEach((doc) => {
      const aula = doc.data();
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = `${aula.materia} - ${aula.data} - ${aula.hora} - ${aula.professor}`;
      selectAula.appendChild(option);
    });
  } catch (error) {
    alert('Erro ao carregar aulas: ' + error.message);
  }
}

// Carregar inscrições do professor para exibir
async function carregarInscricoes() {
  listaInscricoes.innerHTML = '';
  const user = auth.currentUser;
  if (!user) return;

  try {
    // Busca aulas do professor
    const aulasRef = collection(db, "aulas");
    const aulasQuery = query(aulasRef, where("professorUID", "==", user.uid));
    const aulasSnapshot = await getDocs(aulasQuery);

    if (aulasSnapshot.empty) {
      listaInscricoes.innerHTML = '<li>Nenhuma aula cadastrada.</li>';
      return;
    }

    for (const aulaDoc of aulasSnapshot.docs) {
      const aulaId = aulaDoc.id;
      const aulaData = aulaDoc.data();

      const inscricoesRef = collection(db, "inscricoes");
      const inscricoesQuery = query(inscricoesRef, where("aulaId", "==", aulaId));
      const inscricoesSnapshot = await getDocs(inscricoesQuery);

      if (inscricoesSnapshot.empty) {
        listaInscricoes.innerHTML += `<li>Aula "${aulaData.materia}" não possui inscrições.</li>`;
      } else {
        inscricoesSnapshot.forEach((inscDoc) => {
          const insc = inscDoc.data();
          listaInscricoes.innerHTML += `<li>Aula: ${aulaData.materia} | Aluno: ${insc.nomeAluno} | Email: ${insc.emailAluno}</li>`;
        });
      }
    }
  } catch (error) {
    alert('Erro ao carregar inscrições: ' + error.message);
  }
}

// Atualiza exibição das seções conforme estado de autenticação e tipo de usuário
onAuthStateChanged(auth, (user) => {
  if (user) {
    authSection.style.display = 'none';
    btnLogout.style.display = 'inline-block';
    listaAulasSection.style.display = 'block';

    (async () => {
      const docUsuario = await getDoc(doc(db, "usuarios", user.uid));
      if (docUsuario.exists()) {
        const data = docUsuario.data();
        if (data.tipoUsuario === 'professor') {
          cadastroAula.style.display = 'block';
          inscricaoSection.style.display = 'none';
          inscricoesSection.style.display = 'block';
          carregarAulas();
          carregarInscricoes();
        } else {
          cadastroAula.style.display = 'none';
          inscricaoSection.style.display = 'block';
          inscricoesSection.style.display = 'none';
          carregarAulasNoSelect();
          carregarAulas();
        }
      }
    })();

  } else {
    // Não logado
    authSection.style.display = 'block';
    cadastroAula.style.display = 'none';
    listaAulasSection.style.display = 'none';
    inscricaoSection.style.display = 'none';
    inscricoesSection.style.display = 'none';
    btnLogout.style.display = 'none';
  }
});

// Exibir ou esconder campo RMP conforme tipo de usuário selecionado
const radiosTipoUsuario = document.querySelectorAll('input[name="tipoUsuario"]');
const campoRMP = document.getElementById('campoRMP');

radiosTipoUsuario.forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.value === 'professor' && radio.checked) {
      campoRMP.style.display = 'block';
    } else {
      campoRMP.style.display = 'none';
      document.getElementById('rmp').value = '';
    }
  });
});
