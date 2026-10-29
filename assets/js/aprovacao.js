
import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const section = document.getElementById("tab-students");

const panel = document.createElement("article");
panel.className = "panel-card";

const heading = document.createElement("h3");
heading.textContent = "🔔 Cadastros pendentes";

const description = document.createElement("p");
description.className = "muted";
description.textContent =
  "Aprove os alunos que criaram suas próprias contas.";

const message = document.createElement("p");
message.setAttribute("role", "status");

const list = document.createElement("div");
list.className = "cards-list";

panel.append(heading, description, message, list);

const existingPanel = section.querySelector(".panel-card");
section.insertBefore(panel, existingPanel);

function showMessage(text) {
  message.textContent = text;
}

async function loadPendingStudents() {
  list.replaceChildren();
  showMessage("Carregando solicitações...");

  try {
    if (!auth.currentUser) return;
    const snapshot = await getDocs(query(
      collection(db, "users"),
      where("trainerId", "==", auth.currentUser.uid)
    ));

    const pending = snapshot.docs
      .map(item => ({
        id: item.id,
        ...item.data()
      }))
      .filter(item =>
        item.role === "student" &&
        item.active === false &&
        item.trainerId === auth.currentUser?.uid
      );

    showMessage("");

    if (pending.length === 0) {
      showMessage("✅ Nenhum cadastro aguardando aprovação.");
      return;
    }

    pending.forEach(student => {
      const card = document.createElement("div");
      card.className = "student-row";

      const info = document.createElement("div");

      const name = document.createElement("strong");
      name.textContent = student.name || "Aluno sem nome";

      const email = document.createElement("p");
      email.className = "muted";
      email.textContent = student.email || "E-mail indisponível";

      info.append(name, email);

      const button = document.createElement("button");
      button.className = "primary-btn";
      button.type = "button";
      button.textContent = "✅ Aprovar";

      button.addEventListener("click", async () => {
        const confirmed = confirm(
          `Deseja aprovar o cadastro de ${student.name || "este aluno"}?`
        );

        if (!confirmed) return;

        button.disabled = true;
        button.textContent = "Aprovando...";

        try {
          await updateDoc(doc(db, "users", student.id), {
            active: true
          });

          showMessage("✅ Aluno aprovado com sucesso!");
          await loadPendingStudents();

          alert(
            "Aluno aprovado! Atualize o painel para vê-lo na lista de alunos ativos."
          );

          window.location.reload();

        } catch (error) {
          console.error(error);

          showMessage(
            "Não foi possível aprovar. Confira as permissões do Firebase."
          );

          button.disabled = false;
          button.textContent = "✅ Aprovar";
        }
      });

      card.append(info, button);
      list.append(card);
    });

  } catch (error) {
    console.error(error);
    showMessage("Erro ao carregar os cadastros pendentes.");
  }
}

onAuthStateChanged(auth, async user => {
  if (!user) return;

  try {
    const profile = await getDoc(doc(db, "users", user.uid));

    if (
      profile.exists() &&
      profile.data().role === "trainer" &&
      profile.data().active === true
    ) {
      await loadPendingStudents();
    }
  } catch (error) {
    console.error("Erro ao verificar treinador:", error);
  }
});
