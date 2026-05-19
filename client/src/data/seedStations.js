import { db } from "../firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { EV_STATIONS } from "./mockData";

/**
 * Utility to seed the Firestore database with the 14 Bhutanese stations.
 * Run this once after connecting your Firebase project.
 */
export const seedStations = async () => {
  try {
    const stationsCol = collection(db, "stations");
    
    for (const station of EV_STATIONS) {
      await setDoc(doc(stationsCol, station.id), {
        ...station,
        lastUpdated: Date.now()
      });
    }
    
    console.log("✅ Successfully seeded 14 stations to Firestore!");
    return true;
  } catch (error) {
    console.error("❌ Error seeding stations:", error);
    return false;
  }
};
