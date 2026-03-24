export interface TemplateTask {
  name: string;
  position: number;
  evidence_required: boolean;
  assigned_role: string;
}

export interface TemplateMilestone {
  name: string;
  position: number;
  checklist: string[]; // kept for backwards compat — use tasks for new code
  tasks: TemplateTask[];
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
        tasks: [
          { name: "site hoarding erected", position: 1, evidence_required: true, assigned_role: "contractor" },
          { name: "welfare facilities installed", position: 2, evidence_required: true, assigned_role: "contractor" },
          { name: "existing services located and marked", position: 3, evidence_required: true, assigned_role: "contractor" },
          { name: "asbestos survey completed", position: 4, evidence_required: true, assigned_role: "contractor" },
          { name: "skip and waste management in place", position: 5, evidence_required: true, assigned_role: "contractor" },
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
        tasks: [
          { name: "internal walls removed as per drawings", position: 1, evidence_required: true, assigned_role: "contractor" },
          { name: "existing floor finishes removed", position: 2, evidence_required: true, assigned_role: "contractor" },
          { name: "bathroom and kitchen stripped", position: 3, evidence_required: true, assigned_role: "contractor" },
          { name: "ceiling removed where specified", position: 4, evidence_required: true, assigned_role: "contractor" },
          { name: "structural temporary supports in place", position: 5, evidence_required: true, assigned_role: "contractor" },
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
        tasks: [
          { name: "steel beams installed and padstones set", position: 1, evidence_required: true, assigned_role: "structural_engineer" },
          { name: "new openings formed and lintels installed", position: 2, evidence_required: true, assigned_role: "contractor" },
          { name: "structural engineer sign-off obtained", position: 3, evidence_required: true, assigned_role: "structural_engineer" },
          { name: "party wall works completed", position: 4, evidence_required: true, assigned_role: "contractor" },
          { name: "new load-bearing walls built", position: 5, evidence_required: true, assigned_role: "contractor" },
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
        tasks: [
          { name: "existing roof stripped", position: 1, evidence_required: true, assigned_role: "roofer" },
          { name: "new roof structure formed", position: 2, evidence_required: true, assigned_role: "roofer" },
          { name: "membrane and insulation laid", position: 3, evidence_required: true, assigned_role: "roofer" },
          { name: "roof tiles or covering fixed", position: 4, evidence_required: true, assigned_role: "roofer" },
          { name: "lead flashings and soakers fitted", position: 5, evidence_required: true, assigned_role: "roofer" },
          { name: "gutters and downpipes installed", position: 6, evidence_required: true, assigned_role: "roofer" },
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
        tasks: [
          { name: "stud walls erected", position: 1, evidence_required: true, assigned_role: "carpenter" },
          { name: "door linings fixed", position: 2, evidence_required: true, assigned_role: "carpenter" },
          { name: "joist noggins installed", position: 3, evidence_required: true, assigned_role: "carpenter" },
          { name: "flooring substrate laid", position: 4, evidence_required: true, assigned_role: "carpenter" },
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
        tasks: [
          { name: "soil and waste pipes run", position: 1, evidence_required: true, assigned_role: "plumber" },
          { name: "hot and cold supply pipes run", position: 2, evidence_required: true, assigned_role: "plumber" },
          { name: "underfloor heating pipes laid where specified", position: 3, evidence_required: true, assigned_role: "plumber" },
          { name: "cylinder and boiler position set", position: 4, evidence_required: true, assigned_role: "plumber" },
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
        tasks: [
          { name: "consumer unit position set", position: 1, evidence_required: true, assigned_role: "electrician" },
          { name: "cable routes run", position: 2, evidence_required: true, assigned_role: "electrician" },
          { name: "back boxes fixed", position: 3, evidence_required: true, assigned_role: "electrician" },
          { name: "earth bonding completed", position: 4, evidence_required: true, assigned_role: "electrician" },
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
        tasks: [
          { name: "dot and dab or studwork drylining fixed", position: 1, evidence_required: true, assigned_role: "plasterer" },
          { name: "coving grounds fixed", position: 2, evidence_required: true, assigned_role: "plasterer" },
          { name: "wet plaster scratch coat applied", position: 3, evidence_required: true, assigned_role: "plasterer" },
          { name: "finish coat applied", position: 4, evidence_required: true, assigned_role: "plasterer" },
          { name: "reveals and beads finished", position: 5, evidence_required: true, assigned_role: "plasterer" },
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
        tasks: [
          { name: "skirting and architrave fixed", position: 1, evidence_required: true, assigned_role: "carpenter" },
          { name: "doors hung", position: 2, evidence_required: true, assigned_role: "carpenter" },
          { name: "staircase balustrade fitted", position: 3, evidence_required: true, assigned_role: "carpenter" },
          { name: "fitted wardrobes installed", position: 4, evidence_required: true, assigned_role: "carpenter" },
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
        tasks: [
          { name: "sanitaryware fitted", position: 1, evidence_required: true, assigned_role: "plumber" },
          { name: "taps and showers connected", position: 2, evidence_required: true, assigned_role: "plumber" },
          { name: "boiler commissioned", position: 3, evidence_required: true, assigned_role: "plumber" },
          { name: "pressure tested and signed off", position: 4, evidence_required: true, assigned_role: "plumber" },
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
        tasks: [
          { name: "sockets and switches fitted", position: 1, evidence_required: true, assigned_role: "electrician" },
          { name: "light fittings installed", position: 2, evidence_required: true, assigned_role: "electrician" },
          { name: "consumer unit populated", position: 3, evidence_required: true, assigned_role: "electrician" },
          { name: "NICEIC sign-off obtained", position: 4, evidence_required: true, assigned_role: "electrician" },
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
        tasks: [
          { name: "substrate board fixed", position: 1, evidence_required: true, assigned_role: "tiler" },
          { name: "wall tiles fixed", position: 2, evidence_required: true, assigned_role: "tiler" },
          { name: "floor tiles fixed", position: 3, evidence_required: true, assigned_role: "tiler" },
          { name: "grouting completed", position: 4, evidence_required: true, assigned_role: "tiler" },
          { name: "silicone joints sealed", position: 5, evidence_required: true, assigned_role: "tiler" },
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
        tasks: [
          { name: "units installed", position: 1, evidence_required: true, assigned_role: "carpenter" },
          { name: "worktops fitted", position: 2, evidence_required: true, assigned_role: "carpenter" },
          { name: "appliances connected", position: 3, evidence_required: true, assigned_role: "contractor" },
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
        tasks: [
          { name: "mist coat applied", position: 1, evidence_required: true, assigned_role: "decorator" },
          { name: "full emulsion applied", position: 2, evidence_required: true, assigned_role: "decorator" },
          { name: "gloss to woodwork", position: 3, evidence_required: true, assigned_role: "decorator" },
          { name: "feature walls completed", position: 4, evidence_required: true, assigned_role: "decorator" },
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
        tasks: [
          { name: "underlay laid", position: 1, evidence_required: true, assigned_role: "flooring_installer" },
          { name: "floor covering fitted", position: 2, evidence_required: true, assigned_role: "flooring_installer" },
          { name: "thresholds and trims fixed", position: 3, evidence_required: true, assigned_role: "flooring_installer" },
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
        tasks: [
          { name: "full snagging inspection completed", position: 1, evidence_required: true, assigned_role: "contractor" },
          { name: "all defects remedied", position: 2, evidence_required: true, assigned_role: "contractor" },
          { name: "building control completion certificate obtained", position: 3, evidence_required: true, assigned_role: "contractor" },
          { name: "O&M manuals provided", position: 4, evidence_required: true, assigned_role: "contractor" },
          { name: "keys and warranties handed over", position: 5, evidence_required: true, assigned_role: "contractor" },
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
        tasks: [
          { name: "existing sanitaryware removed", position: 1, evidence_required: true, assigned_role: "plumber" },
          { name: "tiles hacked off", position: 2, evidence_required: true, assigned_role: "contractor" },
          { name: "floor covering removed", position: 3, evidence_required: true, assigned_role: "contractor" },
          { name: "redundant pipework capped", position: 4, evidence_required: true, assigned_role: "plumber" },
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
        tasks: [
          { name: "soil pipe extended or repositioned", position: 1, evidence_required: true, assigned_role: "plumber" },
          { name: "hot and cold supplies run to new positions", position: 2, evidence_required: true, assigned_role: "plumber" },
          { name: "waste pipes run for bath sink and shower", position: 3, evidence_required: true, assigned_role: "plumber" },
          { name: "pressure test completed", position: 4, evidence_required: true, assigned_role: "plumber" },
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
        tasks: [
          { name: "extractor fan wiring run", position: 1, evidence_required: true, assigned_role: "electrician" },
          { name: "shaver socket wiring run", position: 2, evidence_required: true, assigned_role: "electrician" },
          { name: "heated towel rail wiring run", position: 3, evidence_required: true, assigned_role: "electrician" },
          { name: "downlight positions wired", position: 4, evidence_required: true, assigned_role: "electrician" },
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
        tasks: [
          { name: "tanking membrane applied to wet areas", position: 1, evidence_required: true, assigned_role: "tiler" },
          { name: "cement board or aquapanel fixed", position: 2, evidence_required: true, assigned_role: "tiler" },
          { name: "wall tiles fixed and grouted", position: 3, evidence_required: true, assigned_role: "tiler" },
          { name: "floor tiles fixed and grouted", position: 4, evidence_required: true, assigned_role: "tiler" },
          { name: "silicone to all internal angles", position: 5, evidence_required: true, assigned_role: "tiler" },
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
        tasks: [
          { name: "sanitaryware fitted and sealed", position: 1, evidence_required: true, assigned_role: "plumber" },
          { name: "taps and shower valve fitted", position: 2, evidence_required: true, assigned_role: "plumber" },
          { name: "extractor fan fitted and tested", position: 3, evidence_required: true, assigned_role: "electrician" },
          { name: "heated towel rail fitted", position: 4, evidence_required: true, assigned_role: "electrician" },
          { name: "mirror and accessories fitted", position: 5, evidence_required: true, assigned_role: "contractor" },
          { name: "mastic joints completed", position: 6, evidence_required: true, assigned_role: "contractor" },
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
        tasks: [
          { name: "existing ceiling joists reinforced or replaced", position: 1, evidence_required: true, assigned_role: "structural_engineer" },
          { name: "new steel beam installed at ridge", position: 2, evidence_required: true, assigned_role: "structural_engineer" },
          { name: "structural engineer inspection passed", position: 3, evidence_required: true, assigned_role: "structural_engineer" },
          { name: "party wall works completed", position: 4, evidence_required: true, assigned_role: "contractor" },
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
        tasks: [
          { name: "dormer structure formed if applicable", position: 1, evidence_required: true, assigned_role: "roofer" },
          { name: "new roof covering to altered areas", position: 2, evidence_required: true, assigned_role: "roofer" },
          { name: "Velux or roof windows fitted", position: 3, evidence_required: true, assigned_role: "roofer" },
          { name: "lead flashings sealed", position: 4, evidence_required: true, assigned_role: "roofer" },
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
        tasks: [
          { name: "loft floor structure completed", position: 1, evidence_required: true, assigned_role: "carpenter" },
          { name: "staircase installed and guarded", position: 2, evidence_required: true, assigned_role: "carpenter" },
          { name: "stud walls formed to room layout", position: 3, evidence_required: true, assigned_role: "carpenter" },
          { name: "fire doors fitted to escape route", position: 4, evidence_required: true, assigned_role: "carpenter" },
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
        tasks: [
          { name: "electrical circuits run to loft level", position: 1, evidence_required: true, assigned_role: "electrician" },
          { name: "plumbing run if en-suite included", position: 2, evidence_required: true, assigned_role: "plumber" },
          { name: "mechanical ventilation ducted", position: 3, evidence_required: true, assigned_role: "contractor" },
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
        tasks: [
          { name: "insulation between and over rafters fitted", position: 1, evidence_required: true, assigned_role: "contractor" },
          { name: "plasterboard fixed", position: 2, evidence_required: true, assigned_role: "plasterer" },
          { name: "plastered and set", position: 3, evidence_required: true, assigned_role: "plasterer" },
          { name: "skirting and architrave fitted", position: 4, evidence_required: true, assigned_role: "carpenter" },
          { name: "second fix electrical and plumbing completed", position: 5, evidence_required: true, assigned_role: "contractor" },
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
        tasks: [
          { name: "final building control inspection booked", position: 1, evidence_required: true, assigned_role: "contractor" },
          { name: "completion certificate issued", position: 2, evidence_required: true, assigned_role: "contractor" },
          { name: "smoke alarm and fire detection tested", position: 3, evidence_required: true, assigned_role: "electrician" },
          { name: "emergency lighting tested if applicable", position: 4, evidence_required: true, assigned_role: "electrician" },
        ],
      },
    ],
  },
];
