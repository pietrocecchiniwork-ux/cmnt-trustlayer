export interface TemplateMilestone {
  name: string;
  position: number;
  checklist: string[];
}

export interface MilestoneTemplate {
  id: string;
  name: string;
  milestones: TemplateMilestone[];
}

export const milestoneTemplates: MilestoneTemplate[] = [
  {
    id: "full-refurbishment",
    name: "full refurbishment",
    milestones: [
      {
        name: "site setup and enabling works",
        position: 1,
        checklist: [
          "site hoarding erected",
          "welfare facilities installed",
          "existing services located and marked",
          "asbestos survey completed",
          "skip and waste management in place",
        ],
      },
      {
        name: "demolition and strip out",
        position: 2,
        checklist: [
          "internal walls removed as per drawings",
          "existing floor finishes removed",
          "bathroom and kitchen stripped",
          "ceiling removed where specified",
          "structural temporary supports in place",
        ],
      },
      {
        name: "structural works",
        position: 3,
        checklist: [
          "steel beams installed and padstones set",
          "new openings formed and lintels installed",
          "structural engineer sign-off obtained",
          "party wall works completed",
          "new load-bearing walls built",
        ],
      },
      {
        name: "roof works",
        position: 4,
        checklist: [
          "existing roof stripped",
          "new roof structure formed",
          "membrane and insulation laid",
          "roof tiles or covering fixed",
          "lead flashings and soakers fitted",
          "gutters and downpipes installed",
        ],
      },
      {
        name: "first fix carpentry",
        position: 5,
        checklist: [
          "stud walls erected",
          "door linings fixed",
          "joist noggins installed",
          "flooring substrate laid",
        ],
      },
      {
        name: "first fix plumbing",
        position: 6,
        checklist: [
          "soil and waste pipes run",
          "hot and cold supply pipes run",
          "underfloor heating pipes laid where specified",
          "cylinder and boiler position set",
        ],
      },
      {
        name: "first fix electrical",
        position: 7,
        checklist: [
          "consumer unit position set",
          "cable routes run",
          "back boxes fixed",
          "earth bonding completed",
        ],
      },
      {
        name: "plastering and drylining",
        position: 8,
        checklist: [
          "dot and dab or studwork drylining fixed",
          "coving grounds fixed",
          "wet plaster scratch coat applied",
          "finish coat applied",
          "reveals and beads finished",
        ],
      },
      {
        name: "second fix carpentry",
        position: 9,
        checklist: [
          "skirting and architrave fixed",
          "doors hung",
          "staircase balustrade fitted",
          "fitted wardrobes installed",
        ],
      },
      {
        name: "second fix plumbing",
        position: 10,
        checklist: [
          "sanitaryware fitted",
          "taps and showers connected",
          "boiler commissioned",
          "pressure tested and signed off",
        ],
      },
      {
        name: "second fix electrical",
        position: 11,
        checklist: [
          "sockets and switches fitted",
          "light fittings installed",
          "consumer unit populated",
          "NICEIC sign-off obtained",
        ],
      },
      {
        name: "tiling",
        position: 12,
        checklist: [
          "substrate board fixed",
          "wall tiles fixed",
          "floor tiles fixed",
          "grouting completed",
          "silicone joints sealed",
        ],
      },
      {
        name: "kitchen fit out",
        position: 13,
        checklist: [
          "units installed",
          "worktops fitted",
          "appliances connected",
        ],
      },
      {
        name: "decoration",
        position: 14,
        checklist: [
          "mist coat applied",
          "full emulsion applied",
          "gloss to woodwork",
          "feature walls completed",
        ],
      },
      {
        name: "flooring",
        position: 15,
        checklist: [
          "underlay laid",
          "floor covering fitted",
          "thresholds and trims fixed",
        ],
      },
      {
        name: "snagging and handover",
        position: 16,
        checklist: [
          "full snagging inspection completed",
          "all defects remedied",
          "building control completion certificate obtained",
          "O&M manuals provided",
          "keys and warranties handed over",
        ],
      },
    ],
  },
  {
    id: "bathroom-renovation",
    name: "bathroom renovation",
    milestones: [
      {
        name: "strip out",
        position: 1,
        checklist: [
          "existing sanitaryware removed",
          "tiles hacked off",
          "floor covering removed",
          "redundant pipework capped",
        ],
      },
      {
        name: "first fix plumbing",
        position: 2,
        checklist: [
          "soil pipe extended or repositioned",
          "hot and cold supplies run to new positions",
          "waste pipes run for bath sink and shower",
          "pressure test completed",
        ],
      },
      {
        name: "first fix electrical",
        position: 3,
        checklist: [
          "extractor fan wiring run",
          "shaver socket wiring run",
          "heated towel rail wiring run",
          "downlight positions wired",
        ],
      },
      {
        name: "substrate and tiling",
        position: 4,
        checklist: [
          "tanking membrane applied to wet areas",
          "cement board or aquapanel fixed",
          "wall tiles fixed and grouted",
          "floor tiles fixed and grouted",
          "silicone to all internal angles",
        ],
      },
      {
        name: "second fix and commissioning",
        position: 5,
        checklist: [
          "sanitaryware fitted and sealed",
          "taps and shower valve fitted",
          "extractor fan fitted and tested",
          "heated towel rail fitted",
          "mirror and accessories fitted",
          "mastic joints completed",
        ],
      },
    ],
  },
  {
    id: "loft-conversion",
    name: "loft conversion",
    milestones: [
      {
        name: "structural alterations",
        position: 1,
        checklist: [
          "existing ceiling joists reinforced or replaced",
          "new steel beam installed at ridge",
          "structural engineer inspection passed",
          "party wall works completed",
        ],
      },
      {
        name: "roof alterations",
        position: 2,
        checklist: [
          "dormer structure formed if applicable",
          "new roof covering to altered areas",
          "Velux or roof windows fitted",
          "lead flashings sealed",
        ],
      },
      {
        name: "floors walls and stairs",
        position: 3,
        checklist: [
          "loft floor structure completed",
          "staircase installed and guarded",
          "stud walls formed to room layout",
          "fire doors fitted to escape route",
        ],
      },
      {
        name: "first fix MEP",
        position: 4,
        checklist: [
          "electrical circuits run to loft level",
          "plumbing run if en-suite included",
          "mechanical ventilation ducted",
        ],
      },
      {
        name: "plastering and second fix",
        position: 5,
        checklist: [
          "insulation between and over rafters fitted",
          "plasterboard fixed",
          "plastered and set",
          "skirting and architrave fitted",
          "second fix electrical and plumbing completed",
        ],
      },
      {
        name: "building control sign-off",
        position: 6,
        checklist: [
          "final building control inspection booked",
          "completion certificate issued",
          "smoke alarm and fire detection tested",
          "emergency lighting tested if applicable",
        ],
      },
    ],
  },
];
