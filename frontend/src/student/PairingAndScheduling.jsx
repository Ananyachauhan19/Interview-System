import { useState } from "react";

// Utility to shuffle and pair students
function pairStudents(students) {
  const shuffled = [...students].sort(() => Math.random() - 0.5);
  const pairs = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      pairs.push([shuffled[i], shuffled[i + 1]]);
    } else {
      pairs.push([shuffled[i], null]); // Odd student out
    }
  }
  return pairs;
}

const demoStudents = [
  "alice@example.com",
  "bob@example.com",
  "carol@example.com",
  "dave@example.com",
];

const demoSlots = [
  "2025-10-10 10:00",
  "2025-10-10 11:00",
  "2025-10-10 14:00",
  "2025-10-11 09:00",
];

export default function PairingAndScheduling() {
  const [students, setStudents] = useState(demoStudents);
  const [pairs, setPairs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedPairIdx, setSelectedPairIdx] = useState(null);
  const [proposedSlots, setProposedSlots] = useState([]);
  const [approvedSlot, setApprovedSlot] = useState("");
  const [slotVotes, setSlotVotes] = useState({});

  // Form pairs and notify
  const handlePairStudents = () => {
    const newPairs = pairStudents(students);
    setPairs(newPairs);
    setNotifications(
      newPairs.map(
        ([a, b]) =>
          b
            ? `Notification sent to ${a} and ${b}: You are paired for the event.`
            : `Notification sent to ${a}: No partner available.`
      )
    );
    setSelectedPairIdx(null);
    setProposedSlots([]);
    setApprovedSlot("");
    setSlotVotes({});
  };

  // Propose slots for a pair
  const handleProposeSlots = (idx) => {
    setSelectedPairIdx(idx);
    setProposedSlots(demoSlots);
    setApprovedSlot("");
    setSlotVotes({});
  };

  // Student votes for a slot
  const handleVoteSlot = (slot, student) => {
    setSlotVotes((prev) => {
      const updated = { ...prev };
      updated[slot] = updated[slot] ? [...updated[slot], student] : [student];
      // If both students voted for the same slot, approve it
      if (
        updated[slot].length === 2 &&
        pairs[selectedPairIdx].every((s) => updated[slot].includes(s))
      ) {
        setApprovedSlot(slot);
      }
      return updated;
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-2xl w-full mx-auto">
        <h2 className="text-3xl font-extrabold mb-4 text-blue-700 text-center tracking-tight">Pairing & Scheduling</h2>
        <button
          onClick={handlePairStudents}
          className="mb-8 w-full bg-blue-600 text-white p-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition text-lg"
        >
          Form Random Pairs & Notify
        </button>
        {notifications.length > 0 && (
          <div className="mb-8">
            <h3 className="font-semibold mb-2 text-lg text-gray-700">Notifications:</h3>
            <ul className="list-disc ml-6">
              {notifications.map((note, idx) => (
                <li key={idx} className="text-gray-700 text-base">{note}</li>
              ))}
            </ul>
          </div>
        )}
        {pairs.length > 0 && (
          <div>
            <h3 className="font-semibold mb-4 text-lg text-gray-700">Student Pairs:</h3>
            <ul className="divide-y divide-gray-200 mb-8">
              {pairs.map(([a, b], idx) => (
                <li key={idx} className="py-3 flex justify-between items-center">
                  <span className="font-semibold text-blue-700 text-lg">{a} {b ? `& ${b}` : "(no partner)"}</span>
                  {b && (
                    <button
                      className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:bg-green-700 transition text-lg"
                      onClick={() => handleProposeSlots(idx)}
                    >
                      Propose Time Slots
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {selectedPairIdx !== null && pairs[selectedPairIdx][1] && (
          <div className="mb-8">
            <h3 className="font-semibold mb-4 text-lg text-gray-700">Propose & Approve Time Slot</h3>
            <div className="mb-2 text-blue-700 font-semibold">Pair: {pairs[selectedPairIdx][0]} & {pairs[selectedPairIdx][1]}</div>
            <ul className="list-disc ml-6 mb-2">
              {proposedSlots.map((slot, idx) => (
                <li key={idx} className="mb-2 flex items-center">
                  <span className="mr-4 text-lg text-gray-700">{slot}</span>
                  {pairs[selectedPairIdx].map((student) => (
                    <button
                      key={student}
                      className={`ml-2 px-3 py-2 rounded-xl font-semibold text-sm ${slotVotes[slot]?.includes(student) ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}
                      onClick={() => handleVoteSlot(slot, student)}
                      disabled={approvedSlot}
                    >
                      {slotVotes[slot]?.includes(student) ? "Voted" : `Vote as ${student}`}
                    </button>
                  ))}
                </li>
              ))}
            </ul>
            {approvedSlot && (
              <div className="text-green-600 font-bold text-lg mt-4">Approved Slot: {approvedSlot}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
