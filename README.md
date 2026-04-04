# 🪲 DUNG CRAFT: SAVANNA STRATEGIST
**A 2026 Vibe Coding Game Jam Entry**

## 1. THE MISSION (THE "AIM")
You are a **Scarabaeidae (Dung Beetle)** in the heart of the Maasai Mara. Your objective is **Ecological Dominance through Efficiency.** The savanna is suffocating under procedural "Dung Piles" (voxel clusters). You must collaborate with the environment to "process" these piles, turning waste into **Beads (Currency)**. 

You win by clearing designated "Hotspots" on your map, upgrading your beetle’s physiology, and jumping through dimensional portals to harder, more rewarding plains.

**The Strategy:** The Mara is unforgiving. Every action costs energy. If you "eat" too fast without resting in the shade of an Acacia tree, your **Tire (Stamina)** hits 100%. You become immobilized, vulnerable, and bleed precious time. This is not a mindless clicker; it is a game of resource management and rhythmic survival.

---

## 2. THE ARCHITECT'S MANDATES (STRATEGIC PHILOSOPHY)
This project was born from a ruthless pivot. To win the $20,000 Gold Prize, we abandoned the trap of a "Minecraft Clone" and adopted the following non-negotiable rules:

* **Mandate 1: "Time to Interactive" is God.** The jam strictly forbids loading screens. Therefore, **Zero External Assets** are allowed. No `.glb` files, no `.png` textures. The "Dung Aesthetic" relies entirely on mathematical procedural generation, vertex colors, and flat-shaded hex codes. It must load in under 200ms.
* **Mandate 2: The "Infinite Slab" Architecture.** Traditional 256-block high voxel engines crash browsers. We use a thin, procedural "Slab" world that generates only what the player sees. `THREE.InstancedMesh` is mandatory to render thousands of blocks in a single draw call at 60fps.
* **Mandate 3: Gamify the Constraints.** The "Tire" status is the soul of the game. The tension comes from the Risk vs. Reward of buying faster tools that drain your stamina quicker.
* **Mandate 4: Seamless Portal Continuity.** The Vibe Jam Webring is our distribution network. If `?portal=true` is in the URL, the player bypasses the menu and drops instantly into the action. Their exhaustion (`hp` parameter) follows them through the multiverse. 

---

## 3. CORE GAMEPLAY LOOP
1. **Locate:** Use the minimalist **2D Canvas Mini-Map** (Top-Right) to find procedural dung clusters.
2. **Process:** Break down voxels using your current leg tools. 
3. **Manage Tire:** Monitor your **Tire %**. Retreat to the procedural shade to accelerate recovery. If it hits 100%, you suffer a 5-second penalty freeze.
4. **Evolve:** Spend **Beads** at the Maasai Trading Post UI to purchase:
   * *Shovel Legs:* 3x voxel damage.
   * *Chitin Plating:* 50% slower Tire accumulation.
   * *Rolling Mastery:* Passively clear voxels by moving over them.
5. **Ascend:** Clear a pile to reveal a **Level Portal**. Use the **Global Portal** at Home Base to jump to the next game in the Vibe Jam.

---

## 4. TECHNICAL SPECIFICATION
* **Stack:** React + Vite + TypeScript.
* **3D Engine:** React Three Fiber (R3F) / `@react-three/drei`.
* **Rendering:** `InstancedMesh` for all voxels. `ContactShadows` and `Environment` for high-end indie lighting without texture bloat.
* **Math/World Gen:** Simplex-noise for organic savanna terrain mapping.
* **UI:** Tailwind CSS utilizing a lightweight Maasai palette (Red: `#FF0000`, Blue: `#0000FF`, Ochre/Bead-White).

---

## 5. REQUIRED VIBE JAM COMPLIANCE 
* **Widget:** `<script async src="https://jam.pieter.com/2026/widget.js"></script>` MUST be in `index.html`.
* **Inbound Traffic:** Parse `window.location.search`. Extract `username`, `color`, `speed`, and `hp` (Tire).
* **Outbound Traffic:** The exit portal triggers a redirect to `https://jam.pieter.com/portal/2026?username=[NAME]&hp=[TIRE]&ref=[OUR_URL]`.

---

## 6. DEVELOPMENT ROADMAP (DEADLINE: MAY 1, 2026)
* **Phase 1 (By April 10): The Voxel Engine.** Implement `InstancedMesh`, Simplex noise terrain, and basic camera controls.
* **Phase 2 (By April 15): The Core Loop.** Implement the voxel destruction, the "Tire" state machine, and the recovery logic.
* **Phase 3 (By April 22): Economy & Portals.** Build the Bead system, the Shop UI, and the mandatory URL parameter parsing.
* **Phase 4 (By April 28): The Vibe Polish.** Add screen shake, Maasai UI patterns, and hyper-optimize the load time.
