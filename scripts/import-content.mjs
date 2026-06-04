/**
 * One-time import script — reads your content plan files and populates the database.
 * Run with: node scripts/import-content.mjs
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FOLDER = join(ROOT, "Content plan for youtube");
const db = new PrismaClient();

const USER_EMAIL = "flamingeosbusiness@gmail.com";

// ── helpers ──────────────────────────────────────────────────────────────────

function readFile(name) {
  return readFileSync(join(FOLDER, name), "utf-8");
}

/** Parse a numbered list → array of strings */
function parseNumberedList(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\.\s/.test(l))
    .map((l) => l.replace(/^\d+\.\s+/, "").trim())
    .filter(Boolean);
}

// ── calendar data (30 weeks, hard-coded from your calendar file) ─────────────

const CALENDAR = [
  // JUNE — THE COMEBACK
  { title: "I Disappeared for Years… Here's Why I'm Back",                        date: "2026-06-06", filmDate: "2026-06-02", format: "Cinematic Adventure",     notes: "Re-engagement video. Sit-down + B-roll of current life in PR. Sets up everything for the comeback." },
  { title: "I Cut Strangers' Headphones Then Gave Them AirPods Max",               date: "2026-06-13", filmDate: "2026-06-09", format: "Prank + Surprise",        notes: "ThatWasEpic format. Walk up with scissors, cut cheap headphones, pull out the upgrade. Film every reaction." },
  { title: "I Trained Like a Puerto Rican Boxer for 7 Days (Then Fought Someone)", date: "2026-06-20", filmDate: "2026-06-16", format: "Mini Challenge",           notes: "Michelle Khare 'Challenge Accepted' format. Find local boxing gym, train all week, end with a sparring match." },
  { title: "I Rode Around All of Puerto Rico With Almost Nothing",                  date: "2026-06-27", filmDate: "2026-06-23", format: "Cinematic Adventure",     notes: "The flagship video. Multi-day big bike trip across PR. Defines the new era of the channel." },

  // JULY — BUILDING RANGE
  { title: "I Threw a July 4th BBQ for Random Strangers on the Beach",             date: "2026-07-04", filmDate: "2026-06-30", format: "Helping / Giving",        notes: "Buy a grill, food, decorations. Set up on a public beach. Invite anyone walking by. Timely content." },
  { title: "I Built the World's Worst Boat and Tried to Sail Across a Bay",        date: "2026-07-11", filmDate: "2026-07-07", format: "Absurd Concept",          notes: "Buy cheap hardware store materials. Build something barely floating. Try to cross a bay in PR. The failure IS the content." },
  { title: "I Went to the Barber With the WORST Reviews in Puerto Rico",            date: "2026-07-18", filmDate: "2026-07-14", format: "Investigative",           notes: "Google Maps worst-rated barber. Actually get your hair cut. Film the whole experience. Interview the barber." },
  { title: "I Cliff Jumped Every Spot in Puerto Rico in One Day",                   date: "2026-07-25", filmDate: "2026-07-21", format: "Adrenaline",              notes: "Hit every known cliff jumping spot — Crash Boat, Guajataca, etc. GoPro every jump. Birthday week July 25." },
  { title: "I Let a 5-Year-Old Control My Life for 24 Hours",                      date: "2026-08-01", filmDate: "2026-07-28", format: "Absurd Concept",          notes: "Find a kid (family friend, cousin). They make EVERY decision for 24 hours — what you eat, wear, where you go." },

  // AUGUST — PUSHING VIRAL
  { title: "I Opened a Free Lemonade Stand in the Hood (People's Reactions)",      date: "2026-08-08", filmDate: "2026-08-04", format: "Helping / Giving",        notes: "Set up a free lemonade stand in a tough neighborhood. Just talk to people. No agenda. DimeloGee/community vibes." },
  { title: "I Survived on Only Gas Station Food for 7 Days",                       date: "2026-08-15", filmDate: "2026-08-11", format: "Mini Challenge",           notes: "Every single meal from a gas station. Rate them. Show the nutritional horror. Track how you feel each day." },
  { title: "I Spoke Only Spanish to English Speakers for 24 Hours",                date: "2026-08-22", filmDate: "2026-08-18", format: "Prank + Surprise",        notes: "Go to tourist areas — speak ONLY Spanish. Film the confusion. Bilingual pranks perform insanely well." },
  { title: "I Camped on a Deserted Island in Puerto Rico for 3 Days",              date: "2026-08-29", filmDate: "2026-08-25", format: "Cinematic Adventure",     notes: "Boat to a small cay. 3 days alone. Fishing, shelter-building, nighttime footage. Kurt Caz / survival energy." },

  // SEPTEMBER — LEVELING UP
  { title: "I Gave My Barber $500 to Give Me ANY Haircut He Wanted",               date: "2026-09-05", filmDate: "2026-09-01", format: "Absurd Concept",          notes: "Walk in, hand them $500 cash, say 'do whatever you want.' The reveal and your reaction = the thumbnail." },
  { title: "I Challenged Random People at the Mall to Beat Me at Anything for $100", date: "2026-09-12", filmDate: "2026-09-08", format: "Prank + Mini Challenge", notes: "Arm wrestling, trivia, rock paper scissors. If they win, they get $100. You losing is funnier than winning." },
  { title: "I Ate at Every Restaurant on One Street in Puerto Rico",                date: "2026-09-19", filmDate: "2026-09-15", format: "Investigative",           notes: "Pick one street with tons of restaurants. Eat one thing at EVERY place. Rate them all. Talk to owners." },
  { title: "I Hitchhiked Across Puerto Rico With No Phone",                         date: "2026-09-26", filmDate: "2026-09-22", format: "Cinematic Adventure",     notes: "No phone, no GPS, no money. Strangers' stories become the content. Bald & Bankrupt rawness." },

  // OCTOBER — HALLOWEEN ENERGY
  { title: "I Tried Every Job on Craigslist Puerto Rico for One Day Each",         date: "2026-10-03", filmDate: "2026-09-29", format: "Mini Challenge",           notes: "Find the weirdest job listings. Show up. Actually do the work. Each job = a chapter." },
  { title: "I Pranked an Entire Town in Puerto Rico (No One Was Safe)",             date: "2026-10-10", filmDate: "2026-10-06", format: "Prank + Surprise",        notes: "Pick a small pueblo. Run 5-6 wholesome pranks. By end of day the whole town knows you." },
  { title: "I Explored Puerto Rico's Most Abandoned Building at 3AM",              date: "2026-10-17", filmDate: "2026-10-13", format: "Adrenaline",              notes: "Research the creepiest abandoned location in PR. Go at 3AM. Your genuine fear is the content." },
  { title: "I Said YES to Every Stranger for 24 Hours in Puerto Rico",             date: "2026-10-24", filmDate: "2026-10-20", format: "Absurd Concept",          notes: "Whatever anyone suggests or asks, you say yes. You have ZERO control. The day spirals." },
  { title: "I Went Trick-or-Treating as a 26-Year-Old (Reactions Were Insane)",    date: "2026-10-31", filmDate: "2026-10-27", format: "Prank + Surprise",        notes: "Full costume. Go door to door. Halloween night post = timely. Door reactions = non-stop content." },

  // NOVEMBER — DEEPER + GIVING
  { title: "I Lived Like My Grandparents for 48 Hours (No Phone, No Internet)",    date: "2026-11-07", filmDate: "2026-11-03", format: "Mini Challenge",           notes: "No tech for 2 days. Cook traditional food, visit elderly neighbors, hand-wash clothes. Gen Z vs old-school PR." },
  { title: "I Surprised My Mom With Her Dream [Thing] (She Had No Idea)",          date: "2026-11-14", filmDate: "2026-11-10", format: "Helping / Giving",        notes: "Whatever your mom has always wanted — room makeover, trip, gift. Plan secretly. Film the reveal." },
  { title: "I Wore a Disguise to My Own Neighborhood to See if Anyone Recognized Me", date: "2026-11-21", filmDate: "2026-11-17", format: "Prank + Surprise",    notes: "Professional disguise — old man, different look, full costume. Walk around barrio. Near-misses = hilarious." },
  { title: "I Cooked Thanksgiving Dinner for Strangers Who Had Nobody",            date: "2026-11-28", filmDate: "2026-11-24", format: "Helping / Giving",        notes: "Find people alone on Thanksgiving. Cook a real meal. Invite them. The human connection is the content." },

  // DECEMBER — FINISH THE YEAR ON FIRE
  { title: "I Let My Subscribers Control My Entire Day (It Got Out of Hand)",      date: "2026-12-05", filmDate: "2026-12-01", format: "Absurd Concept",          notes: "Post IG story night before asking followers what to do. Execute top-voted ideas. Community-driven chaos." },
  { title: "I Gave Christmas Gifts to Kids Who Weren't Expecting Anything",        date: "2026-12-12", filmDate: "2026-12-08", format: "Helping / Giving",        notes: "Buy gifts. Find families in communities that need it. Kids' reactions + parents' reactions. Keep it genuine." },
  { title: "I Trained Like a UFC Fighter for 30 Days (Then Got in the Ring)",      date: "2026-12-19", filmDate: "2026-12-15", format: "Mini Challenge",           notes: "Condense training footage throughout the month. End with an actual sparring match. Transformation + climax." },
  { title: "Everything I Learned Posting Every Week for 6 Months (My Honest Truth)", date: "2026-12-27", filmDate: "2026-12-22", format: "Cinematic Adventure", notes: "Reflection video. Show real analytics, growth, struggles. Tease 2027 plans. The bookend to Week 1." },
];

// ── creator styles for 300_Ideas_By_Creator ──────────────────────────────────

const CREATOR_STYLES = [
  "ThatWasEpic",
  "Brian Carmichael",
  "Mike Okay",
  "Jamantha Antoine",
  "Adrenaline Addiction",
  "Lofe",
  "Kurt Caz",
  "YouAreLouis",
  "DimeloGee",
  "Elmusulll",
  "RickyElPeluquero",
  "HectorLee",
  "AndrewWongPR",
  "FrancoMicheo",
  "Danny",
  "Lost LeBlanc",
  "I Did A Thing",
  "Michelle Khare",
  "Tyler Oliveira",
  "Bald and Bankrupt",
];

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const user = await db.user.findUnique({ where: { email: USER_EMAIL } });
  if (!user) throw new Error(`User not found with email: ${USER_EMAIL}. Make sure you're logged in.`);
  const userId = user.id;
  console.log(`\n✓ Found user: ${user.name ?? user.email} (${userId})\n`);

  // ── 1. Calendar entries ──────────────────────────────────────────────────
  console.log("📅 Importing calendar entries...");
  let calendarCount = 0;
  for (const entry of CALENDAR) {
    try {
      await db.contentCalendar.create({
        data: {
          userId,
          title: entry.title,
          scheduledDate: new Date(entry.date + "T10:00:00"),
          scriptType: "long_form",
          status: "planned",
          priority: 1,
          topic: entry.format,
          notes: `Film: ${entry.filmDate}\nFormat: ${entry.format}\n\n${entry.notes}`,
        },
      });
      calendarCount++;
      process.stdout.write(`  [${calendarCount}/${CALENDAR.length}] ${entry.title.slice(0, 60)}...\n`);
    } catch (e) {
      console.log(`  ⚠ Skipped (may already exist): ${entry.title.slice(0, 50)}`);
    }
  }
  console.log(`✓ Calendar: ${calendarCount} entries added\n`);

  // ── 2. Title sessions for each calendar video ────────────────────────────
  console.log("🎯 Creating title sessions for each calendar video...");
  let titleCount = 0;
  for (const entry of CALENDAR) {
    try {
      const titleEntry = {
        title: entry.title,
        overallScore: 9,
        ctrPrediction: 9,
        curiosityScore: 8,
        emotionScore: 8,
        searchabilityScore: 7,
        clarityScore: 9,
        reasoning: `From your 2026 content calendar. Format: ${entry.format}. ${entry.notes.slice(0, 100)}`,
      };
      await db.titleReport.create({
        data: {
          userId,
          topic: entry.title,
          targetKeywords: [entry.format],
          titles: [titleEntry],
          topTitle: entry.title,
          aiModel: "manual",
        },
      });
      titleCount++;
    } catch (e) {
      // skip duplicates
    }
  }
  console.log(`✓ Titles: ${titleCount} sessions created\n`);

  // ── 3. Fresh Ideas (100) ─────────────────────────────────────────────────
  console.log("💡 Importing 100 Fresh Ideas...");
  const freshText = readFile("100_FRESH_Ideas.md");
  const freshIdeas = parseNumberedList(freshText);
  let freshCount = 0;
  for (const title of freshIdeas) {
    try {
      await db.idea.create({
        data: { userId, title, category: "video", status: "idea", priority: 2, tags: ["fresh", "original"] },
      });
      freshCount++;
    } catch (e) { /* skip */ }
  }
  console.log(`✓ Fresh Ideas: ${freshCount} added\n`);

  // ── 4. Viral Ideas (100) ─────────────────────────────────────────────────
  console.log("🔥 Importing 100 Viral Video Ideas...");
  const viralText = readFile("100_Viral_Video_Ideas.md");
  const viralIdeas = parseNumberedList(viralText);
  let viralCount = 0;
  for (const title of viralIdeas) {
    try {
      await db.idea.create({
        data: { userId, title, category: "video", status: "idea", priority: 2, tags: ["viral"] },
      });
      viralCount++;
    } catch (e) { /* skip */ }
  }
  console.log(`✓ Viral Ideas: ${viralCount} added\n`);

  // ── 5. Creator-Style Ideas (300) ─────────────────────────────────────────
  console.log("🎬 Importing 300 Creator-Style Ideas...");
  const creatorText = readFile("300_Ideas_By_Creator.md");
  const sections = creatorText.split(/^##\s+/m).filter(Boolean);
  let creatorCount = 0;

  for (const section of sections) {
    const lines = section.split("\n");
    const headerLine = lines[0].trim();
    // Extract style name from header like "THATWASEPIC STYLE" → try to match a known creator
    const styleName =
      CREATOR_STYLES.find((s) =>
        headerLine.toUpperCase().includes(s.toUpperCase().replace(/\s+/g, ""))
      ) ??
      CREATOR_STYLES.find((s) =>
        s.toUpperCase().split(" ").some((w) => headerLine.toUpperCase().includes(w))
      ) ??
      headerLine.replace(/\s+STYLE$/i, "").trim();

    const ideas = parseNumberedList(section);
    for (const title of ideas) {
      try {
        await db.idea.create({
          data: {
            userId,
            title,
            category: "video",
            status: "idea",
            priority: 2,
            tags: ["creator-style", styleName.toLowerCase().replace(/\s+/g, "-")],
          },
        });
        creatorCount++;
      } catch (e) { /* skip */ }
    }
  }
  console.log(`✓ Creator-Style Ideas: ${creatorCount} added\n`);

  // ── 6. Calendar ideas also added to Ideas board ──────────────────────────
  console.log("📌 Adding calendar videos to Ideas board as high-priority...");
  let calIdeaCount = 0;
  for (const entry of CALENDAR) {
    try {
      await db.idea.create({
        data: {
          userId,
          title: entry.title,
          notes: `Format: ${entry.format}\nFilm: ${entry.filmDate} / Post: ${entry.date}\n\n${entry.notes}`,
          category: "video",
          status: "idea",
          priority: 3,
          tags: ["calendar-2026", entry.format.toLowerCase().replace(/[\s+]+/g, "-")],
        },
      });
      calIdeaCount++;
    } catch (e) { /* skip */ }
  }
  console.log(`✓ Calendar ideas on board: ${calIdeaCount} added\n`);

  // ── Summary ──────────────────────────────────────────────────────────────
  const totalIdeas = freshCount + viralCount + creatorCount + calIdeaCount;
  console.log("═".repeat(50));
  console.log(`✅ IMPORT COMPLETE`);
  console.log(`   📅 Calendar entries:  ${calendarCount}`);
  console.log(`   🎯 Title sessions:    ${titleCount}`);
  console.log(`   💡 Ideas board:       ${totalIdeas} total`);
  console.log(`      ↳ Fresh ideas:     ${freshCount}`);
  console.log(`      ↳ Viral ideas:     ${viralCount}`);
  console.log(`      ↳ Creator-style:   ${creatorCount}`);
  console.log(`      ↳ Calendar (P3):   ${calIdeaCount}`);
  console.log("═".repeat(50));
  console.log("\n→ Check /calendar for your 2026 schedule");
  console.log("→ Check /titles for your title sessions");
  console.log("→ Check /ideas for all your video ideas\n");
}

main()
  .catch((e) => { console.error("\n❌ Error:", e.message); process.exit(1); })
  .finally(() => db.$disconnect());
