import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, addDoc, updateDoc, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDT-_E3WxIMrxhg_Xi5LBun1kEuyoi8cxs",
    authDomain: "game-2077d.firebaseapp.com",
    projectId: "game-2077d",
    storageBucket: "game-2077d.appspot.com",
    messagingSenderId: "314740810914",
    appId: "1:314740810914:web:c88def62f9216ea7a363fb",
    measurementId: "G-ETKZDQB47T"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

// Sign in anonymously
signInAnonymously(auth)
  .catch((error) => {
    console.error("Anonymous sign-in failed:", error);
  });

// --- Profanity Filter Setup ---
let bannedWords = [];
let bannedWordsLoaded = false;

async function loadBannedWords() {
    try {
        const response = await fetch('words.json');
        const arr = await response.json();
        bannedWords = arr.map(w => w.trim().toLowerCase()).filter(Boolean);
        bannedWordsLoaded = true;
        console.log("Banned words loaded:", bannedWords.length);
    } catch (e) {
        console.error("Failed to load profanity list:", e);
        bannedWords = [];
        bannedWordsLoaded = true;
    }
}
loadBannedWords();

// --- Name Prompt with Profanity Filter ---
window.getPlayerName = async function() {
    let name = localStorage.getItem("eb_player_name");
    if (!name) {
        if (!bannedWordsLoaded) {
            alert("Loading profanity filter, please try again in a moment.");
            return "Anonymous";
        }
        let valid = false;
        while (!valid) {
            name = prompt("Enter your name for the leaderboard:");
            if (name === null) {
                name = "Anonymous";
                break;
            }
            name = name.trim() || "Anonymous";
            // Normalize for leetspeak and symbols
            const lowerName = name.toLowerCase();
            const normalized = lowerName
                .replace(/[@4]/g, 'a')
                .replace(/[$5]/g, 's')
                .replace(/[!1|]/g, 'i')
                .replace(/[0]/g, 'o')
                .replace(/[3]/g, 'e')
                .replace(/[7]/g, 't')
                .replace(/[^a-z]/g, ''); // Remove non-letters

            // Profanity check
            if (bannedWords.some(word => normalized.includes(word))) {
                alert("Your name has been detected as inappropriate. Please pick a new name.");
                continue;
            }

            // Duplicate name check
            const leaderboardRef = collection(db, "leaderboard");
            const q = query(leaderboardRef, where("name", "==", name));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                alert("That name is already taken. Please choose a different name.");
                continue;
            }

            valid = true;
        }
        localStorage.setItem("eb_player_name", name);
    }
    return name;
};

// --- Save or update player's best score ---
window.saveOrUpdateScore = async function(survivedSeconds, ballsEaten) {
    const name = await window.getPlayerName();
    const leaderboardRef = collection(db, "leaderboard");
    const q = query(leaderboardRef, where("name", "==", name));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        // Player already has a score, update if new score is better
        const docRef = snapshot.docs[0].ref;
        const oldData = snapshot.docs[0].data();
        if (Number(survivedSeconds) > oldData.survived) {
            await updateDoc(docRef, {
                survived: Number(survivedSeconds),
                balls: ballsEaten,
                timestamp: Date.now()
            });
        }
    } else {
        // No score yet, add new
        await addDoc(leaderboardRef, {
            name,
            survived: Number(survivedSeconds),
            balls: ballsEaten,
            timestamp: Date.now()
        });
    }
};

// --- Show leaderboard (top 10) ---
window.showLeaderboardFromFirestore = async function() {
    const leaderboardList = document.getElementById("leaderboardList");
    leaderboardList.innerHTML = "Loading...";
    const leaderboardRef = collection(db, "leaderboard");
    // Order by survived (number), descending
    const q = query(leaderboardRef, orderBy("survived", "desc"), limit(10));
    const querySnapshot = await getDocs(q);
    leaderboardList.innerHTML = "";
    querySnapshot.forEach(doc => {
        const entry = doc.data();
        const li = document.createElement("li");
        li.textContent = `${entry.name || "Anonymous"} — Time: ${entry.survived}s | Balls: ${entry.balls}`;
        leaderboardList.appendChild(li);
    });
};

window.db = db;
window.collection = collection;
window.query = query;
window.where = where;
window.getDocs = getDocs;
window.addDoc = addDoc;
window.updateDoc = updateDoc;
