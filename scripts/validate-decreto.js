// scripts/validate-decreto.js

// Replicate the calculateHoursAndCategory function from page.js exactly
const calculateHoursAndCategory = (equiv, chapters) => {
  const hasCatC = chapters.cap_8 || chapters.cap_9 || chapters.cap_10;
  const hasCatB = chapters.cap_7 || chapters.cap_13 || chapters.cap_15 || chapters.cap_16 || chapters.cap_17;

  let category = 'A';
  if (hasCatC) {
    category = 'C';
  } else if (hasCatB) {
    category = 'B';
  }

  let hours = 0;
  if (equiv >= 1 && equiv <= 15) {
    hours = category === 'A' ? 0 : (category === 'B' ? 2 : 4);
  } else if (equiv > 15 && equiv <= 30) {
    hours = category === 'A' ? 0 : (category === 'B' ? 4 : 8);
  } else if (equiv > 30 && equiv <= 60) {
    hours = category === 'A' ? 0 : (category === 'B' ? 8 : 16);
  } else if (equiv > 60 && equiv <= 100) {
    hours = category === 'A' ? 1 : (category === 'B' ? 16 : 28);
  } else if (equiv > 100 && equiv <= 150) {
    hours = category === 'A' ? 2 : (category === 'B' ? 22 : 44);
  } else if (equiv > 150 && equiv <= 250) {
    hours = category === 'A' ? 4 : (category === 'B' ? 30 : 60);
  } else if (equiv > 250 && equiv <= 350) {
    hours = category === 'A' ? 8 : (category === 'B' ? 45 : 78);
  } else if (equiv > 350 && equiv <= 500) {
    hours = category === 'A' ? 12 : (category === 'B' ? 60 : 96);
  } else if (equiv > 500 && equiv <= 650) {
    hours = category === 'A' ? 16 : (category === 'B' ? 75 : 114);
  } else if (equiv > 650 && equiv <= 850) {
    hours = category === 'A' ? 20 : (category === 'B' ? 90 : 132);
  } else if (equiv > 850 && equiv <= 1100) {
    hours = category === 'A' ? 24 : (category === 'B' ? 105 : 150);
  } else if (equiv > 1100 && equiv <= 1400) {
    hours = category === 'A' ? 28 : (category === 'B' ? 120 : 168);
  } else if (equiv > 1400 && equiv <= 1900) {
    hours = category === 'A' ? 32 : (category === 'B' ? 135 : 186);
  } else if (equiv > 1900 && equiv <= 3000) {
    hours = category === 'A' ? 36 : (category === 'B' ? 150 : 204);
  } else if (equiv > 3000) {
    hours = category === 'A' ? 40 : (category === 'B' ? 170 : 220);
  }

  return { category, hours };
};

// Test suite
const tests = [
  // Equivalent workers formula check
  { admin: 10, prod: 40, expectedEquiv: 45 },
  { admin: 5, prod: 20, expectedEquiv: 22.5 },
  { admin: 0, prod: 100, expectedEquiv: 100 },

  // Risk Category logic
  { chapters: { cap_8: true }, expectedCategory: 'C' }, // Cap 8 -> C
  { chapters: { cap_9: true }, expectedCategory: 'C' }, // Cap 9 -> C
  { chapters: { cap_10: true }, expectedCategory: 'C' }, // Cap 10 -> C
  { chapters: { cap_7: true }, expectedCategory: 'B' }, // Cap 7 -> B
  { chapters: { cap_13: true }, expectedCategory: 'B' }, // Cap 13 -> B
  { chapters: { cap_15: true }, expectedCategory: 'B' }, // Cap 15 -> B
  { chapters: { cap_16: true }, expectedCategory: 'B' }, // Cap 16 -> B
  { chapters: { cap_17: true }, expectedCategory: 'B' }, // Cap 17 -> B
  { chapters: { cap_5: true, cap_6: true, cap_11: true }, expectedCategory: 'A' }, // Only Cap 5, 6, 11 -> A
  { chapters: { cap_8: true, cap_15: true }, expectedCategory: 'C' }, // C overrides B

  // Hours matrix logic
  // Range 1-15
  { equiv: 10, chapters: { cap_5: true }, expectedCategory: 'A', expectedHours: 0 },
  { equiv: 10, chapters: { cap_15: true }, expectedCategory: 'B', expectedHours: 2 },
  { equiv: 10, chapters: { cap_8: true }, expectedCategory: 'C', expectedHours: 4 },

  // Range 61-100
  { equiv: 80, chapters: { cap_5: true }, expectedCategory: 'A', expectedHours: 1 },
  { equiv: 80, chapters: { cap_15: true }, expectedCategory: 'B', expectedHours: 16 },
  { equiv: 80, chapters: { cap_8: true }, expectedCategory: 'C', expectedHours: 28 },

  // Range >3000
  { equiv: 4000, chapters: { cap_5: true }, expectedCategory: 'A', expectedHours: 40 },
  { equiv: 4000, chapters: { cap_15: true }, expectedCategory: 'B', expectedHours: 170 },
  { equiv: 4000, chapters: { cap_8: true }, expectedCategory: 'C', expectedHours: 220 },
];

let successCount = 0;
let failCount = 0;

console.log('Starting Decreto 351/79 calculation logic validation...');

tests.forEach((t, index) => {
  if (t.expectedEquiv !== undefined) {
    // Test equiv formula
    const actualEquiv = (t.admin / 2) + t.prod;
    if (actualEquiv === t.expectedEquiv) {
      successCount++;
    } else {
      console.error(`Test ${index} failed: admin=${t.admin}, prod=${t.prod} | expectedEquiv=${t.expectedEquiv}, got=${actualEquiv}`);
      failCount++;
    }
  } else {
    // Test category and hours
    const { category, hours } = calculateHoursAndCategory(t.equiv || 0, t.chapters);
    let ok = true;
    if (category !== t.expectedCategory) {
      console.error(`Test ${index} failed: equiv=${t.equiv}, chapters=${JSON.stringify(t.chapters)} | expectedCategory=${t.expectedCategory}, got=${category}`);
      ok = false;
    }
    if (t.expectedHours !== undefined && hours !== t.expectedHours) {
      console.error(`Test ${index} failed: equiv=${t.equiv}, chapters=${JSON.stringify(t.chapters)} | expectedHours=${t.expectedHours}, got=${hours}`);
      ok = false;
    }
    if (ok) {
      successCount++;
    } else {
      failCount++;
    }
  }
});

console.log(`\nValidation complete. Passed: ${successCount}/${tests.length} | Failed: ${failCount}`);
if (failCount > 0) {
  process.exit(1);
} else {
  console.log('All calculations matching the Decreto 351/79 hours and category requirements!');
  process.exit(0);
}
