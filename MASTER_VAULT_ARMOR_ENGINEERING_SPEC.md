# MASTER_VAULT_ARMOR_ENGINEERING_SPEC.md

## VAULT-01 / ORIGINAL POWERED EXOSKELETON

### Production Design, Mechanical Decomposition, Asset Generation, Blender Assembly, Rigging and WebGL Handoff

**Revision:** 1.0  
**Status:** Master engineering/design source of truth for landing-page armor assets  
**Project:** VAULT-01  
**Owner:** Priyansh Gadia  
**Intended consumer:** Antigravity / Blender automation / 3D asset generation pipeline / landing-page integration

---

# 0. PURPOSE

This document defines the complete construction philosophy for the original VAULT-01 powered exoskeleton used in the cinematic landing-page sequence.

This is **not** a request for one generic robot model.

The final result must be a mechanically decomposed, visually production-grade machine built from many intentionally defined subcomponents that assemble into six major assemblies and ultimately one coherent powered suit.

The six landing-page component assets are:

```text
armor_boots.glb
armor_legs.glb
armor_torso.glb
armor_arms.glb
armor_gauntlets.glb
armor_helmet.glb
```

The final assembled/rigged export is:

```text
armor_rigged_final.glb
```

The six components are not six unrelated designs. They are six mechanically compatible assemblies derived from one master design language.

The final suit must communicate:

> engineered machine, not sculpted costume.

---

# 1. NON-NEGOTIABLE DESIGN RULES

## 1.1 Originality

This is an original fictional powered exoskeleton.

It may occupy the visual territory of high-end cinematic powered armor, aerospace machinery, industrial robotics and premium hard-surface science fiction.

It must **not** reproduce copyrighted Iron Man / Marvel / Tony Stark / Stark Industries assets, silhouettes, helmet geometry, chest reactor geometry, movie props, logos, symbols, or recognizable scene designs.

Never use copied movie geometry as a construction reference.

Use broader mechanical references instead:

- aerospace hardware
- industrial exoskeletons
- robotic joints
- automotive suspension
- turbine machinery
- precision camera mechanisms
- industrial valves
- mechanical watches
- high-end machining
- spacecraft thermal systems
- military protective equipment
- prosthetic robotics
- industrial actuators

The goal is a new machine assembled from credible engineering ideas.

## 1.2 Material identity

Primary:

**Gunmetal Black**

- brushed steel
- machined steel
- anisotropic highlights
- satin and semi-matte regions
- subtle tooling wear

Secondary:

**Blood Red**

- matte and satin structural plates
- restrained edge abrasion
- selective glossy regions
- never candy-red
- never orange

Substructure:

**Dark Graphite**

- internal frames
- actuator housings
- flexible joint covers
- carbon-composite surfaces
- recessed channels

Energy:

**Restrained Neon Cyan**

Only used for:

- optical sensors
- internal power state
- core activity
- palm emitter
- selected instrumentation

Industrial accent:

**Amber**

Only used for:

- thermal indicators
- warning points
- tiny service indicators
- temperature sensing

## 1.3 Detail definition

"Detailed" means mechanically explicit.

Required detail classes:

```text
MACRO
major plates, shells, housings, limbs

MID
hinges, actuator bodies, bearing races, service panels, conduits

MICRO
pins, screws, retainers, cable clips, mesh vents, locking teeth

HERO-MICRO
features that become visible during close-up flight shots
```

A random noise texture is not detail.

A bevel is not detail.

The surface must contain actual designed features.

## 1.4 Geometry priority

Major and medium mechanical features should be real geometry.

Hero close-up micro-features such as:

- hinge pins
- small screws
- locking teeth
- thin retaining rings
- vent louvers
- cable clamps
- actuator rods

should be real geometry where they remain visually resolvable.

Below the screen-space threshold, use efficient geometry/normal/roughness detail rather than exploding the mesh solely to satisfy a polygon number.

The phrase "1 mm detail" is a **visual fidelity target**, not permission to make every microscopic feature unnecessarily expensive.

---

# 2. MASTER SUIT DIMENSIONAL ENVELOPE

The suit is fictional. The dimensions below are design-production dimensions, not validated human-safety or aerospace specifications.

```text
Nominal total height:       1940 mm
Shoulder width:              560 mm
Chest maximum width:         520 mm
Hip exterior width:          390 mm
Foot length:                 315 mm
Foot maximum width:          128 mm
Approx. head envelope:       235 mm
Approx. torso height:        620 mm
Approx. thigh length:        410 mm
Approx. lower-leg length:    420 mm
Approx. upper-arm length:    305 mm
Approx. forearm length:      285 mm
```

All left/right components are mirrored from the same design master wherever symmetry is appropriate.

Mechanical asymmetry is allowed only where the design intentionally requires service routing, cooling, power distribution or interface differences.

---

# 3. MASTER COORDINATE CONVENTION

Use a right-handed coordinate system.

```text
+X = suit right
-X = suit left
+Y = upward
-Y = downward
+Z = forward
-Z = rear
```

Human/suit forward direction:

```text
+Z
```

Landing-page flight direction:

```text
ENE / approximately 67.5° heading in the world plane
```

Do not bake the flight direction into the mesh orientation.

Meshes remain in canonical upright suit coordinates.

The landing-page controller owns flight orientation.

---

# 4. ORIGIN / PIVOT RULES

Every export must have a useful transform origin.

```text
BOOT
origin = ankle mechanical center

LEG
origin = hip joint center

TORSO
origin = torso center / pelvis reference

ARM
origin = shoulder socket

GAUNTLET
origin = wrist bearing center

HELMET
origin = neck locking ring center

ASSEMBLED SUIT
origin = pelvis / central body reference
```

Do not place origins at arbitrary geometry centers.

The origin must correspond to the mechanical interface used during the landing-page animation.

---

# 5. MASTER ASSEMBLY TREE

```text
VAULT_MK_I
│
├── LOWER_SYSTEM
│   ├── BOOTS
│   │   ├── left boot
│   │   └── right boot
│   │
│   └── LEGS
│       ├── left leg
│       └── right leg
│
├── CORE_SYSTEM
│   └── TORSO
│       ├── chest shell
│       ├── abdomen
│       ├── shoulder mount
│       ├── spine
│       └── power plant
│
├── CONTROL_SYSTEM
│   └── ARMS
│       ├── left arm
│       └── right arm
│
├── OUTPUT_SYSTEM
│   └── GAUNTLETS
│       ├── left gauntlet
│       └── right gauntlet
│
└── SENSING_SYSTEM
    └── HELMET
        ├── cranial shell
        ├── optics
        ├── jaw
        ├── rear shell
        └── neck interface
```

---

# 6. MECHANICAL INTERFACE CONTRACT

The armor must come apart and reassemble at designed physical interfaces.

```text
BOOT ↔ LEG
ankle locking collar + bearing + actuator + power/data coupling

LEG ↔ TORSO
hip bearing + actuator + load transfer frame + armor overlap

ARM ↔ TORSO
shoulder bearing + actuator mount + structural bracket + power/data coupling

GAUNTLET ↔ ARM
wrist bearing + locking collar + energy conduit + data/power junction

HELMET ↔ TORSO
neck bearing + mechanical lock + power/data interface
```

Every interface must have:

1. structural attachment
2. visual continuity
3. plausible load path
4. cabling/data route
5. service access
6. deliberate separation geometry

When components separate during the landing-page flight, the viewer should be able to understand where they came from.

---

# 7. MATERIAL LIBRARY

## MAT-01 / GUNMETAL_OUTER

Base tone: near-black graphite/gunmetal.

Roughness: approximately 0.24-0.42 depending on panel.

Metalness: high.

Anisotropy: enabled where supported.

Micro detail:

- fine directional machining
- edge wear
- subtle scratches
- very small roughness variation

Use for major armor plates.

## MAT-02 / BLOOD_RED_STRUCTURAL

Deep red.

Roughness: approximately 0.30-0.55.

Used for:

- structural ribs
- selected armor shells
- shoulder components
- accent panels

Never use a uniform red material across the whole suit.

## MAT-03 / GRAPHITE_SUBFRAME

Dark neutral graphite.

Used for:

- internal frames
- joint housings
- flexible covers
- mechanical brackets

## MAT-04 / BRUSHED_TITANIUM

Dark silver/gunmetal metallic.

Used selectively for:

- hinge pins
- bearing races
- actuator rods
- structural interfaces

## MAT-05 / BLACK_RUBBER

Near-black, high roughness.

Used for:

- articulation boots
- flexible seals
- sole traction
- cable sleeves

## MAT-06 / OPTICAL_CYAN

Emission restrained to optical/energy components.

Avoid giant bloom.

## MAT-07 / AMBER_SENSOR

Tiny emission only.

## MAT-08 / HEAT_DISCOLORATION

Subtle dark-to-warm metal variation.

Use around:

- thrusters
- thermal vents
- high-load actuator zones

---

# 8. POWER / DATA ARCHITECTURE

The suit has a fictional internal power architecture.

Do not copy an Arc Reactor.

## POWER SYSTEM

```text
central power plant
        ↓
primary power bus
        ↓
regional distribution nodes
        ↓
limb power couplers
        ↓
actuator / sensor / emitter loads
```

## DATA SYSTEM

```text
central controller
        ↓
spinal data trunk
        ↓
regional controller nodes
        ↓
limb buses
        ↓
local sensors / actuators
```

Power and data should be visually separated where possible.

Power:

thicker conduits.

Data:

smaller paired or shielded cables.

---

# 9. THERMAL ARCHITECTURE

Visible heat management is a core part of the realism.

Use:

- heat sinks
- thermal spreaders
- vent channels
- vent grilles
- thermal pads
- radiator fins
- exhaust paths
- localized heat shielding

Heat-producing regions:

```text
power plant
thrusters
palm emitter
major actuators
helmet optics
```

Do not invent pseudo-technical cooling everywhere.

Each thermal feature must have a believable reason to exist in the fictional design.

---

# 10. SUBCOMPONENT STANDARD

Each component must have:

```text
COMPONENT ID
NAME
SUBSYSTEM
PARENT
FUNCTION
INTERFACE
PRIMARY MATERIAL
SECONDARY MATERIAL
FASTENER STYLE
POWER/DATA ROLE
MOVEMENT ROLE
VISIBLE DETAILS
EXPORT STATUS
QA STATUS
```

Naming convention:

```text
VAULT_[ASSEMBLY]_[SYSTEM]_[COMPONENT]
```

Examples:

```text
VAULT_BOOT_ANKLE_BEARING_OUTER
VAULT_BOOT_THRUSTER_HOUSING
VAULT_LEG_KNEE_HINGE_PRIMARY
VAULT_TORSO_CORE_HEATSINK_04
VAULT_ARM_ELBOW_PISTON_INNER
VAULT_GAUNTLET_PALM_COLLIMATOR
VAULT_HELMET_OPTIC_L_HOUSING
```

---

# 11. BOOT ASSEMBLY

## Asset

```text
armor_boots.glb
```

## Functional role

Propulsion, stabilization, load transfer and ground contact.

## Visual target

Heavy industrial boot with a wide stable stance, integrated twin-thruster propulsion, robust ankle articulation and dense mechanical understructure.

## Boot hierarchy

```text
BOOT_ROOT
├── OUTER_SHELL
├── INNER_FRAME
├── TOE_SYSTEM
├── MIDFOOT_SYSTEM
├── HEEL_SYSTEM
├── ANKLE_SYSTEM
├── THRUSTER_SYSTEM
├── THERMAL_SYSTEM
├── SOLE_SYSTEM
├── POWER_DATA_SYSTEM
└── SERVICE_SYSTEM
```

## Component register

| ID    | Component                   | Function                 | Interface / Note                 |
| ----- | --------------------------- | ------------------------ | -------------------------------- |
| B-001 | Toe shell outer             | primary toe armor        | shell continuity                 |
| B-002 | Toe shell inner             | internal support         | mates B-001                      |
| B-003 | Toe plate center            | impact protection        | removable service piece          |
| B-004 | Toe lateral plate L         | lateral coverage         | mirrored                         |
| B-005 | Toe lateral plate R         | lateral coverage         | mirrored                         |
| B-006 | Forefoot dorsal shell       | upper foot armor         | articulating overlap             |
| B-007 | Forefoot medial shell       | medial protection        | mirrored                         |
| B-008 | Forefoot lateral shell      | lateral protection       | mirrored                         |
| B-009 | Toe seam rail               | visible panel boundary   | flush-mounted                    |
| B-010 | Toe fastener set            | retention                | recessed micro fasteners         |
| B-011 | Forefoot structural frame   | load transfer            | internal                         |
| B-012 | Forefoot cross brace        | torsional support        | internal                         |
| B-013 | Midfoot armor shell         | main enclosure           | shell                            |
| B-014 | Midfoot service panel       | access                   | removable                        |
| B-015 | Service panel hinge L       | access pivot             | micro hinge                      |
| B-016 | Service panel hinge R       | access pivot             | micro hinge                      |
| B-017 | Service latch               | panel retention          | mechanical                       |
| B-018 | Lateral reinforcement strip | load support             | external                         |
| B-019 | Medial reinforcement strip  | load support             | external                         |
| B-020 | Heel outer shell            | rear protection          | shell                            |
| B-021 | Heel inner frame            | structural core          | internal                         |
| B-022 | Heel cap upper              | upper heel protection    | shell                            |
| B-023 | Heel cap lower              | thrust housing interface | thermal interface                |
| B-024 | Heel retaining rail         | panel attachment         | fastener rail                    |
| B-025 | Ankle outer collar          | joint housing            | LEG interface                    |
| B-026 | Ankle inner collar          | joint retention          | bearing interface                |
| B-027 | Ankle bearing outer race    | rotation                 | metallic                         |
| B-028 | Ankle bearing inner race    | rotation                 | metallic                         |
| B-029 | Ankle bearing retainer      | bearing retention        | micro fasteners                  |
| B-030 | Ankle locking tooth ring    | rigid lock               | visible teeth                    |
| B-031 | Ankle locking actuator      | lock movement            | powered                          |
| B-032 | Ankle actuator mount        | actuator support         | bracket                          |
| B-033 | Ankle actuator body         | articulation             | piston housing                   |
| B-034 | Ankle actuator piston       | articulation             | polished rod                     |
| B-035 | Ankle actuator clevis       | joint interface          | pin joint                        |
| B-036 | Ankle hinge pin             | joint rotation           | visible                          |
| B-037 | Ankle flexible boot seal    | debris isolation         | rubber                           |
| B-038 | Heel thruster housing L     | propulsion               | mirrored                         |
| B-039 | Heel thruster housing R     | propulsion               | mirrored                         |
| B-040 | Midsole thruster chamber L  | stabilization            | mirrored                         |
| B-041 | Midsole thruster chamber R  | stabilization            | mirrored                         |
| B-042 | Thruster nozzle L           | exhaust                  | high-temp material               |
| B-043 | Thruster nozzle R           | exhaust                  | high-temp material               |
| B-044 | Nozzle retaining ring L     | retention                | thermal                          |
| B-045 | Nozzle retaining ring R     | retention                | thermal                          |
| B-046 | Internal thermal liner L    | heat isolation           | ceramic-like fictional composite |
| B-047 | Internal thermal liner R    | heat isolation           | same                             |
| B-048 | Thruster fin array L        | flow control             | micro fins                       |
| B-049 | Thruster fin array R        | flow control             | micro fins                       |
| B-050 | Ignition chamber L          | energy source interface  | emissive interior                |
| B-051 | Ignition chamber R          | energy source interface  | emissive interior                |
| B-052 | Thruster cable harness L    | power/data               | braided sleeve                   |
| B-053 | Thruster cable harness R    | power/data               | braided sleeve                   |
| B-054 | Thermal vent grille L       | exhaust cooling          | louvered                         |
| B-055 | Thermal vent grille R       | exhaust cooling          | louvered                         |
| B-056 | Sole carrier plate          | load transfer            | structural                       |
| B-057 | Sole traction block set     | ground contact           | rubberized                       |
| B-058 | Heel traction blocks        | braking/stability        | rubberized                       |
| B-059 | Magnetic latch L            | landing lock             | powered                          |
| B-060 | Magnetic latch R            | landing lock             | powered                          |
| B-061 | Sole perimeter seal         | environmental sealing    | rubber                           |
| B-062 | Power coupler housing       | boot power               | LEG interface                    |
| B-063 | Data coupler housing        | boot data                | LEG interface                    |
| B-064 | Power bus connector         | local distribution       | concealed                        |
| B-065 | Data bus connector          | local control            | concealed                        |
| B-066 | Cable guide set             | harness routing          | micro clamps                     |
| B-067 | Service connector plate     | maintenance              | recessed                         |
| B-068 | Fastener cluster set A      | panel retention          | M2-class visual scale            |
| B-069 | Fastener cluster set B      | panel retention          | M2-class visual scale            |
| B-070 | Heat discoloration plates   | thermal indication       | subtle                           |

### Boot engineering constraints

- Heel and midsole propulsion units must have visible internal chamber depth.
- Thrusters cannot be flat glowing discs.
- Ankle joint must remain believable when the boot separates from the leg.
- The boot must be able to rotate around the ankle origin without clipping obvious rigid plates.
- Thruster glow must illuminate nearby material rather than creating a floating cyan orb.

---

# 12. LEG ASSEMBLY

## Asset

```text
armor_legs.glb
```

## Functional role

Load-bearing kinematics, shock management and lower-body actuation.

## Hierarchy

```text
LEG_ROOT
├── HIP_INTERFACE
├── THIGH_ARMOR
├── THIGH_FRAME
├── KNEE_SYSTEM
├── SHIN_ARMOR
├── SHIN_FRAME
├── POWER_PACK
├── VENTILATION
├── ACTUATION
└── ANKLE_INTERFACE
```

## Component register

| ID    | Component                    | Function           | Interface / Note |
| ----- | ---------------------------- | ------------------ | ---------------- |
| L-001 | Hip outer collar             | torso interface    | bearing housing  |
| L-002 | Hip inner ring               | torso interface    | locking          |
| L-003 | Hip bearing outer race       | rotation           | metallic         |
| L-004 | Hip bearing inner race       | rotation           | metallic         |
| L-005 | Hip bearing retainer         | retention          | fasteners        |
| L-006 | Thigh outer shell L          | armor              | left             |
| L-007 | Thigh outer shell R          | armor              | right            |
| L-008 | Thigh inner shell L          | inner armor        | left             |
| L-009 | Thigh inner shell R          | inner armor        | right            |
| L-010 | Thigh front plate L          | frontal protection | shell            |
| L-011 | Thigh front plate R          | frontal protection | shell            |
| L-012 | Thigh lateral rail L         | structural accent  | left             |
| L-013 | Thigh lateral rail R         | structural accent  | right            |
| L-014 | Thigh rear plate L           | rear armor         | left             |
| L-015 | Thigh rear plate R           | rear armor         | right            |
| L-016 | Thigh service hatch L        | maintenance        | hinged           |
| L-017 | Thigh service hatch R        | maintenance        | hinged           |
| L-018 | Hatch hinge set L            | access             | micro            |
| L-019 | Hatch hinge set R            | access             | micro            |
| L-020 | Hatch lock L                 | retention          | micro actuator   |
| L-021 | Hatch lock R                 | retention          | micro actuator   |
| L-022 | Hip actuator housing L       | motion             | torso/leg        |
| L-023 | Hip actuator housing R       | motion             | torso/leg        |
| L-024 | Hip actuator piston L        | motion             | polished rod     |
| L-025 | Hip actuator piston R        | motion             | polished rod     |
| L-026 | Hip actuator clevis L        | interface          | pin              |
| L-027 | Hip actuator clevis R        | interface          | pin              |
| L-028 | Knee upper carrier           | knee load path     | structural       |
| L-029 | Knee hinge central housing   | articulation       | multi-axis       |
| L-030 | Knee outer bearing           | rotation           | metallic         |
| L-031 | Knee inner bearing           | rotation           | metallic         |
| L-032 | Knee locking tooth ring      | position lock      | visible          |
| L-033 | Knee lock actuator           | lock               | micro            |
| L-034 | Knee piston L                | actuation          | internal side    |
| L-035 | Knee piston R                | actuation          | internal side    |
| L-036 | Knee piston rod L            | actuation          | polished         |
| L-037 | Knee piston rod R            | actuation          | polished         |
| L-038 | Knee piston clevis L         | articulation       | pin              |
| L-039 | Knee piston clevis R         | articulation       | pin              |
| L-040 | Knee armor cap               | protection         | outer shell      |
| L-041 | Knee impact plate            | impact             | red accent       |
| L-042 | Knee vent grille             | thermal            | louvered         |
| L-043 | Knee hinge guard             | protection         | removable        |
| L-044 | Shin outer shell L           | armor              | left             |
| L-045 | Shin outer shell R           | armor              | right            |
| L-046 | Shin inner frame L           | structure          | left             |
| L-047 | Shin inner frame R           | structure          | right            |
| L-048 | Shin front plate L           | armor              | left             |
| L-049 | Shin front plate R           | armor              | right            |
| L-050 | Shin side rail L             | reinforcement      | left             |
| L-051 | Shin side rail R             | reinforcement      | right            |
| L-052 | Shin rear vent L             | cooling            | left             |
| L-053 | Shin rear vent R             | cooling            | right            |
| L-054 | Auxiliary power pack L       | local power        | side mounted     |
| L-055 | Auxiliary power pack R       | local power        | side mounted     |
| L-056 | Power pack shell L           | enclosure          | left             |
| L-057 | Power pack shell R           | enclosure          | right            |
| L-058 | Power pack heat sink L       | thermal            | fins             |
| L-059 | Power pack heat sink R       | thermal            | fins             |
| L-060 | Power conduit L              | energy             | braided          |
| L-061 | Power conduit R              | energy             | braided          |
| L-062 | Data conduit L               | control            | shielded         |
| L-063 | Data conduit R               | control            | shielded         |
| L-064 | Thigh ventilation channel L  | thermal            | recessed         |
| L-065 | Thigh ventilation channel R  | thermal            | recessed         |
| L-066 | Thigh vent louver bank L     | airflow            | micro fins       |
| L-067 | Thigh vent louver bank R     | airflow            | micro fins       |
| L-068 | Shin service panel L         | maintenance        | recessed         |
| L-069 | Shin service panel R         | maintenance        | recessed         |
| L-070 | Service panel fastener set L | retention          | micro            |
| L-071 | Service panel fastener set R | retention          | micro            |
| L-072 | Internal knee frame          | load support       | graphite         |
| L-073 | Knee cable carrier           | cable routing      | flexible         |
| L-074 | Knee flexible dust seal      | isolation          | rubber           |
| L-075 | Ankle interface housing L    | boot interface     | mechanical       |
| L-076 | Ankle interface housing R    | boot interface     | mechanical       |
| L-077 | Ankle coupling ring L        | attachment         | locking          |
| L-078 | Ankle coupling ring R        | attachment         | locking          |
| L-079 | Ankle power coupler          | power              | boot interface   |
| L-080 | Ankle data coupler           | data               | boot interface   |

### Leg engineering constraints

The knee is a hero-detail mechanism.

The side view must clearly reveal:

- multi-axis joint
- locking teeth
- dual piston arrangement
- inner structural frame
- armor overlap
- cable routing

Do not bury the actuator system entirely behind armor.

The viewer must be able to understand that the leg can articulate.

---

# 13. TORSO ASSEMBLY

## Asset

```text
armor_torso.glb
```

## Functional role

Primary structural body, central computation/power distribution, thermal management and head/limb integration.

This is the densest major assembly.

## Hierarchy

```text
TORSO_ROOT
├── CHEST
├── SHOULDER_MOUNTS
├── ABDOMEN
├── PELVIS_INTERFACE
├── SPINAL_SYSTEM
├── CORE_POWER_PLANT
├── THERMAL_SYSTEM
├── POWER_DISTRIBUTION
├── DATA_DISTRIBUTION
├── COLLAR_SYSTEM
└── SERVICE_SYSTEM
```

## Component register

| ID    | Component                      | Function              | Interface / Note            |
| ----- | ------------------------------ | --------------------- | --------------------------- |
| T-001 | Central torso frame            | primary skeleton      | load path                   |
| T-002 | Upper chest frame              | structural            | shell support               |
| T-003 | Lower chest frame              | structural            | abdomen interface           |
| T-004 | Left rib frame                 | lateral load path     | mirrored                    |
| T-005 | Right rib frame                | lateral load path     | mirrored                    |
| T-006 | Left red structural rib        | visible reinforcement | blood red                   |
| T-007 | Right red structural rib       | visible reinforcement | blood red                   |
| T-008 | Upper sternum plate            | chest shell           | armor                       |
| T-009 | Lower sternum plate            | chest shell           | armor                       |
| T-010 | Left pectoral armor            | shell                 | mirrored                    |
| T-011 | Right pectoral armor           | shell                 | mirrored                    |
| T-012 | Central chest armor frame      | core surround         | structural                  |
| T-013 | Core aperture bezel            | power plant housing   | non-circular reactor design |
| T-014 | Core optical shield            | energy containment    | cyan interface              |
| T-015 | Core upper heat sink           | thermal               | radial fins                 |
| T-016 | Core lower heat sink           | thermal               | radial fins                 |
| T-017 | Core left heat sink            | thermal               | radial fins                 |
| T-018 | Core right heat sink           | thermal               | radial fins                 |
| T-019 | Core diagonal heat sink A      | thermal               | fin geometry                |
| T-020 | Core diagonal heat sink B      | thermal               | fin geometry                |
| T-021 | Core containment frame         | power plant           | graphite                    |
| T-022 | Core service ring              | serviceability        | mechanical                  |
| T-023 | Core retaining bolts           | retention             | micro                       |
| T-024 | Core power bus upper           | distribution          | cable/bus                   |
| T-025 | Core power bus lower           | distribution          | cable/bus                   |
| T-026 | Core data manifold             | control               | central                     |
| T-027 | Core coolant manifold L        | thermal               | fictional cooling           |
| T-028 | Core coolant manifold R        | thermal               | fictional cooling           |
| T-029 | Left shoulder structural yoke  | arm interface         | load bearing                |
| T-030 | Right shoulder structural yoke | arm interface         | load bearing                |
| T-031 | Left shoulder bearing housing  | rotation              | arm interface               |
| T-032 | Right shoulder bearing housing | rotation              | arm interface               |
| T-033 | Left shoulder bearing race     | rotation              | metallic                    |
| T-034 | Right shoulder bearing race    | rotation              | metallic                    |
| T-035 | Left shoulder retainer         | bearing retention     | fasteners                   |
| T-036 | Right shoulder retainer        | bearing retention     | fasteners                   |
| T-037 | Left shoulder armor cap        | protection            | red/black                   |
| T-038 | Right shoulder armor cap       | protection            | red/black                   |
| T-039 | Left shoulder service plate    | maintenance           | removable                   |
| T-040 | Right shoulder service plate   | maintenance           | removable                   |
| T-041 | Left shoulder actuator         | articulation          | powered                     |
| T-042 | Right shoulder actuator        | articulation          | powered                     |
| T-043 | Left shoulder actuator rod     | articulation          | polished                    |
| T-044 | Right shoulder actuator rod    | articulation          | polished                    |
| T-045 | Left shoulder power connector  | energy                | arm interface               |
| T-046 | Right shoulder power connector | energy                | arm interface               |
| T-047 | Left shoulder data connector   | control               | arm interface               |
| T-048 | Right shoulder data connector  | control               | arm interface               |
| T-049 | Upper abdomen segment 01       | articulation          | segmented                   |
| T-050 | Upper abdomen segment 02       | articulation          | segmented                   |
| T-051 | Upper abdomen segment 03       | articulation          | segmented                   |
| T-052 | Mid abdomen segment 04         | articulation          | segmented                   |
| T-053 | Lower abdomen segment 05       | articulation          | segmented                   |
| T-054 | Lower abdomen segment 06       | articulation          | segmented                   |
| T-055 | Abdomen left side rail         | structural            | articulation                |
| T-056 | Abdomen right side rail        | structural            | articulation                |
| T-057 | Abdomen flex cover L           | flexible isolation    | rubber                      |
| T-058 | Abdomen flex cover R           | flexible isolation    | rubber                      |
| T-059 | Abdomen cable carrier L        | routing               | flexible                    |
| T-060 | Abdomen cable carrier R        | routing               | flexible                    |
| T-061 | Pelvis top frame               | lower interface       | legs                        |
| T-062 | Pelvis left joint carrier      | leg interface         | structural                  |
| T-063 | Pelvis right joint carrier     | leg interface         | structural                  |
| T-064 | Pelvis power manifold          | power                 | lower distribution          |
| T-065 | Pelvis data manifold           | data                  | lower distribution          |
| T-066 | Spinal upper plate             | rear shell            | armor                       |
| T-067 | Spinal middle plate            | rear shell            | armor                       |
| T-068 | Spinal lower plate             | rear shell            | armor                       |
| T-069 | Spinal central data conduit    | data                  | exposed                     |
| T-070 | Spinal conduit shield L        | protection            | graphite                    |
| T-071 | Spinal conduit shield R        | protection            | graphite                    |
| T-072 | Spinal retention bracket 01    | conduit support       | fastened                    |
| T-073 | Spinal retention bracket 02    | conduit support       | fastened                    |
| T-074 | Spinal retention bracket 03    | conduit support       | fastened                    |
| T-075 | Spinal micro connector bank    | data                  | visible                     |
| T-076 | Rear thermal spine             | heat spreading        | metal                       |
| T-077 | Rear heat sink fin bank L      | thermal               | fins                        |
| T-078 | Rear heat sink fin bank R      | thermal               | fins                        |
| T-079 | Rear service panel upper       | maintenance           | panel                       |
| T-080 | Rear service panel lower       | maintenance           | panel                       |
| T-081 | Collar base ring               | helmet interface      | mechanical                  |
| T-082 | Collar locking segments        | helmet retention      | radial segments             |
| T-083 | Collar lock actuator L         | locking               | mechanism                   |
| T-084 | Collar lock actuator R         | locking               | mechanism                   |
| T-085 | Collar data coupler            | data                  | helmet interface            |
| T-086 | Collar power coupler           | power                 | helmet interface            |
| T-087 | Left thermal vent louver bank  | cooling               | external                    |
| T-088 | Right thermal vent louver bank | cooling               | external                    |
| T-089 | Chest service hatch L          | access                | hinged                      |
| T-090 | Chest service hatch R          | access                | hinged                      |
| T-091 | Chest hatch hinge set L        | hinge                 | micro                       |
| T-092 | Chest hatch hinge set R        | hinge                 | micro                       |
| T-093 | Chest hatch lock L             | retention             | micro                       |
| T-094 | Chest hatch lock R             | retention             | micro                       |
| T-095 | Power bus junction L           | distribution          | arm/torso                   |
| T-096 | Power bus junction R           | distribution          | arm/torso                   |
| T-097 | Data bus junction L            | distribution          | arm/torso                   |
| T-098 | Data bus junction R            | distribution          | arm/torso                   |
| T-099 | Thermal spreader plate L       | heat routing          | internal                    |
| T-100 | Thermal spreader plate R       | heat routing          | internal                    |
| T-101 | Core heat shield L             | containment           | internal                    |
| T-102 | Core heat shield R             | containment           | internal                    |
| T-103 | Core support bracket L         | structural            | internal                    |
| T-104 | Core support bracket R         | structural            | internal                    |
| T-105 | Torso lower armor belt         | pelvis interface      | shell                       |
| T-106 | Torso upper armor belt         | chest interface       | shell                       |

### Torso core design

The chest power plant must NOT be a familiar circular Arc Reactor imitation.

Recommended form:

```text
recessed asymmetric containment aperture
        ↓
layered aperture frame
        ↓
shielded luminous energy chamber
        ↓
radial/diagonal heat-sink architecture
        ↓
rear power bus
```

The energy source should read as an engineered plant embedded into the torso.

It may contain a central cyan optical volume, but the mechanical silhouette around it must be substantially different from a conventional glowing circle-in-chest design.

---

# 14. ARM ASSEMBLY

## Asset

```text
armor_arms.glb
```

## Functional role

Manipulation, actuation, precision control and load transfer.

Left/right geometry is mirrored where possible.

## Hierarchy

```text
ARM_ROOT
├── SHOULDER
├── BICEP
├── ELBOW
├── FOREARM
├── WRIST_INTERFACE
├── POWER
├── DATA
└── THERMAL
```

## Component register

| ID    | Component                    | Function           | Interface / Note |
| ----- | ---------------------------- | ------------------ | ---------------- |
| A-001 | Shoulder bearing carrier L   | arm attachment     | torso            |
| A-002 | Shoulder bearing carrier R   | arm attachment     | torso            |
| A-003 | Shoulder spherical bearing L | articulation       | major bearing    |
| A-004 | Shoulder spherical bearing R | articulation       | major bearing    |
| A-005 | Shoulder outer armor cap L   | protection         | sliding          |
| A-006 | Shoulder outer armor cap R   | protection         | sliding          |
| A-007 | Shoulder cap rail L          | cap travel         | guide            |
| A-008 | Shoulder cap rail R          | cap travel         | guide            |
| A-009 | Shoulder actuator L          | positioning        | powered          |
| A-010 | Shoulder actuator R          | positioning        | powered          |
| A-011 | Shoulder actuator rod L      | actuation          | polished         |
| A-012 | Shoulder actuator rod R      | actuation          | polished         |
| A-013 | Upper arm frame L            | skeleton           | graphite         |
| A-014 | Upper arm frame R            | skeleton           | graphite         |
| A-015 | Bicep outer shell L          | armor              | red/black        |
| A-016 | Bicep outer shell R          | armor              | red/black        |
| A-017 | Bicep inner shell L          | armor              | inner            |
| A-018 | Bicep inner shell R          | armor              | inner            |
| A-019 | Bicep service panel L        | access             | hinged           |
| A-020 | Bicep service panel R        | access             | hinged           |
| A-021 | Bicep panel hinge L          | access             | micro            |
| A-022 | Bicep panel hinge R          | access             | micro            |
| A-023 | Bicep panel lock L           | retention          | micro            |
| A-024 | Bicep panel lock R           | retention          | micro            |
| A-025 | Tricep carbon shell L        | rear protection    | carbon weave     |
| A-026 | Tricep carbon shell R        | rear protection    | carbon weave     |
| A-027 | Elbow upper housing L        | articulation       | joint            |
| A-028 | Elbow upper housing R        | articulation       | joint            |
| A-029 | Elbow lower housing L        | articulation       | joint            |
| A-030 | Elbow lower housing R        | articulation       | joint            |
| A-031 | Elbow bearing L              | rotation           | metal            |
| A-032 | Elbow bearing R              | rotation           | metal            |
| A-033 | Elbow inner piston L         | actuation          | exposed          |
| A-034 | Elbow inner piston R         | actuation          | exposed          |
| A-035 | Elbow piston rod L           | actuation          | polished         |
| A-036 | Elbow piston rod R           | actuation          | polished         |
| A-037 | Elbow piston clevis L        | linkage            | pin              |
| A-038 | Elbow piston clevis R        | linkage            | pin              |
| A-039 | Elbow locking ring L         | rigid lock         | teeth            |
| A-040 | Elbow locking ring R         | rigid lock         | teeth            |
| A-041 | Forearm main shell L         | armor              | left             |
| A-042 | Forearm main shell R         | armor              | right            |
| A-043 | Forearm dorsal plate L       | armor              | top              |
| A-044 | Forearm dorsal plate R       | armor              | top              |
| A-045 | Forearm vent array L         | thermal            | louvered         |
| A-046 | Forearm vent array R         | thermal            | louvered         |
| A-047 | Forearm lateral rail L       | reinforcement      | left             |
| A-048 | Forearm lateral rail R       | reinforcement      | right            |
| A-049 | Forearm service hatch L      | maintenance        | recessed         |
| A-050 | Forearm service hatch R      | maintenance        | recessed         |
| A-051 | Forearm hatch hinge set L    | access             | micro            |
| A-052 | Forearm hatch hinge set R    | access             | micro            |
| A-053 | Forearm hatch latch L        | retention          | micro            |
| A-054 | Forearm hatch latch R        | retention          | micro            |
| A-055 | Wrist bearing outer L        | gauntlet interface | metallic         |
| A-056 | Wrist bearing outer R        | gauntlet interface | metallic         |
| A-057 | Wrist bearing inner L        | gauntlet interface | metallic         |
| A-058 | Wrist bearing inner R        | gauntlet interface | metallic         |
| A-059 | Wrist lock ring L            | retention          | locking          |
| A-060 | Wrist lock ring R            | retention          | locking          |
| A-061 | Wrist power conduit L        | energy             | gauntlet         |
| A-062 | Wrist power conduit R        | energy             | gauntlet         |
| A-063 | Wrist data conduit L         | data               | gauntlet         |
| A-064 | Wrist data conduit R         | data               | gauntlet         |
| A-065 | Arm cable carrier L          | routing            | flexible         |
| A-066 | Arm cable carrier R          | routing            | flexible         |
| A-067 | Shoulder fastener cluster L  | structural         | micro            |
| A-068 | Shoulder fastener cluster R  | structural         | micro            |
| A-069 | Elbow vent mesh L            | cooling            | micro            |
| A-070 | Elbow vent mesh R            | cooling            | micro            |
| A-071 | Forearm thermal shield L     | heat               | internal         |
| A-072 | Forearm thermal shield R     | heat               | internal         |

---

# 15. GAUNTLET ASSEMBLY

## Asset

```text
armor_gauntlets.glb
```

## Functional role

High-density manipulation, palm energy emission, fine control and wrist output.

The gauntlets are a hero macro-detail asset.

## Hierarchy

```text
GAUNTLET_ROOT
├── WRIST
├── HAND_FRAME
├── BACK_OF_HAND
├── FINGER_SYSTEM
├── PALM_EMITTER
├── ENERGY_ROUTING
├── THERMAL_SYSTEM
└── SERVICE_SYSTEM
```

## Component register

| ID    | Component                      | Function           | Interface / Note |
| ----- | ------------------------------ | ------------------ | ---------------- |
| G-001 | Wrist interface ring L         | arm interface      | bearing          |
| G-002 | Wrist interface ring R         | arm interface      | bearing          |
| G-003 | Wrist lock collar L            | retention          | mechanical       |
| G-004 | Wrist lock collar R            | retention          | mechanical       |
| G-005 | Hand structural frame L        | skeleton           | graphite         |
| G-006 | Hand structural frame R        | skeleton           | graphite         |
| G-007 | Back-of-hand main plate L      | armor              | shell            |
| G-008 | Back-of-hand main plate R      | armor              | shell            |
| G-009 | Back-of-hand dorsal ridge L    | reinforcement      | shell            |
| G-010 | Back-of-hand dorsal ridge R    | reinforcement      | shell            |
| G-011 | Palm heel plate L              | armor              | shell            |
| G-012 | Palm heel plate R              | armor              | shell            |
| G-013 | Palm lateral plate L           | armor              | shell            |
| G-014 | Palm lateral plate R           | armor              | shell            |
| G-015 | Palm inner plate L             | armor              | shell            |
| G-016 | Palm inner plate R             | armor              | shell            |
| G-017 | Palm emitter housing L         | output             | deep collimator  |
| G-018 | Palm emitter housing R         | output             | deep collimator  |
| G-019 | Emitter outer retaining ring L | retention          | metal            |
| G-020 | Emitter outer retaining ring R | retention          | metal            |
| G-021 | Emitter collimator sleeve L    | beam shaping       | recessed         |
| G-022 | Emitter collimator sleeve R    | beam shaping       | recessed         |
| G-023 | Emitter inner aperture L       | energy             | cyan             |
| G-024 | Emitter inner aperture R       | energy             | cyan             |
| G-025 | Emitter thermal ring L         | heat               | metal            |
| G-026 | Emitter thermal ring R         | heat               | metal            |
| G-027 | Emitter power conduit L        | energy             | forearm feed     |
| G-028 | Emitter power conduit R        | energy             | forearm feed     |
| G-029 | Emitter capacitor chamber L    | energy             | fictional        |
| G-030 | Emitter capacitor chamber R    | energy             | fictional        |
| G-031 | Index finger proximal armor L  | articulation       | finger           |
| G-032 | Index finger proximal armor R  | articulation       | finger           |
| G-033 | Index finger middle armor L    | articulation       | finger           |
| G-034 | Index finger middle armor R    | articulation       | finger           |
| G-035 | Index finger distal armor L    | articulation       | finger           |
| G-036 | Index finger distal armor R    | articulation       | finger           |
| G-037 | Middle finger proximal armor L | articulation       | finger           |
| G-038 | Middle finger proximal armor R | articulation       | finger           |
| G-039 | Middle finger middle armor L   | articulation       | finger           |
| G-040 | Middle finger middle armor R   | articulation       | finger           |
| G-041 | Middle finger distal armor L   | articulation       | finger           |
| G-042 | Middle finger distal armor R   | articulation       | finger           |
| G-043 | Ring finger proximal armor L   | articulation       | finger           |
| G-044 | Ring finger proximal armor R   | articulation       | finger           |
| G-045 | Ring finger middle armor L     | articulation       | finger           |
| G-046 | Ring finger middle armor R     | articulation       | finger           |
| G-047 | Ring finger distal armor L     | articulation       | finger           |
| G-048 | Ring finger distal armor R     | articulation       | finger           |
| G-049 | Little finger proximal armor L | articulation       | finger           |
| G-050 | Little finger proximal armor R | articulation       | finger           |
| G-051 | Little finger middle armor L   | articulation       | finger           |
| G-052 | Little finger middle armor R   | articulation       | finger           |
| G-053 | Little finger distal armor L   | articulation       | finger           |
| G-054 | Little finger distal armor R   | articulation       | finger           |
| G-055 | Thumb proximal armor L         | articulation       | thumb            |
| G-056 | Thumb proximal armor R         | articulation       | thumb            |
| G-057 | Thumb distal armor L           | articulation       | thumb            |
| G-058 | Thumb distal armor R           | articulation       | thumb            |
| G-059 | Finger hinge barrel set L      | micro articulation | visible          |
| G-060 | Finger hinge barrel set R      | micro articulation | visible          |
| G-061 | Finger hinge pin set L         | micro articulation | visible          |
| G-062 | Finger hinge pin set R         | micro articulation | visible          |
| G-063 | Finger tendon carrier L        | actuation          | internal         |
| G-064 | Finger tendon carrier R        | actuation          | internal         |
| G-065 | Palm thermal vent L            | cooling            | louvered         |
| G-066 | Palm thermal vent R            | cooling            | louvered         |
| G-067 | Wrist thermal vent L           | cooling            | micro            |
| G-068 | Wrist thermal vent R           | cooling            | micro            |
| G-069 | Back-of-hand service hatch L   | access             | hinged           |
| G-070 | Back-of-hand service hatch R   | access             | hinged           |
| G-071 | Service hatch hinge sets       | access             | micro            |
| G-072 | Service hatch latch sets       | retention          | micro            |

### Gauntlet emitter rule

The palm emitter must have depth.

It must not be a glowing flat circle.

Minimum conceptual stack:

```text
outer armored housing
        ↓
retaining structure
        ↓
thermal ring
        ↓
collimator sleeve
        ↓
recessed aperture
        ↓
contained cyan energy volume
```

The emitter can visually charge for the repulsor event, but the underlying geometry must be visible in unpowered daylight.

---

# 16. HELMET ASSEMBLY

## Asset

```text
armor_helmet.glb
```

## Functional role

Optical sensing, head protection, environmental sensing and command interface.

This is the most iconic silhouette but must remain unmistakably original.

## Hierarchy

```text
HELMET_ROOT
├── CRANIAL_SHELL
├── FOREHEAD
├── CHEEKS
├── JAW
├── OPTICS
├── SIDE_VENTS
├── REAR_SHELL
├── NECK_INTERFACE
└── INTERNAL_FRAME
```

## Component register

| ID    | Component                  | Function               | Interface / Note |
| ----- | -------------------------- | ---------------------- | ---------------- |
| H-001 | Cranial outer shell        | primary housing        | shell            |
| H-002 | Cranial inner shell        | structural backing     | graphite         |
| H-003 | Forehead armor plate       | protection             | shell            |
| H-004 | Forehead center ridge      | reinforcement          | structural       |
| H-005 | Brow left armor            | optic surround         | left             |
| H-006 | Brow right armor           | optic surround         | right            |
| H-007 | Cheek plate L              | facial side protection | left             |
| H-008 | Cheek plate R              | facial side protection | right            |
| H-009 | Jaw outer plate            | lower protection       | articulated      |
| H-010 | Jaw inner frame            | structure              | articulation     |
| H-011 | Jaw hinge L                | jaw articulation       | visible          |
| H-012 | Jaw hinge R                | jaw articulation       | visible          |
| H-013 | Jaw hinge pin L            | pivot                  | micro            |
| H-014 | Jaw hinge pin R            | pivot                  | micro            |
| H-015 | Chin guard                 | lower protection       | shell            |
| H-016 | Neck opening frame         | torso interface        | mechanical       |
| H-017 | Neck locking ring outer    | attachment             | torso            |
| H-018 | Neck locking ring inner    | attachment             | torso            |
| H-019 | Neck lock tooth set        | retention              | radial           |
| H-020 | Neck lock actuator L       | lock                   | micro            |
| H-021 | Neck lock actuator R       | lock                   | micro            |
| H-022 | Left optic housing         | sensor                 | recessed         |
| H-023 | Right optic housing        | sensor                 | recessed         |
| H-024 | Left optic lens            | sensor                 | cyan             |
| H-025 | Right optic lens           | sensor                 | cyan             |
| H-026 | Left optic bezel           | sensor                 | machined         |
| H-027 | Right optic bezel          | sensor                 | machined         |
| H-028 | Left optic heat sink       | thermal                | micro fins       |
| H-029 | Right optic heat sink      | thermal                | micro fins       |
| H-030 | Left optic cable           | data/power             | internal         |
| H-031 | Right optic cable          | data/power             | internal         |
| H-032 | Side vent array L          | cooling                | louvered         |
| H-033 | Side vent array R          | cooling                | louvered         |
| H-034 | Vent inner mesh L          | airflow                | mesh             |
| H-035 | Vent inner mesh R          | airflow                | mesh             |
| H-036 | Rear cranial shell upper   | rear protection        | segmented        |
| H-037 | Rear cranial shell lower   | rear protection        | segmented        |
| H-038 | Rear shell hinge L         | articulated shell      | micro            |
| H-039 | Rear shell hinge R         | articulated shell      | micro            |
| H-040 | Rear shell hinge pin L     | pivot                  | micro            |
| H-041 | Rear shell hinge pin R     | pivot                  | micro            |
| H-042 | Rear service panel         | access                 | removable        |
| H-043 | Rear panel latch           | retention              | micro            |
| H-044 | Rear panel fastener set    | retention              | micro            |
| H-045 | Helmet inner harness L     | support                | flexible         |
| H-046 | Helmet inner harness R     | support                | flexible         |
| H-047 | Helmet crown support       | internal               | graphite         |
| H-048 | Helmet jaw actuator L      | actuation              | piston           |
| H-049 | Helmet jaw actuator R      | actuation              | piston           |
| H-050 | Jaw actuator rod L         | actuation              | polished         |
| H-051 | Jaw actuator rod R         | actuation              | polished         |
| H-052 | Helmet data coupler        | torso interface        | neck             |
| H-053 | Helmet power coupler       | torso interface        | neck             |
| H-054 | Helmet thermal spreader L  | heat                   | internal         |
| H-055 | Helmet thermal spreader R  | heat                   | internal         |
| H-056 | Helmet vent rail L         | airflow                | side             |
| H-057 | Helmet vent rail R         | airflow                | side             |
| H-058 | Helmet chin service plate  | access                 | micro            |
| H-059 | Chin plate fastener set    | retention              | micro            |
| H-060 | Optic controller housing   | sensing                | internal         |
| H-061 | Optic controller board     | electronics            | fictional        |
| H-062 | Optic protective shutter L | optic protection       | mechanical       |
| H-063 | Optic protective shutter R | optic protection       | mechanical       |
| H-064 | Neck interface power ring  | energy                 | lower            |

### Helmet optical rule

The optics are:

- narrow
- recessed
- horizontal-ish but original in exact geometry
- mechanically framed
- cyan only when powered

They are **not glowing eyeballs**.

They should look like optical apertures containing energy behind lenses.

---

# 17. CROSS-ASSEMBLY MECHANICAL INTERFACES

## 17.1 BOOT ↔ LEG

Required visible elements:

```text
ankle collar
bearing race
locking teeth
actuator connection
power coupler
data coupler
flexible seal
```

When separated by 100-300 mm in the landing-page shot, these elements must remain visually understandable.

## 17.2 LEG ↔ TORSO

Required:

```text
hip bearing
actuator
load frame
armor overlap
power bus
data bus
```

## 17.3 ARM ↔ TORSO

Required:

```text
spherical bearing
bearing race
actuator
mount bracket
armor cap rail
power connector
data connector
```

## 17.4 GAUNTLET ↔ ARM

Required:

```text
wrist bearing
lock collar
power conduit
data conduit
inner frame
```

## 17.5 HELMET ↔ TORSO

Required:

```text
neck locking ring
radial lock segments
actuator
power ring
data ring
```

---

# 18. MASTER HARD-SURFACE GENERATION PROMPT

Use this as the global base prompt for any image-to-3D or concept-generation stage.

> ORIGINAL VAULT-01 powered exoskeleton, fictional high-end industrial hard-surface machine, created from a coherent family of mechanically engineered assemblies, gunmetal black brushed and machined metal as primary material, blood-red matte and satin structural armor plates, dark graphite internal frame, restrained cyan energy only in optical and power systems, tiny amber industrial indicators, aerospace-inspired mechanical construction, robotic actuator assemblies, visible bearing races, hinges, hydraulic pistons, locking collars, service panels, cable routing, precision fasteners, thermal vents, heat sinks, internal mounting brackets, layered armor plates, believable part interfaces, manufacturing seams, subtle tooling wear, realistic roughness variation, micro bevels, physically coherent construction, premium cinematic VFX asset, highly detailed hero prop, studio-quality hard-surface design, original silhouette, original helmet, original chest power architecture, no copied superhero armor, no Iron Man, no Marvel, no Stark branding, no arc reactor, no recognizable movie geometry, no cartoon, no low-poly, no toy appearance, no random decorative greebles, no impossible floating plates, no smooth primitive-only geometry.

---

# 19. COMPONENT GENERATION PROTOCOL

Each major assembly must be generated from at least four canonical visual views before final 3D generation.

Required:

```text
FRONT
BACK
LEFT / SIDE
RIGHT / SIDE
```

Preferred:

```text
FRONT 3/4
BACK 3/4
TOP
BOTTOM
EXPLODED VIEW
```

The views must share:

- identical proportions
- identical panel boundaries
- identical color/material system
- identical joint positions
- identical interface positions
- identical mechanical logic

Never create front, side and back views independently from unrelated prompts.

---

# 20. MULTI-VIEW CONSISTENCY RULE

The image-to-3D input set for a component must be generated from one master design.

Do not permit the 3D generator to reinterpret:

- proportions
- major panel topology
- joint location
- interface diameter
- silhouette

between views.

If the front says the shoulder is 280 mm from the center and the side view implies 340 mm, regenerate the views before generating the mesh.

---

# 21. SYMMETRY RULE

Base design:

perfectly symmetrical.

After the common master geometry is established, controlled asymmetry may be introduced only for:

- cable routing
- service panels
- thermal distribution
- power distribution
- minor visual wear

Do not create asymmetry accidentally through independent generation.

---

# 22. SUBCOMPONENT GENERATION METHOD

For a dense subsystem, use a component-by-component construction process.

Recommended Antigravity process:

```text
1. create master assembly context
2. create structural frame
3. create primary outer shells
4. create joint hardware
5. create actuators
6. create internal routing
7. create thermal hardware
8. create service panels
9. create fasteners
10. create micro detail
11. assign materials
12. validate fit
13. save checkpoint
14. assemble
15. inspect from hero camera
```

Do not generate 100 disconnected decorative objects and then hide them inside the shell.

The subcomponents must contribute to the structure.

---

# 23. ANTIGRAVITY BUILD PROTOCOL

The agent should treat each armor assembly as a miniature engineering project.

For every assembly, produce:

### PHASE A / ARCHITECTURE

Define:

- bounding box
- primary load path
- primary joints
- service access
- power/data path
- thermal zones

### PHASE B / STRUCTURE

Build:

- internal frame
- bearing carriers
- mounting brackets
- structural plates

### PHASE C / ARMOR

Build:

- outer shells
- panel seams
- overlap regions
- access panels

### PHASE D / ACTUATION

Build:

- actuator bodies
- pistons
- rods
- clevises
- hinge pins
- locking systems

### PHASE E / ENERGY + DATA

Build:

- conduits
- junctions
- connectors
- sensor housings

### PHASE F / THERMAL

Build:

- heat sinks
- vents
- exhaust shields
- thermal paths

### PHASE G / MICRODETAIL

Build:

- fasteners
- retaining rings
- latches
- cable clips
- vent mesh
- small service hardware

### PHASE H / MATERIALS

Apply:

- gunmetal
- blood red
- graphite
- brushed metal
- rubber
- cyan emissive
- amber indicators

### PHASE I / VALIDATION

Inspect all interfaces.

### PHASE J / EXPORT

Only export once QA passes.

---

# 24. DETAIL DENSITY RULE

The visual detail should be hierarchical.

At 5-10 meters:

large silhouette and primary armor architecture.

At 1-3 meters:

major panels, joints, seams, vents and actuators.

At 0.25-1 meter:

fasteners, hinges, service panels, cable routing and surface detail.

At macro close-up:

pins, retainers, bearing texture, machining, layered material response.

Do not distribute equal polygon density everywhere.

Concentrate detail where the landing-page camera actually looks.

---

# 25. MICRO FASTENER RULE

Fasteners should have families rather than random screw spam.

Use a consistent visual vocabulary:

```text
M2 visual-scale recessed hex
M2.5 visual-scale socket
M3 visual-scale socket
micro retaining screws
panel latches
quarter-turn service fasteners
```

Fasteners should be aligned with real-looking retention points.

Do not place screws where no panel would need a screw.

---

# 26. CABLE ROUTING RULE

Cables must travel between plausible endpoints.

Every major visible cable should have:

```text
source connector
cable sleeve
routing clips
bend radius
destination connector
```

Do not let cables:

- float in space
- pass through armor plates
- terminate nowhere
- randomly cross moving joints

Use flexible loops around articulation zones.

---

# 27. ACTUATOR RULE

Every actuator should have:

```text
housing
piston
rod
mount
clevis
pin
```

Where an actuator is exposed in a hero view, these parts must be visually distinct.

Do not make an actuator a simple cylinder.

---

# 28. HINGE RULE

Every visible articulated hinge should have:

```text
left housing
right housing
barrel
pin
retainer
clearance
```

A hinge should visually communicate rotation.

---

# 29. SERVICE PANEL RULE

Every service panel should have:

- seam
- retention system
- access logic
- slight depth
- visible fastening or latch

Optional:

small recessed amber indicator.

Do not plaster every surface with access panels.

---

# 30. PANEL GAP RULE

Panel seams should be:

consistent

controlled

subtle

They should not look like drawn black outlines.

Use actual separation or recessed seam geometry where the camera resolves it.

---

# 31. THRUSTER DESIGN RULE

The boot thrusters are a major landing-page hero element.

Each thruster requires:

```text
outer housing
inner chamber
thermal liner
retaining ring
nozzle throat
exhaust cone
support ribs
power feed
thermal vent path
```

The active exhaust is a visual effect layered onto physical geometry.

The geometry itself must still look credible when powered off.

---

# 32. FINAL ASSEMBLY PROTOCOL

Once all six assemblies exist:

1. import into one canonical master scene
2. align origins
3. verify interface dimensions
4. verify symmetry
5. verify silhouette
6. verify plate overlap
7. verify no intersection in neutral pose
8. verify mechanical clearance in key animation poses
9. connect power/data paths
10. apply final materials
11. add wear pass
12. perform studio lighting test
13. perform cinematic lighting test
14. create rig
15. create animations
16. export final assembled GLB

---

# 33. RIG HIERARCHY

Suggested armature:

```text
ROOT
└── pelvis
    ├── spine_01
    │   └── spine_02
    │       └── chest
    │           ├── neck
    │           │   └── head
    │           ├── shoulder.L
    │           │   └── upper_arm.L
    │           │       └── forearm.L
    │           │           └── hand.L
    │           └── shoulder.R
    │               └── upper_arm.R
    │                   └── forearm.R
    │                       └── hand.R
    ├── thigh.L
    │   └── shin.L
    │       └── foot.L
    └── thigh.R
        └── shin.R
            └── foot.R
```

Mechanical helper bones may be added for:

- shoulder caps
- pistons
- wrist rings
- ankle housings
- helmet jaw
- rear cranial shell
- thruster gimbals
- finger joints

---

# 34. REQUIRED ANIMATION CLIPS

Final assembled asset should contain at minimum:

```text
Idle
Landing
StandUp
StepBack
Aim
AimAndShoot
```

Where practical, split the repulsor event into:

```text
Aim
EmitterCharge
Fire
Recover
```

This gives the landing page finer timeline control.

---

# 35. LANDING ANIMATION

Required sequence:

```text
helmet descends
↓
helmet locks
↓
energy stabilizes
↓
suit impacts
↓
knees compress
↓
one hand / arm stabilizes
↓
brief landing hold
```

Do not reproduce an existing superhero movie pose frame-for-frame.

The pose should be an original mechanically believable landing stance.

---

# 36. STAND-UP ANIMATION

The machine rises through:

```text
compression release
↓
knee extension
↓
hip extension
↓
torso stabilization
↓
shoulder settle
↓
head alignment
↓
final upright lock
```

The motion should suggest mass.

Avoid weightless acceleration.

---

# 37. STEP-BACK ANIMATION

Exact concept:

```text
neutral
↓
weight transfer
↓
rear foot lift
↓
rear foot placement
↓
hip shift
↓
front foot adjustment
↓
final stance
```

2-3 steps maximum.

The armor should clearly move away from the landing pad before aiming.

---

# 38. AIM ANIMATION

Sequence:

```text
torso rotates
↓
shoulder aligns
↓
upper arm rises
↓
elbow adjusts
↓
forearm rotates
↓
wrist locks
↓
gauntlet emitter aligns
```

Do not rotate the entire arm like a single rigid primitive.

---

# 39. REPULSOR / ENERGY EVENT

The palm emitter sequence:

```text
idle
↓
internal cyan wake
↓
collimator activation
↓
energy concentration
↓
short high-intensity discharge
↓
local illumination
↓
recoil / stabilization
```

The actual visual effect may use particles, volumetric light, shader effects or a short beam.

The underlying physical emitter remains visible.

---

# 40. LANDING PAD INTERACTION

The final landing page has one physical red button adjacent to the landing pad.

No large label.

No explanatory UI card.

Click sequence:

```text
BUTTON PRESS
↓
ARMOR STEP BACK
↓
ARMOR AIM
↓
EMITTER CHARGE
↓
REPULSOR BLAST
↓
LANDING PAD REACTS
↓
RADIAL APERTURE OPENS
↓
ROCK TUNNEL REVEALED
↓
ENTER THE VAULT
```

The button is a landing-page controller feature, not part of the armor asset itself.

---

# 41. LANDING-PAGE COMPONENT FLIGHT

The six assemblies fly separately.

Order:

```text
BOOTS
LEGS
TORSO
ARMS
GAUNTLETS
HELMET
```

Each piece enters a left-side hero focus region.

The armor should occupy roughly 40-55% of the left side of the viewport while focused.

The component's long-axis heading should generally read ENE.

Right side:

portfolio/editorial content.

---

# 42. COMPONENT FLIGHT BEHAVIOR

Each component:

```text
approaches
↓
stabilizes
↓
becomes focal
↓
holds long enough to inspect
↓
accelerates
↓
leaves ENE
```

Avoid random rotation.

The motion should look like a controlled autonomous system.

---

# 43. FORMATION FLIGHT

After the six component close-ups:

camera pulls back.

All components become visible together.

Formation must be asymmetric but deliberate.

Maintain enough spacing to distinguish:

- boots
- legs
- torso
- arms
- gauntlets
- helmet

The formation transitions into descent.

---

# 44. LANDING ASSEMBLY ORDER

Exact order:

```text
01 BOOTS
02 LEGS
03 TORSO
04 ARMS
05 GAUNTLETS
06 HELMET
```

Each component must visibly approach its mating interface.

Avoid snapping from 100 mm away.

The final lock must feel mechanical.

The helmet is the final assembly event.

---

# 45. CAMERA TEST POSITIONS

Required review cameras:

```text
C01 INTRO / DOOR
C02 DISTANT WORKBENCH
C03 BOOT HERO
C04 LEG HERO
C05 TORSO HERO
C06 ARM HERO
C07 GAUNTLET MACRO
C08 HELMET HERO
C09 FORMATION
C10 LANDING
C11 FINAL SUIT
C12 AIM
C13 REPULSOR
C14 APERTURE
```

Each camera must be able to see the actual intended level of asset detail.

---

# 46. HERO CAMERA DETAIL TEST

For each component hero shot:

### BOOT

Visible:

- ankle bearing
- thruster housing
- nozzle
- thermal shield
- sole
- panel seams

### LEG

Visible:

- knee joint
- actuator
- locking teeth
- thigh panel architecture
- shin vent system

### TORSO

Visible:

- core architecture
- rib plates
- shoulder mounts
- abdomen segmentation
- rear data conduit if angle permits

### ARM

Visible:

- shoulder bearing
- bicep service panel
- elbow pistons
- forearm vent array

### GAUNTLET

Visible:

- finger joints
- palm collimator
- wrist bearing
- conduit routing

### HELMET

Visible:

- optical housings
- brow structure
- jaw mechanism
- side vents
- neck lock
- rear cranial articulation

---

# 47. LIGHTING TEST

Required lighting passes:

## PASS A / POWERED OFF

Purpose:

prove geometry quality.

## PASS B / POWERED

Purpose:

prove emission quality.

## PASS C / CINEMATIC RED

Purpose:

prove blood-red structural lighting.

## PASS D / NEUTRAL STUDIO

Purpose:

prove materials are not dependent on theatrical lighting to hide weaknesses.

---

# 48. MATERIAL VALIDATION

At neutral studio lighting:

- gunmetal must read metallic
- blood red must read painted metal
- graphite must read separate from outer armor
- rubber must read non-metallic
- cyan must remain localized
- amber must remain subtle

If everything reads like one shader:

FAIL.

---

# 49. GEOMETRY QA

For every exported component:

```text
no non-manifold hero surfaces
no obvious duplicate shells
no accidental floating objects
no broken normals
no missing faces
no self-intersections visible from hero cameras
no disconnected components that should be connected
no impossible plate penetrations
no broken pivots
```

---

# 50. ASSEMBLY FIT QA

Test every interface in:

```text
neutral
landing
standing
step-back
aim
```

No major clipping.

No visible gaps where the mechanical interface should be sealed.

No overlap that makes the system impossible to articulate.

---

# 51. EXPORT SPECIFICATION

## Individual assets

```text
armor_boots.glb
armor_legs.glb
armor_torso.glb
armor_arms.glb
armor_gauntlets.glb
armor_helmet.glb
```

## Final

```text
armor_rigged_final.glb
```

Recommended:

- binary GLB
- PBR materials
- tangents where required
- compressed geometry if pipeline supports it
- compressed textures if supported and visually lossless enough
- embedded or locally resolvable textures
- no absolute filesystem references

---

# 52. NAMING INSIDE GLB

Top-level nodes should be stable.

Example:

```text
VAULT_BOOT_L
VAULT_BOOT_R
VAULT_LEG_L
VAULT_LEG_R
VAULT_TORSO
VAULT_ARM_L
VAULT_ARM_R
VAULT_GAUNTLET_L
VAULT_GAUNTLET_R
VAULT_HELMET
```

Do not rely on array indices for animation targeting.

Use names.

---

# 53. FINAL RIGGED ASSET REQUIREMENTS

`armor_rigged_final.glb` must include:

- complete assembled suit
- complete armature
- stable node naming
- neutral pose
- Landing
- StandUp
- StepBack
- AimAndShoot
- Idle

Optional:

- EmitterCharge
- Fire
- Recover

All animations must start from the canonical neutral pose or document their expected predecessor state.

---

# 54. WEBGL LANDING-PAGE PERFORMANCE STRATEGY

The landing page can use external 3D assets.

But quality must not be achieved by loading every maximum-density mesh and texture simultaneously.

Preferred strategy:

```text
INTRO
↓
load environment + boots + legs + torso
↓
begin early sequence
↓
preload arms + gauntlets
↓
preload helmet
↓
assemble final state
```

Use:

- Draco when appropriate
- KTX2/Basis where appropriate
- mipmaps
- texture compression
- frustum culling
- visibility gating
- animation culling
- careful draw-call management

Do not compromise hero geometry before reducing redundant materials and unnecessary simultaneous visibility.

---

# 55. DISTANCE / LOD POLICY

Far flight formation:

LOD may be used.

Component hero:

full-detail asset required.

Macro gauntlet / helmet:

full-detail asset required.

Final standing suit:

full-detail hero asset required.

Do not swap to visibly simplified geometry during close-up shots.

---

# 56. VISUAL CONTINUITY RULE

Every assembly must share:

- same paint
- same machining style
- same seam vocabulary
- same fastener vocabulary
- same red tone
- same graphite tone
- same cyan energy language
- same thermal treatment
- same design generation

A boot cannot look like a military boot while the helmet looks like a fantasy robot helmet.

Everything must look manufactured by the same fictional engineering organization.

---

# 57. SURFACE WEAR

Wear should be localized.

Apply strongest wear at:

- foot edges
- knee edges
- elbow edges
- gauntlet knuckles
- service panel borders
- exposed mechanical contact points

Do not add grunge uniformly.

---

# 58. RED PAINT WEAR

Blood-red painted plates may reveal:

- darker undercoat
- subtle bright metal edge
- slight abrasion

Do not make the suit look battle-damaged unless intentionally requested.

The default state is:

used

maintained

engineered

not ruined.

---

# 59. CYAN EMISSION RULE

Cyan is powerful because it is scarce.

Use it for:

- eyes/optics
- central power plant
- palm emitter
- selected power bus glimpses

Keep nonessential emissive surfaces dark.

---

# 60. HERO COMPONENT PROMPTS

## BOOT

> Original VAULT-01 propulsion boot assembly, extremely detailed hard-surface industrial powered exoskeleton component, heavy wide stance, gunmetal-black machined outer shell, blood-red structural plates, graphite inner frame, twin embedded heel and midsole thruster chambers, visible heat shielding, deep nozzle geometry, ankle bearing and locking collar, exposed actuator mechanics, service panels, retaining rings, precision fasteners, braided power/data conduits, louvered thermal vents, rubberized traction sole, physically coherent manufacturing, layered plates, micro seams, hinge pins, retaining clips and tooling marks, premium cinematic VFX asset, hero close-up quality, original design, no copied superhero armor, no Iron Man.

## LEG

> Original VAULT-01 load-bearing leg assembly, heavy thigh armor tapering into reinforced shin, complex multi-axis knee mechanism, visible dual hydraulic-style actuators, locking tooth ring, internal graphite frame, side auxiliary power modules, ventilation channels, service panels, cable carriers, blood-red structural plates, gunmetal-black armor, machined bearings and fasteners, realistic plate interfaces and clearance, cinematic production asset, dense mechanical construction, original hard-surface design, no copied film armor.

## TORSO

> Original VAULT-01 torso assembly, broad shoulders, heavily engineered chest structure, segmented articulated abdomen, thick blood-red structural ribs, gunmetal black machined armor, shoulder bearing mounts, exposed rear spinal data conduit, collar locking ring, deeply recessed asymmetric cyan power plant with shielded aperture and distributed heat-sink fins, internal frame, service hatches, cable routing, thermal architecture, hundreds of meaningful mechanical design features, premium cinematic hard-surface VFX asset, original architecture, no Arc Reactor, no Iron Man chest, no Marvel geometry.

## ARMS

> Original VAULT-01 powered arm assembly, heavy spherical shoulder bearing, sliding armor cap on guided rails, exposed inner elbow dual-piston mechanism, layered bicep armor, carbon-composite tricep surfaces, detailed forearm venting, service panels, bearings, actuator rods, clevis joints, cable routing, wrist bearing, gunmetal black and blood red finish, highly detailed mechanically plausible construction, premium cinematic VFX asset, original silhouette.

## GAUNTLETS

> Original VAULT-01 gauntlet assembly, dense articulated hand armor, heavily plated back of hand, individually segmented fingers with visible micro hinge mechanisms, wrist rotational bearing, palm energy system built around a deep recessed collimator rather than a flat circle, internal energy conduit, thermal ring, service panels, mechanical retention hardware, blood-red and gunmetal-black finish, restrained cyan energy aperture, extreme macro hard-surface fidelity, premium cinematic VFX quality, original design, no copied repulsor geometry.

## HELMET

> Original VAULT-01 sensor helmet, aggressive architectural silhouette, layered cranial shell, separate articulated jaw, recessed narrow horizontal cyan optical apertures, machined optical housings, side ventilation grilles, rear cranial articulation, visible neck locking ring, service panel, internal support frame, micro hinges, actuator rods, precision fasteners, gunmetal-black with restrained blood-red structural accents, sophisticated aerospace robotics aesthetic, premium cinematic hard-surface asset, original silhouette, no Iron Man helmet, no Marvel geometry.

---

# 61. NEGATIVE PROMPT

Apply to concept/model generation where supported.

```text
Iron Man
Tony Stark
Marvel
Stark Industries
Arc Reactor
replica movie armor
copied superhero suit
recognizable film helmet
Avengers
comic costume
superhero cosplay
plastic toy
low poly
simple primitives
primitive robot
smooth mannequin
flat armor
flat glowing circle
random greebles
floating panels
impossible hinges
fake screws
screw spam
neon cyberpunk
rainbow colors
purple neon
white plastic
cartoon
anime
steampunk
fantasy armor
ornamental medieval armor
cloth superhero suit
rubber toy
cheap game asset
T-pose unless rigging stage
broken topology
melted geometry
blobby geometry
```

---

# 62. CONCEPT ART REVIEW GATE

Before creating any 3D mesh from a component concept:

The concept must pass:

```text
[ ] recognizable silhouette
[ ] front/side consistency
[ ] mechanically coherent
[ ] interface locations defined
[ ] material hierarchy clear
[ ] propulsion/actuation purpose visible
[ ] no copied franchise geometry
[ ] enough negative space around the form
[ ] major panel seams visible
[ ] micro-detail zones identified
```

If any fail:

regenerate the concept.

Do not proceed to 3D generation.

---

# 63. BLENDER CONSTRUCTION GATE

Before exporting:

```text
[ ] object names correct
[ ] pivots correct
[ ] normals correct
[ ] bevels intentional
[ ] panel seams correct
[ ] fasteners aligned
[ ] hinges real
[ ] actuators complete
[ ] cable routing coherent
[ ] service panels plausible
[ ] material assignments correct
[ ] no accidental intersections
[ ] interfaces fit
[ ] hero cameras inspected
```

---

# 64. ASSEMBLY GATE

The assembled suit must pass all of the following:

```text
[ ] boots attach cleanly
[ ] legs attach cleanly
[ ] torso supports hips
[ ] arms attach to shoulder mounts
[ ] gauntlets attach to wrists
[ ] helmet locks to neck
[ ] power/data interfaces visually connect
[ ] no floating geometry
[ ] no broken silhouette
[ ] no component appears from a different design family
```

---

# 65. ANIMATION CLEARANCE GATE

Check at:

```text
Landing
Standing
StepBack
Aim
Fire
```

Specifically inspect:

- shoulders
- elbows
- wrists
- hips
- knees
- ankles
- neck
- helmet jaw
- fingers

The armor must not visibly intersect itself during hero framing.

---

# 66. CINEMATIC DETAIL GATE

Capture close-up frames.

The following must be visibly resolvable:

### Boot

ankle bearing + thruster chamber + nozzle structure

### Leg

knee actuator + locking mechanism + panel seams

### Torso

core architecture + thermal fins + structural ribs

### Arm

elbow pistons + shoulder bearing

### Gauntlet

finger hinges + palm collimator

### Helmet

optic housing + jaw hinge + side vent

If the camera cannot see these details because they were never modeled:

FAIL.

If they were modeled but the lighting hides them:

adjust lighting before reducing geometry.

---

# 67. ASSET INTEGRATION CONTRACT FOR ANTIGRAVITY

The landing page should consume these assets without altering their underlying geometry.

Expected loader interface:

```text
loadArmorComponent('armor_boots.glb')
loadArmorComponent('armor_legs.glb')
loadArmorComponent('armor_torso.glb')
loadArmorComponent('armor_arms.glb')
loadArmorComponent('armor_gauntlets.glb')
loadArmorComponent('armor_helmet.glb')
loadArmorAssembly('armor_rigged_final.glb')
```

The landing-page scene owns:

- placement
- camera
- lighting
- flight
- scroll timing
- assembly transforms
- interactive button
- aperture opening

The asset owns:

- geometry
- material
- hierarchy
- animation clips
- pivots

Keep those concerns separate.

---

# 68. LOADING BEHAVIOR

Do not show incomplete assets.

If the browser is still loading an asset during an invisible preparation stage:

delay the visible transition.

Do not display:

```text
loading model
asset pending
gray mesh
missing texture
T-pose
```

The visitor should only see finished geometry.

---

# 69. INTRODUCTION TO THE ARMOR

The opening scene starts with the armor distant and unpowered.

The sequence is:

```text
P + G
↓
Priyansh Gadia typography reveal
↓
black becomes gunmetal door
↓
door separates
↓
distant workshop appears
↓
suit pieces remain silhouette
↓
helmet optics activate
↓
other components activate
↓
room powers up
↓
full armor detail visible
↓
overhead hatch opens
↓
components launch
```

There are no explanatory labels on the door.

The workbench is distant.

Once the armor is fully powered:

no subsequent silhouette-only shots.

---

# 70. HERO ELEMENT REQUIREMENT

After assembly and stand-up:

The complete suit is the landing-page hero.

The final shot must present:

- clear complete silhouette
- high geometric detail
- readable materials
- visible cyan optics
- visible red structural elements
- believable mechanical joints
- deep architectural environment
- landing pad
- one red interactive button

The suit should occupy a substantial portion of the frame.

Do not hide it behind typography.

---

# 71. RED BUTTON INTERACTION CONTRACT

The button itself is not part of the armor assets.

It is part of the landing environment.

Visual requirements:

```text
red
emissive
physical housing
subtle mechanical depth
obvious click target
no explanatory label
```

On click:

```text
suit backs away
suit aims
palm emitter activates
short energy discharge
landing pad aperture opens
rock tunnel appears
Vault CTA appears
```

---

# 72. APERTURE DESIGN

The landing pad should contain several radial mechanical segments.

Each segment requires:

- structural plate
- hinge/pivot region
- actuator region
- inner frame

Opening behavior:

```text
closed
↓
lock release
↓
segment separation
↓
radial retraction
↓
fully open
```

The tunnel below should reveal only part of the route into VAULT-01.

---

# 73. MASTER QA CAMERA SET

Before declaring the armor production-ready, capture:

```text
BOOT / front 3-4
BOOT / ankle macro
BOOT / thruster macro
LEG / front
LEG / knee macro
TORSO / front
TORSO / core macro
TORSO / rear spine
ARM / shoulder macro
ARM / elbow macro
GAUNTLET / top
GAUNTLET / palm macro
GAUNTLET / fingers macro
HELMET / front 3-4
HELMET / optics macro
HELMET / jaw macro
HELMET / rear shell
FULL SUIT / front
FULL SUIT / front 3-4
FULL SUIT / rear 3-4
FULL SUIT / landing
FULL SUIT / standing
FULL SUIT / aim
FULL SUIT / fire
```

---

# 74. QUALITY BAR

The model should survive the following visual question:

> "What is holding this part together?"

There should be an answer.

Another:

> "Where does the power go?"

There should be a visible conceptual route.

Another:

> "How does this joint move?"

There should be a mechanical answer.

Another:

> "How is this panel serviced?"

There should be a believable access point.

Another:

> "Why is this heat sink here?"

There should be a thermal reason.

If every question is answered only by decorative styling, the model has failed the engineering-art direction.

---

# 75. RSO METHODOLOGY ANCHOR

The construction process for this fictional armor should deliberately borrow the **method**, not the visual design, of the existing RSO mechanical work.

The RSO report records an initial 14-component valve assembly and then a final 15-component merged assembly after adding the PLBD seat, diaphragm and clamp. It also explicitly documents component materials and functions, and shows separate assembly/cross-sectional views. This demonstrates the desired progression:

```text
functional decomposition
→ defined components
→ geometry
→ assembly
→ iteration
→ merged final mechanism
```

For the armor, the decomposition is much larger, but the mindset is the same.

The RSO report also documents explicit dimensions and design parameters instead of describing the valve only as a visual object. The armor should similarly use intentional fictional production dimensions and mechanical interfaces rather than relying on decorative geometry alone.

Source reference:

`RSO_in_IPD_FINAL.pdf`

Relevant areas:

- initial 14-component assembly: Section 4.5
- initial design figure: Figure 4.1
- final dual-path architecture: Section 6.1 / Figure 6.1
- PLBD component specifications: Section 6.2
- final 15-component assembly: Section 6.6 / Table 6.2
- final merged assembly figure: Figure 6.3

---

# 76. ITERATION RULE

Do not attempt to perfect all six assemblies simultaneously.

Correct sequence:

```text
MASTER DESIGN
↓
BOOT
↓
LEG
↓
TORSO
↓
ARM
↓
GAUNTLET
↓
HELMET
↓
CROSS-ASSEMBLY FIT
↓
FINAL MATERIALS
↓
RIG
↓
ANIMATION
```

Each completed assembly becomes a reference for the next.

For example:

The ankle interface created for the boot becomes the exact mechanical reference used by the leg.

The wrist created for the arm becomes the exact mechanical reference used by the gauntlet.

The collar created for the torso becomes the exact reference used by the helmet.

Never redraw an interface from scratch after it has been approved.

---

# 77. CHECKPOINT FILES

Antigravity should save intermediate source/checkpoints.

Recommended:

```text
armor_master_v001.blend
armor_boots_v001.blend
armor_boots_v002.blend
armor_legs_v001.blend
armor_torso_v001.blend
armor_arms_v001.blend
armor_gauntlets_v001.blend
armor_helmet_v001.blend
armor_master_assembled_v001.blend
armor_master_rigged_v001.blend
```

Final export files should be copied into the landing-page asset directory only after QA.

---

# 78. DO NOT LOSE SOURCE GEOMETRY

GLB is an interchange/export format.

Do not use the GLBs as the only master source if Blender/source files are available.

Keep editable source scenes.

The editable master is the authority.

The GLBs are production exports.

---

# 79. VERSIONING

Recommended:

```text
DESIGN_v001
GEOMETRY_v001
MATERIAL_v001
RIG_v001
ANIMATION_v001
EXPORT_v001
```

Never overwrite a visually important milestone before preserving the previous checkpoint.

---

# 80. FINAL DELIVERABLE MANIFEST

Minimum final landing-page asset set:

```text
about-assets/
└── armor/
    ├── armor_boots.glb
    ├── armor_legs.glb
    ├── armor_torso.glb
    ├── armor_arms.glb
    ├── armor_gauntlets.glb
    ├── armor_helmet.glb
    └── armor_rigged_final.glb
```

Additional environment assets may live separately:

```text
about-assets/
└── environment/
    ├── door-hero.glb
    ├── cavern-environment.glb
    └── landing-pad.glb
```

Only include environment files actually used by the final page.

---

# 81. FINAL PRODUCTION CHECKLIST

## Design

```text
[ ] original silhouette
[ ] original helmet
[ ] original core
[ ] consistent proportions
[ ] consistent material system
[ ] coherent mechanical vocabulary
```

## Geometry

```text
[ ] hundreds of meaningful subcomponents across complete suit
[ ] actual hinges
[ ] actual fasteners
[ ] actual actuators
[ ] actual service panels
[ ] actual cable routes
[ ] actual thermal hardware
[ ] no primitive-only construction
```

## Assembly

```text
[ ] boot/leg interface fits
[ ] leg/torso interface fits
[ ] arm/torso interface fits
[ ] gauntlet/arm interface fits
[ ] helmet/torso interface fits
```

## Materials

```text
[ ] gunmetal reads as metal
[ ] red reads as painted armor
[ ] graphite reads as substructure
[ ] rubber reads as rubber
[ ] cyan is restrained
[ ] amber is restrained
```

## Animation

```text
[ ] Landing
[ ] StandUp
[ ] StepBack
[ ] Aim
[ ] AimAndShoot
[ ] Idle
```

## Landing page

```text
[ ] opening silhouette state
[ ] optics power-up
[ ] room power-up
[ ] hatch launch
[ ] boot flight
[ ] leg flight
[ ] torso flight
[ ] arm flight
[ ] gauntlet flight
[ ] helmet flight
[ ] formation flight
[ ] landing
[ ] assembly
[ ] stand-up
[ ] red-button interaction
[ ] repulsor
[ ] aperture
[ ] tunnel
[ ] Vault CTA
```

---

# 82. FAILURE CONDITIONS

Immediately reject the asset if any of the following occur:

```text
single primitive shapes dominate
armor looks like a generic game character
helmet resembles a known copyrighted design
core resembles an Arc Reactor
red/black material looks like plastic
cyan glow hides geometry
joints have no mechanics
panels float
fasteners are randomly scattered
cables terminate nowhere
service panels have no opening logic
legs/arms are visibly incompatible
assembled suit requires impossible intersections
animation causes severe clipping
hero close-up reveals missing geometry
landing page requires silhouette after full activation
```

Do not solve these by hiding the camera.

Fix the asset.

---

# 83. IMPORTANT ART-DIRECTION PRINCIPLE

The suit should contain enough detail that the visitor can believe:

someone designed it,

someone assembled it,

someone could service it,

someone could explain why its mechanisms exist.

That is the visual identity.

Do not confuse complexity with noise.

Every small element should look intentional.

---

# 84. FINAL MASTER STATEMENT

The VAULT-01 armor is an original fictional powered exoskeleton constructed as a coherent engineering system.

It is composed of six major assemblies:

```text
BOOTS
LEGS
TORSO
ARMS
GAUNTLETS
HELMET
```

Those assemblies are themselves composed of hundreds of purposeful subcomponents including:

- frames
- armor plates
- bearings
- hinges
- pistons
- actuator rods
- locking mechanisms
- cables
- conduits
- service panels
- thermal hardware
- power hardware
- data hardware
- fasteners
- sensors
- optical systems

The six assemblies must be capable of separating, flying independently, becoming focal hero objects, reforming into one machine, landing, standing, aiming and producing the repulsor interaction required by the VAULT-01 landing page.

The final machine must look like one manufactured object.

The landing page must present it like a cinematic production asset.

The underlying engineering decomposition is the source of the detail.

The camera and lighting reveal that detail.

The scroll controls the story.

The final aperture leads to the real VAULT-01.

**This document is the construction source of truth for the armor.**

# VAULT-01 // MASTER ARMOR

# PYTHON-FIRST PARAMETRIC 3D CONSTRUCTION DIRECTIVE

# REVISION 03

#

# CRITICAL CORRECTION TO PREVIOUS EXECUTION PLAN

#

# DO NOT WAIT FOR MANUALLY SUPPLIED GLB MODELS.

#

# DO NOT TREAT MASTER_VAULT_ARMOR_ENGINEERING_SPEC.md AS A DOCUMENT THAT

# SOMEONE ELSE IS EXPECTED TO EXECUTE IN BLENDER.

#

# YOU ARE NOW REQUIRED TO IMPLEMENT THE 3D ASSET GENERATION PIPELINE ITSELF.

#

# The engineering specification is the SOURCE OF TRUTH.

#

# Your task is to write the Python tooling that reads/embodies that

# specification and constructs the actual armor geometry component-by-component,

# assembly-by-assembly, entirely through scripted 3D generation.

#

# The end result must be REAL GEOMETRY.

#

# Not:

# - reference images

# - concept art

# - SVGs

# - primitive placeholders

# - a low-detail mannequin

# - six empty GLB slots

# - a manually modeled asset somebody else must finish

#

# The expected pipeline is:

#

# ENGINEERING SPEC

# ↓

# PARAMETRIC PYTHON DEFINITIONS

# ↓

# SUBCOMPONENT GENERATORS

# ↓

# ASSEMBLY GENERATORS

# ↓

# MASTER SUIT

# ↓

# MATERIAL / DETAIL PASS

# ↓

# RIG

# ↓

# ANIMATION

# ↓

# GLB EXPORT

#

# The landing page consumes the resulting assets.

#

# The landing page code is NOT the blocker.

# The armor asset pipeline is now the task.

================================================================================

## 0. ABSOLUTE SCOPE

================================================================================

You are constructing NEW LANDING-PAGE armor assets.

Do not modify the existing VAULT-01 3D installation.

The existing Vault is frozen.

Do not modify:

index.html
lab.js
cave3.js
transition.js
realism.js
LS1 modules
biometric/security code
WebAuthn code
Cloudflare code
existing Vault geometry
existing Vault materials
existing Vault camera system
existing Vault shaders

Only create or modify files belonging to the armor-generation pipeline and
landing-page asset pipeline.

Before doing anything:

1. inspect repository
2. inspect AGENTS.md
3. inspect installed software
4. determine whether Blender is installed
5. determine Blender version
6. inspect existing model directories
7. inspect current About-page asset expectations
8. inspect current Git status

Then establish the armor generation directory.

Preferred:

tools/
└── vault_armor/
├── README.md
├── config.py
├── materials.py
├── geometry.py
├── fasteners.py
├── actuators.py
├── joints.py
├── wiring.py
├── surface.py
├── assembly.py
├── validation.py
├── export.py
├── generate_all.py
├── generate_boots.py
├── generate_legs.py
├── generate_torso.py
├── generate_arms.py
├── generate_gauntlets.py
├── generate_helmet.py
└── generate_final.py

The exact directory may be adapted to repository conventions.

Do NOT create one gigantic 10,000-line script unless absolutely necessary.

The generator must be modular.

================================================================================

## 1. IMPORTANT TERMINOLOGY

================================================================================

This project uses "CAD" to mean:

PARAMETRIC, ENGINEERING-STYLE, DIMENSIONALLY CONTROLLED HARD-SURFACE
3D CONSTRUCTION.

Blender is permitted as the geometry-generation environment.

Blender is not traditional mechanical CAD.

The requirement is NOT to pretend Blender is SolidWorks.

The requirement is:

Use Python to explicitly construct the machine.

Where Blender's:

bpy
bmesh
Boolean
Curve
Mesh
Modifier
Collection
Material
Armature
Animation

systems provide the required result, use them.

If a true CAD kernel is available and useful for certain mechanical parts,
it may be used.

However, do NOT split the pipeline across Blender + FreeCAD + OpenSCAD +
three other systems merely because each can make one primitive.

Prefer one deterministic source-of-truth generation pipeline.

================================================================================

## 2. FIRST REQUIRED DELIVERABLE

================================================================================

Before generating the complete suit, create:

generate_all.py

and a reusable geometry library.

Running:

blender -b --python tools/vault_armor/generate_all.py

or the equivalent verified command must generate a complete master scene.

The script must be deterministic.

Same:

source code

- parameters
- Blender version

must produce materially equivalent geometry.

Do not rely on manually clicking through Blender.

================================================================================

## 3. NO MANUAL MODELING DEPENDENCY

================================================================================

A human may inspect the generated result.

A human may approve a result.

A human may provide artistic direction.

But the pipeline itself must be capable of rebuilding the assets from source.

Do NOT say:

"Open Blender and model this."

Instead:

"generate script X, run it, inspect output, revise parameters,
rerun."

The Python source must be the reproducible design record.

================================================================================

## 4. ENGINEERING SPEC IS THE AUTHORITY

================================================================================

Read:

MASTER_VAULT_ARMOR_ENGINEERING_SPEC.md

fully before implementation.

Do not simplify its architecture.

Do not collapse named components into decorative texture.

Where the specification defines:

component
function
interface
dimension
material
actuator
fastener
routing
thermal system
power system
movement

the Python implementation should represent that information.

The implementation must preserve the terminology of the engineering spec.

If an exact construction detail is unspecified:

choose a mechanically plausible design,
record that decision in a code comment,
and keep it parameterized.

Do not silently invent major architecture.

================================================================================

## 5. RSO METHODOLOGY

================================================================================

Use the same GENERAL CONSTRUCTION PHILOSOPHY demonstrated by the RSO work:

functional component
→ component geometry
→ interfaces
→ assembly
→ validation
→ iteration

The RSO documentation explicitly defines a component-level bill of materials
and then merges those components into a final assembly. :contentReference[oaicite:2]{index=2}

The improved design similarly documents the final 15-component merged assembly
with the added PLBD seat, diaphragm and clamp as separate components. :contentReference[oaicite:3]{index=3}

Do NOT copy the RSO geometry.

Copy the engineering discipline.

================================================================================

## 6. MASTER OBJECT MODEL

================================================================================

Create this hierarchy:

VAULT_MK_I
│
├── ARMOR_ROOT
│
├── BOOTS
│ ├── BOOT_L
│ └── BOOT_R
│
├── LEGS
│ ├── LEG_L
│ └── LEG_R
│
├── TORSO
│
├── ARMS
│ ├── ARM_L
│ └── ARM_R
│
├── GAUNTLETS
│ ├── GAUNTLET_L
│ └── GAUNTLET_R
│
├── HELMET
│
├── POWER_SYSTEM
│
├── DATA_SYSTEM
│
├── THERMAL_SYSTEM
│
└── ENERGY_SYSTEM

Every major assembly is a Blender Collection.

Every functional subassembly is another Collection.

Every physical component is an Object or logically grouped Object family.

Do not create one monolithic mesh too early.

================================================================================

## 7. COMPONENT IDENTIFICATION

================================================================================

Every generated object must have a stable name.

Use:

VAULT*<ASSEMBLY>*<SUBSYSTEM>\_<COMPONENT>

Example:

VAULT_BOOT_THRUSTER_HOUSING_L

VAULT_BOOT_THRUSTER_NOZZLE_L

VAULT_BOOT_ANKLE_BEARING_OUTER_L

VAULT_BOOT_ANKLE_BEARING_INNER_L

VAULT_BOOT_LOCKING_COLLAR_L

VAULT_BOOT_ACTUATOR_BODY_L

VAULT_BOOT_ACTUATOR_ROD_L

VAULT_BOOT_SERVICE_PANEL_L

VAULT_BOOT_FASTENER_M2_01_L

Do not use:

Cube
Cube.001
Cylinder.023
Plane.002

Those names are prohibited in the final generated hierarchy.

================================================================================

## 8. PARAMETRIC SOURCE OF TRUTH

================================================================================

Create centralized dimensions.

Example:

SUIT_HEIGHT_MM = 1940.0

SHOULDER_WIDTH_MM = 560.0

FOOT_LENGTH_MM = 315.0

CHEST_WIDTH_MM = 520.0

etc.

Then define subsystem parameters.

Example:

BOOT = {
"length": 315.0,
"width": 128.0,
"ankle_diameter": ...,
"thruster_diameter": ...,
"sole_thickness": ...,
}

Do not scatter magic numbers throughout geometry functions.

================================================================================

## 9. UNIT SYSTEM

================================================================================

Use metric millimeters in the design parameters.

Blender internal units may be meters if configured consistently.

The conversion must be centralized:

MM = 0.001

Never mix:

millimeter dimensions

meter dimensions

arbitrary Blender units

inside the same calculation.

================================================================================

## 10. MASTER AXIS

================================================================================

Use:

+X = suit right
-X = suit left

+Y = up

+Z = forward

All component generators must honor this convention.

The final suit must face +Z.

================================================================================

## 11. MIRROR STRATEGY

================================================================================

Do NOT independently generate left and right limbs from scratch.

Generate:

MASTER_LEFT_OR_RIGHT

then mirror mathematically when symmetry is appropriate.

This ensures:

matching proportions

matching joints

matching interfaces

matching detail

matching fasteners

matching materials

Intentional asymmetry must be explicitly defined.

================================================================================

## 12. GEOMETRY LIBRARY

================================================================================

Create reusable geometry primitives that are MORE sophisticated than:

cube

sphere

cylinder

The library should support:

hard_surface_shell()

panel()

panel_with_bevel()

recess()

raised_rib()

vent_louver()

bearing()

bearing_race()

hinge()

hinge_pin()

actuator()

piston()

rod_end()

locking_tooth()

service_panel()

fastener()

countersunk_fastener()

cable()

cable_bundle()

connector()

heat_sink()

radiator_fin()

mesh_grille()

thruster()

nozzle()

retaining_ring()

bracket()

mount()

joint_housing()

sensor_housing()

energy_channel()

Do not make these merely wrappers around cubes.

Each helper should create meaningful geometry.

================================================================================

## 13. HARD-SURFACE PANEL GENERATOR

================================================================================

Create a general function:

make_panel(...)

Parameters should include:

width

height

depth

bevel

corner_radius

curvature

material

panel_gap

fastener_pattern

mount_points

service_access

normal_direction

The resulting panel should have:

real thickness

edge definition

small bevel

mounting logic

optional seams

not just a flat plane.

================================================================================

## 14. PANEL SEAMS

================================================================================

Mechanical armor must contain real panel separation.

Generate:

panel borders

gaps

recesses

overlaps

interlocking edges

Do not simply draw black lines onto a surface.

Where a gap is visually important:

model it.

================================================================================

## 15. FASTENER SYSTEM

================================================================================

Create reusable fastener generators.

Support:

hex socket

torx-like

countersunk

button-head

hex-head

retaining screw

small pin

washer

Each fastener has:

head

shaft where visible

seat

optional washer

material

scale

orientation

Fasteners should be repeated according to meaningful engineering logic.

Do NOT scatter random screws.

================================================================================

## 16. ACTUATOR SYSTEM

================================================================================

Create physically readable actuators.

Each actuator should include:

housing

mount

rod

rod end

seal region

joint

retaining hardware

At least two visual material regions.

The actuator rod should move relative to its housing when animation is played.

================================================================================

## 17. BEARING SYSTEM

================================================================================

Where rotational joints are specified:

generate:

outer race

inner race

retaining ring

mount

visible bearing geometry

Do NOT model every microscopic bearing ball unless the shot requires it.

For hero close-up joints:

individual visible rollers/balls may be warranted.

================================================================================

## 18. CABLE SYSTEM

================================================================================

Use curves or mesh tubes.

Cable bundles should include:

main conduit

secondary data cable

power cable

retention clips

strain relief

connector

Do not simply draw glowing lines.

Cables need physical thickness.

================================================================================

## 19. THERMAL SYSTEM

================================================================================

Armor must look capable of managing heat.

Generate:

heat sinks

ventilation channels

thermal barriers

heat shield plates

radiator fins

exhaust paths

material transitions

Use red/amber indicators sparingly.

Do not make every vent glow.

================================================================================

# 20. BOOT GENERATOR

================================================================================

Create:

generate_boots.py

The boot is NOT one mesh.

Target a large number of physical components.

Recommended minimum logical component families:

BOOT OUTER STRUCTURE

- toe shell
- medial shell
- lateral shell
- upper foot shell
- heel shell
- rear stabilizer
- sole frame

ANKLE

- ankle collar
- outer bearing
- inner bearing
- bearing retainer
- collar bolts
- actuator bracket
- actuator housing
- piston rod
- rod end
- secondary linkage
- locking mechanism

THRUSTER

- heel chamber
- inner chamber
- nozzle
- nozzle ring
- thermal liner
- heat sink
- exhaust shroud
- intake / cooling channel
- power conduit
- ignition assembly

SOLE

- structural plate
- traction frame
- traction blocks
- magnetic latch
- pressure/contact plate

SERVICE

- service panel
- retaining screws
- cable clips
- inspection port
- thermal sensor

DETAIL

- seams
- panel overlaps
- fasteners
- brackets
- retention pins

The script must actually construct those parts.

================================================================================

## 21. BOOT THRUSTER

================================================================================

The thruster must have depth.

Do NOT use:

flat circle

- blue glow.

Construct:

outer housing
→ thermal liner
→ chamber
→ nozzle
→ retaining geometry
→ emitter interior

When illuminated:

the user should see inside the propulsion aperture.

================================================================================

## 22. BOOT ARTICULATION

================================================================================

Build an actual ankle articulation hierarchy.

Example:

BOOT_L
└── ANKLE
├── bearing
├── collar
├── actuator
└── foot

The foot must be able to rotate relative to the shin.

================================================================================

# 23. LEG GENERATOR

================================================================================

Create:

generate_legs.py

Major systems:

THIGH

HIP INTERFACE

KNEE

SHIN

POWER PACK

THERMAL

SERVICE

The knee must be the hero.

Generate:

outer knee housing

inner knee housing

upper hinge

lower hinge

locking teeth

dual actuator pair

piston rods

mounting brackets

bearing surfaces

protective covers

service plate

cable routing

internal support frame

When the knee bends:

actuators and joints must move believably.

================================================================================

# 24. TORSO GENERATOR

================================================================================

Create:

generate_torso.py

This is the central assembly.

It should contain:

chest shell

back shell

rib plates

segmented abdomen

sternum structure

shoulder brackets

collar

neck ring

spinal structure

data conduit

power plant

thermal system

service panels

fasteners

internal frame

The torso should contain significantly more geometry than the boots.

================================================================================

## 25. ORIGINAL POWER PLANT

================================================================================

Do NOT create an Arc Reactor clone.

Create:

VAULT_CORE_01

A recessed non-circular or mechanically distinct power architecture.

Recommended conceptual structure:

central energy chamber

surrounding heat-sink architecture

radial but non-iconic cooling vanes

power bus

shielding

service ring

conduit system

The light should be cyan.

The geometry must clearly be its own design.

================================================================================

## 26. SPINAL DATA BUS

================================================================================

The rear torso should expose a sophisticated data/power spine.

Include:

central trunk

branch conduits

connector blocks

strain relief

mounting brackets

protected segments

This should become a visible hero detail from rear three-quarter shots.

================================================================================

# 27. ARM GENERATOR

================================================================================

Create:

generate_arms.py

Each arm:

shoulder

upper arm

elbow

forearm

wrist

must be independently articulated.

Shoulder:

large bearing

mount

sliding cap

actuator

Elbow:

dual internal pistons

bearing

locking structure

Forearm:

vent system

service panels

cable routing

carbon-like substructure

================================================================================

# 28. GAUNTLET GENERATOR

================================================================================

Create:

generate_gauntlets.py

This must be one of the highest-detail assemblies.

Include:

wrist bearing

back-hand armor

finger housings

individual phalange segments

finger hinges

micro actuators

palm chamber

energy conduit

emitter

rear service panels

fasteners

The fingers must NOT be five featureless blocks.

Each finger should be a mechanical assembly.

================================================================================

# 29. PALM EMITTER

================================================================================

Do NOT use a flat glowing circle.

Build:

external palm housing

recessed collimator

retaining ring

inner lens

concentric optical/energy geometry

cooling structure

power conduit

backplane

The emitter should have a deep mechanical cavity.

================================================================================

# 30. HELMET GENERATOR

================================================================================

Create:

generate_helmet.py

Major systems:

cranial shell

face shell

jaw

jaw hinge

jaw actuator

optic housings

optic lenses

side vents

rear shell

neck interface

locking mechanism

service panels

internal frame

micro fasteners

The helmet needs the strongest recognizable silhouette.

It must still be original.

================================================================================

# 31. OPTICS

================================================================================

Create two narrow recessed optical apertures.

They should NOT be painted on.

Build:

optic cavity

outer frame

lens

internal light chamber

retaining frame

The cyan light comes from inside the cavity.

It should not bloom into giant circles.

================================================================================

# 32. HELMET JAW

================================================================================

The jaw must be mechanically distinct from the cranial housing.

Build:

jaw plate

hinge

actuator

link

inner structure

retainer

When the helmet moves, the jaw remains mechanically believable.

================================================================================

# 33. ASSEMBLY GENERATOR

================================================================================

Create:

assembly.py

It should assemble:

boots

legs

torso

arms

gauntlets

helmet

using the mechanical interfaces defined in the engineering specification.

DO NOT simply put objects at approximate coordinates.

Use named interfaces.

Example:

ANKLE_INTERFACE

KNEE_INTERFACE

HIP_INTERFACE

SHOULDER_INTERFACE

WRIST_INTERFACE

NECK_INTERFACE

Each interface must define:

position

orientation

parent

clearance

allowed motion

================================================================================

# 34. INTERFACE VALIDATION

================================================================================

Write validation functions that check:

left/right symmetry

joint alignment

interpenetration

object distances

interface positions

expected hierarchy

missing components

duplicate names

non-manifold geometry where unacceptable

extreme dimensions

broken transforms

Before export:

run validation.

If validation fails:

DO NOT export final assets.

================================================================================

# 35. CLEARANCE CHECK

================================================================================

For moving joints:

evaluate several poses:

neutral

slight bend

maximum intended bend

landing

step-back

aim

If armor plates intersect incorrectly:

flag the component.

================================================================================

# 36. MICRO-DETAIL STRATEGY

================================================================================

Do NOT attempt to satisfy "500 components" through random repetition.

Every repeated element must belong to a system.

Examples:

20 screws:
acceptable if fastening a real panel system.

30 cable clips:
acceptable if routing a real cable bundle.

50 vent fins:
acceptable if forming a thermal system.

500 random bolts:
FAIL.

The geometry count must represent design.

================================================================================

# 37. HERO-MICRO DETAIL STRATEGY

================================================================================

Create special high-detail zones where the About page camera gets close:

BOOT:
ankle + thruster

LEG:
knee

TORSO:
core + shoulder mount

ARM:
elbow

GAUNTLET:
palm + fingers

HELMET:
optics + jaw + vents

These areas receive the highest geometry detail.

================================================================================

# 38. MATERIAL GENERATOR

================================================================================

Create:

materials.py

Materials:

MAT_GUNMETAL

MAT_BLOOD_RED

MAT_GRAPHITE

MAT_CYAN_ENERGY

MAT_AMBER_INDICATOR

MAT_RUBBER

MAT_GLASS

MAT_THERMAL

MAT_BRUSHED_METAL

MAT_DARK_CARBON

Material parameters should include:

base color

metallic

roughness

normal/bump where generated

clearcoat only when justified

anisotropy

emission

Do not use one material for the entire suit.

================================================================================

# 39. GUNMETAL

================================================================================

Gunmetal should have:

high metallic response

moderate roughness

anisotropic brushing

subtle surface variation

No mirror-chrome appearance.

================================================================================

# 40. BLOOD RED

================================================================================

Blood red should be:

deep

matte/satin

slightly worn

with selective glossy inserts.

Edge wear should remain subtle.

Do not paint every edge silver.

================================================================================

# 41. GRAPHITE

================================================================================

Graphite:

dark

semi-matte

structural

rubber/carbon-like where appropriate.

Use it to expose construction beneath armor plates.

================================================================================

# 42. CYAN ENERGY

================================================================================

Cyan exists only on:

optics

core

palm emitter

selected conduits

Power-state details.

Do not turn the suit into a blue neon object.

================================================================================

# 43. SURFACE WEAR

================================================================================

Create deterministic surface variation.

Allowed:

micro scratches

roughness variation

edge abrasion

subtle heat marks

small tooling marks

Do not create:

grunge everywhere

rust everywhere

random dirt decals

post-apocalyptic damage

The machine is maintained.

================================================================================

# 44. DETAILING BY GEOMETRY SCALE

================================================================================

Use three levels:

LEVEL 01:
large mechanical forms

LEVEL 02:
functional medium mechanisms

LEVEL 03:
hero micro details

Do not generate expensive geometry below meaningful camera resolution.

The criterion is visible mechanical fidelity, not an arbitrary triangle number.

================================================================================

# 45. CAMERA-BASED DETAIL BUDGET

================================================================================

Define:

HERO_CAMERA_DISTANCE

COMPONENT_CAMERA_DISTANCE

FORMATION_CAMERA_DISTANCE

At:

hero/component distance:

maximum detail

At:

formation distance:

disable hidden micro geometry or use LOD

Do not load every tiny object at full cost when 20 meters away.

================================================================================

# 46. COLLECTION-BASED LOD

================================================================================

Organize:

DETAIL_MACRO

DETAIL_MID

DETAIL_MICRO

DETAIL_HERO

This permits controlled activation.

================================================================================

# 47. MASTER ASSEMBLED SUIT

================================================================================

The final suit MUST be assembled from the same generated components.

Do not create an unrelated replacement suit.

The same:

boots

legs

torso

arms

gauntlets

helmet

used in the component flight sequence must be capable of assembling into the
final hero.

This is non-negotiable.

================================================================================

# 48. RIGGING

================================================================================

Create:

generate_final.py

Build armature after geometry is validated.

Required conceptual bones:

root

pelvis

spine

spine_upper

neck

head

shoulder.L

upper_arm.L

forearm.L

hand.L

shoulder.R

upper_arm.R

forearm.R

hand.R

thigh.L

shin.L

foot.L

thigh.R

shin.R

foot.R

Additional mechanical helper bones:

ankle.L

ankle.R

knee_mechanism.L

knee_mechanism.R

elbow_mechanism.L

elbow_mechanism.R

wrist.L

wrist.R

helmet_lock

thruster.L

thruster.R

---

# 49. MECHANICAL RIGGING

---

Where appropriate:

armor plates can be rigidly parented

mechanical actuators can use constraints

cables can be curve-driven

hinges use rotational constraints

pistons use tracking constraints

The goal is mechanical animation.

Do not use a soft human-skin deformation pipeline.

This is armor.

================================================================================

# 50. REQUIRED ANIMATIONS

================================================================================

Create:

IDLE

LANDING

STAND_UP

STEP_BACK

AIM

REPULSOR_FIRE

Animations may be generated procedurally.

They do not need to come from a marketplace asset.

================================================================================

# 51. LANDING ANIMATION

================================================================================

Landing must feel heavy.

Sequence:

descend

foot contact

knee compression

body stabilization

arm stabilization

head alignment

energy stabilization

No cartoon bounce.

================================================================================

# 52. STAND-UP ANIMATION

================================================================================

After landing:

hips rise

knees extend

torso rises

shoulders settle

head aligns

feet stabilize

This must look like a machine standing under load.

================================================================================

# 53. STEP-BACK

================================================================================

Two or three steps.

Weight transfer.

Foot placement.

Leg articulation.

Arm counterbalance.

No skating.

================================================================================

# 54. AIM

================================================================================

The suit:

turns

raises arm

locks shoulder

aligns elbow

aligns wrist

stabilizes palm

The motion should have mechanical stages.

================================================================================

# 55. REPULSOR FIRE

================================================================================

When activated:

palm emitter powers

cyan intensity increases

local illumination activates

short pulse launches

subtle recoil

environment response

No giant explosion.

No copied movie beam.

================================================================================

# 56. COMPONENT EXPORTS

================================================================================

Export:

public/about-assets/armor_boots.glb

public/about-assets/armor_legs.glb

public/about-assets/armor_torso.glb

public/about-assets/armor_arms.glb

public/about-assets/armor_gauntlets.glb

public/about-assets/armor_helmet.glb

public/about-assets/armor_rigged_final.glb

The paths may be adapted only if the existing About code requires a different
verified path.

The currently deployed About code expects those conceptual assets.

Verify the actual paths before export.

================================================================================

# 57. EXPORT TRANSFORMS

================================================================================

Every component export must:

face the correct direction

use correct origin

apply transforms

use correct scale

preserve material assignments

preserve object hierarchy

preserve animation data where applicable

Do not export arbitrary world coordinates from the master scene.

================================================================================

# 58. ORIGIN CONTRACT

================================================================================

BOOT:

origin at ankle/mechanical reference.

LEG:

origin at hip interface.

TORSO:

origin at body root.

ARM:

origin at shoulder socket.

GAUNTLET:

origin at wrist interface.

HELMET:

origin at neck interface.

Final assembly:

origin at suit root.

================================================================================

# 59. EXPORT METADATA

================================================================================

Each component should contain useful metadata.

Example:

VAULT_ASSET_ID

VAULT_ASSEMBLY

VAULT_VERSION

VAULT_SCALE_MM

VAULT_ORIGIN

VAULT_INTERFACE

VAULT_GENERATOR_VERSION

Do not expose this metadata in the website.

================================================================================

# 60. GENERATION MANIFEST

================================================================================

Generate:

armor_generation_manifest.json

containing:

source_spec_version

generator_version

Blender version

generation timestamp

component list

object counts

triangle counts

material counts

animation clips

export paths

validation result

This is internal engineering evidence.

================================================================================

# 61. COMPONENT BOM

================================================================================

Generate:

armor_component_manifest.json

Each record:

component_id

parent

function

material

dimensions

object_names

interface_names

generator_file

validation_status

Do not fake values.

Generate from the actual scene.

================================================================================

# 62. OBJECT COUNT

================================================================================

At completion, calculate:

total objects

total meshes

total vertices

total polygons

total triangles

Do NOT set an arbitrary requirement like:

"must be 2 million polygons."

Geometry quality matters more than a meaningless number.

================================================================================

# 63. DETAIL VALIDATION

================================================================================

Automated validation cannot determine whether an armor part looks cinematic.

Therefore create automated structural validation PLUS rendered visual validation.

Both are required.

================================================================================

# 64. AUTOMATED STRUCTURAL QA

================================================================================

Check:

all expected assemblies exist

all expected component IDs exist

all interfaces exist

all material classes exist

no missing child objects

no default object names

no unapplied transform where prohibited

no NaN transforms

no zero-scale objects

no broken parent relationships

no duplicate identifiers

no missing exports

================================================================================

# 65. GEOMETRY QA

================================================================================

Check:

non-manifold geometry

degenerate faces

zero-area faces

inverted normals where applicable

extreme aspect ratios

unexpected disconnected islands

self-intersections in critical surfaces

Boolean failures

modifier errors

Do not automatically delete questionable geometry.

Log it.

Fix intentionally.

================================================================================

# 66. VISUAL QA RENDERS

================================================================================

The generator must automatically create preview renders.

For each major component:

front

rear

left

right

three-quarter

hero macro

Generate:

boot_preview.png

leg_preview.png

torso_preview.png

arm_preview.png

gauntlet_preview.png

helmet_preview.png

and assembled:

suit_preview.png

Use a temporary QA directory, not the production About asset directory if
possible.

================================================================================

# 67. HERO MACRO RENDERS

================================================================================

The hero macro renders must deliberately show:

BOOT:
ankle + thruster

LEG:
knee + actuator

TORSO:
core + shoulder + abdomen

ARM:
elbow + actuator

GAUNTLET:
finger + palm emitter

HELMET:
optic + jaw + vent

These images exist to expose weak geometry.

================================================================================

# 68. AUTOMATED WEAKNESS CHECK

================================================================================

After rendering:

inspect the renders.

Ask:

Are the mechanical parts readable?

Are there obvious primitive shapes?

Are joints physically explicit?

Are materials differentiated?

Are seams visible?

Are fasteners visible?

Does the object look assembled?

If not:

revise the generator.

Do not simply change lighting.

================================================================================

# 69. CRITICAL RULE

================================================================================

DO NOT fix bad geometry by:

darkening the render

adding fog

adding bloom

adding motion blur

reducing visibility

These can hide flaws.

The geometry itself must work under neutral lighting.

================================================================================

# 70. NEUTRAL INSPECTION RENDER

================================================================================

Every component should have one neutral inspection render:

soft neutral studio light

no cinematic fog

minimal bloom

neutral background

This exposes actual geometry.

================================================================================

# 71. CINEMATIC INSPECTION RENDER

================================================================================

Then create:

cinematic render

gunmetal

blood red

cyan

dark environment

dramatic lighting

This evaluates final presentation.

Both must pass.

================================================================================

# 72. GENERATOR ITERATION LOOP

================================================================================

For each assembly:

BUILD

↓

VALIDATE

↓

RENDER

↓

INSPECT

↓

MODIFY PARAMETERS / GEOMETRY FUNCTIONS

↓

REBUILD

↓

RENDER AGAIN

Do not manually edit the final .blend as the permanent fix.

The fix must eventually go into the Python generator.

================================================================================

# 73. CHECKPOINT .BLEND FILES

================================================================================

Save:

vault_armor_stage_boots.blend

vault_armor_stage_legs.blend

vault_armor_stage_torso.blend

vault_armor_stage_arms.blend

vault_armor_stage_gauntlets.blend

vault_armor_stage_helmet.blend

vault_armor_master.blend

These are reproducible engineering checkpoints.

They may remain outside the final deployment bundle if too large.

================================================================================

# 74. FAILURE RECOVERY

================================================================================

If one assembly fails:

do not destroy the working assemblies.

Regenerate only:

failed assembly

then reassemble.

The generators should support:

--only boots

--only legs

--only torso

--only arms

--only gauntlets

--only helmet

--assemble

--rig

--export

--validate

================================================================================

# 75. CLI

================================================================================

Preferred commands:

generate_boots.py
generate_legs.py
generate_torso.py
generate_arms.py
generate_gauntlets.py
generate_helmet.py
generate_final.py

And:

generate_all.py

must run the full pipeline.

================================================================================

# 76. DETERMINISTIC RANDOMNESS

================================================================================

If surface variation requires randomness:

use a fixed seed.

Never allow random geometry to change between runs accidentally.

================================================================================

# 77. PROCEDURAL DETAILS

================================================================================

Procedural geometry is NOT prohibited here.

It is encouraged.

But procedural does NOT mean simplistic.

For example:

50 vent louvers generated by a function:

GOOD.

50 random cubes:

BAD.

================================================================================

# 78. BOOLEAN USAGE

================================================================================

Booleans are allowed.

Use them for:

recesses

panel apertures

service ports

mounting holes

vent channels

mechanical cavities

But:

apply and validate the result where appropriate.

Do not accumulate hundreds of unchecked live boolean modifiers.

================================================================================

# 79. BEVEL STRATEGY

================================================================================

Every visible manufactured edge should have an intentional bevel.

Do not bevel everything equally.

Large structural edge:

larger controlled radius.

Micro hardware:

small radius.

Sharp functional interface:

minimal radius.

================================================================================

# 80. MANUFACTURING LOGIC

================================================================================

Not every feature needs to be literally manufacturable.

But every feature should look as though an engineer could explain:

Why is it here?

What does it connect to?

What does it protect?

How does it move?

How is it fastened?

How is it serviced?

If there is no answer:

reconsider the feature.

================================================================================

# 81. NO GREEBLE SPAM

================================================================================

"Greeble" is not an excuse for random decoration.

Every visible repeated detail should imply:

fastening

cooling

actuation

sensing

structural reinforcement

routing

serviceability

energy management

================================================================================

# 82. SUIT CONTINUITY

================================================================================

Every assembly must visually communicate:

same manufacturer

same engineering architecture

same paint system

same machining style

same fastener family

same mechanical logic

same energy architecture

================================================================================

# 83. COLOR APPLICATION

================================================================================

Do not randomly assign red.

Use red for:

structural plates

load-bearing accents

selected armor regions

architectural visual identity

Gunmetal remains dominant.

================================================================================

# 84. ENERGY APPLICATION

================================================================================

Cyan only appears when powered.

The generated master scene must support:

POWER_OFF

POWERING

POWER_ON

This is necessary for the opening cinematic.

================================================================================

# 85. BOOT POWER STATE

================================================================================

OFF:

thruster dark

indicator dark

minimal reflection

ON:

internal power light

small cyan emission

controlled heat

Do not add giant cyan halos.

================================================================================

# 86. HELMET POWER STATE

================================================================================

The helmet eyes are OFF initially.

Then:

internal optical chamber powers

lens becomes visible

cyan glow reaches final intensity

The geometry remains visible.

The eyes are not simply two emissive rectangles.

================================================================================

# 87. TORSO POWER STATE

================================================================================

The VAULT_CORE_01 powers.

The surrounding heat sinks and conduits respond.

The core should look like an engineered machine activating,
not a glowing magic orb.

================================================================================

# 88. COMPLETE SUIT POWER STATE

================================================================================

When fully powered:

eyes

core

gauntlet emitters

selected conduits

instrument lights

activate in a coordinated sequence.

The room lighting then responds.

================================================================================

# 89. LANDING PAGE INTEGRATION

================================================================================

The resulting GLBs are intended for:

About / landing page only.

The existing about.js currently expects:

armor_boots.glb
armor_legs.glb
armor_torso.glb
armor_arms.glb
armor_gauntlets.glb
armor_helmet.glb
armor_rigged_final.glb

Verify the current code before assuming the exact paths or object names.

Do not modify About choreography merely because the assets are generated
through a different pipeline.

================================================================================

# 90. COMPONENT FLIGHT

================================================================================

Every exported assembly must work independently.

It must be possible for About JavaScript to:

load

position

rotate

scale

animate

hide/show

power

and accelerate

each assembly independently.

================================================================================

# 91. FINAL ASSEMBLY

================================================================================

The six components must assemble at the exact mechanical interfaces.

No:

floating limbs

misaligned shoulders

floating helmet

feet above ground

overlapping armor

obvious gaps that shouldn't exist

The assembled suit must be a coherent machine.

================================================================================

# 92. ASSEMBLY TEST

================================================================================

Run:

neutral assembly

landing pose

standing pose

step-back

aim

repulsor

For each:

render.

Inspect.

================================================================================

# 93. LANDING PAD INTERFACE

================================================================================

The final suit should have a verified spatial relationship to the landing pad
used by About.

Do not hardcode a relationship without checking the current About scene.

The suit must stand naturally relative to:

platform surface

camera

button

tunnel aperture

================================================================================

# 94. UNIT TESTING

================================================================================

Create tests for geometry helper functions where practical.

At minimum:

dimension calculations

mirror behavior

interface transforms

component naming

export paths

material creation

================================================================================

# 95. BUILD LOG

================================================================================

Every generator run should log:

assembly

component count

object count

vertex count

triangle count

warnings

validation result

export result

Use a machine-readable JSON report as well.

================================================================================

# 96. NO SILENT FAILURES

================================================================================

If an operation fails:

raise a clear exception.

Do not:

catch everything

continue

pretend success.

A missing component must fail the build.

================================================================================

# 97. EXPORT GATE

================================================================================

Do not export:

armor_boots.glb

until boots pass validation.

Do not export:

armor_rigged_final.glb

until all six assemblies pass.

================================================================================

# 98. FINAL ASSET GATE

================================================================================

Each GLB must be independently load-tested.

Write a small verification script that:

loads each GLB

walks the scene hierarchy

confirms expected collections/objects

confirms materials

confirms dimensions

confirms animation clips

reports errors.

================================================================================

# 99. WEBGL LOAD TEST

================================================================================

After the GLBs are generated:

run the real About page.

Confirm:

boots visible

legs visible

torso visible

arms visible

gauntlets visible

helmet visible

final suit visible

Do not accept "GLB loaded successfully" as proof.

Inspect actual rendered frames.

================================================================================

# 100. FINAL CINEMATIC TEST

================================================================================

Run the exact About-page sequence:

INTRO

DOOR

ROOM

POWER

LAUNCH

BOOTS

LEGS

TORSO

ARMS

GAUNTLETS

HELMET

FORMATION

LANDING

STAND

REPULSOR

APERTURE

VAULT CTA

The generated geometry must survive the entire sequence.

================================================================================

# 101. ABSOLUTE ANTI-SUBSTITUTION RULE

================================================================================

If the generated geometry does not look sufficiently detailed:

DO NOT replace it with:

a reference image

a 2D cutout

a texture

a silhouette

a primitive placeholder

a fake CSS object

a screenshot of the concept art.

Return to the Python generator.

Improve the geometry.

================================================================================

# 102. REFERENCE IMAGE USAGE

================================================================================

Reference images are allowed as DESIGN REFERENCES.

They are NOT allowed as the final armor.

Use them to inspect:

silhouette

mechanical construction

surface detail

proportion

lighting

material

Do not embed reference images into the production model as a visual fake.

================================================================================

# 103. ONLINE RESEARCH

================================================================================

You may research publicly available mechanical references.

Research:

robot joints

industrial actuators

aerospace hardware

mechanical watches

automotive suspension

prosthetic systems

turbines

thermal systems

camera mechanisms

precision machined assemblies

Use these to inform ORIGINAL designs.

Do not copy copyrighted suit geometry.

================================================================================

# 104. REFERENCE SEARCH RULE

================================================================================

Search for:

MECHANISM

not:

IRON MAN SUIT MODEL

Preferred searches:

industrial ankle actuator

robot knee hydraulic joint

aerospace helmet mechanism

mechanical wrist bearing

robotic finger actuator

jet nozzle cross section

heat sink architecture

camera iris mechanism

precision locking collar

This creates engineering inspiration rather than copying.

================================================================================

# 105. DESIGN ITERATION

================================================================================

Iteration is expected.

Version:

BOOT_v001

BOOT_v002

BOOT_v003

etc.

But final production should reference the accepted source.

Do not leave multiple competing versions connected to About.

================================================================================

# 106. DESIGN APPROVAL POINTS

================================================================================

After each major assembly:

generate preview renders.

The user may inspect.

Do not require manual mesh sculpting.

Changes should be expressible as:

Python parameter changes

generator changes

reference changes

then regeneration.

================================================================================

# 107. IMPORTANT: DO NOT MODEL ALL 6 ASSEMBLIES SIMULTANEOUSLY AT FIRST

================================================================================

Build in this order:

1. BOOTS

2. LEGS

3. TORSO

4. ARMS

5. GAUNTLETS

6. HELMET

7. FULL ASSEMBLY

8. RIG

9. ANIMATION

10. EXPORT

This prevents six incompatible designs.

================================================================================

# 108. BOOT FIRST

================================================================================

The FIRST concrete implementation target is:

VAULT BOOT v001

Do not jump to the full suit.

Generate:

full left/right boot assembly

all major mechanical systems

high-detail hero region

materials

thruster

ankle articulation

service system

fasteners

internal structure

preview renders

validation

export test.

Only after BOOT v001 is visibly convincing should you continue.

================================================================================

# 109. BOOT SUCCESSION

================================================================================

After boots:

LEG v001

The leg MUST explicitly connect to the boot ankle interface.

Then:

TORSO v001

which MUST explicitly connect to both legs and arms.

Then:

ARM v001

which MUST connect to torso and gauntlet.

Then:

GAUNTLET v001

which MUST connect to arm.

Then:

HELMET v001

which MUST connect to torso neck.

================================================================================

# 110. MASTER ASSEMBLY VALIDATION

================================================================================

Only after all six are present:

assemble.

Check:

human proportions

mechanical proportions

symmetry

clearance

visual coherence

materials

color system

energy system

silhouette

detail distribution

================================================================================

# 111. THE FINAL OBJECT

================================================================================

The final master object should look like an engineered machine whose parts
could plausibly have been individually designed, manufactured, assembled,
serviced and repaired.

That is the visual target.

================================================================================

# 112. WHAT "ATOMIC DETAIL" MEANS IN THIS PIPELINE

================================================================================

Atomic detail means:

A large feature is made of smaller functional parts.

Example:

THRUSTER

is not:

one cylinder.

It is:

housing

liner

retainer

nozzle

nozzle ring

mount

thermal shield

conduit

fasteners

internal chamber

Similarly:

KNEE

is not:

one rounded object.

It is:

housing

bearings

hinges

teeth

actuators

rods

pins

covers

retainers

cables

service access.

This is the standard for every assembly.

================================================================================

# 113. HUMAN VISUAL SCALE

================================================================================

The final suit must remain coherent at:

full-body distance

component distance

close component distance

macro inspection

Do not optimize only for one camera.

================================================================================

# 114. MACRO CAMERA

================================================================================

Create a QA camera capable of getting close enough to inspect:

2-5 mm class geometry where present.

The model should retain believable construction under this inspection.

================================================================================

# 115. NOT EVERYTHING MUST BE TRUE 1MM GEOMETRY

================================================================================

Important implementation clarification:

The requirement is visual fidelity at the landing-page camera.

It does NOT mean:

make every line 1 mm thick.

It does NOT mean:

generate millions of triangles for meaningless microscopic surfaces.

Use actual geometry where the viewer can resolve it.

Use material-level detail below that threshold.

The important thing is that the model reads as mechanically intricate.

================================================================================

# 116. GENERATION PIPELINE SHOULD BE REUSABLE

================================================================================

Once the armor tooling exists, it should be possible to modify:

suit height

shoulder width

foot size

core size

panel layout

red/black distribution

thruster size

helmet proportions

without rewriting the entire model.

That is why this is a parametric generator.

================================================================================

# 117. FINAL FILE STRUCTURE

================================================================================

Preferred:

tools/
vault_armor/
config.py
geometry.py
materials.py
fasteners.py
actuators.py
joints.py
wiring.py
surface.py
assembly.py
validation.py
export.py
generate_boots.py
generate_legs.py
generate_torso.py
generate_arms.py
generate_gauntlets.py
generate_helmet.py
generate_final.py
generate_all.py

public/
about-assets/
armor_boots.glb
armor_legs.glb
armor_torso.glb
armor_arms.glb
armor_gauntlets.glb
armor_helmet.glb
armor_rigged_final.glb

================================================================================

# 118. GIT FIREWALL

================================================================================

Allowed changes:

landing-page asset generator files

landing-page assets

About page files already authorized

Do NOT modify the existing Vault.

After every major milestone:

git diff --name-only

Unexpected 3D Vault changes:

REVERT.

================================================================================

# 119. COMPLETION REPORT

================================================================================

Do not say:

"armor pipeline ready"

until actual geometry has been generated.

Do not say:

"models will appear when supplied"

because supplying them is no longer the plan.

The task is to create them.

Report:

generator files created

Blender version

assemblies generated

component/object counts

triangle counts

validation status

exports generated

animation clips generated

preview renders generated

About page load test

Vault firewall result

================================================================================

# 120. FINAL COMMAND

================================================================================

BEGIN WITH THE BOOTS.

Do not begin by creating placeholders.

Do not begin by wiring empty GLB loaders.

Do not wait for external artists.

Do not wait for manually modeled geometry.

Do not stop at concept art.

Read:

MASTER_VAULT_ARMOR_ENGINEERING_SPEC.md

Build the Python generation framework.

Then generate:

VAULT BOOT v001.

Construct it component-by-component.

Give every major mechanical feature a real physical implementation.

Generate the geometry.

Render it.

Inspect it.

Iterate.

Then continue:

LEGS
→
TORSO
→
ARMS
→
GAUNTLETS
→
HELMET
→
MASTER ASSEMBLY
→
RIG
→
ANIMATIONS
→
GLBs
→
ABOUT PAGE.

The Python source is the model.

The `.blend` is the generated engineering scene.

The `.glb` is the deployment artifact.

The landing page is the presentation layer.

That is the pipeline.

# VAULT-01 // CRITICAL PIPELINE CORRECTION

# DIRECT PARAMETRIC CAD GENERATION

# DO NOT USE BLENDER AS THE AUTHORING SYSTEM

# DO NOT GENERATE THE ARMOR AS MESHES

#

# This message supersedes the previous assumption that the armor must be

# created as GLB meshes and then surgically separated in Blender.

#

# We are changing the production pipeline.

#

# The armor will be authored as TRUE PARAMETRIC CAD from Python.

#

# The methodology should follow the successful engineering workflow already

# demonstrated in the Respiratory Support Optimization project:

#

# parameterize the design

# → construct individual mechanical components

# → assemble components

# → inspect geometry

# → iterate

# → produce a merged assembly

#

# The uploaded MASTER_VAULT_ARMOR_ENGINEERING_SPEC.md is the design source

# of truth for the armor.

#

# The uploaded RSO project/report is the workflow reference for how we want

# the engineering model to be authored.

#

# ---------------------------------------------------------------------------

# ABSOLUTE CORRECTION

# ---------------------------------------------------------------------------

#

# DO NOT:

#

# - create Blender meshes as the primary armor authoring method

# - sculpt the armor as one monolithic mesh

# - generate six disconnected artistic mesh blobs

# - cut a finished mesh into pieces

# - depend on an external artist-created GLB for the actual armor geometry

# - replace detailed mechanical parts with primitive placeholders

# - create a CAD shell and then pretend that surface bevels are "detail"

#

# DO:

#

# - write Python CAD-generation scripts

# - create actual B-Rep / solid CAD geometry

# - construct components individually

# - create explicit mechanical interfaces

# - build subassemblies

# - assemble subassemblies

# - use parametric dimensions

# - preserve component identity

# - preserve assembly hierarchy

# - export genuine CAD deliverables

#

# The final landing-page GLBs are a later derivative/export stage.

#

# CAD IS THE SOURCE.

#

# GLB IS ONLY THE WEB DELIVERY REPRESENTATION.

#

# ---------------------------------------------------------------------------

# 1. AUTHORING TECHNOLOGY

# ---------------------------------------------------------------------------

#

# Use the CAD-generation technology that is actually available and reliable

# in the current Antigravity environment.

#

# Preferred:

#

# CadQuery

#

# using its OpenCascade-backed solid modeling workflow.

#

# Alternative:

#

# another Python parametric B-Rep CAD library only if CadQuery is genuinely

# unavailable.

#

# Do NOT switch to Blender merely because Blender is convenient for export.

#

# First solve the CAD.

#

# The generated geometry must be genuine CAD solids.

#

# The geometry must be independently inspectable in:

#

# - Onshape

# - FreeCAD

# - another valid STEP-compatible CAD viewer

#

# Onshape is OPTIONAL.

#

# It is a viewing / inspection tool, not the authoring dependency.

#

# If the Python CAD pipeline produces valid STEP and/or BREP assemblies,

# that is sufficient for this stage.

#

# ---------------------------------------------------------------------------

# 2. THE MASTER FILE IS THE SOURCE OF TRUTH

# ---------------------------------------------------------------------------

#

# Read:

#

# MASTER_VAULT_ARMOR_ENGINEERING_SPEC.md

#

# completely before creating geometry.

#

# Do not paraphrase the specification into a simpler "robot".

#

# Preserve:

#

# - dimensional envelope

# - coordinate system

# - subsystem hierarchy

# - mechanical interfaces

# - component IDs

# - material categories

# - assembly logic

# - power/data routing

# - thermal architecture

# - landing-page component boundaries

#

# The engineering specification is authoritative.

#

# If a detail is specified there:

# model it.

#

# If a detail is not specified:

# derive it from surrounding mechanical logic rather than inventing

# visually unrelated decoration.

#

# ---------------------------------------------------------------------------

# 3. THE CORE IDEA

# ---------------------------------------------------------------------------

#

# We are not making:

#

# "a detailed armor model."

#

# We are making:

#

# "a complete fictional mechanical product consisting of hundreds or

# thousands of individually authored CAD components."

#

# The six major landing-page assemblies are:

#

# ARMOR BOOTS

# ARMOR LEGS

# ARMOR TORSO

# ARMOR ARMS

# ARMOR GAUNTLETS

# ARMOR HELMET

#

# But these are NOT the actual modeling granularity.

#

# Each major assembly must itself consist of many intentional CAD parts.

#

# Conceptually:

#

# BOOTS

# ├── outer armor

# ├── inner chassis

# ├── ankle articulation

# ├── propulsion

# ├── thermal management

# ├── power

# ├── sensing

# ├── latching

# ├── sole

# └── fasteners

#

# and each of those contains further parts.

#

# ---------------------------------------------------------------------------

# 4. COMPONENT COUNT PHILOSOPHY

# ---------------------------------------------------------------------------

#

# Do not use component count as an artificial vanity metric.

#

# However, the requested visual target requires genuinely decomposed geometry.

#

# Therefore target:

#

# LOW COMPLEXITY SUBSYSTEM:

# 30-80 parts

#

# STANDARD SUBSYSTEM:

# 80-200 parts

#

# HERO SUBSYSTEM:

# 150-400+ parts

#

# A major assembly may therefore naturally reach:

#

# 100

# 250

# 500

# 1000+

#

# independently authored objects depending on its complexity.

#

# There is no requirement that every tiny screw become an independent file.

#

# But it must remain a genuine CAD feature/object in the assembly hierarchy

# when it contributes visually or mechanically.

#

# ---------------------------------------------------------------------------

# 5. "1000 COMPONENTS" MUST NOT MEAN RANDOM GREEBLES

# ---------------------------------------------------------------------------

#

# Never satisfy the component-count target by scattering arbitrary:

#

# cubes

# cylinders

# pipes

# plates

# bolts

#

# across the model.

#

# Every component needs a reason.

#

# Each component should answer at least one:

#

# - What does it support?

# - What does it connect?

# - What does it move?

# - What does it protect?

# - What does it cool?

# - What does it conduct?

# - What does it sense?

# - What does it lock?

# - What does it actuate?

# - What does it service?

#

# If an object has no plausible role:

#

# do not add it.

#

# ---------------------------------------------------------------------------

# 6. PARAMETRIC MODELING RULE

# ---------------------------------------------------------------------------

#

# Do not hard-code hundreds of unrelated coordinates.

#

# Establish a master parameter system.

#

# Example categories:

#

# SUIT:

# total_height

# shoulder_width

# hip_width

#

# JOINT:

# bearing_od

# bearing_id

# actuator_stroke

# housing_wall

#

# ARMOR:

# panel_thickness

# seam_gap

# edge_radius

#

# FASTENERS:

# bolt_diameter

# head_height

# washer_diameter

#

# PROPULSION:

# chamber_diameter

# nozzle_diameter

# thermal_liner

#

# Then create component geometry from these parameters.

#

# This allows later iteration without rebuilding the entire model.

#

# ---------------------------------------------------------------------------

# 7. MODEL HIERARCHY

# ---------------------------------------------------------------------------

#

# Every generated CAD object must have an explicit name.

#

# Naming convention:

#

# V01*<ASSEMBLY>*<SUBSYSTEM>_<COMPONENT>_<INDEX>

#

# Example:

#

# V01_BOOT_PROPULSION_THRUSTER_HOUSING_L

#

# V01_BOOT_PROPULSION_NOZZLE_L

#

# V01_BOOT_PROPULSION_NOZZLE_RET_RING_L

#

# V01_BOOT_ANKLE_BEARING_OUTER_L

#

# V01_BOOT_ANKLE_BEARING_INNER_L

#

# V01_BOOT_ANKLE_ACTUATOR_PISTON_L

#

# etc.

#

# Do not use:

#

# Part001

# Body17

# Cylinder34

# Box82

#

# unless such names are hidden inside a generated implementation layer.

#

# The exported assembly should remain intelligible.

#

# ---------------------------------------------------------------------------

# 8. CAD SCRIPT ARCHITECTURE

# ---------------------------------------------------------------------------

#

# Do not create one enormous Python file.

#

# Create a modular CAD codebase.

#

# Suggested structure:

#

# vault_armor_cad/

#

# config.py

#

# common/

# materials.py

# fasteners.py

# bearings.py

# actuators.py

# panels.py

# vents.py

# connectors.py

# utilities.py

#

# boots/

# boot_master.py

# boot_outer_shell.py

# boot_ankle.py

# boot_thruster.py

# boot_sole.py

# boot_power.py

# boot_thermal.py

# boot_assembly.py

#

# legs/

# leg_master.py

# leg_thigh.py

# leg_knee.py

# leg_shin.py

# leg_hip.py

# leg_actuation.py

# leg_power.py

# leg_assembly.py

#

# torso/

# torso_master.py

# torso_frame.py

# torso_chest.py

# torso_core.py

# torso_abdomen.py

# torso_spine.py

# torso_shoulders.py

# torso_thermal.py

# torso_power.py

# torso_assembly.py

#

# arms/

# arm_master.py

# arm_shoulder.py

# arm_bicep.py

# arm_elbow.py

# arm_forearm.py

# arm_assembly.py

#

# gauntlets/

# gauntlet_master.py

# gauntlet_palm.py

# gauntlet_fingers.py

# gauntlet_emitter.py

# gauntlet_wrist.py

# gauntlet_assembly.py

#

# helmet/

# helmet_master.py

# helmet_cranium.py

# helmet_jaw.py

# helmet_optics.py

# helmet_rear_shell.py

# helmet_ventilation.py

# helmet_neck.py

# helmet_assembly.py

#

# full_suit/

# suit_assembly.py

# suit_validation.py

# suit_export.py

#

# build_all.py

#

# The exact folder names may differ.

#

# The architecture must remain modular.

#

# ---------------------------------------------------------------------------

# 9. BUILD PIPELINE

# ---------------------------------------------------------------------------

#

# The build pipeline must be:

#

# PARAMETERS

# ↓

# COMMON HARDWARE

# ↓

# SUBCOMPONENTS

# ↓

# SUBSYSTEMS

# ↓

# MAJOR ASSEMBLY

# ↓

# SIX-ASSEMBLY SUIT

# ↓

# VALIDATION

# ↓

# CAD EXPORT

#

# NOT:

#

# prompt → mesh → GLB.

#

# ---------------------------------------------------------------------------

# 10. COMMON HARDWARE LIBRARY

# ---------------------------------------------------------------------------

#

# Build reusable parametric generators for:

#

# screws

# bolts

# washers

# nuts

# pins

# shafts

# bearings

# retaining rings

# spacers

# brackets

# hinges

# bushings

# cable clips

# hose clamps

# actuator rods

# actuator bodies

# collars

# panels

# vent louvers

# grille frames

# connector housings

#

# Each generator must accept dimensions and placement.

#

# Example:

#

# create_fastener(type="M2.5", length=8, ...)

#

# or equivalent.

#

# The implementation need not use literal real-world catalog hardware unless

# appropriate.

#

# The visual target is realistic engineering scale.

#

# ---------------------------------------------------------------------------

# 11. BOOT CAD PROGRAM

# ---------------------------------------------------------------------------

#

# Build the boot as an engineering assembly.

#

# Required major subsystems:

#

# BOOT-01:

# outer armor shell

#

# BOOT-02:

# toe protection

#

# BOOT-03:

# forefoot structural frame

#

# BOOT-04:

# heel housing

#

# BOOT-05:

# ankle locking collar

#

# BOOT-06:

# ankle bearing

#

# BOOT-07:

# actuator system

#

# BOOT-08:

# propulsion chamber

#

# BOOT-09:

# propulsion nozzle

#

# BOOT-10:

# thermal shielding

#

# BOOT-11:

# power interface

#

# BOOT-12:

# sensor package

#

# BOOT-13:

# sole

#

# BOOT-14:

# traction system

#

# BOOT-15:

# magnetic latch

#

# BOOT-16:

# service panels

#

# BOOT-17:

# fasteners

#

# BOOT-18:

# cable routing

#

# BOOT-19:

# stabilizer system

#

# ---------------------------------------------------------------------------

# 12. BOOT THRUSTER

# ---------------------------------------------------------------------------

#

# The thruster must not be represented by:

#

# one cylinder

#

# It should contain:

#

# outer housing

# mounting ring

# internal chamber

# liner

# injector-like geometry

# nozzle throat

# nozzle cone

# retaining ring

# heat shields

# rear support

# power feed

# control wiring

# stabilization hardware

#

# Build the internal architecture so that the component remains visually

# convincing when viewed from underneath or behind.

#

# ---------------------------------------------------------------------------

# 13. ANKLE ENGINEERING

# ---------------------------------------------------------------------------

#

# Model:

#

# outer bearing race

# inner bearing race

# bearing carrier

# retaining ring

# pivot shaft

# actuator bracket

# actuator body

# piston

# rod end

# joint pin

# locking collar

# sensor mount

# cable guide

#

# The joint must visually explain how the foot is allowed to articulate.

#

# ---------------------------------------------------------------------------

# 14. LEG CAD PROGRAM

# ---------------------------------------------------------------------------

#

# Major subsystems:

#

# thigh armor

# inner thigh frame

# hip coupler

# hip bearing

# knee housing

# knee bearing

# hydraulic actuator system

# locking teeth

# shin armor

# side power module

# thermal channels

# service panels

# cable routing

# internal frame

# fasteners

#

# Knee is a hero feature.

#

# Build it as actual mechanical architecture.

#

# When the leg is separated from the torso and boot, the interface must make

# sense.

#

# ---------------------------------------------------------------------------

# 15. KNEE ASSEMBLY

# ---------------------------------------------------------------------------

#

# The knee should contain several nested components.

#

# Required concepts:

#

# primary hinge

# secondary stabilizer

# actuator pair

# bearing carrier

# mechanical stop

# locking teeth

# protective armor cap

# cable routing

# service access

#

# Make the inner mechanical system visible when the outer armor is separated.

#

# ---------------------------------------------------------------------------

# 16. TORSO CAD PROGRAM

# ---------------------------------------------------------------------------

#

# This is the largest assembly.

#

# Build:

#

# torso outer shell

# structural frame

# rib system

# abdomen segments

# shoulder mounts

# collar

# spinal system

# data trunk

# power trunk

# thermal system

# service panels

# chest core housing

# core heat sink

# core shielding

# cable routing

# fasteners

#

# The torso must contain genuinely layered construction.

#

# ---------------------------------------------------------------------------

# 17. ORIGINAL POWER CORE

# ---------------------------------------------------------------------------

#

# The power system MUST NOT be an Arc Reactor imitation.

#

# Create an original power architecture.

#

# Suggested engineering logic:

#

# recessed power chamber

# central energy aperture

# radial heat-sink stack

# segmented containment frame

# power routing manifold

# thermal exhaust path

# sensor ring

# protective shutter

#

# It must look mechanically engineered.

#

# Cyan illumination occurs inside this architecture.

#

# The cyan light must not be painted onto the outer plate.

#

# ---------------------------------------------------------------------------

# 18. SPINAL DATA ARCHITECTURE

# ---------------------------------------------------------------------------

#

# The back of the torso must contain:

#

# central structural spine

# modular vertebral plates

# cable trunks

# data junction blocks

# service connectors

# protective channel covers

#

# The spine should visually communicate that the armor is a system.

#

# ---------------------------------------------------------------------------

# 19. ARM CAD PROGRAM

# ---------------------------------------------------------------------------

#

# Build mirrored left/right assemblies from shared parametric definitions.

#

# Required:

#

# shoulder bearing

# sliding shoulder cap

# upper arm frame

# bicep armor

# elbow housing

# dual actuators

# forearm frame

# vent system

# service panels

# cable routing

# wrist coupler

#

# Left/right should share the same mechanical grammar.

#

# ---------------------------------------------------------------------------

# 20. SHOULDER MECHANISM

# ---------------------------------------------------------------------------

#

# Do not make the shoulder a decorative ball.

#

# Build:

#

# bearing

# race

# carrier

# mounting bracket

# shoulder cap

# sliding interface

# actuator

# retaining hardware

# cable channel

#

# The shoulder armor must be able to conceptually move relative to the torso.

#

# ---------------------------------------------------------------------------

# 21. GAUNTLET CAD PROGRAM

# ---------------------------------------------------------------------------

#

# This must be a hero close-up assembly.

#

# Subsystems:

#

# palm housing

# dorsal armor

# finger armor

# finger joints

# knuckle mechanisms

# wrist bearing

# emitter chamber

# energy conduit

# cooling system

# service panel

# fasteners

#

# Each finger must contain multiple articulating segments.

#

# Do not represent the hand as a single mitten.

#

# ---------------------------------------------------------------------------

# 22. PALM EMITTER

# ---------------------------------------------------------------------------

#

# ORIGINAL DESIGN.

#

# Do not copy a movie repulsor.

#

# Build a recessed collimation system:

#

# outer housing

# mounting flange

# lens/cap

# focusing structure

# internal ring

# conductor paths

# thermal interface

# rear power connector

#

# The emitter should look physically recessed into the palm.

#

# ---------------------------------------------------------------------------

# 23. HELMET CAD PROGRAM

# ---------------------------------------------------------------------------

#

# Helmet is the primary identity object.

#

# Required:

#

# cranial shell

# brow structure

# optical housings

# cheek plates

# jaw

# jaw actuator

# rear shell

# neck collar

# vent system

# cable/data connection

# optical protection

# service panels

# fastening

#

# The helmet must be mechanically separable from the neck.

#

# ---------------------------------------------------------------------------

# 24. OPTICAL SYSTEM

# ---------------------------------------------------------------------------

#

# The two cyan optical apertures should be:

#

# recessed

# narrow

# horizontal

# physically housed

#

# Do not model them as glowing rectangles floating on the helmet.

#

# They must sit inside:

#

# outer shell

# optical bezel

# lens housing

# internal emitter/sensor volume

#

# ---------------------------------------------------------------------------

# 25. JAW MECHANISM

# ---------------------------------------------------------------------------

#

# The jaw must not simply be sculpted into the helmet.

#

# Build:

#

# jaw plate

# hinge

# hinge pin

# actuator/linkage

# rear support

# locking interface

#

# The architectural distinction between:

#

# cranial shell

# cheek

# jaw

#

# must be visible.

#

# ---------------------------------------------------------------------------

# 26. VENTILATION

# ---------------------------------------------------------------------------

#

# Build actual layered ventilation.

#

# Outer vent opening

# ↓

# louver frame

# ↓

# louver blades

# ↓

# recessed cavity

# ↓

# internal mesh/grille

# ↓

# thermal channel

#

# Do not fake ventilation with black painted lines.

#

# ---------------------------------------------------------------------------

# 27. SERVICEABILITY

# ---------------------------------------------------------------------------

#

# The armor must look as though an engineer could service it.

#

# Include:

#

# removable panels

# fasteners

# inspection covers

# connector access

# cable routing

# mechanical separation points

#

# This is important.

#

# A good engineering object explains how it would be assembled and repaired.

#

# ---------------------------------------------------------------------------

# 28. PANEL DESIGN

# ---------------------------------------------------------------------------

#

# Armor panels should be actual solid bodies.

#

# Use:

#

# shell

# inset

# flange

# mounting interface

# seam

#

# whenever applicable.

#

# Do not simply engrave lines onto a surface to represent every seam.

#

# Where the seam represents a real assembly boundary:

#

# create actual separation.

#

# ---------------------------------------------------------------------------

# 29. PANEL GAPS

# ---------------------------------------------------------------------------

#

# Maintain intentional seam gaps.

#

# They should communicate:

#

# movement

# serviceability

# assembly

# thermal expansion

# articulation

#

# Do not create random gaps.

#

# ---------------------------------------------------------------------------

# 30. INTERNAL STRUCTURE

# ---------------------------------------------------------------------------

#

# Whenever two armor sections separate:

#

# THERE MUST BE SOMETHING INSIDE.

#

# Never reveal:

#

# a hollow shell

#

# Instead reveal:

#

# bracket

# frame

# actuator

# cable

# connector

# bearing

# latch

# thermal shield

#

# ---------------------------------------------------------------------------

# 31. POWER ROUTING

# ---------------------------------------------------------------------------

#

# Establish a master power architecture.

#

# Example:

#

# torso core

# ↓

# primary trunk

# ↓

# shoulder distribution

# ↓

# arms

#

# torso core

# ↓

# lower trunk

# ↓

# hip distribution

# ↓

# legs

#

# torso auxiliary

# ↓

# neck data/power

# ↓

# helmet

#

# torso

# ↓

# forearm

# ↓

# gauntlet emitter

#

# The visible conduits should correspond to this architecture.

#

# ---------------------------------------------------------------------------

# 32. DATA ROUTING

# ---------------------------------------------------------------------------

#

# Create separate visual data conduits.

#

# Do not simply reuse the power cables.

#

# Use distinct:

#

# thin data trunks

# junction housings

# connectors

# protected routing channels

#

# especially around:

#

# spine

# neck

# shoulders

# wrists

#

# ---------------------------------------------------------------------------

# 33. THERMAL ARCHITECTURE

# ---------------------------------------------------------------------------

#

# The fictional suit is an extreme-environment machine.

#

# Therefore model thermal logic.

#

# Possible:

#

# heat sinks

# heat exchangers

# vent channels

# thermal shields

# isolated hot zones

# radiator fins

# heat-spreading plates

#

# Red/amber visual accents can identify thermal regions.

#

# ---------------------------------------------------------------------------

# 34. MATERIAL-READY CAD

# ---------------------------------------------------------------------------

#

# CAD geometry must carry meaningful part/category metadata so the later

# rendering stage can assign:

#

# GUNMETAL

# RED

# GRAPHITE

# CYAN

# AMBER

# ELASTOMER

# OPTICAL

#

# Do not simply assign one material to everything.

#

# ---------------------------------------------------------------------------

# 35. ASSEMBLY TREE

# ---------------------------------------------------------------------------

#

# The complete suit assembly hierarchy should resemble:

#

# VAULT_MK1

# │

# ├── TORSO

# │ ├── chest

# │ ├── abdomen

# │ ├── spine

# │ ├── core

# │ ├── shoulder_mount_L

# │ └── shoulder_mount_R

# │

# ├── ARM_L

# ├── ARM_R

# ├── GAUNTLET_L

# ├── GAUNTLET_R

# ├── LEG_L

# ├── LEG_R

# ├── BOOT_L

# ├── BOOT_R

# └── HELMET

#

# Every child contains further subassemblies.

#

# ---------------------------------------------------------------------------

# 36. LEFT / RIGHT MIRRORING

# ---------------------------------------------------------------------------

#

# Where possible:

#

# create one master side

#

# then transform/mirror it.

#

# Do not independently redesign left/right.

#

# This ensures mechanical compatibility.

#

# Intentional asymmetries are allowed for:

#

# service access

# power distribution

# cooling

# data routing

#

# but they must be deliberate.

#

# ---------------------------------------------------------------------------

# 37. MECHANICAL INTERFACES

# ---------------------------------------------------------------------------

#

# Explicitly model these interface planes:

#

# BOOT ↔ LEG

#

# LEG ↔ TORSO

#

# TORSO ↔ ARM

#

# ARM ↔ GAUNTLET

#

# TORSO ↔ HELMET

#

# Each interface must include:

#

# locating feature

# retention

# load-bearing structure

# power/data path

# clearance

# protective geometry

#

# ---------------------------------------------------------------------------

# 38. ASSEMBLY CLEARANCE

# ---------------------------------------------------------------------------

#

# When assembled:

#

# armor panels may overlap visually,

# but moving components must not obviously occupy the same physical volume.

#

# Check:

#

# shoulder rotation region

# elbow

# wrist

# knee

# ankle

# helmet/neck

#

# ---------------------------------------------------------------------------

# 39. VALIDATION

# ---------------------------------------------------------------------------

#

# Create automated geometry checks.

#

# At minimum:

#

# - object exists

# - solid is valid

# - no unexpected null geometry

# - bounding box within expected range

# - left/right symmetry within tolerance where appropriate

# - key interfaces align

# - assembly origin correct

# - no catastrophic self-intersection in static assembly

#

# Where practical:

#

# compute:

#

# volume

# bounding box

# center of mass

# approximate part count

#

# Store results in machine-readable metadata.

#

# ---------------------------------------------------------------------------

# 40. CAD QA REPORT

# ---------------------------------------------------------------------------

#

# Each assembly should produce:

#

# assembly_summary.json

#

# containing:

#

# assembly_name

# part_count

# subsystem_count

# bounding_box

# component_names

# validation_results

# export_paths

#

# Also produce a human-readable:

#

# README.md

#

# for each completed assembly describing:

#

# what was generated

# how it is structured

# how to regenerate it

# known limitations

#

# ---------------------------------------------------------------------------

# 41. EXPORT FORMAT

# ---------------------------------------------------------------------------

#

# PRIMARY AUTHORING OUTPUT:

#

# STEP

#

# Prefer:

#

# AP242

#

# if the chosen exporter supports it reliably.

#

# Otherwise:

#

# standard STEP.

#

# Secondary:

#

# BREP or native project format where useful.

#

# GLB is NOT the primary source.

#

# The final GLB conversion is a later delivery stage.

#

# ---------------------------------------------------------------------------

# 42. SIX FINAL CAD ASSEMBLIES

# ---------------------------------------------------------------------------

#

# The CAD pipeline must ultimately produce:

#

# armor_boots.step

# armor_legs.step

# armor_torso.step

# armor_arms.step

# armor_gauntlets.step

# armor_helmet.step

#

# and:

#

# master_armor_assembly.step

#

# The later web-export stage may derive:

#

# armor_boots.glb

# armor_legs.glb

# armor_torso.glb

# armor_arms.glb

# armor_gauntlets.glb

# armor_helmet.glb

# armor_rigged_final.glb

#

# Do not create these GLBs yet unless the conversion pipeline is trivial and

# does not compromise the CAD source.

#

# ---------------------------------------------------------------------------

# 43. NO BLENDER DEPENDENCY

# ---------------------------------------------------------------------------

#

# Blender is NOT part of the CAD authoring pipeline.

#

# Do not tell the user:

#

# "open this in Blender and cut it."

#

# Do not make Blender the source of truth.

#

# Blender may eventually be used for:

#

# - rendering

# - material assignment

# - animation

# - GLB delivery

#

# but only AFTER the CAD is complete.

#

# ---------------------------------------------------------------------------

# 44. ONshape

# ---------------------------------------------------------------------------

#

# Onshape is optional.

#

# If Onshape import is convenient:

#

# use it for viewing.

#

# It is not required for the core build.

#

# The Python CAD source must be able to regenerate the geometry independently.

#

# ---------------------------------------------------------------------------

# 45. DO NOT WAIT FOR A HUMAN MODELER

# ---------------------------------------------------------------------------

#

# We are explicitly asking YOU to create the CAD generation scripts.

#

# Do not stop with:

#

# "I need a 3D artist."

#

# Do not stop with:

#

# "Please provide a GLB."

#

# Do not stop with:

#

# "Please provide reference geometry."

#

# The entire purpose of this stage is to generate the engineering geometry

# programmatically.

#

# ---------------------------------------------------------------------------

# 46. ONLINE RESEARCH

# ---------------------------------------------------------------------------

#

# You may research real mechanical systems to understand:

#

# hinge construction

# bearing layouts

# actuator design

# cable routing

# aerospace paneling

# thermal systems

# industrial fasteners

# robotics articulation

# propulsion housings

#

# Do NOT copy any copyrighted armor.

#

# Research engineering principles.

#

# Synthesize an original machine.

#

# ---------------------------------------------------------------------------

# 47. REFERENCE IMAGE USE

# ---------------------------------------------------------------------------

#

# Reference images are supplementary.

#

# They may inform:

#

# surface language

# mechanical plausibility

# proportion

# engineering vocabulary

#

# They are NOT geometry sources.

#

# The CAD scripts must generate the actual geometry.

#

# ---------------------------------------------------------------------------

# 48. DEVELOPMENT STRATEGY

# ---------------------------------------------------------------------------

#

# Do NOT attempt the entire suit in one Python script and hope it works.

#

# Develop in this order:

#

# PHASE A:

# common CAD library

#

# PHASE B:

# BOOT

#

# PHASE C:

# LEG

#

# PHASE D:

# TORSO

#

# PHASE E:

# ARM

#

# PHASE F:

# GAUNTLET

#

# PHASE G:

# HELMET

#

# PHASE H:

# six-assembly integration

#

# PHASE I:

# full suit

#

# ---------------------------------------------------------------------------

# 49. BOOT-FIRST GATE

# ---------------------------------------------------------------------------

#

# DO NOT BEGIN THE NEXT MAJOR ASSEMBLY UNTIL BOOT PASSES REVIEW.

#

# Boot must have:

#

# - complete outer geometry

# - genuine inner mechanical structure

# - propulsion architecture

# - ankle mechanism

# - thermal architecture

# - serviceability

# - fasteners

# - power/data routing

# - correct dimensions

# - valid CAD solids

# - exportable STEP

#

# Produce a rendered/previewed engineering view if possible.

#

# ---------------------------------------------------------------------------

# 50. BOOT VISUAL QA

# ---------------------------------------------------------------------------

#

# Inspect:

#

# top

# bottom

# front

# rear

# inner ankle

# outer ankle

# heel

# thruster

# sole

#

# The boot must remain convincing from every major view.

#

# ---------------------------------------------------------------------------

# 51. MODEL INSPECTION SCALE

# ---------------------------------------------------------------------------

#

# Inspect at:

#

# full assembly

# subsystem

# close-up

# hero close-up

#

# At hero close-up:

#

# hinge pins

# fasteners

# seams

# retaining rings

# actuator details

# vents

# cable clips

#

# should remain recognizable.

#

# ---------------------------------------------------------------------------

# 52. GEOMETRY OVER TEXTURE

# ---------------------------------------------------------------------------

#

# The visual requirement is geometry-heavy.

#

# Therefore:

#

# panel seams

# hinge structures

# major fasteners

# actuator bodies

# brackets

# bearings

# vents

#

# should generally be physical CAD geometry.

#

# Do NOT rely on textures to create the entire mechanical character.

#

# Micro-surface texture is a later rendering concern.

#

# ---------------------------------------------------------------------------

# 53. DETAIL DISTRIBUTION

# ---------------------------------------------------------------------------

#

# Concentrate detail where the landing-page camera will look.

#

# HERO ZONES:

#

# helmet face

# torso core

# shoulder

# knee

# ankle

# gauntlet

# thruster

#

# Background/unseen regions may be simpler.

#

# This is intelligent engineering, not artificial uniform complexity.

#

# ---------------------------------------------------------------------------

# 54. CAD ASSEMBLY METADATA

# ---------------------------------------------------------------------------

#

# Every assembly should expose:

#

# component ID

# subsystem

# material category

# left/right

# parent

# interface

# transform

#

# via a metadata dictionary or equivalent export manifest.

#

# ---------------------------------------------------------------------------

# 55. FUTURE WEB EXPORT

# ---------------------------------------------------------------------------

#

# Do not optimize the CAD source around the web renderer yet.

#

# First:

#

# make the machine correct.

#

# Later:

#

# CAD → tessellation → GLB → WebGL

#

# will be an export pipeline.

#

# The CAD source must survive independently.

#

# ---------------------------------------------------------------------------

# 56. THE COMPLETE SUIT

# ---------------------------------------------------------------------------

#

# Once all six assemblies are finished:

#

# assemble them using the same interface origins defined in the engineering

# specification.

#

# Do NOT create a second "final suit mesh."

#

# The final suit must literally be:

#

# BOOT + LEG + TORSO + ARM + GAUNTLET + HELMET

#

# assembled from the same authored assemblies.

#

# This guarantees continuity between:

#

# separated flight components

#

# and

#

# final assembled hero.

#

# ---------------------------------------------------------------------------

# 57. HERO SUIT ASSEMBLY

# ---------------------------------------------------------------------------

#

# Verify:

#

# boots align

# knees align

# hips align

# shoulders align

# wrists align

# neck aligns

# helmet seats correctly

#

# Verify the same model that exists as separated pieces can be assembled without

# arbitrary scaling.

#

# ---------------------------------------------------------------------------

# 58. ARTICULATION READINESS

# ---------------------------------------------------------------------------

#

# Even before animation:

#

# identify intended motion axes:

#

# ankle pitch

# knee hinge

# hip rotation

# shoulder rotation

# elbow hinge

# wrist rotation

# finger articulation

# helmet/jaw articulation

#

# Store these axes in metadata.

#

# This will later simplify animation.

#

# ---------------------------------------------------------------------------

# 59. LATER ANIMATION PIPELINE

# ---------------------------------------------------------------------------

#

# ONLY AFTER CAD IS COMPLETE:

#

# CAD

# ↓

# tessellation

# ↓

# optimized render mesh

# ↓

# rig

# ↓

# animation

# ↓

# GLB

#

# At that stage Blender may be used.

#

# But do not begin that phase now.

#

# ---------------------------------------------------------------------------

# 60. REQUIRED PYTHON DELIVERABLES

# ---------------------------------------------------------------------------

#

# You are explicitly required to create the Python CAD generators.

#

# Minimum:

#

# build_common.py

# build_boots.py

# build_legs.py

# build_torso.py

# build_arms.py

# build_gauntlets.py

# build_helmet.py

# build_full_suit.py

# validate_armor.py

# export_armor.py

# build_all.py

#

# Plus any genuinely useful modular subsystem files.

#

# ---------------------------------------------------------------------------

# 61. SCRIPT BEHAVIOR

# ---------------------------------------------------------------------------

#

# Running:

#

# python build_boots.py

#

# should regenerate the complete boot CAD.

#

# Running:

#

# python build_legs.py

#

# should regenerate the complete leg CAD.

#

# etc.

#

# Running:

#

# python build_full_suit.py

#

# should assemble all available completed assemblies.

#

# Running:

#

# python build_all.py

#

# should execute the full pipeline in dependency order.

#

# ---------------------------------------------------------------------------

# 62. DETERMINISM

# ---------------------------------------------------------------------------

#

# The CAD generation must be deterministic.

#

# Same parameters

# +

# same code

# =

# same geometry.

#

# Do not rely on random generation.

#

# ---------------------------------------------------------------------------

# 63. NO PROCEDURAL RANDOM GREEBLE GENERATION

# ---------------------------------------------------------------------------

#

# This is a hard prohibition.

#

# Do not use:

#

# random.seed(...)

#

# to scatter arbitrary mechanical objects simply to create "detail."

#

# Every component must be deliberately placed by a deterministic rule.

#

# ---------------------------------------------------------------------------

# 64. ITERATION LOG

# ---------------------------------------------------------------------------

#

# Maintain:

#

# CAD_BUILD_LOG.md

#

# Every iteration should document:

#

# what changed

# why it changed

# which parameters changed

# validation result

#

# This mirrors the disciplined iterative engineering approach demonstrated by

# the RSO project.

#

# ---------------------------------------------------------------------------

# 65. GEOMETRY VERSIONING

# ---------------------------------------------------------------------------

#

# Every major assembly should have an explicit version:

#

# BOOT v0.1

# BOOT v0.2

#

# etc.

#

# Do not overwrite a useful validated version without documenting the change.

#

# ---------------------------------------------------------------------------

# 66. FAILURE HANDLING

# ---------------------------------------------------------------------------

#

# If one subsystem fails:

#

# do not silently replace it with a box.

#

# report:

#

# COMPONENT

# ERROR

# ROOT CAUSE

# REQUIRED FIX

#

# Then fix the CAD generator.

#

# ---------------------------------------------------------------------------

# 67. NO FAKE COMPLETION

# ---------------------------------------------------------------------------

#

# Do not report:

#

# "1000 components completed"

#

# unless the generated assembly metadata actually confirms the component count.

#

# Do not report:

#

# "production-grade"

#

# simply because the Python script ran.

#

# Provide evidence.

#

# ---------------------------------------------------------------------------

# 68. PREVIEW ARTIFACTS

# ---------------------------------------------------------------------------

#

# Each major assembly should produce preview images:

#

# front

# rear

# side

# three-quarter

# exploded

#

# These are inspection artifacts only.

#

# The CAD remains the source of truth.

#

# ---------------------------------------------------------------------------

# 69. FINAL VALIDATION

# ---------------------------------------------------------------------------

#

# Before declaring the CAD pipeline complete:

#

# [ ] all six assemblies generate

#

# [ ] all major parts have names

#

# [ ] all major parts are solids

#

# [ ] interfaces align

#

# [ ] no major empty shell interiors

#

# [ ] propulsion is structurally defined

#

# [ ] joints are structurally defined

#

# [ ] power routing exists

#

# [ ] data routing exists

#

# [ ] thermal architecture exists

#

# [ ] serviceability exists

#

# [ ] full suit assembles from the six same source assemblies

#

# [ ] STEP exports open correctly

#

# [ ] generated geometry is deterministic

#

# [ ] validation report generated

#

# [ ] component count verified

#

# [ ] preview images captured

#

# ---------------------------------------------------------------------------

# 70. FINAL OUTPUT

# ---------------------------------------------------------------------------

#

# The final CAD directory should resemble:

#

# vault_armor_cad/

#

# scripts/

# common/

# boots/

# legs/

# torso/

# arms/

# gauntlets/

# helmet/

# full_suit/

#

# exports/

# armor_boots.step

# armor_legs.step

# armor_torso.step

# armor_arms.step

# armor_gauntlets.step

# armor_helmet.step

# master_armor_assembly.step

#

# validation/

#

# previews/

#

# CAD_BUILD_LOG.md

#

# ---------------------------------------------------------------------------

# 71. LANDING PAGE INTEGRATION

# ---------------------------------------------------------------------------

#

# Do NOT modify about.js to accommodate missing assets at this stage.

#

# Do NOT modify about.html.

#

# Do NOT modify about.css.

#

# First create the CAD.

#

# Once the CAD has passed inspection, we will perform:

#

# CAD → Web tessellation → GLB → landing-page integration.

#

# ---------------------------------------------------------------------------

# 72. EXISTING VAULT FIREWALL

# ---------------------------------------------------------------------------

#

# The existing 3D Vault remains untouched.

#

# Do not modify:

#

# lab.js

# cave3.js

# transition.js

# realism.js

# index.html

# biometric/security code

# existing scene modules

#

# The armor CAD pipeline is an independent landing-page asset-production

# subsystem.

#

# ---------------------------------------------------------------------------

# 73. FIRST IMPLEMENTATION TASK

# ---------------------------------------------------------------------------

#

# DO NOT attempt to generate the full suit immediately.

#

# FIRST:

#

# inspect the environment

#

# identify available Python CAD libraries

#

# confirm CadQuery/OpenCascade availability

#

# inspect the RSO CAD generator as workflow reference

#

# inspect MASTER_VAULT_ARMOR_ENGINEERING_SPEC.md

#

# create the CAD project structure

#

# create the common parametric hardware library

#

# then begin:

#

# BOOTS v0.1

#

# ---------------------------------------------------------------------------

# 74. BOOTS v0.1 ACCEPTANCE GATE

# ---------------------------------------------------------------------------

#

# The first real deliverable is:

#

# COMPLETE PARAMETRIC BOOT CAD.

#

# It must not be:

#

# a blockout

# a low-detail mock-up

# a shell

# a mesh

# a single fused solid with decorative lines

#

# It must be a real assembly.

#

# Build the boot component-by-component.

#

# The first version should already contain:

#

# outer armor

# inner frame

# ankle mechanism

# heel mechanism

# thruster

# thermal protection

# sole

# traction

# service panels

# fasteners

# power routing

# sensor elements

#

# The exact component decomposition must follow the master engineering

# specification.

#

# ---------------------------------------------------------------------------

# 75. VISUAL STANDARD

# ---------------------------------------------------------------------------

#

# We are aiming for:

#

# "cinematic blockbuster engineering asset"

#

# while authoring it as:

#

# "parametric mechanical CAD."

#

# Those are not contradictory.

#

# The CAD provides the engineering.

#

# The later rendering pipeline provides:

#

# materials

# lighting

# reflections

# microtexture

# atmosphere

# cinematic presentation.

#

# ---------------------------------------------------------------------------

# 76. FINAL INSTRUCTION

# ---------------------------------------------------------------------------

#

# Do not tell me that the armor requires a professional 3D artist.

#

# Do not tell me to source a GLB.

#

# Do not move this to Blender.

#

# Do not make placeholder meshes.

#

# Do not make one giant mesh.

#

# Write the Python CAD generators.

#

# Build the armor like an engineered machine.

#

# Build it component-by-component.

#

# Build every subsystem deliberately.

#

# Assemble the subsystems.

#

# Assemble the six major assemblies.

#

# Assemble the final suit.

#

# Validate it.

#

# Export it as CAD.

#

# ONLY AFTER THAT will we convert it for the cinematic WebGL landing page.

#

# Start with the common CAD library and BOOTS v0.1.
