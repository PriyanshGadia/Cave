# VAULT-01 // ABOUT PAGE MASTER ART BIBLE
## Canonical Specification for the Illustrated Visual Story of Priyansh Gadia Building VAULT-01
### Rule Compliance: AGENTS.md Rule 10 & plan.md Phase 1 Mandate

---

## 1. Executive Directive & Narrative Thesis

> **"The story was never about a generic superhero or a suit. It is the authentic story of the builder: how Priyansh found an empty subterranean basalt cave and built VAULT-01 piece by piece into an operating systems foundry."**

- **Core Rule**: **ONE PLACE. ONE CHARACTER. ONE BUILD. MULTIPLE MOMENTS IN TIME.**
- **Strict Visual Requirement**: Every scene is photographed/illustrated inside the **SAME physical basalt cavern**. The room physically accumulates:
  $$\text{Raw Cave} \longrightarrow \text{Hollow} \longrightarrow \text{Workbench} \longrightarrow \text{Central Core} \longrightarrow \text{LS1} \longrightarrow \text{RS1} \longrightarrow \text{LS2/RS2} \longrightarrow \text{RS3} \longrightarrow \text{Integration} \longrightarrow \text{Completed VAULT-01}$$
- **Visual Dominance**: **80–90% of the viewport is artwork**. Story copy and technical indicators are minimal translucent callouts (10–20% maximum).
- **No Text in Artwork**: The generated artwork contains **zero AI typography, fake UI, labels, or numbers**. All text lives in HTML/CSS/SVG.
- **Continuity Gate**: Scene $N$ strictly inherits Scene $N-1$. Every object introduced in an earlier scene remains present, in its exact coordinate location, in every subsequent scene.

---

## 2. Master Environment: The Subterranean Basalt Foundry

### 2.1 Geological & Architectural Foundation
- **Setting**: A deep subterranean volcanic basalt cave located hundreds of meters underground.
- **Ceiling**: 8.5 to 10 meters high, characterized by hexagonal columnar basalt joints, dramatic natural ceiling fissures, rough rock fracture planes, and water/mineral seepage stains (dark iron oxide streaks).
- **Floor**: Uneven natural dark grey/black basalt floor. A circular excavated depression (the central pit, diameter 7.5m, depth 0.35m) sits at the center, carved and leveled by hand.
- **Walls**: Stepped basalt columns and raw fracture faces. Irregular rock alcoves on the west and east perimeter where stations are anchored with industrial steel brackets and concrete grout.
- **Atmosphere**: Early scenes have cold cavern darkness, drifting limestone dust, and breath moisture. Middle scenes introduce heat haze from welding and soldering, coiled cabling, and industrial tool racks. Late scenes feature filtered cleanroom airflow, cryogenic vapor wisps around heatsinks, and volumetric light cones.

### 2.2 Spatial Map & Sector Coordinates
The room is oriented with the primary entrance tunnel at the **South** and the deep cave wall at the **North**:

```text
                           [ NORTH CAVE WALL ]
                                    │
           [LS3]                    │                    [RS3]
      World Telemetry               │                Chronos Radar
      (North-West)                  │                (North-East)
                                    │
                                    │
           [LS2]                    │                    [RS2]
      Clinical / Research           │              Transformer Compute
      (Mid-West)                    │              (Mid-East)
                                    │
                                    │
           [LS1]            [CENTRAL HOLOTABLE]          [RS1]
      Biometric Entry       Circular Core Gantry     Argus Vision Racks
      (South-West)           [0, 0, 0] Center        (South-East)
                                    │
                                    │
                            [ENTRANCE TUNNEL]
                              South Threshold
```

### 2.3 Master Lighting Progression
1. **Scenes 01–02 (Discovery)**: Deep obsidian/charcoal darkness (`#050609`). The only illumination is a single 2700K halogen portable work lamp (warm amber `#e5a93b`) held by Priyansh, throwing high-contrast grazing shadows across fractured basalt.
2. **Scenes 03–04 (Excavation & Center)**: Temporary tripod work halogen lamps and drafting clip-lights (`#ffb347`, 3200K) focused on the floor pit. Tungsten sparks and amber welding glow.
3. **Scenes 05–06 (LS1 & RS1 Online)**: First introduction of coherent **Cyan Plasma & Sensor Blue** (`#00f2ff`, `#2563eb`). LS1 biometric slit glows cobalt; RS1 server telemetry lights pulse emerald and cyan. The cave begins to acquire dual-temperature lighting (warm rock shadows vs. cool technical emitters).
4. **Scenes 07–08 (Compute & Coordination)**: Internal refraction caustics from RS2's liquid cooling loops (`#00e5ff`) and periodic amber radar sweeps from RS3 (`#ffaa00`).
5. **Scenes 09–10 (Integration & VAULT-01 Payoff)**: The grand activation. Perimeter floor trenches, recessed architectural rock-wall uplights, and overhead gantry luminaires energize in unison. Balanced palette: deep obsidian basalt (`#0a0d14`), structural titanium slate (`#1e2430`), rich cyan system arteries (`#00f2ff`), and restrained crimson structural identity accents (`#8b1e28`).

---

## 3. Master Character: Priyansh Gadia

### 3.1 Anatomical & Facial Likeness
- **Identity Source**: Derived directly from `public/priyansh-clean.webp` and `ls1_identity_detail.js`.
- **Demographics**: South Asian / Indian male, early 20s, athletic lean engineer's build (height ~1.78m).
- **Hair**: Natural thick, dark wavy/curly black hair with natural volume and texture.
- **Face**: Defined jawline, focused brow, expressive dark brown eyes with intense intellectual concentration, neat subtle stubble / clean-shaven.
- **CRITICAL INVARIANT**: **STRICTLY NO SPECTACLES / GLASSES IN ANY ARTWORK**. Bare, alert eyes.
- **Posture & Pose**: **NO HERO POSES. NO ARMS CROSSED. NO FLOATING.** Priyansh is an engineer and researcher actively engaged in physical or mental work in every single frame.

### 3.2 Costume & Equipment Progression
Priyansh's attire realistically evolves with the state of the foundry:

| Era | Chapters | Wardrobe | Tools & Gear | Physical Condition |
| :--- | :--- | :--- | :--- | :--- |
| **I. Rugged Discovery** | Ch 01–03 | Heavy dark canvas chore jacket, durable charcoal utility trousers, reinforced steel-toe leather work boots, leather work gloves. Headlamp unbuckled around neck. | Hand-held high-output halogen searchlight, surveyor's steel tape, mechanical chalk stick, field notebook. | Weary, alert, dust-smudged hands, high-focus body language. |
| **II. Heavy Assembly** | Ch 04–06 | Dark henley / utility work tee, sleeves pushed up to elbows, padded technical cargo pants, heavy tool belt with holster pockets. | Cordless industrial torque driver, digital multimeter, wire strippers, safety glasses pulled down around neck. | Sleeves rolled up, forearm veins prominent, hands working on terminals and junction boxes. |
| **III. Systems Integration** | Ch 07–09 | Technical matte-black mid-layer shirt, dark tailored ergonomic trousers, clean utility sneakers. | Precision stylus, electronic calibration wand, fiber-optic splicing tool, diagnostic tablet. | Clean, confident, completely immersed in complex architectural orchestration. |
| **IV. The Operating Vault** | Ch 10 | Refined minimalist dark techwear overshirt/blazer, dark trousers. Bare hands. | None (the entire room is the tool). | Relaxed yet commanding natural posture standing beside the completed central console. |

---

## 4. The 7 Master Vault Objects: Detailed Specification & 4-Stage Lifecycle

Every object exists in the physical cavern, anchored at specific 3D coordinates, and evolves across 4 discrete construction stages:
1. **Unfinished**: Raw mounting plates, rough masonry anchors, loose cables, open shipping/assembly crates.
2. **Partial**: Chassis assembled, internal circuitry and cooling lines visible, hand tools actively applied.
3. **Operational**: Exterior bezels fastened, primary displays and energy loops functional, actively running tasks.
4. **Master / Integrated**: Fully dressed with custom armor panels, conduits sealed in floor trenches, integrated into the central neural bus.

---

### Object 1: Central AI Holotable (`CORE // ARC-01`)
- **Shape**: Low-profile circular sunken ring platform (diameter 3.4m, height 0.82m) with a central recessed toroidal cavity housing the `ARC-01` electromagnetic containment ring. Surrounded by an outer graphite work ring with flush capacitive glass controls.
- **Material**: Matte bead-blasted dark titanium-alloy outer rim, copper electromagnetic induction coils visible through quartz glass inspection ports, frosted diffuser ring, inner tungsten core emitter.
- **Scale**: 3.4m diameter, 0.82m height from recessed pit floor.
- **Location**: Cavern dead center: `[X: 0.0m, Y: 0.0m, Z: 0.0m]`.
- **Colour**: Charcoal titanium (`#1a1d24`), burnished copper (`#b87333`), cyan emitter aura (`#00f2ff`), tungsten filament glow (`#ffb347`).
- **Lighting**: Internal upward-firing volumetric cyan cone (`#00f2ff`), perimeter amber status indicators (`#f59e0b`).
- **Construction Stages**:
  - *Unfinished (Ch 03)*: Perfect circular chalk layout inscribed on the leveled basalt floor; 8 steel anchor plates bolted into rock boreholes with exposed threads; wooden parts crate nearby containing uncoiled heavy copper wire and ceramic insulators.
  - *Partial (Ch 04)*: Titanium chassis ring anchored; segmented copper toroidal coils exposed without top glass; Priyansh on one knee tightening a hex bolt with a torque wrench; battery-powered diagnostic terminal showing waveform test pulses.
  - *Operational (Ch 05–08)*: Toroid sealed beneath circular tempered quartz; cyan plasma core breathing softly (0.5 Hz harmonic pulse); circular holographic interface hovering 40cm above the table; diagnostic instruments neatly racked on perimeter.
  - *Master (Ch 09–10)*: Full multi-layered volumetric holographic node matrix suspended in air; 6 radial floor conduit trenches sealed with glass deck plates glowing with cyan data pulses leading to all wall sectors.

---

### Object 2: Sector LS1 (`PORTAL // BIOMETRICS & IDENTITY`)
- **Shape**: Monolithic vertical pedestal console (0.5m x 0.45m x 1.35m) with an angled optical glass surface, positioned in front of a heavy octagonal reinforced pressure airlock portal frame embedded into the basalt rock fissure.
- **Material**: Textured gunmetal aluminum, polished dark obsidian optical glass surface, brushed steel mounting braces anchored into raw rock.
- **Scale**: Pedestal: 1.35m high, 0.5m wide; Portal Frame: 2.8m high x 2.2m wide rock-anchored airlock frame.
- **Location**: South-West wall (`Sector LS1`), coordinates: `[X: -4.8m, Y: 0.0m, Z: -2.5m]`.
- **Colour**: Obsidian black (`#0d0e12`), cobalt blue biometric laser grid (`#2563eb`), cyan authorization aura (`#06b6d4`).
- **Lighting**: Vertical optical prism slit glowing deep cobalt, multi-spectral biometric scanner projection (retinal & palm scan fan).
- **Construction Stages**:
  - *Unfinished (Ch 03–04)*: Raw fissure in basalt framed with heavy steel structural I-beams; hydraulic actuator mounting pins welded to rock anchors; coils of heavy shielded cable hanging from temporary scaffolding.
  - *Partial (Ch 05)*: Pedestal housing mounted; side maintenance hatch open showing exposed ribbon cable harness and terminal blocks; Priyansh holding a digital multimeter probe against an optical emitter; test alignment grid flickering erratically on glass.
  - *Operational (Ch 06–08)*: Pedestal sealed; active multi-spectral scanning prism casting a crisp cobalt/cyan laser fan; octagonal airlock seals pressurized; status indicators solid green/cyan.
  - *Master (Ch 09–10)*: Monolithic zero-trust entry gateway; floor optical fibers glowing steady cobalt; primary access interface for VAULT-01.

---

### Object 3: Sector RS1 (`ARGUS // COMPUTER VISION & TELEMETRY`)
- **Shape**: Twin vertical 19-inch industrial rack towers (2.1m high x 0.8m wide each) angled 15° inward toward the room center, topped by an articulated triple-camera optical sensor gimbal.
- **Material**: Cold-rolled steel rack chassis with black powder coat, ventilated perforated aluminum bezels, glass-shielded high-speed camera sensors with knurled brass lens rings.
- **Scale**: Dual rack: 1.8m width total, 2.1m height, 0.7m depth.
- **Location**: South-East wall (`Sector RS1`), coordinates: `[X: +4.8m, Y: 0.0m, Z: -2.5m]`.
- **Colour**: Industrial rack black (`#111318`), server status LEDs (cool white and phosphor green), phosphor cyan vision stream monitors.
- **Lighting**: Soft glow from dual CRT/LCD telemetry screens displaying vector tracking grids, high-speed camera infrared ring illuminators.
- **Construction Stages**:
  - *Unfinished (Ch 04)*: Steel rack skeletal frame anchored to concrete leveling pads; unpopulated rack rails; open cardboard/foam crates containing 4U server chassis on the floor.
  - *Partial (Ch 05)*: Racks populated with GPU compute blades; thick braided looms of orange fiber-optic cables being laced with zip-ties along cable ladders; top camera gimbal mounted but uncalibrated.
  - *Operational (Ch 06)*: All servers powered and humming; optical camera gimbal actively tracking room movement with subtle stepper motor clicks; dual diagnostic screens rendering real-time spatial point-clouds of the cave.
  - *Master (Ch 07–10)*: Argus edge telemetry engine running continuous spatial tracking; vector lines projected onto floor surfaces; integrated into central vault defense and monitoring bus.

---

### Object 4: Sector LS2 (`RESEARCH // SCRATCHPAD & CLINICAL AI`)
- **Shape**: Expansive cantilevered drafting console (2.4m length x 0.85m depth) mounted directly beneath a backlit slate-black magnetic schematic wall (2.4m x 1.6m) fixed to the basalt wall.
- **Material**: Heavy zinc drafting tabletop with inlaid brass ruler edge, matte black magnetic composite wall, gooseneck articulated task lamps in spun aluminum.
- **Scale**: 2.4m wide x 1.8m high footprint against the west cave wall.
- **Location**: Mid-West wall (`Sector LS2`), coordinates: `[X: -5.6m, Y: 0.0m, Z: +1.5m]`.
- **Colour**: Slate charcoal (`#181a20`), warm incandescent tungsten light (`#ffbe6a`), graph-paper ivory (`#f0eee6`), chalk white annotations (`#e2e8f0`).
- **Lighting**: Dual warm incandescent articulated desk lamps (2700K) casting sharp shadows on papers, soft backlighting behind the magnetic blackboard.
- **Construction Stages**:
  - *Unfinished (Ch 05)*: Raw basalt wall marked with red chalk guidelines; heavy wall anchors drilled; timber bracing holding steel mounting bracket in place.
  - *Partial (Ch 06)*: Zinc table surface installed; magnetic blackboard mounted; covered in dense hand-chalked mathematical proofs (loss functions, transformer attention equations); piles of clinical trial printouts and open notebooks.
  - *Operational (Ch 07)*: Dual auxiliary high-resolution monochrome research displays mounted alongside blackboard; model loss curves charting down to convergence; Priyansh writing formulas directly onto blackboard with chalk.
  - *Master (Ch 09–10)*: Digital research repository station; handwritten notes preserved alongside digital neural architecture diagrams; high-density storage array under desk fully humming.

---

### Object 5: Sector RS2 (`COMPUTE // TRANSFORMER KERNELS & C++ ENGINE`)
- **Shape**: Monolithic hermetic liquid-cooled server cabinet (1.2m wide x 2.2m high x 0.9m deep) with transparent borosilicate front panel revealing vertical rows of copper heatsinks and glowing coolant channels.
- **Material**: Brushed gunmetal magnesium-aluminum alloy, transparent borosilicate glass, nickel-plated liquid cooling manifolds, clear fluoropolymer tubing with circulating coolant.
- **Scale**: 1.2m wide, 2.2m high, 0.9m deep.
- **Location**: Mid-East wall (`Sector RS2`), coordinates: `[X: +5.6m, Y: 0.0m, Z: +1.5m]`.
- **Colour**: Deep titanium slate (`#1c202a`), pure cryogenic cyan coolant (`#00e5ff`), amber diagnostic fault indicators.
- **Lighting**: Internal illumination along coolant manifolds casting shimmering refraction caustics onto adjacent rock walls.
- **Construction Stages**:
  - *Unfinished (Ch 05)*: Reinforced concrete foundation plinth curing on rock floor; heavy copper grounding strap bolted into deep borehole; empty cabinet shell on transport pallet.
  - *Partial (Ch 06)*: Server blade chassis inserted; liquid cooling loop open with Priyansh pressure-testing fittings with a hand pump; temporary coolant bucket and towel on floor.
  - *Operational (Ch 07)*: Loop pressurized; blue/cyan coolant circulating with micro-bubbles; front panel closed; digital readout displaying core frequency (4.8 GHz) and memory bandwidth metrics.
  - *Master (Ch 08–10)*: Peak performance state; zero thermal throttle; low laminar fan whisper; bus cables tied into RS1 and Central Table through overhead cable trays.

---

### Object 6: Sector RS3 (`CHRONOS // MISSION SCHEDULING RADAR`)
- **Shape**: Slanted circular naval-radar style command console (1.0m diameter) on a heavy cast-iron pedestal, flanked by three vertical micro-telemetry panels showing time-zone ephemeris and scheduling clocks.
- **Material**: Dark cast iron base, bead-blasted stainless steel bezel, curved convex radar cathode-ray display glass, brass rotary encoder dials.
- **Scale**: 1.0m diameter console, 1.2m height.
- **Location**: North-East wall (`Sector RS3`), coordinates: `[X: +4.2m, Y: 0.0m, Z: +5.2m]`.
- **Colour**: Industrial battleship grey (`#232832`), phosphor amber sweep beam (`#ffaa00`), dark navy radar grid (`#0a192f`).
- **Lighting**: Slow 360° rotating amber radar sweep beam casting periodic amber illumination across the nearby basalt wall.
- **Construction Stages**:
  - *Unfinished (Ch 06)*: Empty cast-iron pedestal bolted to floor; spool of shielded telemetry multi-core wire sticking out of floor trench; packing crate labeled "CHRONOS // CHRONOMETER".
  - *Partial (Ch 07)*: Slanted console housing mounted; CRT glass fitted; circuit boards exposed through rear access hatch; calibration oscilloscope sitting on temporary folding stool.
  - *Operational (Ch 08)*: Chronos active; amber radar sweep rotating continuously; displaying calendar commitment arcs, flight telemetry, project milestones in crisp vector typography.
  - *Master (Ch 09–10)*: Global synchronization master clock; precision pulse signal routed to central table, driving vault lighting duty cycles and automated subsystem standby modes.

---

### Object 7: Sector LS3 (`EXTERNAL DATA // GEOSPATIAL GLOBE`)
- **Shape**: Recessed hemispherical wall alcove (2.0m diameter) housing a suspended magnetic levitation globe frame with ring-shaped holographic orbital emitters.
- **Material**: Carved basalt masonry archway, anodized black aerospace aluminum gimbal rings, neodymium magnetic levitation mount, optical laser projector arrays.
- **Scale**: 2.0m wide alcove, 1.2m suspended globe sphere.
- **Location**: North-West wall (`Sector LS3`), coordinates: `[X: -4.2m, Y: 0.0m, Z: +5.2m]`.
- **Colour**: Volcanic basalt darks (`#0c0d12`), spectral earth blues and greens (`#0ea5e9`, `#10b981`), golden orbital trajectory rings (`#fbbf24`).
- **Lighting**: Glowing suspended holographic sphere casting gentle blue and emerald ambient light into the northern reaches of the cave.
- **Construction Stages**:
  - *Unfinished (Ch 07)*: Rough hollow carved into basalt wall; structural steel archway partially mortared into rock; dark and unpowered.
  - *Partial (Ch 08)*: Gimbal rings mounted; laser projector modules being aligned with optical targets; test patterns projecting distorted calibration grids onto rock.
  - *Operational (Ch 09)*: Suspended globe operational; live satellite data streams and atmospheric contours rendering in mid-air; magnetic stabilizer humming silently.
  - *Master (Ch 10)*: Complete external world telemetry hub; real-time planetary data feeds; high-bandwidth satellite uplinks active; fully tied into central AI Holotable.

---

## 5. Physical Transitions & Continuity Bridges

Every transition between chapters MUST NOT be a generic fade or arbitrary black wipe. Every cut or morph must be physically grounded in an object present in both scenes:

| Transition | From $\rightarrow$ To | Physical Connecting Object | Camera Motion / Visual Mechanism | Bridge State Duration |
| :---: | :---: | :---: | :---: | :---: |
| **T 01–02** | 01 $\rightarrow$ 02 | Portable halogen searchlight beam | Torch beam pans across dark basalt, illuminating the rough threshold of the hollow | 0.6s |
| **T 02–03** | 02 $\rightarrow$ 03 | Cavern floor threshold | Camera tracks over Priyansh’s shoulder as his boot steps down into the central pit; chalk touches rock | 0.8s |
| **T 03–04** | 03 $\rightarrow$ 04 | Inscribed circular chalk radius | Drawn chalk arc on stone morphs directly into the machined titanium outer rim of the Holotable | 0.8s |
| **T 04–05** | 04 $\rightarrow$ 05 | Heavy power umbilical cable | Priyansh drags a thick black-and-copper cable from Holotable base across the floor to LS1 portal | 0.7s |
| **T 05–06** | 05 $\rightarrow$ 06 | Alignment laser line | LS1's newly activated cobalt optical sensor emits a horizontal laser level line across to RS1 | 0.6s |
| **T 06–07** | 06 $\rightarrow$ 07 | Technical blueprint sheet | Priyansh carries an annotated paper schematic from RS1 across to LS2's drafting table, pinning it | 0.8s |
| **T 07–08** | 07 $\rightarrow$ 08 | High-voltage braided conduit | Braided conduit running out of RS2 liquid server floor trench extends forward into RS3 Chronos base | 0.6s |
| **T 08–09** | 08 $\rightarrow$ 09 | Main electrical bus breaker switch | Priyansh throws the master heavy-duty knife switch; current surges along all floor trenches to LS3 | 0.9s |
| **T 09–10** | 09 $\rightarrow$ 10 | Master architectural crane pull-back | Camera smoothly cranes up and back through the ceiling fissure, revealing the complete operating vault | 1.2s |

---

## 6. Detailed 10-Chapter Scene Breakdown

### Chapter 01 — STRANDED
- **Narrative**: An idea is not a system. The beginning in total darkness.
- **Composition**: Ultra-wide cinematic establishing frame (24mm lens). The basalt cavern is vast, imposing, and ancient. Priyansh is SMALL in the frame (occupying ~8% of screen height), holding a portable halogen inspection torch.
- **Priyansh Action**: Stepping carefully across jagged, broken basalt floor slabs, raising his torch to inspect the ceiling fracture lines. Weary posture, intense observant eyes.
- **Active Objects**: Portable halogen work lamp (warm amber cone).
- **Environment**: 100% natural raw cave. Zero technology. Cold moisture, fractured basalt columns, pitch-black negative space in distance.
- **Color**: Near black (`#050609`), slate basalt (`#181a20`), warm halogen beam (`#e5a93b`).
- **Story Text Overlay**: *"I found the space before I found the system."*

### Chapter 02 — THE HOLLOW
- **Narrative**: Discovering the natural enclosure. The space has potential.
- **Composition**: Medium-wide perspective (35mm lens). Priyansh stands at the rim of the sunken natural circular hollow in the cave floor.
- **Priyansh Action**: Standing in three-quarter view, unrolling a handheld surveyor's steel tape measure with one hand while holding his torch downward to examine the hollow's perimeter rock bed.
- **Active Objects**: Surveyor's tape, torch resting on a stone block casting low grazing light.
- **Environment**: The natural depression is visible, roughly 7.5 meters across. Rock walls have natural alcoves that intuitively suggest equipment bays.
- **Color**: Deep charcoal (`#0c0e14`), dusty stone amber (`#d97706`), faint cavern mist.
- **Story Text Overlay**: *"The room was empty. That gave me somewhere to start."*

### Chapter 03 — CLEARING THE SPACE
- **Narrative**: Physical labor precedes architecture. Staking the work area.
- **Composition**: Dynamic ground-level perspective (35mm lens). Priyansh is kneeling on the cleared basalt floor.
- **Priyansh Action**: Priyansh is on one knee, drawing a precise large circular radius on the stone with a stick of industrial white chalk. Piles of cleared rock rubble and basic hand tools (crowbar, sledgehammer, plumb line) sit nearby.
- **Active Objects**: Chalk radius line on stone, steel carpenter's square, tool chest, twin halogen tripod work lights illuminating the work zone.
- **Environment**: The central pit is swept clean of loose gravel; anchor holes are marked with red wax grease-pencil.
- **Color**: Basalt grey (`#1c202a`), chalk white (`#f1f5f9`), twin halogen warm glow (`#ffbe6a`).
- **Story Text Overlay**: *"Before any machine, there were measurements."*

### Chapter 04 — THE CENTER
- **Narrative**: Building the heart first. The circular AI Holotable takes shape.
- **Composition**: Eye-level tracking shot (45mm lens). Focus on the central sunken pit.
- **Priyansh Action**: Priyansh is actively tightening structural mounting bolts on the titanium rim of the Holotable with a torque wrench. Sleeves rolled up, forearm muscles tense, focused gaze on the mechanical fit.
- **Active Objects**: Central Holotable in **Partial Stage** (titanium frame anchored, copper toroid coils exposed, wires neatly bundled, portable diagnostic oscilloscope testing coil continuity).
- **Environment**: Rest of the cave remains dark and raw. Temporary power generator cable leads into the dark background.
- **Color**: Dark titanium grey (`#1e2430`), bright copper orange (`#b87333`), initial cold spark of cyan (`#00f2ff`).
- **Story Text Overlay**: *"I built the center first."*

### Chapter 05 — FIRST FUNCTIONAL SYSTEM (LS1)
- **Narrative**: Establishing secure boundary and identity. LS1 biometric portal.
- **Composition**: Wide diagonal two-shot (35mm lens). Holotable is visible in foreground right (running in soft idle); Priyansh is across the room on the left at Sector LS1.
- **Priyansh Action**: Priyansh is standing beside the LS1 pedestal console with an open side panel, carefully inserting an optical prism sensor and checking signal sync with a handheld tablet.
- **Active Objects**:
  - Holotable: **Operational** (soft 0.5Hz cyan pulse).
  - LS1: **Partial to Operational transition** (cobalt laser fan flickering, airlock frame hydraulic clamps latching into rock).
  - All other sectors: Dark, unbuilt, raw rock.
- **Environment**: First permanent cable conduit tray bolted along the floor connecting Holotable to LS1.
- **Color**: Cyan plasma (`#00f2ff`), biometric cobalt (`#2563eb`), dark basalt backdrop.
- **Story Text Overlay**: *"Once one station worked, I could build outward."*

### Chapter 06 — EXPANSION (RS1)
- **Narrative**: Giving the vault eyes. Argus vision racks take shape on the opposite wall.
- **Composition**: Deep-perspective shot looking from behind LS1 toward the East wall (50mm lens).
- **Priyansh Action**: Priyansh is standing between the dual RS1 rack towers, using both hands to dress a thick bundle of orange optical fibers into an overhead cable guide.
- **Active Objects**:
  - Holotable: **Operational**.
  - LS1: **Operational** (glowing quietly in the background left).
  - RS1: **Operational** (top camera gimbal active, twin telemetry monitors glowing phosphor green and cyan).
  - LS2, RS2, RS3, LS3: Unbuilt.
- **Environment**: The cavern is now physically bridged across the south half by glowing floor conduits.
- **Color**: Emerald telemetry phosphor (`#10b981`), fiber-optic orange (`#f97316`), cool cyan ambient.
- **Story Text Overlay**: *"The room began to see."*

### Chapter 07 — THINKING & COMPUTATION (LS2 + RS2)
- **Narrative**: Research, mathematics, and raw compute engine. The foundry becomes a lab.
- **Composition**: Wide lateral profile shot (40mm lens) capturing both mid-cavern walls.
- **Priyansh Action**: Priyansh is standing at LS2's zinc drafting table, holding chalk in one hand while looking across the cavern at RS2's liquid-cooled server tower, comparing an equation with real-time throughput.
- **Active Objects**:
  - Holotable, LS1, RS1: **Operational**.
  - LS2 (Research): **Operational** (monochrome screens active, dense hand-drawn formulas on blackboard, warm desk lamps).
  - RS2 (Compute): **Operational** (liquid coolant circulating through illuminated channels, fan exhaust shimmer).
  - RS3, LS3: Unbuilt.
- **Environment**: The middle third of the cavern is now structured and illuminated. North wall remains in mysterious shadow.
- **Color**: Warm tungsten task light (`#ffbe6a`), cryogenic coolant cyan (`#00e5ff`), deep graphite.
- **Story Text Overlay**: *"Some parts worked immediately. Some had to be rebuilt."*

### Chapter 08 — CHRONOS (RS3)
- **Narrative**: Time and mission synchronization. Chronos radar online.
- **Composition**: Medium tracking shot (45mm lens) centered on the North-East bay.
- **Priyansh Action**: Priyansh leans over the circular Chronos radar console, making fine adjustments to a calibrated rotary brass encoder dial, watching the phosphor sweep line update.
- **Active Objects**:
  - Holotable, LS1, RS1, LS2, RS2: **Operational**.
  - RS3 (Chronos): **Operational** (amber radar sweep spinning, trajectory arcs rendered in crisp vector lines).
  - LS3: Unfinished structural archway on the opposite wall, waiting for power.
- **Environment**: Floor cable trench now fully rings the eastern half of the room.
- **Color**: Radar phosphor amber (`#ffaa00`), dark navy grid (`#0a192f`), titanium metal highlights.
- **Story Text Overlay**: *"It was no longer just storage. It was coordinating time."*

### Chapter 09 — THE LAST EMPTY WALL & ACTIVATION
- **Narrative**: Completing the ring. LS3 and master electrical bus coupling.
- **Composition**: Grand dramatic wide shot (28mm lens) from the south entrance looking north.
- **Priyansh Action**: Priyansh is at the master north distribution breaker, firmly engaging the heavy industrial knife switch with both hands. His back is three-quarter to camera, posture decisive and grounded.
- **Active Objects**:
  - All stations (LS1, RS1, LS2, RS2, RS3, LS3): **Full Power Surge**.
  - LS3 (Globe): Holographic orbital rings ignite and snap into perfect magnetic levitation.
  - Floor trenches: Bright cyan conduits surge with energy, flowing from the outer ring back into the Central Holotable.
- **Environment**: The entire cavern illuminates for the first time. Shadows recede into architectural accents.
- **Color**: Singularity cyan (`#00f2ff`), electric surge white (`#ffffff`), warm ambient basalt.
- **Story Text Overlay**: *"Eventually the cave stopped feeling empty. The room became a system."*

### Chapter 10 — VAULT-01
- **Narrative**: Built from nothing. The finished subterranean systems foundry.
- **Composition**: Master cinematic wide hero pull-back (24mm lens). The entire vaulted subterranean complex is visible in breathtaking clarity and depth.
- **Priyansh Action**: Priyansh stands naturally and calmly beside the Central Holotable, one hand resting lightly on the console perimeter, looking out toward the entrance portal. Relaxed, quiet confidence.
- **Active Objects**: Every single object (Holotable, LS1, RS1, LS2, RS2, RS3, LS3) operating in harmonious synchronization. Multidimensional volumetric holograms, live telemetry streams, gentle coolant caustics, and radar sweeps operating as one cohesive machine.
- **Environment**: The completed VAULT-01. Raw natural basalt rock remains visible around and above the precision-engineered architecture, honoring the geological origin while celebrating human engineering mastery.
- **Color**: Master signature palette: Obsidian basalt (`#0a0d14`), aerospace titanium (`#1e2430`), electric cyan energy (`#00f2ff`), deep armor crimson identity (`#8b1e28`), and gold telemetry highlights (`#f59e0b`).
- **Story Text Overlay**: *"Built from nothing. VAULT-01."*

---

## 7. Strict Acceptance Criteria & Continuity Gates

Before accepting any generated artwork for Scene $N$:
1. **The Continuity Gate**:
   - Compare Scene $N$ with Scene $N-1$ and the Master Art Bible.
   - Did the cave geometry or ceiling fissure pattern change? $\rightarrow$ **REJECT**.
   - Did Priyansh's facial features or hair change? $\rightarrow$ **REJECT**.
   - Did glasses appear on Priyansh? $\rightarrow$ **REJECT IMMEDIATELY**.
   - Did an object built in Scene $N-1$ disappear or change location? $\rightarrow$ **REJECT**.
   - Did unbuilt stations prematurely appear fully finished? $\rightarrow$ **REJECT**.
2. **Text-Free Verification**:
   - Confirm there are zero legible alphanumeric strings, fake Latin text, or generated UI gibberish in the image.
3. **Action Verification**:
   - Ask: *"What is the builder physically doing in this frame?"* If the answer is "standing in a hero pose," **REJECT**. Priyansh must be actively measuring, bolting, wiring, splicing, drawing, or adjusting.
4. **Dominance Verification**:
   - The artwork must cleanly fill the viewport, establishing 80–90% visual storytelling dominance.

---

## 8. Generation Execution Protocol

When the image generation quota unlocks:
1. **Step 1**: Generate Master Cave Plate (`master_cave.png`). Verify rock architecture.
2. **Step 2**: Generate Master Character Plate (`master_builder.png`) using `public/priyansh-clean.webp` reference. Verify bare eyes, no glasses, authentic builder apparel.
3. **Step 3**: Generate Scene 01 (`scene_01_stranded.png`). Visually inspect before proceeding.
4. **Step 4**: Pass Scene 01 as reference into Scene 02 (`scene_02_hollow.png`). Visually inspect.
5. **Step 5–12**: Sequentially generate Scene 03 through Scene 10, strictly carrying forward the previous scene and enforcing the spatial accumulation rules.
6. **Step 13**: Mount the verified plates into `about.html` with GSAP scroll-driven transitions and verify with Playwright.
