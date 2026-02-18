
function getSafeDate(year, month, day) {
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const safeDay = Math.min(day, lastDayOfMonth);
    return new Date(year, month, safeDay, 12, 0, 0);
}

function calculateFirstPayDate(todayIso, cutDay, payDay) {
    console.log(`\n--- Testing with Purchase: ${todayIso}, Cut: ${cutDay}, Pay: ${payDay} ---`);

    const today = new Date(todayIso);
    console.log("Purchase Date (derived):", today.toString());

    // Explicit casting simulation (Fix applied in database.ts)
    // We now force these to be numbers before use.
    cutDay = Number(cutDay);
    payDay = Number(payDay);

    let targetCutOffMonth = today.getMonth();
    let targetCutOffYear = today.getFullYear();

    console.log(`Current Day: ${today.getDate()}, Cut Day: ${cutDay}`);
    console.log(`Condition (today.getDate() > cutDay):`, today.getDate() > cutDay);

    if (today.getDate() > cutDay) {
        targetCutOffMonth++;
        console.log(">> Advanced CutOff Month to next month");
    } else {
        console.log(">> kept CutOff Month as current");
    }

    const cutOff = getSafeDate(targetCutOffYear, targetCutOffMonth, cutDay);
    console.log("Calculated Cut Off Date:", cutOff.toString());

    let targetPayMonth = cutOff.getMonth();
    let targetPayYear = cutOff.getFullYear();

    if (payDay < cutDay) {
        targetPayMonth++;
        console.log(">> PayDay < CutDay, advancing Pay Month");
    }

    const firstPayDate = getSafeDate(targetPayYear, targetPayMonth, payDay);
    console.log("Final First Pay Date:", firstPayDate.toString());

    return firstPayDate;
}

// Scenario 1: User's reported case
// Purchase: Feb 18, 2025. Cut: 3, Pay: 24.
// Expected: March 24.
// Bug Manifestation: Feb 24 (if it stayed in same month).

const dateIso = "2025-02-18T17:00:00.000Z"; // 12:00 Colombia Time (approx)
calculateFirstPayDate(dateIso, 3, 24);

// Scenario 2: String inputs (simulating SQLite weirdness)
calculateFirstPayDate(dateIso, "3", "24");

