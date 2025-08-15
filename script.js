// Wait until DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // ---------------- Firebase Setup ----------------
 const firebaseConfig = {
    apiKey: "AIzaSyBzF4ukkSob_J074cJ88cNzLQZKQa9VUK8",
    authDomain: "easy-study-42e89.firebaseapp.com",
    projectId: "easy-study-42e89",
    storageBucket: "easy-study-42e89.firebasestorage.app",
    messagingSenderId: "427012748746",
    appId: "1:427012748746:web:85c1d9e869138a2b098b33"
  };

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  db.settings({ experimentalForceLongPolling: true }); // avoid host warnings

  // ---------------- DOM Elements ----------------
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const authMsg = document.getElementById('auth-msg');
  const logoutBtn = document.getElementById('logoutBtn');

  const adminPanel = document.getElementById('admin-panel');
  const studentPanel = document.getElementById('student-panel');

  const noteTitleInput = document.getElementById('note-title');
  const noteContentInput = document.getElementById('note-content');
  const addNoteBtn = document.getElementById('add-note');
  const notesList = document.getElementById('notes-list');
  const notesDisplay = document.getElementById('notes-display');

  const quizQuestionInput = document.getElementById('quiz-question');
  const quizOptionsInput = document.getElementById('quiz-options');
  const quizAnswerInput = document.getElementById('quiz-answer');
  const addQuizBtn = document.getElementById('add-quiz');
  const quizList = document.getElementById('quiz-list');
  const quizDisplay = document.getElementById('quiz-display');

  const studentAnswerSection = document.getElementById('quiz-answer-section');
  const studentAnswerInput = document.getElementById('student-answer');
  const submitAnswerBtn = document.getElementById('submit-answer');
  const answerFeedback = document.getElementById('answer-feedback');

  // ---------------- Auth ----------------
  loginBtn?.addEventListener('click', () => {
    auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
      .catch(err => authMsg.textContent = err.message);
  });

  signupBtn?.addEventListener('click', () => {
    auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
      .then(() => { authMsg.textContent = "✅ Account created. You can now log in."; })
      .catch(err => authMsg.textContent = err.message);
  });

  logoutBtn?.addEventListener('click', () => auth.signOut());

  auth.onAuthStateChanged(user => {
    if (user) {
      document.getElementById('auth-section').style.display = 'none';
      document.getElementById('main-section').style.display = 'block';
      document.getElementById('user-email').textContent = user.email;

      if (user.email === "L@gmail.com") {
        adminPanel.style.display = 'block';
      } else {
        studentPanel.style.display = 'block';
      }

      loadNotes();
      loadQuizzes();
    } else {
      document.getElementById('auth-section').style.display = 'block';
      document.getElementById('main-section').style.display = 'none';
      adminPanel.style.display = 'none';
      studentPanel.style.display = 'none';
    }
  });

  // ---------------- Firestore References ----------------
  const notesCollection = db.collection('notes');
  const quizCollection = db.collection('quizzes');

  // ---------------- Admin: Add Note ----------------
  addNoteBtn?.addEventListener('click', () => {
    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();
    if (!title || !content) return alert("Fill both fields.");
    notesCollection.add({ title, content, timestamp: firebase.firestore.FieldValue.serverTimestamp() })
      .then(() => { alert("✅ Note added!"); noteTitleInput.value = ""; noteContentInput.value = ""; loadNotes(); });
  });

  // ---------------- Admin: Add Quiz ----------------
  addQuizBtn?.addEventListener('click', () => {
    const question = quizQuestionInput.value.trim();
    const options = quizOptionsInput.value.split(',').map(opt => opt.trim());
    const answer = quizAnswerInput.value.trim();
    if (!question || options.length < 2 || !answer) return alert("Fill all quiz fields and provide at least 2 options.");

    quizCollection.add({ question, options, answer, timestamp: firebase.firestore.FieldValue.serverTimestamp() })
      .then(() => { alert("✅ Quiz added!"); quizQuestionInput.value = ""; quizOptionsInput.value = ""; quizAnswerInput.value = ""; loadQuizzes(); });
  });

  // ---------------- Display Notes ----------------
  function loadNotes() {
    notesCollection.orderBy('timestamp', 'desc').get().then(snapshot => {
      const notesHTML = snapshot.docs.map(doc => `<p><strong>${doc.data().title}</strong>: ${doc.data().content}</p>`).join('');
      notesList.innerHTML = notesHTML;
      notesDisplay.innerHTML = notesHTML;
    });
  }

  // ---------------- Display Quizzes ----------------
  let currentQuizId = null;

  function loadQuizzes() {
    quizCollection.orderBy('timestamp', 'desc').get().then(snapshot => {
      // Admin panel
      quizList.innerHTML = snapshot.docs.map(doc => {
        const data = doc.data();
        return `<p>${data.question} - Answer: ${data.answer} <button onclick="deleteQuiz('${doc.id}')">Delete</button></p>`;
      }).join('');

      // Student panel
      quizDisplay.innerHTML = '';
      snapshot.forEach(doc => {
        const data = doc.data();
        const btn = document.createElement('button');
        btn.textContent = data.question;
        btn.addEventListener('click', () => {
          currentQuizId = doc.id;
          studentAnswerSection.style.display = 'block';
          studentAnswerInput.value = '';
          answerFeedback.textContent = '';
          renderOptions(data.options);
        });
        quizDisplay.appendChild(btn);
        quizDisplay.appendChild(document.createElement('br'));
      });
    });
  }

  // Render multiple-choice options
  function renderOptions(options) {
    studentAnswerInput.innerHTML = ''; // clear previous
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt;
      btn.addEventListener('click', () => { studentAnswerInput.value = opt; });
      studentAnswerInput.appendChild(btn);
    });
  }

  // ---------------- Student: Submit Answer ----------------
  submitAnswerBtn?.addEventListener('click', () => {
    if (!currentQuizId || !studentAnswerInput.value) return;
    quizCollection.doc(currentQuizId).get().then(doc => {
      const correct = doc.data().answer;
      if (studentAnswerInput.value === correct) {
        answerFeedback.textContent = "✅ Correct!";
        answerFeedback.style.color = 'green';
      } else {
        answerFeedback.textContent = `❌ Incorrect. Correct: ${correct}`;
        answerFeedback.style.color = 'red';
      }
    });
  });

  // ---------------- Delete Quiz ----------------
  window.deleteQuiz = function(quizId) {
    if (confirm("Delete this quiz?")) {
      quizCollection.doc(quizId).delete().then(loadQuizzes);
    }
  };
});


