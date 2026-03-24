export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Curated context snapshot — update this as needed
  const context = {
    user: {
      name: "Antonio Puopolo",
      age: 34,
      location: "Brisbane, Australia",
      timezone: "GMT+10",
      family: "Wife Madelene, 3 boys: Matteo, Alessio, Francesco",
    },
    work: {
      role: "Real Estate Salesperson",
      team: "Hicks Team at Place Real Estate",
      focus: "Camp Hill, Brisbane",
      boss: "Shane Hicks",
      kpis: "5 BAP / 2 MAP / 1 LAP per week, $60K/qtr GCI target",
      crm: "REX",
    },
    interests: {
      f1: "Massive F1 fan, favourite driver Kimi Antonelli, follows 2026 season",
      cars: "Drives/interested in Audi RS6",
    },
    assistant: {
      name: "Hamm (George voice)",
      purpose: "Help Antonio Make Money — personal AI for real estate productivity",
    },
  };

  return res.status(200).json(context);
}
