import {
  AlertTriangle,
  Backpack,
  Car,
  Droplets,
  HeartPulse,
  Home,
  LifeBuoy,
  Phone,
  Plug,
  Shield,
  Siren,
  Users,
} from "lucide-react";
import { cityGeo } from "../lib/indiaGeo";

const HELPLINES = [
  { name: "National emergency", num: "112", note: "Police, fire, ambulance — one number" },
  { name: "Ambulance", num: "108", note: "Medical emergency" },
  { name: "Disaster helpline", num: "1078", note: "NDMA / disaster management" },
  { name: "State disaster control", num: "1070", note: "State emergency operations" },
  { name: "Police", num: "100", note: "Local police" },
  { name: "Fire", num: "101", note: "Fire & rescue" },
];

const KIT = [
  "Torch + spare batteries",
  "Battery radio / charged power bank",
  "First-aid + essential medicines",
  "Sealed drinking water + dry food (2–3 days)",
  "Chlorine tablets / water purifier",
  "Aadhaar, ration card, voter ID in a zip bag",
  "Cash in small notes",
  "Spare clothes, shoes, sanitary items",
  "Rope, whistle, waterproof matches",
  "Mosquito repellent / net",
];

const BEFORE = [
  "Know the highest floor or nearest raised shelter and the walking route — not the car route.",
  "Listen to IMD / All India Radio / local TV. Do not wait for social-media rumours.",
  "Move valuables, documents and chemicals to a higher shelf. Unplug non-essential electrics.",
  "Fill clean bottles now. Floodwater is not drinking water.",
  "If you live in a basement or ground-floor ward, pack a bag tonight, not when water is at the door.",
];

const DURING = [
  "Move up. Never into a closed attic. If trapped, go to the roof and signal.",
  "Do not walk through moving water. 15 cm can knock you down; 30 cm can float a car.",
  "Turn Around, Don’t Drown — never drive into an underpass, nallah or flooded ORR/WEH dip.",
  "Stay off bridges over fast water. Do not touch switches if you are wet or standing in water.",
  "Keep children and elderly on higher floors. Do not let anyone play in floodwater.",
];

const AFTER = [
  "Return only when officials say it is safe. Wear boots and gloves for cleanup.",
  "Boil or chlorinate water. Throw out food that touched floodwater.",
  "Watch for snakes, live wires and open manholes. Avoid stagnant water (leptospirosis, dengue).",
  "Photograph damage for insurance / relief. Cooperate with surveys.",
  "Do not switch mains on until an electrician checks the board.",
];

const CITY_TIPS: Record<string, { title: string; tips: string[] }> = {
  bengaluru: {
    title: "Bengaluru — valley & lake wards",
    tips: [
      "Bellandur, Varthur, Koramangala valley and ORR dips flood first. Avoid Silk Board / Iblur underpasses.",
      "Lake bunds and storm drains can overflow with little warning. Do not stand on bunds to watch water.",
      "Power cuts are common. Keep a torch; do not wade near open transformer yards.",
    ],
  },
  mumbai: {
    title: "Mumbai — Mithi, creeks & locals",
    tips: [
      "Do not walk along tracks or onto platforms if water is over the rail. Locals halt — wait for BEST / Metro.",
      "Saki Naka, Kurla, Dharavi, BKC and Mahim Creek rise fast. Stay off WEH dips and subways.",
      "If a car stalls in water, get out immediately. Exhaust and electrics fail in minutes.",
    ],
  },
  chennai: {
    title: "Chennai — Adyar, canals & ECR",
    tips: [
      "Adyar, Kotturpuram, Saidapet and Pallikaranai marsh wards go under first. Avoid subway roads.",
      "Cyclone rain can keep rising after the eye passes. Stay on upper floors overnight.",
      "Do not drink metro / tanker water unless boiled. Prefer packaged water.",
    ],
  },
  delhi: {
    title: "Delhi — Yamuna floodplain",
    tips: [
      "Geeta Colony, Mayur Vihar, Yamuna Bank, ITO ghats and low colonies evacuate when the barrage rises.",
      "Do not go to the river to take photos. Currents at barrages are lethal.",
      "After water falls, mosquitoes and snakes move into rooms. Sleep under a net.",
    ],
  },
  hyderabad: {
    title: "Hyderabad — Musi & old city",
    tips: [
      "Chaderghat, Malakpet, Afzalgunj, Nayapul and Musi banks flood when the river is in spate.",
      "Do not cross Purana Pul / Nayapul on foot if water is on the deck.",
      "Osmania General Hospital area is low. Keep medicines dry and a neighbour contact ready.",
    ],
  },
  kolkata: {
    title: "Kolkata — Hooghly, canals & wetlands",
    tips: [
      "Garden Reach, Metiabruz, Beliaghata canal and East Kolkata wetlands flood with tide + rain.",
      "Never enter Tolly’s Nullah or lock gates. Currents reverse with the tide.",
      "Use boiled water; cholera risk rises after inundation.",
    ],
  },
  ahmedabad: {
    title: "Ahmedabad — Sabarmati banks",
    tips: [
      "Raikhad, Jamalpur, Behrampura and Danilimda sit on the old floodplain.",
      "Riverfront promenades are not shelters. Move inland and up.",
      "If the barrage releases water, leave the river edge immediately.",
    ],
  },
  pune: {
    title: "Pune — Mula–Mutha sangam",
    tips: [
      "Sangamwadi, Yerawada, Bund Garden, Mundhwa and riverside peths flood when dams release.",
      "Do not stand on Bund Garden or Holkar Bridge to watch the river.",
      "Dam-release warnings can come with only a few hours’ notice. Keep bags packed in monsoon.",
    ],
  },
  guwahati: {
    title: "Guwahati — Brahmaputra & Bharalu",
    tips: [
      "Bharalumukh, Fancy Bazaar, Pan Bazaar and Machkhowa go under when the Brahmaputra is high.",
      "Hill runoff (Basistha, Fatasil) can flash-flood lanes in minutes. Move upslope, not toward the river.",
      "Do not take boats unless run by NDRF / SDRF.",
    ],
  },
};

export function StaySafe({ city }: { city: string }) {
  const geo = cityGeo(city);
  const local = CITY_TIPS[city] ?? CITY_TIPS.bengaluru;

  return (
    <div className="space-y-4 pb-6">
      <div>
        <h2 className="font-display text-xl font-bold">How to stay safe during a flood</h2>
        <p className="mt-1 max-w-3xl text-xs text-slate-400">
          Practical steps from NDMA / NIDM public guidance, written for Indian cities. This page is first-aid
          knowledge — not an official warning. For {geo.name}, the mapped corridor is {geo.river}.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Stat icon={Droplets} k="15 cm moving water" v="Can knock an adult down" />
        <Stat icon={Car} k="30 cm of water" v="Can float and sweep a car" />
        <Stat icon={Siren} k="First call" v="112 — then move to higher ground" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Phase title="Before" icon={Home} color="text-sky-300" items={BEFORE} />
        <Phase title="During" icon={AlertTriangle} color="text-amber-300" items={DURING} />
        <Phase title="After" icon={HeartPulse} color="text-emerald-300" items={AFTER} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass rounded-xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-violetx-300" />
            <h3 className="font-display text-sm font-semibold">{local.title}</h3>
          </div>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-200">
            {local.tips.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violetx-400" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-slate-500">
            Use the Live Flood Map and Early Warning pages to see which nearby localities the engine flags first —
            then treat official IMD / municipal alerts as the order to move.
          </p>
        </div>

        <div className="glass rounded-xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <Backpack className="h-4 w-4 text-violetx-300" />
            <h3 className="font-display text-sm font-semibold">NDMA emergency kit</h3>
          </div>
          <ul className="grid grid-cols-1 gap-1.5 text-sm text-slate-200 sm:grid-cols-2">
            {KIT.map((item) => (
              <li key={item} className="rounded-md bg-white/5 px-2 py-1.5">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <Phone className="h-4 w-4 text-violetx-300" />
          <h3 className="font-display text-sm font-semibold">Call these numbers</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {HELPLINES.map((h) => (
            <a
              key={h.num}
              href={`tel:${h.num}`}
              className="rounded-lg border border-white/10 bg-ink-800/80 px-3 py-2 hover:border-violetx-400/40"
            >
              <div className="font-mono text-lg text-violetx-200">{h.num}</div>
              <div className="text-sm text-slate-100">{h.name}</div>
              <div className="text-[11px] text-slate-400">{h.note}</div>
            </a>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Donts />
        <div className="glass rounded-xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-violetx-300" />
            <h3 className="font-display text-sm font-semibold">Help neighbours</h3>
          </div>
          <ul className="space-y-2 text-sm text-slate-200">
            <li>Check on elderly, disabled people, pregnant women and those living alone on the ground floor.</li>
            <li>Share the upper floor. Do not charge money for shelter in an emergency.</li>
            <li>If you own a building with a terrace, keep the stair unlocked during heavy rain nights.</li>
            <li>Animals drown too — move pets and livestock to raised ground early.</li>
          </ul>
          <div className="mt-4 space-y-1 text-[11px] text-slate-500">
            <p>
              Sources:{" "}
              <a className="text-violetx-300 underline" href="https://ndma.gov.in/Natural-Hazards/Floods/Do-Donts" target="_blank" rel="noreferrer">
                NDMA flood do’s & don’ts
              </a>
              {" · "}
              <a className="text-violetx-300 underline" href="https://ndma.gov.in/Natural-Hazards/Floods" target="_blank" rel="noreferrer">
                NDMA emergency kit
              </a>
              {" · "}
              <a className="text-violetx-300 underline" href="https://www.nidm.gov.in/PDF/IEC/Dosnewnidm.pdf" target="_blank" rel="noreferrer">
                NIDM IEC
              </a>
              {" · "}
              <a className="text-violetx-300 underline" href="https://mausam.imd.gov.in/" target="_blank" rel="noreferrer">
                IMD
              </a>
            </p>
            <p>cosYNOT BMSCE is a simulation. Follow police, fire, NDRF and municipal orders over this screen.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, k, v }: { icon: typeof Droplets; k: string; v: string }) {
  return (
    <div className="glass flex items-center gap-3 rounded-xl px-3 py-3">
      <Icon className="h-5 w-5 shrink-0 text-sky-300" />
      <div>
        <div className="text-sm font-semibold">{k}</div>
        <div className="text-[11px] text-slate-400">{v}</div>
      </div>
    </div>
  );
}

function Phase({
  title,
  icon: Icon,
  color,
  items,
}: {
  title: string;
  icon: typeof Home;
  color: string;
  items: string[];
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <h3 className="font-display text-sm font-semibold">{title}</h3>
      </div>
      <ol className="space-y-2 text-sm leading-relaxed text-slate-200">
        {items.map((t, i) => (
          <li key={t} className="flex gap-2">
            <span className="font-mono text-[11px] text-slate-500">{i + 1}.</span>
            {t}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Donts() {
  const items = [
    { icon: Car, t: "Don’t drive into water you cannot see the bottom of." },
    { icon: Plug, t: "Don’t use wet switches, pumps or phone chargers in water." },
    { icon: Droplets, t: "Don’t drink, cook with, or bathe children in floodwater." },
    { icon: Shield, t: "Don’t return for documents or a bike if water is still rising." },
  ];
  return (
    <div className="glass rounded-xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-rose-300" />
        <h3 className="font-display text-sm font-semibold">Never do this</h3>
      </div>
      <ul className="space-y-3 text-sm text-slate-200">
        {items.map((x) => (
          <li key={x.t} className="flex gap-2">
            <x.icon className="mt-0.5 h-4 w-4 shrink-0 text-rose-300/80" />
            {x.t}
          </li>
        ))}
      </ul>
    </div>
  );
}
