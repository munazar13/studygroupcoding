import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  doc,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";

import { firebaseConfig } from "../src/config/firebaseConfig.js";

const DATA_FILE = path.resolve(process.cwd(), "modul_admin_study_group_coding.json");

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const rl = readline.createInterface({ input, output });

async function commitInChunks(items, collectionName) {
  const chunkSize = 450;

  for (let i = 0; i < items.length; i += chunkSize) {
    const batch = writeBatch(db);
    const chunk = items.slice(i, i + chunkSize);

    for (const item of chunk) {
      if (!item.id) {
        throw new Error(`Data di collection ${collectionName} ada yang tidak punya id.`);
      }

      const ref = doc(db, collectionName, String(item.id));

      batch.set(
        ref,
        {
          ...item,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }

    await batch.commit();
    console.log(`Berhasil import ${chunk.length} data ke ${collectionName}`);
  }
}

async function main() {
  console.log("=== Import Materi Study Group Coding ===");

  const email = await rl.question("Email admin Firebase: ");
  const password = await rl.question("Password admin Firebase: ");

  console.log("Login admin...");
  await signInWithEmailAndPassword(auth, email.trim(), password.trim());

  console.log("Membaca file JSON...");
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  const data = JSON.parse(raw);

  if (!data.courses || !data.courseSections || !data.questions) {
    throw new Error("Format JSON salah. Harus ada courses, courseSections, dan questions.");
  }

  console.log(`Courses: ${data.courses.length}`);
  console.log(`Course Sections: ${data.courseSections.length}`);
  console.log(`Questions: ${data.questions.length}`);

  await commitInChunks(data.courses, "courses");
  await commitInChunks(data.courseSections, "courseSections");
  await commitInChunks(data.questions, "questions");

  console.log("Import selesai.");
  console.log("Sekarang cek Firebase Firestore dan Admin Panel.");
}

main()
  .catch((error) => {
    console.error("Import gagal:");
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    rl.close();
  });