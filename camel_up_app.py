import streamlit as st
import random
import matplotlib.pyplot as plt
from collections import Counter

# --- Board Drawing Function ---
def draw_board(camel_positions, spectator_tiles):
    fig, ax = plt.subplots(figsize=(14, 3))

    # Draw tiles
    for t in range(17):
        ax.add_patch(plt.Rectangle((t, 0), 1, 1, fill=False))
        ax.text(t + 0.5, -0.3, str(t), ha="center", va="center", fontsize=9)

    # Draw camels
    for camel, (tile, stack) in camel_positions.items():
        ax.plot(tile + 0.5, 0.5 + stack * 0.3, 'o', markersize=15,
                color=camel.lower())
        ax.text(tile + 0.5, 0.5 + stack * 0.3, camel[0].upper(),
                ha="center", va="center", color="white", fontsize=9, weight="bold")

    # Draw spectator tiles
    for tile, stype in spectator_tiles.items():
        if stype == "Oasis":
            ax.plot(tile + 0.5, 0.8, marker="*", color="green", markersize=15)
        elif stype == "Mirage":
            ax.plot(tile + 0.5, 0.8, marker="^", color="red", markersize=12)

    ax.set_xlim(0, 17)
    ax.set_ylim(0, 3)
    ax.axis("off")
    st.pyplot(fig)

# --- Helper Functions ---
def simulate_race(camel_positions, remaining_camels, spectator_tiles, trials=10000):
    outcomes = []
    for _ in range(trials):
        positions = {c: list(p) for c, p in camel_positions.items()}
        camels_to_roll = remaining_camels[:]
        random.shuffle(camels_to_roll)

        for camel in camels_to_roll:
            roll = random.randint(1, 3)
            tile, stack = positions[camel]

            # Move camel and any camels on top
            moving_stack = [(c, s) for c, (t, s) in positions.items() if t == tile and s >= stack]
            moving_stack.sort(key=lambda x: positions[x[0]][1])  # keep order
            for c, _ in moving_stack:
                positions[c][0] += roll

            new_tile = positions[camel][0]

            # Spectator tile effects
            if new_tile in spectator_tiles:
                if spectator_tiles[new_tile] == "Oasis":
                    for c, _ in moving_stack:
                        positions[c][0] += 1
                elif spectator_tiles[new_tile] == "Mirage":
                    for c, _ in moving_stack:
                        positions[c][0] -= 1

            # Restack camels properly
            same_tile_camels = [(c, s) for c, (t, s) in positions.items() if t == positions[camel][0]]
            same_tile_camels.sort(key=lambda x: positions[x[0]][1])
            for i, (c, _) in enumerate(same_tile_camels):
                positions[c][1] = i

        # Determine order
        order = sorted(positions.items(), key=lambda x: (x[1][0], x[1][1]), reverse=True)
        outcomes.append(order[0][0])  # Winner only

    return Counter(outcomes), trials

def check_constraints(camel_positions, spectator_tiles):
    # Check duplicate camel positions
    seen = set()
    for pos in camel_positions.values():
        if tuple(pos) in seen:
            return False, "Two camels cannot occupy the same tile & stack index."
        seen.add(tuple(pos))

    # Spectator tile cannot be on camel tile
    camel_tiles = {pos[0] for pos in camel_positions.values()}
    for tile in spectator_tiles.keys():
        if tile in camel_tiles:
            return False, f"Spectator tile cannot be placed on camel tile {tile}."

    # Spectator tiles cannot be adjacent
    for t in spectator_tiles.keys():
        if (t - 1 in spectator_tiles) or (t + 1 in spectator_tiles):
            return False, "Spectator tiles cannot be side by side."

    return True, ""

# --- Streamlit UI ---
st.title("🐪 Camel Up Probability Simulator")

st.subheader("Camel Positions")
camel_positions = {}
colors = ["Red", "Blue", "Yellow", "Orange", "Green"]
for camel in colors:
    col1, col2 = st.columns(2)
    with col1:
        tile = st.number_input(f"{camel} tile", min_value=0, max_value=16, value=0, key=f"{camel}_tile")
    with col2:
        stack = st.number_input(f"{camel} stack index", min_value=0, max_value=4, value=0, key=f"{camel}_stack")
    camel_positions[camel] = [tile, stack]

st.subheader("Spectator Tiles")
spectator_tiles = {}
for t in range(17):
    choice = st.multiselect(f"Tile {t}", ["Oasis", "Mirage"], key=f"spec_{t}")
    if choice:
        spectator_tiles[t] = choice[0]

st.subheader("Remaining Camels to Roll")
remaining_camels = st.multiselect("Select remaining camels to roll", colors)

# --- Live Board Preview ---
st.subheader("Board Preview")
draw_board(camel_positions, spectator_tiles)

# --- Simulation ---
if st.button("Run Simulation"):
    valid, msg = check_constraints(camel_positions, spectator_tiles)
    if not valid:
        st.error(msg)
    elif not remaining_camels:
        st.error("Select at least one remaining camel to roll.")
    else:
        st.info("Running simulation, please wait...")
        outcome_counts, total = simulate_race(camel_positions, remaining_camels, spectator_tiles)
        st.subheader("Winning Probability")
        for camel in colors:
            count = outcome_counts.get(camel, 0)
            prob = count / total * 100
            st.write(f"{camel}: {prob:.2f}% ({count}/{total})")
